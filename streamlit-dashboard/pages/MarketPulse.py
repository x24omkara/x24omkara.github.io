import pandas as pd
import numpy as np
import streamlit as st
import plotly.express as px

from utils import load_data, preprocess

st.title("Market Pulse")

df = load_data()
d = preprocess(df)

# Defensive column handling
d.columns = d.columns.str.strip()

if "RFS Date" not in d.columns:
    st.error("Column 'RFS Date' not found in dataset")
    st.stop()

d["RFS Date"] = pd.to_datetime(d["RFS Date"], errors="coerce")

agg = (
    d.dropna(subset=["RFS Date"])
     .groupby(d["RFS Date"].dt.to_period("M"))["Won Capacity"]
     .sum()
     .reset_index()
)

agg["month"] = agg["RFS Date"].dt.to_timestamp()

fig = px.line(
    agg,
    x="month",
    y="Won Capacity",
    title="Won MW over time"
)

st.plotly_chart(fig, use_container_width=True)
