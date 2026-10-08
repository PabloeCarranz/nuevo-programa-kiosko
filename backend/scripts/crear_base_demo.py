"""Crea una base SQLite nueva con el esquema del sistema y datos de ejemplo.

Uso (desde la carpeta backend/):
    .venv\\Scripts\\python scripts\\crear_base_demo.py [ruta_destino]

Por defecto escribe ../datos/negocio.db. Si el archivo ya existe NO lo pisa.
Usuarios de ejemplo: Master, Caja1, Caja2, Caja3 — contrasena 1234.
"""

import hashlib
import sqlite3
import sys
from pathlib import Path

ESQUEMA = """
CREATE TABLE GOLOSINAS (ID INTEGER PRIMARY KEY AUTOINCREMENT, CODIGO INTEGER, NOMBRE_PRODUCTO TEXT, CANTIDAD INTEGER,
    PRECIO REAL, activo INTEGER DEFAULT 1, barras_codigo TEXT, SALDO_FINAL INTEGER DEFAULT 0);
CREATE TABLE BEBIDAS (ID INTEGER PRIMARY KEY AUTOINCREMENT, CODIGO INTEGER, NOMBRE_PRODUCTO VARCHAR(50), CANTIDAD INTEGER,
    PRECIO REAL, activo INTEGER DEFAULT 1, barras_codigo TEXT, SALDO_FINAL INTEGER DEFAULT 0);
CREATE TABLE CIGARROS (ID INTEGER PRIMARY KEY AUTOINCREMENT, CODIGO INTEGER, NOMBRE_PRODUCTO VARCHAR(50), CANTIDAD INTEGER,
    PRECIO REAL, activo INTEGER DEFAULT 1, barras_codigo TEXT, SALDO_FINAL INTEGER DEFAULT 0);
CREATE TABLE MESA_POOL (id INTEGER PRIMARY KEY AUTOINCREMENT, codigo INTEGER UNIQUE, nombre_producto TEXT, cantidad REAL DEFAULT 0,
    precio REAL DEFAULT 0, BARRAS_CODIGO, mesa INTEGER, activo INTEGER DEFAULT 1, saldo_final INTEGER);
CREATE UNIQUE INDEX idx_golosina_codigo ON GOLOSINAS(CODIGO);
CREATE UNIQUE INDEX idx_bebidas_codigo ON BEBIDAS(CODIGO);
CREATE UNIQUE INDEX idx_cigarros_codigo ON CIGARROS(CODIGO);

CREATE TABLE FACTURAS (id INTEGER PRIMARY KEY AUTOINCREMENT, caja TEXT NOT NULL, numero_correlativo INTEGER NOT NULL,
    numero_factura TEXT NOT NULL, fecha TEXT, usuario TEXT, cliente TEXT, metodo_pago TEXT, total REAL,
    activo INTEGER DEFAULT 1, multipago_efectivo REAL DEFAULT NULL, multipago_transferencia REAL DEFAULT NULL);
CREATE TABLE DETALLE_FACTURA (id INTEGER PRIMARY KEY AUTOINCREMENT, factura_id INTEGER, codigo_producto TEXT, producto TEXT,
    cantidad INTEGER, precio_unitario REAL, precio_total REAL, activo INTEGER DEFAULT 1, HORAS_MANUALES INTEGER DEFAULT 0,
    FOREIGN KEY(factura_id) REFERENCES FACTURAS(id));
CREATE TABLE CAJAS (nombre TEXT PRIMARY KEY, prefijo TEXT NOT NULL);
CREATE TABLE INGRESOS (ID INTEGER PRIMARY KEY AUTOINCREMENT, FECHA TEXT, DETALLE TEXT, RUBRO TEXT, CODIGO INTEGER,
    NOMBRE_PRODUCTO TEXT, CANTIDAD_INGRESADA INTEGER, COMENTARIOS VARCHAR(50));
CREATE TABLE INVENTARIO (CODIGO INTEGER, NOMBRE_PRODUCTO TEXT, CANTIDAD INTEGER, FECHA_CARGA TEXT, PRIMARY KEY (CODIGO, FECHA_CARGA));
CREATE TABLE AJUSTES (ID INTEGER PRIMARY KEY AUTOINCREMENT, FECHA_CARGA TEXT, TIPO_AJUSTE TEXT, CODIGO INTEGER,
    NOMBRE_PRODUCTO VARCHAR(50), CANTIDAD INTEGER, COMENTARIO TEXT, ACTIVO INTEGER DEFAULT 1, detalle TEXT);
CREATE TABLE SESION_POOL (id INTEGER PRIMARY KEY AUTOINCREMENT, cliente TEXT, inicio_tiempo TEXT, fin_tiempo TEXT, estado TEXT,
    usuario_inicia TEXT, usuario_termina TEXT, facturado INTEGER DEFAULT 0, COMENTARIOS TEXT);
CREATE TABLE CONSUMO_TEMPORAL (id INTEGER PRIMARY KEY AUTOINCREMENT, sesion_id INTEGER, codigo TEXT, detalle TEXT, cantidad INTEGER,
    precio_unitario REAL, total REAL, fecha TEXT, FOREIGN KEY(sesion_id) REFERENCES SESION_POOL(id));
CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
CREATE TABLE CLIENTES (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT NOT NULL);
CREATE TABLE cierres (usuario TEXT, fecha TEXT, PRIMARY KEY (usuario, fecha));
CREATE TABLE cierres2 (id INTEGER PRIMARY KEY AUTOINCREMENT, usuario TEXT, fecha TEXT, fecha_hora TEXT);

-- Datos del negocio que se muestran en pantalla y en el ticket (una sola fila, id = 1).
CREATE TABLE NEGOCIO (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    nombre TEXT NOT NULL,
    subtitulo TEXT NOT NULL DEFAULT '',
    direccion TEXT NOT NULL DEFAULT '',
    telefono TEXT NOT NULL DEFAULT '',
    pie_ticket TEXT NOT NULL DEFAULT '',
    rubro_golosinas TEXT NOT NULL DEFAULT 'Kiosco',
    rubro_bebidas TEXT NOT NULL DEFAULT 'Bebidas',
    rubro_cigarros TEXT NOT NULL DEFAULT 'Cocina',
    rubro_mesa_pool TEXT NOT NULL DEFAULT 'Tiempo y varios'
);
"""

