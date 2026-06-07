from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    SECRET_KEY: str = "CHANGE_ME_SUPER_SECRET"
    DATABASE_URL: str = "postgresql://localhost:5432/floralmatch"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALLOWED_ORIGINS: str = "http://localhost:3000"

    YANDEX_API_KEY: str = ""
    YANDEX_FOLDER_ID: str = ""
    YANDEX_GPT_MODEL: str = "yandexgpt-lite/latest"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
