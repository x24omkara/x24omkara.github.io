import streamlit as st
import pandas as pd
import numpy as np

from utils import load_data, preprocess, build_features, do_clustering

st.title("Competitor Clustering")

df = load_data()
d = preprocess(df)
features = build_features(d)

features_clust, best = do_clustering(features)

st.write(f"Optimal clusters: {best['k']}")
st.dataframe(features_clust)
