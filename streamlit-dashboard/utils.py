import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

import pandas as pd
import os

def load_data():
    path = os.path.join("data", "Competitor_Utiltiy.csv")  # 👈 exact filename

    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV not found at: {path}")

    df = pd.read_csv(path)

    # ---- basic cleaning ----
    df.columns = df.columns.astype(str).str.strip()
    df["Group Company"] = df["Group Company"].astype(str).str.strip()
    df["Category"] = df["Category"].astype(str).str.strip()

    df["Won Capacity"] = pd.to_numeric(df["Won Capacity"], errors="coerce").fillna(0)
    df["Final Tariff"] = pd.to_numeric(df["Final Tariff"], errors="coerce")

    return df


def build_features(df):
    feat = (d.groupby("Group Company")["Won Capacity"]
            .agg(["sum","count"])
            .rename(columns={"sum":"won_mw","count":"bids"})
            .reset_index())
    feat["win_rate"] = feat["won_mw"] / feat["bids"].replace({0:np.nan})
    return feat

def do_clustering(features, n_clusters=3):
    X = features[["won_mw","win_rate"]].fillna(0)
    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    features["cluster"] = km.fit_predict(Xs)
    return features



