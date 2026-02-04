import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score

def load_data(path="data/Competitor_Utiltiy.csv"):
    df = pd.read_csv(path)
    df.columns = df.columns.str.strip()
    return df

def preprocess(df):
    d = df.copy()
    d["Group Company"] = d["Group Company"].astype(str).str.strip()
    d["Category"] = d["Category"].astype(str).str.strip()
    d["Won Capacity"] = pd.to_numeric(d["Won Capacity"], errors="coerce").fillna(0)
    d["Final Tariff"] = pd.to_numeric(d["Final Tariff"], errors="coerce")
    d["Tender Capacity"] = pd.to_numeric(d["Tender Capacity"], errors="coerce")
    d["Won Flag"] = (d["Won Capacity"] > 0)
    return d

def build_features(d):
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


