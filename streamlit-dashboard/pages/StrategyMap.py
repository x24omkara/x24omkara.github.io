import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px

from utils import load_data, preprocess, build_features, do_clustering

st.title("2×2 Strategy Map")

df = load_data()
d = preprocess(df)
features = build_features(d)

features_clust, best = do_clustering(features)

# Define axes
features_clust["Scale"] = features_clust["won_mw"]
features_clust["Aggressiveness"] = -features_clust["win_rate_tenders"]

fig = px.scatter(
    features_clust,
    x="Aggressiveness",
    y="Scale",
    color="cluster",
    hover_name="Group Company",
    title="Strategy Map: Aggressiveness vs Scale"
)

st.plotly_chart(fig, use_container_width=True)
