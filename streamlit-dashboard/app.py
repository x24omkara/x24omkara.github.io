import streamlit as st
import os

from utils import load_data, preprocess, build_features, do_clustering

st.set_page_config(page_title="Utility Competitor Dashboard", layout="wide")

# --- Debug (optional, remove later) ---
# st.write("Files in root:", os.listdir("."))
# st.write("Files in data/:", os.listdir("data"))

# --- Load data ---
df = load_data()

st.sidebar.title("Filters")
cat_filter = st.sidebar.multiselect(
    "Category", sorted(df["Category"].dropna().unique().tolist())
)
auth_filter = st.sidebar.multiselect(
    "Authority", sorted(df["Bidding Authority"].dropna().unique().tolist())
)

# Apply filters
d = df.copy()
if cat_filter:
    d = d[d["Category"].isin(cat_filter)]
if auth_filter:
    d = d[d["Bidding Authority"].isin(auth_filter)]

st.title("Utility Competitor Analytics")
st.write("Filtered dataset preview")
st.dataframe(d.head())

# --- Feature engineering + clustering ---
d_clean = preprocess(d)
features = build_features(d_clean)

features_clust, best = do_clustering(features)

st.subheader("Clustering summary")
st.write(f"Optimal clusters: {best['k']}")
st.dataframe(features_clust)
