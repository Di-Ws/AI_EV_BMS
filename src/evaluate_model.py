"""
Step 1 (v2): Fix labels, then evaluate with leave-one-battery-out (LOBO).

Label fixes (computed from the `capacity` column, no re-parsing needed):
  1. Drop discharges with capacity <= MIN_VALID_AH (aborted / empty runs)
  2. Per-battery reference capacity = median of the 3 highest capacities in the
     first REF_CYCLES valid cycles (NOT cycle 1, NOT a fixed 2.0 Ah)
  3. Trim leading warm-up cycles until capacity first reaches 95% of the reference
  4. SOH = capacity / reference
  5. RUL = (first cycle where 5-cycle median SOH <= eol_frac) - cycle
     Batteries that never reach EOL get NO RUL label and are excluded from RUL
     training/evaluation (they are still used for SOH).

Run from the project root:
    python src/evaluate_model.py
    python src/evaluate_model.py --eol-frac 0.70 --window 10
    python src/evaluate_model.py --save
"""
import argparse
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.base import clone
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import LeaveOneGroupOut
from xgboost import XGBRegressor

DATA_PATH = Path("data/processed/merged_battery_dataset.csv")
MODEL_DIR = Path("models/saved_models")
REPORT_DIR = Path("reports")

MIN_VALID_AH = 0.5
REF_CYCLES = 20
WARMUP_FRAC = 0.95
MIN_ROWS = 10

BASE_FEATURES = [
    "avg_voltage", "max_voltage", "min_voltage",
    "avg_current", "max_current",
    "avg_temp", "max_temp", "ambient_temp",
    "discharge_duration",
]
ROLL_COLS = ["avg_voltage", "avg_temp", "discharge_duration", "current_x_duration"]
TARGETS = ["soh", "rul"]


# ----------------------------------------------------------------- labels
def clean_labels(df: pd.DataFrame, eol_frac: float):
    df = df.sort_values(["battery_id", "cycle"]).copy()
    raw_rows = df.groupby("battery_id").size()

    df = df[df["capacity"] > MIN_VALID_AH].copy()

    df["ref_cap"] = df.groupby("battery_id")["capacity"].transform(
        lambda s: s.head(REF_CYCLES).nlargest(3).median()
    )

    reached = (
        (df["capacity"] >= WARMUP_FRAC * df["ref_cap"]).astype(int)
        .groupby(df["battery_id"]).cummax().astype(bool)
    )
    df = df[reached].copy()

    df["soh"] = df["capacity"] / df["ref_cap"]
    df = df[df["soh"] <= 1.15].copy()

    enough = df.groupby("battery_id")["cycle"].transform("size") >= MIN_ROWS
    df = df[enough].copy()

    smooth = df.groupby("battery_id")["soh"].transform(
        lambda s: s.rolling(5, min_periods=1).median()
    )
    eol = df.loc[smooth <= eol_frac].groupby("battery_id")["cycle"].min()
    df["eol_cycle"] = df["battery_id"].map(eol)
    df["rul"] = df["eol_cycle"] - df["cycle"]   # NaN if never reached EOL
    return df.reset_index(drop=True), raw_rows


def label_report(df, raw_rows, eol_frac):
    g = df.groupby("battery_id").agg(
        rows=("cycle", "count"),
        ambient=("ambient_temp", "first"),
        ref_cap=("ref_cap", "first"),
        soh_min=("soh", "min"),
        soh_max=("soh", "max"),
        eol_cycle=("eol_cycle", "first"),
    )
    g["rows_dropped"] = raw_rows.reindex(g.index) - g["rows"]
    removed = sorted(set(raw_rows.index) - set(g.index))

    print(f"\n=== Cleaned labels (EOL = SOH <= {eol_frac:.0%} of own reference) ===")
    print(g.round(3).to_string())
    if removed:
        print(f"\nBatteries removed entirely (too few valid rows): {removed}")
    n_eol = int(g["eol_cycle"].notna().sum())
    print(f"\nBatteries that reached EOL (valid RUL labels): {n_eol} of {len(g)}")
    print(f"Rows kept: {len(df)} of {int(raw_rows.sum())}")


# --------------------------------------------------------------- features
def build_features(df: pd.DataFrame, window: int):
    df = df.sort_values(["battery_id", "cycle"]).reset_index(drop=True)
    df["current_x_duration"] = df["avg_current"].abs() * df["discharge_duration"]
    for col in ROLL_COLS:
        df[f"{col}_roll{window}"] = df.groupby("battery_id")[col].transform(
            lambda s: s.rolling(window, min_periods=1).mean()
        )
    features = BASE_FEATURES + ["current_x_duration"] + [f"{c}_roll{window}" for c in ROLL_COLS]
    return df, features


