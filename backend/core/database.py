from neo4j import GraphDatabase
from .config import settings


class Neo4jDB:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.NEO4J_URI,
            auth=(settings.NEO4J_USER, settings.NEO4J_PASSWORD)
        )

    def query(self, cypher, **params):
        with self.driver.session() as session:
            result = session.run(cypher, **params)
            return [dict(r) for r in result]

    def close(self):
        self.driver.close()


db = Neo4jDB()
