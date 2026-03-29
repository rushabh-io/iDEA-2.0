import random
import pandas as pd
from faker import Faker
from datetime import datetime, timedelta
from core.database import db
from data.fatf_list import get_fatf_risk


fake = Faker()

def add_synthetic_ownership_layer(accounts_df):
    if accounts_df.empty:
        print("No accounts to process for synthetic ownership layer.")
        return {"persons": 0, "ownerships": 0, "directorships": 0}

    print("Adding synthetic ownership layer...")

    # Step 1: Get unique banks, assign countries
    banks = accounts_df['bank'].unique()
    country_map = {}
    
    # from fatf_list
    HIGH_RISK_COUNTRIES = [
        "Cayman Islands", "British Virgin Islands", "Panama",
        "Seychelles", "Belize", "Vanuatu", "Samoa",
        "Myanmar", "Iran", "North Korea", "Syria", "Yemen"
    ]
    LOW_RISK_COUNTRIES = [
        "United States", "United Kingdom", "Canada", "Australia",
        "Germany", "France", "Japan", "Singapore", "Switzerland"
    ]

    for bank in banks:
        # bias 2:1 toward HIGH_RISK_COUNTRIES
        if random.random() < 0.66:
            country = random.choice(HIGH_RISK_COUNTRIES)
        else:
            country = random.choice(LOW_RISK_COUNTRIES)
        country_map[str(bank)] = {
            "country": country,
            "fatf_risk": get_fatf_risk(country)
        }

    # Update Account nodes with country and risk
    update_query = """
    UNWIND $batch AS row
    MATCH (a:Account {bank: row.bank})
    SET a.country = row.country,
        a.fatf_risk = row.fatf_risk
    """
    
    batch = [{"bank": k, "country": v["country"], "fatf_risk": v["fatf_risk"]}
             for k, v in country_map.items()]
    db.query(update_query, batch=batch)

    # Step 2: Create Person nodes
    person_count = max(10, len(accounts_df) // 20)
    persons = []
    
    for i in range(person_count):
        persons.append({
            'id': f'PER_{i:04d}',
            'name': fake.name(),
            'nationality': random.choice(HIGH_RISK_COUNTRIES + LOW_RISK_COUNTRIES),
            'pep': random.random() < 0.15
        })

    create_person_query = """
    UNWIND $batch AS row
    CREATE (p:Person {
        id: row.id,
        name: row.name,
        nationality: row.nationality,
        pep: row.pep,
        type: 'Person'
    })
    """
    db.query(create_person_query, batch=persons)

    # Step 3 & 4: OWNS and DIRECTOR_OF relationships
    account_ids = accounts_df['account_id'].astype(str).tolist()
    
    ownerships = []
    directorships = []
    
    for person in persons:
        # Each Person owns 2-5 random accounts
        owned_accounts = random.sample(account_ids, random.randint(2, 5))
        for acc_id in owned_accounts:
            days_ago = random.randint(365, 1095) # 1-3 years ago
            since_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
            ownerships.append({
                'person_id': person['id'],
                'account_id': acc_id,
                'percentage': random.choice([51, 60, 75, 100]),
                'since': since_date,
                'direct': True
            })
            
        # Each Person directs 1-3 random accounts
        directed_accounts = random.sample(account_ids, random.randint(1, 3))
        for acc_id in directed_accounts:
            days_ago = random.randint(365, 1095)
            appointed_date = (datetime.now() - timedelta(days=days_ago)).strftime('%Y-%m-%d')
            directorships.append({
                'person_id': person['id'],
                'account_id': acc_id,
                'appointed': appointed_date,
                'role': 'Director'
            })

    create_owns_query = """
    UNWIND $batch AS row
    MATCH (p:Person {id: row.person_id}), (a:Account {id: row.account_id})
    CREATE (p)-[:OWNS {
        percentage: row.percentage,
        since: row.since,
        direct: row.direct
    }]->(a)
    """
    
    # NEW: Create Person-to-Person ownership for layering
    person_layering = []
    # Make some persons own other persons to create deep layering
    for i in range(len(persons) - 1):
        if random.random() < 0.2: # 20% chance of being owned by previous person
            person_layering.append({
                'owner_id': persons[i]['id'],
                'owned_id': persons[i+1]['id']
            })
            
    create_person_owns_query = """
    UNWIND $batch AS row
    MATCH (owner:Person {id: row.owner_id}), (owned:Person {id: row.owned_id})
    CREATE (owner)-[:OWNS { percentage: 100, direct: false }]->(owned)
    """
    if person_layering:
        for i in range(0, len(person_layering), 500):
            db.query(create_person_owns_query, batch=person_layering[i:i+500])
            
    if ownerships:
        for i in range(0, len(ownerships), 500):
            db.query(create_owns_query, batch=ownerships[i:i+500])
        
    create_directs_query = """
    UNWIND $batch AS row
    MATCH (p:Person {id: row.person_id}), (a:Account {id: row.account_id})
    CREATE (p)-[:DIRECTOR_OF {
        appointed: row.appointed,
        role: row.role
    }]->(a)
    """
    if directorships:
        for i in range(0, len(directorships), 500):
            db.query(create_directs_query, batch=directorships[i:i+500])

    print(f"Added {len(persons)} persons, {len(ownerships)} ownership links, {len(directorships)} directorships")
    
    return {
        "persons": len(persons),
        "ownerships": len(ownerships),
        "directorships": len(directorships)
    }