PRODUCTOS = {
    "GOLOSINAS": [
        (20001, "Alfajor triple chocolate", 1200, "7790040111111"),
        (20002, "Chicles menta x10", 600, "7790040222222"),
        (20003, "Papas fritas 90 g", 1800, "7790040333333"),
        (20004, "Turrón de maní", 500, "7790040444444"),
        (20005, "Barra de cereal", 900, "7790040555555"),
    ],
    "BEBIDAS": [
        (30001, "Cerveza rubia 1 L", 4200, "7790070000001"),
        (30002, "Gaseosa cola 500 ml", 2300, "7790070000002"),
        (30003, "Agua mineral 500 ml", 1500, "7790070000003"),
        (30004, "Fernet con cola", 5500, ""),
        (30005, "Cerveza tirada pinta", 3800, ""),
        (30006, "Gaseosa lima 500 ml", 2300, "7790070000006"),
    ],
    "CIGARROS": [
        (40001, "Hamburguesa completa", 9500, ""),
        (40002, "Papas con cheddar", 7000, ""),
        (40003, "Pizza muzzarella", 11000, ""),
        (40004, "Tostado jamón y queso", 5200, ""),
    ],
}

TIEMPO = [
    (90001, "Mesa pool 1", 0),
    (90002, "Mesa pool 2", 0),
    (90003, "Cancha 1", 0),
    (90010, "15 minutos", 1500),
    (90011, "30 minutos", 3000),
    (90012, "45 minutos", 4500),
    (90013, "1 hora", 6000),
    (90020, "Hora de cancha", 18000),
    (90021, "Alquiler de tacos", 2000),
]


def crear(destino: Path) -> None:
    if destino.exists():
        print(f"Ya existe {destino}, no se modifica.")
        return
    destino.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(destino)
    with conn:
        conn.executescript(ESQUEMA)
        conn.execute(
            "INSERT INTO NEGOCIO (id, nombre, subtitulo, direccion, telefono, pie_ticket) VALUES (1, ?, ?, ?, ?, ?)",
            ("La Canchita Bar", "Bar · Pool · Canchas", "Av. Siempreviva 742", "11 5555-0000", "¡Gracias por su visita!"),
        )
        conn.executemany("INSERT INTO CAJAS VALUES (?, ?)", [("Caja1", "A101"), ("Caja2", "B202"), ("Caja3", "C303"), ("Master", "M000")])
        clave = hashlib.sha256(b"1234").hexdigest()
        conn.executemany("INSERT INTO usuarios (nombre, password) VALUES (?, ?)", [(u, clave) for u in ("Master", "Caja1", "Caja2", "Caja3")])
        for tabla, filas in PRODUCTOS.items():
            conn.executemany(
                f"INSERT INTO {tabla} (CODIGO, NOMBRE_PRODUCTO, CANTIDAD, PRECIO, barras_codigo, activo, SALDO_FINAL) VALUES (?, ?, 50, ?, ?, 1, 50)",
                [(c, n, p, b) for c, n, p, b in filas],
            )
        conn.executemany(
            "INSERT INTO MESA_POOL (codigo, nombre_producto, cantidad, precio, BARRAS_CODIGO, activo, saldo_final) VALUES (?, ?, 0, ?, '', 1, 0)",
            TIEMPO,
        )
        conn.executemany("INSERT INTO CLIENTES (nombre) VALUES (?)", [("Mesa 1",), ("Mesa 2",), ("Cancha 1",), ("Juan Pérez",)])
    conn.close()
    print(f"Base de demo creada en {destino}")


if __name__ == "__main__":
    base = Path(__file__).resolve().parent.parent
    destino = Path(sys.argv[1]) if len(sys.argv) > 1 else (base / ".." / "datos" / "negocio.db").resolve()
    crear(destino)
