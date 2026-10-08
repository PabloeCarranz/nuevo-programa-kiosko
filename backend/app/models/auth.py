from pydantic import BaseModel


class LoginRequest(BaseModel):
    usuario: str
    password: str


class UsuarioResponse(BaseModel):
    usuario: str
    rol: str


class CambiarPasswordRequest(BaseModel):
    usuario_objetivo: str
    actual: str
    nueva: str
    repetir: str
