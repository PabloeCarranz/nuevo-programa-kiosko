from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BASE_DIR / ".env", extra="ignore")

    db_path: str = "../datos/negocio.db"
    session_secret: str
    receipts_dir: str = "../datos/comprobantes"
    cierres_dir: str = "../datos/cierres"

    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_destinatario: str = ""

    cors_origin: str = "http://localhost:5173"
    # Permite tambien acceder desde otras PCs/celulares en la misma red local
    # (192.168.x.x, 10.x.x.x, 172.16-31.x.x) al puerto del frontend, ademas
    # de localhost. No es un wildcard abierto a internet.
    cors_origin_regex: str = r"^http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}):5173$"

    @property
    def db_path_resolved(self) -> Path:
        path = Path(self.db_path)
        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()
        return path

    @property
    def receipts_dir_resolved(self) -> Path:
        path = Path(self.receipts_dir)
        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()
        return path

    @property
    def cierres_dir_resolved(self) -> Path:
        path = Path(self.cierres_dir)
        if not path.is_absolute():
            path = (BASE_DIR / path).resolve()
        return path


settings = Settings()
