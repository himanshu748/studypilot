from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(Path(__file__).parents[2] / ".env"),
        env_prefix="STUDYPILOT_",
        extra="ignore",
        populate_by_name=True,
    )

    fixture_mode: bool = True
    serve_frontend: bool = False
    agentcore_runtime_arn: str | None = None
    database_path: Path = Path("./data/studypilot.sqlite3")
    aws_region: str = "us-east-1"
    bedrock_model_id: str | None = Field(default=None, validation_alias="BEDROCK_MODEL_ID")
