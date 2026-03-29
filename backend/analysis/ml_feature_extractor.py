"""
In-Memory ML Feature Extractor

Computes the same 27 features that the trained Random Forest expects,
but from a standardized pandas DataFrame instead of Neo4j.

The standardized DataFrame has canonical columns:
  Timestamp, From Bank, Account, To Bank, Account.1,
  Amount Received, Receiving Currency, Amount Paid,
  Payment Currency, Payment Format, Is Laundering
"""
import pandas as pd
import numpy as np


def extract_features_from_dataframe(std_df: pd.DataFrame) -> pd.DataFrame:
    """
    Given a standardized transaction DataFrame, compute per-account
    features matching the FEATURE_COLS used by trainer.py.
    """
    # Rename to internal shorthand for clarity
    df = std_df.copy()
    df = df.rename(columns={
        "Account": "from_acc",
        "Account.1": "to_acc",
        "Amount Paid": "amount",
        "Timestamp": "timestamp",
        "Is Laundering": "is_laundering",
    })

    # Ensure numeric
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0)

    # ---- Outgoing stats per account ----
    out_stats = df.groupby("from_acc").agg(
        out_degree=("to_acc", "count"),
        total_sent=("amount", "sum"),
        avg_sent=("amount", "mean"),
        max_sent=("amount", "max"),
        min_sent=("amount", "min"),
        std_sent=("amount", "std"),
        dist_out=("to_acc", "nunique"),
    ).reset_index().rename(columns={"from_acc": "account_id"})

    # Near-threshold count (transactions between 8500 and 10000)
    near_thresh = df[(df["amount"] >= 8500) & (df["amount"] < 10000)]
    near_thresh_counts = near_thresh.groupby("from_acc").size().reset_index(name="near_threshold_count")
    near_thresh_counts = near_thresh_counts.rename(columns={"from_acc": "account_id"})
    out_stats = out_stats.merge(near_thresh_counts, on="account_id", how="left")
    out_stats["near_threshold_count"] = out_stats["near_threshold_count"].fillna(0).astype(int)

    # ---- Incoming stats per account ----
    in_stats = df.groupby("to_acc").agg(
        in_degree=("from_acc", "count"),
        total_received=("amount", "sum"),
        avg_received=("amount", "mean"),
        dist_in=("from_acc", "nunique"),
    ).reset_index().rename(columns={"to_acc": "account_id"})

    # ---- Merge ----
    all_accounts = set(df["from_acc"].unique()) | set(df["to_acc"].unique())
    features = pd.DataFrame({"account_id": list(all_accounts)})
    features = features.merge(out_stats, on="account_id", how="left")
    features = features.merge(in_stats, on="account_id", how="left")

    # Fill NaN for accounts that only appear on one side
    fill_zero_cols = [
        "out_degree", "in_degree", "total_sent", "total_received",
        "avg_sent", "avg_received", "max_sent", "min_sent", "std_sent",
        "near_threshold_count", "dist_out", "dist_in"
    ]
    for col in fill_zero_cols:
        if col in features.columns:
            features[col] = features[col].fillna(0)

    # ---- Derived features ----
    features["degree_ratio"] = features["out_degree"] / (features["in_degree"] + 1)
    features["amount_ratio"] = features["total_sent"] / (features["total_received"] + 1)
    features["is_hub"] = ((features["out_degree"] >= 5) & (features["in_degree"] >= 5)).astype(int)
    features["near_threshold_flag"] = (features["near_threshold_count"] >= 3).astype(int)
    features["high_std"] = (features["std_sent"] > features["avg_sent"]).astype(int)

    # ---- Pattern detection (heuristic approximation) ----
    # Since we don't have Neo4j graph algorithms, approximate patterns
    # from transaction structure

    # Fan-out: account sends to many distinct recipients
    features["has_fan_out"] = (features["dist_out"] >= 5).astype(int)
    # Fan-in: account receives from many distinct senders
    features["has_fan_in"] = (features["dist_in"] >= 5).astype(int)

    # Cycle detection: check if A -> B -> A exists
    cycle_pairs = df.merge(df, left_on=["from_acc", "to_acc"], right_on=["to_acc", "from_acc"], suffixes=("", "_rev"))
    cycle_accounts = set(cycle_pairs["from_acc"].unique())
    features["has_cycle"] = features["account_id"].isin(cycle_accounts).astype(int)

    # Gather-scatter: high in_degree AND high out_degree
    features["has_gather_scatter"] = ((features["in_degree"] >= 4) & (features["out_degree"] >= 4)).astype(int)
    # Scatter-gather: same pattern from a different perspective
    features["has_scatter_gather"] = features["has_gather_scatter"]

    # Stack: sequential layering (approximated by long chain existence)
    features["has_stack"] = ((features["out_degree"] >= 3) & (features["dist_out"] <= 2)).astype(int)

    # Bipartite: two groups only transact with each other
    features["has_bipartite"] = 0  # Hard to detect without full graph; default 0

    # Random: no clear pattern
    features["has_random"] = ((features["out_degree"] >= 2) & (features["has_fan_out"] == 0) & (features["has_cycle"] == 0)).astype(int)

    # Pattern count
    pattern_cols = ["has_fan_out", "has_fan_in", "has_cycle", "has_gather_scatter",
                    "has_scatter_gather", "has_stack", "has_bipartite", "has_random"]
    features["pattern_count"] = features[pattern_cols].sum(axis=1)

    # Risk score (rule-based approximation)
    features["risk_score"] = (
        features["near_threshold_flag"] * 20 +
        features["has_cycle"] * 25 +
        features["has_fan_out"] * 10 +
        features["has_fan_in"] * 10 +
        features["high_std"] * 5 +
        (features["amount_ratio"] > 5).astype(int) * 15
    ).clip(0, 100)

    features["suspicious"] = (features["risk_score"] >= 40).astype(int)

    # ---- Ground truth labels (if available) ----
    if "is_laundering" in df.columns:
        fraud_by_acc = df.groupby("from_acc")["is_laundering"].max().reset_index()
        fraud_by_acc = fraud_by_acc.rename(columns={"from_acc": "account_id", "is_laundering": "ground_truth"})
        features = features.merge(fraud_by_acc, on="account_id", how="left")
        features["ground_truth"] = features["ground_truth"].fillna(0).astype(int)

    return features
