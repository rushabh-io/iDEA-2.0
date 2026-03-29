from core.database import db

res = db.query("MATCH (c:Company) RETURN c LIMIT 1")
print("Company node:", res)

res2 = db.query("MATCH ()-[r:TRANSACTION]->() RETURN elementId(startNode(r)) AS start, elementId(endNode(r)) AS end, labels(startNode(r)) AS start_labels, labels(endNode(r)) AS end_labels LIMIT 1")
print("Transaction edge:", res2)
