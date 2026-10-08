from dataclasses import dataclass

from fastapi import Cookie, Depends, HTTPException, status

from app.security import SESSION_COOKIE_NAME, read_session_token


@dataclass
class CurrentUser:
    usuario: str
    rol: str  # "master" | "caja"

    @property
    def es_master(self) -> bool:
        return self.rol == "master"


def get_current_user(session: str | None = Cookie(default=None, alias=SESSION_COOKIE_NAME)) -> CurrentUser:
    if session is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "No hay sesion activa")
    data = read_session_token(session)
    if data is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sesion invalida o expirada")
    return CurrentUser(usuario=data["usuario"], rol=data["rol"])


def require_master(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
    if not user.es_master:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Accion restringida a Master")
    return user
