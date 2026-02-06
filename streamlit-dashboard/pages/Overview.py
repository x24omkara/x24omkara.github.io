import streamlit as st
import plotly.express as px

from utils import preprocess, load_data

df = load_data()
d = preprocess(df)

st.title("Market Overview")

agg = d.groupby("Category")["Won Capacity"].sum().reset_index()

fig = px.bar(
    agg,
    x="Category",
    y="Won Capacity",
    title="Total Won MW by Category"
)

st.plotly_chart(fig, use_container_width=True)
