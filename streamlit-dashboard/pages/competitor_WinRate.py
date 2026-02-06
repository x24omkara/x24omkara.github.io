import streamlit as st
import pandas as pd
import plotly.express as px
from utils import load_data, preprocess

st.set_page_config(layout="wide")
st.title("Competitor Win Rate vs Capacity")

df = preprocess(load_data())

d = df.copy()
d["Won Capacity"] = pd.to_numeric(d["Won Capacity"], errors="coerce").fillna(0)
d["Final Tariff"] = pd.to_numeric(d["Final Tariff"], errors="coerce")
d["Group Company"] = d["Group Company"].astype(str).str.strip()

d["won_flag"] = d["Won Capacity"] > 0

agg = (
    d.groupby("Group Company", dropna=False)
     .agg(
        won_mw=("Won Capacity", "sum"),
        bids=("Group Company", "size"),
        wins=("won_flag", "sum")
     )
     .reset_index()
)

agg["win_rate"] = agg["wins"] / agg["bids"]
top = agg.sort_values("won_mw", ascending=False).head(15)

fig = px.scatter(
    top,
    x="win_rate",
    y="won_mw",
    size="bids",
    hover_name="Group Company",
    labels={
        "win_rate": "Win rate",
        "won_mw": "Total Won MW",
        "bids": "# Participations"
    }
)

st.plotly_chart(fig, use_container_width=True)
