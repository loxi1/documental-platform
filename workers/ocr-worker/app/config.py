from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ocr-worker"
    nats_url: str = "nats://localhost:4222"

    ocr_inbox_dir: str = "./storage/inbox"
    ocr_tmp_dir: str = "./storage/tmp"
    ocr_out_dir: str = "./storage/out"

    r2_endpoint_url: str | None = None
    r2_bucket: str | None = None
    r2_access_key_id: str | None = None
    r2_secret_access_key: str | None = None
    r2_region: str = "auto"

    class Config:
        env_file = ".env"


settings = Settings()
