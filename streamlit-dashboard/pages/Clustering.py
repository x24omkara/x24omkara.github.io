# import streamlit as st
# import plotly.express as px
# from utils import load_data, preprocess, build_features, do_clustering
import pandas as pd
import numpy as np
import streamlit as st

from utils import load_data, preprocess, build_features, do_clustering


df = preprocess(load_data())
features = build_features(df)
features_clust, best = do_clustering(features)


# st.title("Competitor Clustering")

# df = load_data()
# d = preprocess(df)
# features = build_features(d)

# n = st.slider("Clusters", 2, 8, 3)
# features = do_clustering(features, n_clusters=n)

# fig = px.scatter(features, x="won_mw", y="win_rate",
#                  color="cluster", hover_data=["Group Company"],
#                  title="Competitor Clustering")
# st.plotly_chart(fig, use_container_width=True)


