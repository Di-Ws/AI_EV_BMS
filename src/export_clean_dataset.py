"""
Export the cleaned dataset (corrected SOH / RUL labels) for the backend.

Run from the project root (needs src/evaluate_model.py, the v2 version):
    python src/export_clean_dataset.py
    python src/export_clean_dataset.py --eol-frac 0.80

Output: data/processed/cleaned_dataset.csv
  - same column names as merged_battery_dataset.csv, so the backend can read it unchanged
  - soh      : fraction (1.0 = 100%), relative to each battery's own reference capacity
  - rul      : cycles until SOH reaches eol_frac (0 once past it); EMPTY if the battery
               never reached end-of-life (no valid label)
  - extra columns: ref_cap, eol_cycle, eol_reached
"""
import argparse
from pathlib import Path

import pandas as pd
from evaluate_model import DATA_PATH, clean_labels

OUT_PATH = Path("data/processed/cleaned_dataset.csv")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--eol-frac", type=float, default=0.80)
    args = ap.parse_args()

    raw = pd.read_csv(DATA_PATH)
    df, raw_rows = clean_labels(raw, args.eol_frac)

    df["eol_reached"] = df["eol_cycle"].notna()
    df["rul"] = df["rul"].clip(lower=0)          # rows past EOL -> 0; never-EOL stays NaN
    df = df.sort_values(["battery_id", "cycle"]).reset_index(drop=True)

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(OUT_PATH, index=False)

    n_bat = df["battery_id"].nunique()
    n_eol = int(df.groupby("battery_id")["eol_reached"].first().sum())
    print(f"Wrote {OUT_PATH}: {len(df)} rows, {n_bat} batteries "
          f"({n_eol} reached EOL, {n_bat - n_eol} have no RUL label)")
    print(f"SOH range: {df['soh'].min():.3f} to {df['soh'].max():.3f}")
    removed = sorted(set(raw["battery_id"]) - set(df["battery_id"]))
    if removed:
        print(f"Removed batteries (too few valid cycles): {removed}")


if __name__ == "__main__":
    main()
