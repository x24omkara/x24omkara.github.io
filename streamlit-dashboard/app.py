import streamlit as st
import pandas as pd
import plotly.express as px

# Page config
st.set_page_config(page_title="My Dashboards", layout="wide")

st.title("📊 My Python Dashboards")

import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_PATH = os.path.join(BASE_DIR, "data.csv")

df = pd.read_csv(DATA_PATH)

# Sidebar dashboard selector
dashboard = st.sidebar.selectbox(
    "Select Dashboard",
    ["Overview", "Trend Analysis"]
)

if dashboard == "Overview":
    st.header("Overview")
    st.metric("Total Records", len(df))
    st.metric("Average Value", round(df["value"].mean(), 2))

elif dashboard == "Trend Analysis":
    st.header("Trend Analysis")
    fig = px.line(df, x="date", y="value", title="Value Over Time")
    st.plotly_chart(fig, use_container_width=True)

