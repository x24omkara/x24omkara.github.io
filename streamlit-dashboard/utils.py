# utils.py
import pandas as pd
from pathlib import Path

# Root directory of the Streamlit app
BASE_DIR = Path(__file__).resolve().parent

# Path to data file (matches your repo exactly)
DATA_PATH = BASE_DIR / "data" / "Competitor_Utiltiy.csv"

def load_data():
    """
    Load the master competitor dataset.
    Works locally and on Streamlit Cloud.
    """
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"CSV not found at: {DATA_PATH}")

    return pd.read_csv(DATA_PATH)


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    """
    Light preprocessing applied consistently across pages.
    """
    df = df.copy()

    # Standard string cleanup
    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip()

    return df
