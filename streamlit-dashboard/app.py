import streamlit as st
from utils import load_data, preprocess, build_features, do_clustering
import os
import streamlit as st

st.write("Files in root:", os.listdir("."))
st.write("Files in data/:", os.listdir("data"))
import streamlit as st

from utils import load_data, preprocess, build_features, do_clustering

st.set_page_config(page_title="Utility Competitor Dashboard", layout="wide")

df = load_data()
st.sidebar.title("Filters")
cat_filter = st.sidebar.multiselect("Category", sorted(df["Category"].dropna().unique().tolist()))
auth_filter = st.sidebar.multiselect("Authority", sorted(df["Bidding Authority"].dropna().unique().tolist()))

# apply filters
d = df.copy()
if cat_filter:
    d = d[d["Category"].isin(cat_filter)]
if auth_filter:
    d = d[d["Bidding Authority"].isin(auth_filter)]

st.title("Utility Competitor Analytics")
st.write("Filtered dataset summary:")
st.dataframe(d.head())

# build features + clustering
d_clean = preprocess(d)
features = build_features(d_clean)

n_clusters = st.sidebar.slider("Clusters", 2, 6, 3)
features = do_clustering(features, n_clusters)
