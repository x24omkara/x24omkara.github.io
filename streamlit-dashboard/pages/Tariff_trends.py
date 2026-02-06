import streamlit as st
import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from utils import load_data, preprocess

st.set_page_config(layout="wide")
st.title("Tariff Distribution Over Time")

df = preprocess(load_data())

df["Final Tariff"] = pd.to_numeric(df["Final Tariff"], errors="coerce")
df["Won Capacity"] = pd.to_numeric(df["Won Capacity"], errors="coerce").fillna(0)
df["RFS Date"] = pd.to_datetime(df["RFS Date"], errors="coerce", dayfirst=True)

df = df[(df["Won Capacity"] > 0) & df["Final Tariff"].notna() & df["RFS Date"].notna()]
df["Month"] = df["RFS Date"].dt.to_period("M").dt.to_timestamp()

cats = sorted(df["Category"].dropna().unique())
category = st.selectbox("Category", ["All"] + cats)

d = df if category == "All" else df[df["Category"] == category]

g = (
    d.groupby("Month")["Final Tariff"]
     .agg(
        p25=lambda x: x.quantile(0.25),
        median="median",
        p75=lambda x: x.quantile(0.75),
        n="count"
     )
     .reset_index()
)

g = g[g["n"] >= 3]

fig, ax = plt.subplots(figsize=(10, 5))
ax.plot(g["Month"], g["p25"], label="p25")
ax.plot(g["Month"], g["median"], label="Median")
ax.plot(g["Month"], g["p75"], label="p75")

ax.set_ylabel("Tariff")
ax.set_xlabel("Month")
ax.legend()

st.pyplot(fig)
