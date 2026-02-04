import streamlit as st
from utils import preprocess, load_data
import plotly.express as px

df = load_data()
d = preprocess(df)

st.title("Market Overview")

# total won MW by category
agg = d.groupby("Category")["Won Capacity"].sum().reset_index()
fig = px.bar(agg, x="Category", y="Won Capacity", title="Total Won MW by Category")
st.plotly_chart(fig, use_container_width=True)
