def calculate_risk_score(cycle_length, total_amount, amounts):
    score = 0
    if total_amount > 500000:
        score += 40
    elif total_amount > 100000:
        score += 20
        
    score += cycle_length * 5
    
    if len(amounts) > 1 and max(amounts) - min(amounts) < 50000:
        score += 15  # structured amounts = smurfing signal
        
    return min(int(score), 100)
