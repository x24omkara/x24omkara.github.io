import pandas as pd
import numpy as np
import streamlit as st

from utils import load_data, preprocess, build_features, do_clustering

st.title("Market Pulse")

df = load_data()
d = preprocess(df)
d["RFS Date"] = pd.to_datetime(d["RFS Date"], errors="coerce")

agg = d.groupby(d["RFS Date"].dt.to_period("M"))["Won Capacity"].sum().reset_index()
agg["month"] = agg["RFS Date"].dt.to_timestamp()

fig = px.line(agg, x="month", y="Won Capacity", title="Won MW over time")
st.plotly_chart(fig, use_container_width=True)

