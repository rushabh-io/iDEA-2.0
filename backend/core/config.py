from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    NEO4J_URI: str
    NEO4J_USER: str
    NEO4J_PASSWORD: str
    GROQ_API_KEY: str
    ANTHROPIC_API_KEY: str = ""
    IBM_CSV_PATH: str = "data/aml_sample.csv"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
