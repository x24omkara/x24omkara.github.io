import pandas as pd
import numpy as np
import streamlit as st

from utils import load_data, preprocess, build_features, do_clustering

st.title("2×2 Strategy Map")

df = load_data()
d = preprocess(df)
features = build_features(d)

features = do_clustering(features, n_clusters=3)

# define axes
features["Scale"] = features["won_mw"]
features["Aggressiveness"] = -features["win_rate"]

fig = px.scatter(features, x="Aggressiveness", y="Scale",
                 color="cluster", hover_name="Group Company",
                 title="Strategy Map: Aggressiveness vs Scale")
st.plotly_chart(fig, use_container_width=True)

