import asyncio
import os
import sys

# Add backend directory to sys.path to allow importing modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from core.database import db

def execute_warming_queries():
    print("Initializing Neo4j cache warmup...")
    if not db.driver:
        print("Error: Neo4j driver not initialized. Please check your credentials.")
        return

    queries = [
        # Warm up index on Account(id)
        """
        MATCH (a:Account) 
        WITH a LIMIT 1000 
        RETURN count(a)
        """,
        
        # Warm up relationships
        """
        MATCH ()-[r:TRANSFERRED_TO]->() 
        WITH r LIMIT 5000
        RETURN count(r)
        """,
        
        # Warm up structural patterns (common for detection algorithms)
        """
        MATCH (a:Account)-[:TRANSFERRED_TO]->(b:Account)-[:TRANSFERRED_TO]->(c:Account)
        WITH a LIMIT 500
        RETURN count(a)
        """,
        
        # Ownership linkages
        """
        MATCH (u)-[:OWNS]->(c:Account) 
        WITH u LIMIT 500
        RETURN count(u)
        """
    ]
    
    with db.driver.session() as session:
        for i, q in enumerate(queries):
            try:
                print(f"Executing warmup query {i+1}/{len(queries)}...")
                session.run(q)
            except Exception as e:
                print(f"Failed to execute warmup query {i+1}: {e}")

    print("Cache warmup completed successfully!")

if __name__ == "__main__":
    execute_warming_queries()
