"""Formato de los codigos de activacion.

Lo comparten el programa (que solo VERIFICA, con la clave publica) y los
scripts del vendedor (que FIRMAN, con la clave privada que nunca se entrega).
No importa nada del resto de la app para poder usarse desde scripts/.
"""

import base64

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

# Se completa con scripts/generar_claves_licencia.py. Con la clave publica solo
# se pueden verificar codigos, no fabricarlos.
CLAVE_PUBLICA_HEX = "492713fd715409ec36371a2dd2f7cdb7cba854015cbedc3246cc081185944799"

_PREFIJO = b"CAJA-NEON-LIC-v1"
_LARGO_FIRMA = 64


def normalizar(texto: str) -> str:
    """Deja solo letras y numeros en mayusculas (sirve para el ID y para el codigo)."""
    return "".join(c for c in texto.upper() if c.isalnum())


def mensaje_a_firmar(id_equipo: str) -> bytes:
    return b"|".join([_PREFIJO, normalizar(id_equipo).encode(), b"PERPETUA"])


def formatear_codigo(firma: bytes) -> str:
    """Firma binaria -> texto en grupos de 6 letras/numeros separados por guiones."""
    texto = base64.b32encode(firma).decode().rstrip("=")
    return "-".join(texto[i : i + 6] for i in range(0, len(texto), 6))


def leer_codigo(codigo: str) -> bytes | None:
    limpio = normalizar(codigo)
    try:
        return base64.b32decode(limpio + "=" * (-len(limpio) % 8))
    except ValueError:
        return None


def codigo_valido(codigo: str, id_equipo: str) -> bool:
    firma = leer_codigo(codigo)
    if firma is None or len(firma) != _LARGO_FIRMA:
        return False
    try:
        clave = Ed25519PublicKey.from_public_bytes(bytes.fromhex(CLAVE_PUBLICA_HEX))
        clave.verify(firma, mensaje_a_firmar(id_equipo))
    except (InvalidSignature, ValueError):
        return False
    return True
