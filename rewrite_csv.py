import csv
import random

csv_path = r"c:\Users\Khushi Rathod\OneDrive\Desktop\Projects\iDEA-2.0-1\nexara_test_data.csv"

INDIAN_BANKS = ["Union Bank of India", "SBI", "PNB", "Bank of Baroda", "Canara Bank", "HDFC Bank", "ICICI Bank", "Axis Bank"]
TXN_TYPES = ["RTGS", "NEFT", "IMPS", "NACH"]

id_mapping = {}

def generate_amount_and_type():
    r = random.random()
    if r < 0.40:
        return random.randint(5000000, 9800000), "RTGS"
    elif r < 0.75:
        return random.randint(1000000, 5000000), "NEFT"
    elif r < 0.95:
        return random.randint(100000, 1000000), "IMPS"
    else:
        return random.randint(50000, 100000), "NACH"

def assign_bank(acc_id):
    if acc_id not in id_mapping:
        bank = random.choice(INDIAN_BANKS)
        prefix = ""
        if "Union Bank" in bank: prefix = "UBI"
        elif "SBI" in bank: prefix = "SBI"
        elif "PNB" in bank: prefix = "PNB"
        elif "Baroda" in bank: prefix = "BOB"
        elif "Canara" in bank: prefix = "CAN"
        elif "HDFC" in bank: prefix = "HDF"
        elif "ICICI" in bank: prefix = "ICI"
        elif "Axis" in bank: prefix = "AXS"
        else: prefix = "IND"
        num = f"{random.randint(1000, 9999)}"
        id_mapping[acc_id] = {"new_id": prefix + num, "bank": bank}
    return id_mapping[acc_id]

rows = []
with open(csv_path, 'r', newline='') as f:
    reader = csv.reader(f)
    header = next(reader)
    for row in reader:
        # Timestamp,From Bank,From Account,To Bank,To Account,Amount Received,Receiving Currency,Amount Paid,Payment Currency,Payment Format,Is Laundering
        # 0        1          2            3        4          5               6                  7           8                9              10
        f_acc = row[2]
        t_acc = row[4]
        
        f_map = assign_bank(f_acc)
        t_map = assign_bank(t_acc)
        
        row[1] = f_map['bank']
        row[2] = f_map['new_id']
        row[3] = t_map['bank']
        row[4] = t_map['new_id']
        
        amt, txn_type = generate_amount_and_type()
        row[5] = str(amt)
        row[7] = str(amt)
        row[6] = "INR"
        row[8] = "INR"
        row[9] = txn_type
        
        rows.append(row)

with open(csv_path, 'w', newline='') as f:
    writer = csv.writer(f)
    writer.writerow(header)
    writer.writerows(rows)

print("CSV successfully rewritten.")

