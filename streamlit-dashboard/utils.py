import pandas as pd
import numpy as np
import os

from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score


# -----------------------------
# 1. Load data (Cloud-safe)
# -----------------------------
def load_data():
    path = os.path.join("data", "Competitor_Utiltiy.csv")

    if not os.path.exists(path):
        raise FileNotFoundError(f"CSV not found at: {path}")

    df = pd.read_csv(path)

    # standardize columns
    df.columns = df.columns.astype(str).str.strip()

    return df


# -----------------------------
# 2. Preprocessing / cleaning
# -----------------------------
def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    d = df.copy()

    d["Group Company"] = d["Group Company"].astype(str).str.strip()
    d["Category"] = d["Category"].astype(str).str.strip()

    d["Won Capacity"] = pd.to_numeric(d["Won Capacity"], errors="coerce").fillna(0)
    d["Final Tariff"] = pd.to_numeric(d["Final Tariff"], errors="coerce")

    return d


# -----------------------------
# 3. Feature engineering
# -----------------------------
def build_features(d: pd.DataFrame) -> pd.DataFrame:
    g = d.groupby("Group Company", dropna=False)

    features = g.agg(
        won_mw=("Won Capacity", "sum"),
        n_tenders=("Won Capacity", "count"),
        wavg_final_tariff=("Final Tariff",
                           lambda x: np.average(x.dropna(),
                                                 weights=d.loc[x.index, "Won Capacity"]
                                                 .loc[x.notna()]
                                                 .clip(lower=1))),
        n_categories=("Category", "nunique"),
    ).reset_index()

    # win-rate proxy (relative scale participation)
    features["win_rate_tenders"] = features["n_tenders"] / features["n_tenders"].max()

    return features


# -----------------------------
# 4. Strategy clustering
# -----------------------------
def do_clustering(features: pd.DataFrame, k_min=2, k_max=6):
    use_cols = [
        "won_mw",
        "win_rate_tenders",
        "wavg_final_tariff",
        "n_categories",
    ]
    use_cols = [c for c in use_cols if c in features.columns]

    X = (features
         .set_index("Group Company")[use_cols]
         .replace([np.inf, -np.inf], np.nan)
         .dropna())

    scaler = StandardScaler()
    Xs = scaler.fit_transform(X)

    best = {"k": None, "score": -1, "model": None}

    for k in range(k_min, k_max + 1):
        km = KMeans(n_clusters=k, random_state=42, n_init=20)
        labels = km.fit_predict(Xs)
        score = silhouette_score(Xs, labels)
        if score > best["score"]:
            best = {"k": k, "score": score, "model": km}

    clusters = pd.Series(
        best["model"].predict(Xs),
        index=X.index,
        name="cluster"
    )

    features_clust = (features
                      .set_index("Group Company")
                      .join(clusters, how="inner")
                      .reset_index())

    return features_clust, best
