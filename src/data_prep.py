"""
Data preparation and cleaning scripts for NASA Li-ion battery health datasets.
"""
import pandas as pd
import numpy as np


def clean_battery_data(df: pd.DataFrame) -> pd.DataFrame:
    """Clean raw battery metrics data and prepare features."""
    cleaned_df = df.dropna().copy()
    return cleaned_df
