import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Response, status

from app.db import get_db
from app.deps import CurrentUser, get_current_user, require_master
from app.models.auth import CambiarPasswordRequest, LoginRequest, UsuarioResponse
from app.security import SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, create_session_token
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/usuarios")
def usuarios(conn: sqlite3.Connection = Depends(get_db)) -> list[str]:
    return auth_service.listar_usuarios(conn)


@router.post("/login", response_model=UsuarioResponse)
def login(body: LoginRequest, response: Response, conn: sqlite3.Connection = Depends(get_db)):
    if not auth_service.verificar_credenciales(conn, body.usuario, body.password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario o contrasena incorrectos")
    rol = auth_service.rol_de(body.usuario)
    token = create_session_token(body.usuario, rol)
    response.set_cookie(
        SESSION_COOKIE_NAME,
        token,
        max_age=SESSION_MAX_AGE_SECONDS,
        httponly=True,
        samesite="lax",
    )
    return UsuarioResponse(usuario=body.usuario, rol=rol)


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(SESSION_COOKIE_NAME)
    return {"ok": True}


@router.get("/me", response_model=UsuarioResponse)
def me(user: CurrentUser = Depends(get_current_user)):
    return UsuarioResponse(usuario=user.usuario, rol=user.rol)


@router.post("/cambiar-password")
def cambiar_password(
    body: CambiarPasswordRequest,
    _: CurrentUser = Depends(require_master),
    conn: sqlite3.Connection = Depends(get_db),
):
    if body.nueva != body.repetir:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La nueva contrasena y su repeticion no coinciden")
    ok = auth_service.cambiar_password(conn, body.usuario_objetivo, body.actual, body.nueva)
    if not ok:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "La contrasena actual no es correcta")
    return {"ok": True}
