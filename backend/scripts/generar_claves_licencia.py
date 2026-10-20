"""Genera, UNA sola vez, las claves con las que se firman los codigos de activacion.

Uso (desde la carpeta backend/):
    .venv\\Scripts\\python scripts\\generar_claves_licencia.py

- La clave PRIVADA se guarda fuera del proyecto, en %USERPROFILE%\\.caja-licencias\\
  (o donde diga la variable CAJA_CLAVE_PRIVADA). Es la que permite emitir codigos:
  hay que hacerle copia y NO entregarla nunca con el programa. Si se pierde no se
  pueden emitir mas codigos; si se filtra, cualquiera puede fabricarlos.
- La clave PUBLICA se escribe en app/licencia_codigo.py. Esa si viaja con el programa.

Si ya existe una clave privada, no la pisa: cambiarla invalidaria todos los
codigos ya entregados.
"""

import os
import sys
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

BACKEND = Path(__file__).resolve().parent.parent
ARCHIVO_CODIGO = BACKEND / "app" / "licencia_codigo.py"
PENDIENTE = 'CLAVE_PUBLICA_HEX = "PENDIENTE"'


def ruta_clave_privada() -> Path:
    return Path(os.environ.get("CAJA_CLAVE_PRIVADA") or Path.home() / ".caja-licencias" / "clave_privada.pem")


def main() -> int:
    destino = ruta_clave_privada()
    if destino.exists():
        print(f"Ya existe una clave privada en {destino}. No se toca.")
        return 1

    privada = Ed25519PrivateKey.generate()
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(
        privada.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        )
    )
    publica_hex = privada.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()

    codigo = ARCHIVO_CODIGO.read_text(encoding="utf-8")
    if PENDIENTE in codigo:
        ARCHIVO_CODIGO.write_text(codigo.replace(PENDIENTE, f'CLAVE_PUBLICA_HEX = "{publica_hex}"'), encoding="utf-8")
        print(f"Clave publica escrita en {ARCHIVO_CODIGO}")
    else:
        print(f"{ARCHIVO_CODIGO.name} ya tiene una clave publica. Clave publica nueva (no aplicada): {publica_hex}")

    print(f"Clave privada guardada en: {destino}")
    print("Hace una copia de ese archivo en un lugar seguro y no lo entregues con el programa.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
