import os

def parse_patterns(file_path):
    print(f"Parsing patterns from {file_path}...")
    account_patterns = {} # account_id -> set of pattern types
    
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found.")
        return account_patterns
        
    current_pattern = None
    
    with open(file_path, 'r') as f:
        for line in f:
            line = line.strip()
            if line.startswith("BEGIN LAUNDERING ATTEMPT -"):
                # Extract pattern type e.g., "FAN-OUT" from "BEGIN LAUNDERING ATTEMPT - FAN-OUT:"
                try:
                    # E.g., "BEGIN LAUNDERING ATTEMPT - FAN-OUT:  Max 16-degree Fan-Out"
                    current_pattern = line.split("- ")[1].split(":")[0].strip()
                except IndexError:
                    current_pattern = "UNKNOWN"
            elif line.startswith("END LAUNDERING ATTEMPT"):
                current_pattern = None
            elif line and not line.startswith("Timestamp") and current_pattern:
                parts = line.split(',')
                if len(parts) >= 5:
                    from_account = parts[2].strip()
                    to_account = parts[4].strip()
                    
                    if from_account not in account_patterns:
                        account_patterns[from_account] = set()
                    account_patterns[from_account].add(current_pattern)
                    
                    if to_account not in account_patterns:
                        account_patterns[to_account] = set()
                    account_patterns[to_account].add(current_pattern)
                    
    parsed_result = {acc: list(patterns) for acc, patterns in account_patterns.items()}
    print(f"Found {len(parsed_result)} distinct accounts involved in patterns.")
    return parsed_result
