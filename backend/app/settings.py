from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # AWS
    aws_access_key_id: str | None = None
    aws_secret_access_key: str | None = None
    aws_default_region: str = "us-east-2"
    aws_account_id: str | None = None

    # IoT Core
    iot_endpoint: str
    iot_topic: str
    
    # SQS
    sqs_queue_url: str
    sqs_poll_interval_seconds: int = Field(default=2, ge=1)
    sqs_max_messages: int = Field(default=10, ge=1, le=10)

    # S3
    s3_bucket_name: str

    # RDS
    database_url: str

    # Redis
    redis_url: str = "redis://redis:6379/0"

    # JWT
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 263520

    # App
    environment: str = "development"
    log_level: str = "INFO"


settings = Settings() # Si sqs_queue_url, database_url, jwt_secret no están en el .env, la app crashea al iniciar (deseable porque sino no funcionaría).