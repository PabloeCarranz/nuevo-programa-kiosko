"""Emite el codigo de activacion (para siempre) de una PC.

Uso (desde la carpeta backend/):
    .venv\\Scripts\\python scripts\\emitir_codigo.py ID-DE-LA-PC [--cliente "Bar Don Pepe"]

El ID de la PC lo ve el cliente en la pantalla "Activar" del programa. El codigo
generado solo funciona en esa PC. Cada emision queda anotada en emitidos.csv,
junto a la clave privada.
"""

import argparse
import csv
import os
import sys
from datetime import datetime
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.licencia_codigo import CLAVE_PUBLICA_HEX, formatear_codigo, mensaje_a_firmar, normalizar  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="Emite el codigo de activacion de una PC.")
    parser.add_argument("id_equipo", help="ID que muestra el programa en la pantalla Activar (ej: 1A2B-3C4D-5E6F)")
    parser.add_argument("--cliente", default="", help="Nombre del cliente, solo para el registro")
    args = parser.parse_args()

    id_equipo = normalizar(args.id_equipo)
    if len(id_equipo) != 12:
        print("El ID de la PC debe tener 12 letras/numeros (ej: 1A2B-3C4D-5E6F).")
        return 1

    ruta = Path(os.environ.get("CAJA_CLAVE_PRIVADA") or Path.home() / ".caja-licencias" / "clave_privada.pem")
    if not ruta.exists():
        print(f"No encuentro la clave privada en {ruta}. Genera una con scripts/generar_claves_licencia.py")
        return 1

    privada = serialization.load_pem_private_key(ruta.read_bytes(), password=None)
    if not isinstance(privada, Ed25519PrivateKey):
        print("La clave privada no es Ed25519.")
        return 1
    publica_hex = privada.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex()
    if publica_hex != CLAVE_PUBLICA_HEX:
        print("La clave privada no corresponde a la clave publica que lleva el programa: los codigos no servirian.")
        return 1

    codigo = formatear_codigo(privada.sign(mensaje_a_firmar(id_equipo)))

    registro = ruta.parent / "emitidos.csv"
    nuevo = not registro.exists()
    with registro.open("a", newline="", encoding="utf-8") as f:
        escritor = csv.writer(f)
        if nuevo:
            escritor.writerow(["fecha", "id_equipo", "cliente"])
        escritor.writerow([datetime.now().isoformat(timespec="seconds"), id_equipo, args.cliente])

    print(f"Codigo para la PC {id_equipo}:\n")
    print(codigo)
    return 0


if __name__ == "__main__":
    sys.exit(main())
