"""
Data preparation and cleaning scripts for NASA Li-ion battery health datasets (.mat format).
"""
import os
import glob
import pandas as pd
import numpy as np
import scipy.io


def parse_mat_file(filepath: str) -> pd.DataFrame:
    """
    Parses a NASA battery MATLAB (.mat) file and extracts cycle-level discharge summary metrics:
    - battery_id, cycle index
    - capacity (Ah)
    - voltage metrics (avg, max, min)
    - current metrics (avg, max)
    - temperature metrics (avg, max, ambient)
    - discharge_duration (sec)
    - calculated State of Health (SOH) and Remaining Useful Life (RUL)
    """
    bname = os.path.basename(filepath).replace('.mat', '')
    mat = scipy.io.loadmat(filepath)

    if bname not in mat:
        print(f"Warning: Key '{bname}' not found in {filepath}. Skipping.")
        return pd.DataFrame()

    cycles = mat[bname][0, 0]['cycle'][0]
    records = []
    dis_idx = 0

    for c in cycles:
        c_type = c['type'][0]
        if c_type != 'discharge':
            continue

        dis_idx += 1
        data = c['data'][0, 0]

        amb_temp = float(c['ambient_temperature'][0, 0]) if 'ambient_temperature' in c.dtype.names else np.nan
        cap = float(data['Capacity'][0, 0]) if 'Capacity' in data.dtype.names and data['Capacity'].size > 0 else np.nan

        v_meas = data['Voltage_measured'][0] if 'Voltage_measured' in data.dtype.names else np.array([])
        i_meas = data['Current_measured'][0] if 'Current_measured' in data.dtype.names else np.array([])
        t_meas = data['Temperature_measured'][0] if 'Temperature_measured' in data.dtype.names else np.array([])
        t_time = data['Time'][0] if 'Time' in data.dtype.names else np.array([])

        v_avg = float(np.mean(v_meas)) if len(v_meas) > 0 else np.nan
        v_max = float(np.max(v_meas)) if len(v_meas) > 0 else np.nan
        v_min = float(np.min(v_meas)) if len(v_meas) > 0 else np.nan

        i_avg = float(np.mean(i_meas)) if len(i_meas) > 0 else np.nan
        i_max = float(np.max(np.abs(i_meas))) if len(i_meas) > 0 else np.nan

        t_avg = float(np.mean(t_meas)) if len(t_meas) > 0 else np.nan
        t_max = float(np.max(t_meas)) if len(t_meas) > 0 else np.nan

        dur = float(t_time[-1] - t_time[0]) if len(t_time) > 1 else np.nan

        records.append({
            'battery_id': bname,
            'cycle': dis_idx,
            'capacity': cap,
            'avg_voltage': v_avg,
            'max_voltage': v_max,
            'min_voltage': v_min,
            'avg_current': i_avg,
            'max_current': i_max,
            'avg_temp': t_avg,
            'max_temp': t_max,
            'ambient_temp': amb_temp,
            'discharge_duration': dur
        })

    df = pd.DataFrame(records)

    if not df.empty and 'capacity' in df.columns:
        initial_cap = df['capacity'].dropna().iloc[0] if not df['capacity'].dropna().empty else 2.0
        df['soh'] = df['capacity'] / initial_cap if initial_cap > 0 else np.nan
        df['rul'] = len(df) - df['cycle']

    return df


def process_all_raw_mat_files(raw_dir: str = "data/raw", processed_dir: str = "data/processed") -> pd.DataFrame:
    """
    Batch processes all raw MATLAB .mat files in raw_dir, saves individual battery CSVs
    and exports a combined master CSV 'nasa_battery_summary.csv' in processed_dir.
    """
    os.makedirs(processed_dir, exist_ok=True)
    mat_files = sorted(glob.glob(os.path.join(raw_dir, "*.mat")))

    if not mat_files:
        print(f"No .mat files found in '{raw_dir}'.")
        return pd.DataFrame()

    all_dfs = []
    print(f"Processing {len(mat_files)} MATLAB dataset files from '{raw_dir}'...")

    for filepath in mat_files:
        bname = os.path.basename(filepath).replace('.mat', '')
        df = parse_mat_file(filepath)

        if not df.empty:
            out_file = os.path.join(processed_dir, f"{bname}_summary.csv")
            df.to_csv(out_file, index=False)
            all_dfs.append(df)
            print(f" -> Exported {bname}_summary.csv ({len(df)} rows)")

    if all_dfs:
        master_df = pd.concat(all_dfs, ignore_index=True)
        master_file = os.path.join(processed_dir, "nasa_battery_summary.csv")
        master_df.to_csv(master_file, index=False)
        print(f"\nSuccessfully generated master dataset: '{master_file}' with {len(master_df)} rows.")
        return master_df

    return pd.DataFrame()


def clean_battery_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean raw battery metrics data and prepare features."""
    cleaned_df = df.dropna().copy()
    return cleaned_df


if __name__ == "__main__":
    process_all_raw_mat_files()

