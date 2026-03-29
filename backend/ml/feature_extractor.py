import pandas as pd
from core.database import db


def extract_features() -> pd.DataFrame:
    print("Extracting ML features from Neo4j...")
    
    # Query fetches all required features per account
    query = """
    MATCH (a:Account)
    
    // Outgoing stats
    OPTIONAL MATCH (a)-[out:TRANSACTION]->(toAcc)
    WITH a, count(out) AS out_degree, 
         sum(out.amount) AS total_sent, 
         avg(out.amount) AS avg_sent,
         max(out.amount) AS max_sent,
         min(out.amount) AS min_sent,
         stDev(out.amount) AS std_sent,
         count(CASE WHEN out.amount >= 8500 AND out.amount < 10000 THEN 1 END) AS near_threshold_count,
         count(DISTINCT toAcc) AS dist_out
         
    // Incoming stats
    OPTIONAL MATCH (fromAcc)-[in:TRANSACTION]->(a)
    WITH a, out_degree, total_sent, avg_sent, max_sent, min_sent, std_sent, near_threshold_count, dist_out,
         count(in) AS in_degree,
         sum(in.amount) AS total_received,
         avg(in.amount) AS avg_received,
         count(DISTINCT fromAcc) AS dist_in
         
    RETURN a.id AS account_id,
           COALESCE(out_degree, 0) AS out_degree,
           COALESCE(in_degree, 0) AS in_degree,
           COALESCE(total_sent, 0) AS total_sent,
           COALESCE(total_received, 0) AS total_received,
           COALESCE(avg_sent, 0) AS avg_sent,
           COALESCE(avg_received, 0) AS avg_received,
           COALESCE(max_sent, 0) AS max_sent,
           COALESCE(min_sent, 0) AS min_sent,
           COALESCE(std_sent, 0) AS std_sent,
           COALESCE(near_threshold_count, 0) AS near_threshold_count,
           COALESCE(dist_out, 0) AS dist_out,
           COALESCE(dist_in, 0) AS dist_in,
           COALESCE(a.pattern_count, 0) AS pattern_count,
           CASE WHEN 'FAN-OUT' IN a.patterns THEN 1 ELSE 0 END AS has_fan_out,
           CASE WHEN 'FAN-IN' IN a.patterns THEN 1 ELSE 0 END AS has_fan_in,
           CASE WHEN 'CYCLE' IN a.patterns THEN 1 ELSE 0 END AS has_cycle,
           CASE WHEN 'GATHER-SCATTER' IN a.patterns THEN 1 ELSE 0 END AS has_gather_scatter,
           CASE WHEN 'SCATTER-GATHER' IN a.patterns THEN 1 ELSE 0 END AS has_scatter_gather,
           CASE WHEN 'STACK' IN a.patterns THEN 1 ELSE 0 END AS has_stack,
           CASE WHEN 'BIPARTITE' IN a.patterns THEN 1 ELSE 0 END AS has_bipartite,
           CASE WHEN 'RANDOM' IN a.patterns THEN 1 ELSE 0 END AS has_random,
           COALESCE(a.risk_score, 0) AS risk_score,
           COALESCE(a.suspicious, false) AS suspicious
    """
    
    results = db.query(query)
    df = pd.DataFrame(results)
    
    if df.empty:
        print("No accounts found for feature extraction.")
        return df
        
    # Compute derived features
    df['degree_ratio'] = df['out_degree'] / (df['in_degree'] + 1)
    df['amount_ratio'] = df['total_sent'] / (df['total_received'] + 1)
    
    df['is_hub'] = ((df['out_degree'] >= 5) & (df['in_degree'] >= 5)).astype(int)
    df['near_threshold_flag'] = (df['near_threshold_count'] >= 3).astype(int)
    
    # Fill NaN for std_sent where there's < 2 transactions
    df['std_sent'] = df['std_sent'].fillna(0)
    df['avg_sent'] = df['avg_sent'].fillna(0)
    
    df['high_std'] = (df['std_sent'] > df['avg_sent']).astype(int)
    
    return df
