# utils.py
import pandas as pd
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "data.csv"

def load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"CSV not found at: {DATA_PATH}")
    return pd.read_csv(DATA_PATH)

def preprocess(df):
    df = df.copy()
    # your cleaning logic
    return df