# ------------------------------------------------------------- evaluation
def make_models():
    return {
        "RandomForest": RandomForestRegressor(
            n_estimators=300, min_samples_leaf=3, n_jobs=-1, random_state=42
        ),
        "XGBoost": XGBRegressor(
            n_estimators=300, max_depth=4, learning_rate=0.05,
            subsample=0.8, colsample_bytree=0.8, random_state=42, n_jobs=-1,
        ),
    }


def metrics(y_true, y_pred):
    return {
        "R2": r2_score(y_true, y_pred),
        "MAE": mean_absolute_error(y_true, y_pred),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
    }


def target_frame(df, target):
    if target == "rul":
        return df[df["rul"] >= 0].reset_index(drop=True)
    return df.reset_index(drop=True)


def run_lobo(df, features):
    results, per_battery, per_ambient = [], {}, {}
    logo = LeaveOneGroupOut()

    for target in TARGETS:
        d = target_frame(df, target)
        X, y, groups = d[features], d[target], d["battery_id"]
        print(f"\n[{target.upper()}] {len(d)} rows from {groups.nunique()} batteries")

        base_pred = np.zeros(len(d))
        oof = {name: np.zeros(len(d)) for name in make_models()}

        for tr, te in logo.split(X, y, groups):
            base_pred[te] = y.iloc[tr].mean()
            for name, model in make_models().items():
                m = clone(model).fit(X.iloc[tr], y.iloc[tr])
                oof[name][te] = m.predict(X.iloc[te])

        results.append({"target": target, "model": "MeanBaseline", **metrics(y, base_pred)})
        for name, pred in oof.items():
            results.append({"target": target, "model": name, **metrics(y, pred)})

        err = pd.DataFrame({
            "battery_id": d["battery_id"],
            "ambient_temp": d["ambient_temp"],
            "Baseline": (y - base_pred).abs(),
            **{n: (y - p).abs() for n, p in oof.items()},
        })
        per_battery[target] = (
            err.groupby("battery_id").mean(numeric_only=True).drop(columns="ambient_temp")
        )
        per_ambient[target] = err.groupby("ambient_temp").mean(numeric_only=True)

    return pd.DataFrame(results), per_battery, per_ambient


def save_final_models(df, features, window, eol_frac):
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    for target in TARGETS:
        d = target_frame(df, target)
        for name, model in make_models().items():
            m = clone(model).fit(d[features], d[target])
            path = MODEL_DIR / f"{target}_{name.lower()}.joblib"
            joblib.dump(
                {
                    "model": m,
                    "features": features,
                    "target": target,
                    "rolling_window": window,
                    "eol_frac": eol_frac,
                    "note": "Trained on NASA data; validated with leave-one-battery-out.",
                },
                path,
            )
            print(f"Saved {path}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--window", type=int, default=5, help="rolling window in cycles")
    ap.add_argument("--eol-frac", type=float, default=0.80,
                    help="EOL threshold as a fraction of each battery's reference capacity")
    ap.add_argument("--save", action="store_true", help="fit on all data and export models")
    args = ap.parse_args()

    raw = pd.read_csv(DATA_PATH)
    df, raw_rows = clean_labels(raw, args.eol_frac)
    label_report(df, raw_rows, args.eol_frac)

    df, features = build_features(df, args.window)
    print(f"\nFeatures ({len(features)}): {features}")

    results, per_battery, per_ambient = run_lobo(df, features)

    pd.set_option("display.float_format", lambda v: f"{v:,.4f}")
    print("\n=== Leave-one-battery-out, pooled ===")
    for target in TARGETS:
        print(f"\n--- {target.upper()} ---")
        print(results[results.target == target].drop(columns="target").to_string(index=False))

    for target in TARGETS:
        print(f"\n=== {target.upper()}: MAE per battery (worst first) ===")
        print(per_battery[target].sort_values("RandomForest", ascending=False).to_string())
        print(f"\n=== {target.upper()}: MAE per ambient temperature ===")
        print(per_ambient[target].to_string())

    REPORT_DIR.mkdir(exist_ok=True)
    results.to_csv(REPORT_DIR / "lobo_summary.csv", index=False)
    for target in TARGETS:
        per_battery[target].to_csv(REPORT_DIR / f"lobo_{target}_per_battery.csv")
        per_ambient[target].to_csv(REPORT_DIR / f"lobo_{target}_per_ambient.csv")
    print(f"\nReports written to {REPORT_DIR}/")

    if args.save:
        save_final_models(df, features, args.window, args.eol_frac)


if __name__ == "__main__":
    main()
