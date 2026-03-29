import pandas as pd
from datetime import datetime


def load_and_sample(csv_path, sample_size=50000):
    try:
        df = pd.read_csv(csv_path)
    except FileNotFoundError:
        print(f"Error: Could not find dataset at {csv_path}")
        return pd.DataFrame()

    # Rename columns to match expected schema
    df.columns = [
        "timestamp", "from_bank", "from_account", "to_bank", "to_account",
        "amount_received", "receiving_currency", "amount_paid",
        "payment_currency", "payment_format", "is_laundering"
    ]

    # Parse Timestamp to datetime
    df['parsed_date'] = pd.to_datetime(df['timestamp'])
    
    # Extract date as YYYY-MM-DD string
    df['date_string'] = df['parsed_date'].dt.strftime('%Y-%m-%d')
    
    # Extract hour as integer
    df['hour_int'] = df['parsed_date'].dt.hour

    # Keep ALL rows where is_laundering == 1
    fraud_df = df[df['is_laundering'] == 1]
    
    # Sample exactly sample_size clean rows
    clean_df = df[df['is_laundering'] == 0]
    if len(clean_df) > sample_size:
        clean_df = clean_df.sample(n=sample_size, random_state=42)
        
    # Concatenate, reset index, return dataframe
    final_df = pd.concat([fraud_df, clean_df]).reset_index(drop=True)
    
    # Print: fraud count, clean count, total, fraud ratio
    fraud_count = len(fraud_df)
    clean_count = len(clean_df)
    total = len(final_df)
    ratio = (fraud_count / total * 100) if total > 0 else 0
    
    print(f"Loaded dataset: {fraud_count} fraud | {clean_count} clean | {total} total ({ratio:.2f}% fraud)")
    return final_df


def extract_accounts(df):
    if df.empty:
        return pd.DataFrame()
        
    # Get unique accounts from from_account + to_account
    from_accounts = pd.DataFrame({
        'account_id': df['from_account'],
        'bank': df['from_bank']
    })
    to_accounts = pd.DataFrame({
        'account_id': df['to_account'],
        'bank': df['to_bank']
    })
    
    accounts_df = pd.concat([from_accounts, to_accounts]).drop_duplicates(subset=['account_id'])
    
    # Mark is_suspicious = True if account appears in ANY laundering transaction as sender OR receiver
    laundering_txns = df[df['is_laundering'] == 1]
    suspicious_accounts = set(laundering_txns['from_account']).union(set(laundering_txns['to_account']))
    
    accounts_df['is_suspicious'] = accounts_df['account_id'].isin(suspicious_accounts)
    
    return accounts_df
