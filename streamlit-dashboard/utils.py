# utils.py
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans

# --------------------
# Paths
# --------------------
BASE_DIR = Path(__file__).resolve().parent
DATA_PATH = BASE_DIR / "data" / "Competitor_Utiltiy.csv"

# --------------------
# Data loading
# --------------------
def load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"CSV not found at: {DATA_PATH}")
    return pd.read_csv(DATA_PATH)

def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()

    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype(str).str.strip()

    return df

# --------------------
# Feature engineering
# --------------------
def build_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Minimal example – adjust columns as needed.
    """
    d = df.copy()

    d["Won Capacity"] = pd.to_numeric(d["Won Capacity"], errors="coerce").fillna(0)
    d["Final Tariff"] = pd.to_numeric(d["Final Tariff"], errors="coerce")

    feats = (
        d.groupby("Group Company")
         .agg(
            total_won_mw=("Won Capacity", "sum"),
            avg_tariff=("Final Tariff", "mean")
         )
         .fillna(0)
    )

    return feats

# --------------------
# Clustering
# --------------------
def do_clustering(features: pd.DataFrame, k: int = 4):
    scaler = StandardScaler()
    X = scaler.fit_transform(features)

    model = KMeans(n_clusters=k, random_state=42, n_init="auto")
    labels = model.fit_predict(X)

    features_clust = features.copy()
    features_clust["cluster"] = labels

    return features_clust, model
