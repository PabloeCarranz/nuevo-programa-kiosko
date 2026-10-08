"""Unica fuente de verdad de los rangos de codigo por rubro, tal como
clasifica programa_restaurante_respaldo.py (enviar_totales_y_cerrar)."""

RANGOS = {
    "golosinas": {"tabla": "GOLOSINAS", "desde": 20000, "hasta": 29999},
    "bebidas": {"tabla": "BEBIDAS", "desde": 30000, "hasta": 39999},
    "cigarros": {"tabla": "CIGARROS", "desde": 40000, "hasta": 49999},
    "mesa_pool": {"tabla": "MESA_POOL", "desde": 90000, "hasta": 100000},
}

TABLAS_POR_RUBRO = {rubro: info["tabla"] for rubro, info in RANGOS.items()}


def rubro_de_codigo(codigo: int) -> str | None:
    for rubro, info in RANGOS.items():
        if info["desde"] <= codigo <= info["hasta"]:
            return rubro
    return None


def tabla_de_codigo(codigo: int) -> str | None:
    rubro = rubro_de_codigo(codigo)
    return TABLAS_POR_RUBRO.get(rubro) if rubro else None
