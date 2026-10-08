from fastapi import APIRouter, Depends

from app.deps import CurrentUser, get_current_user
from app.services.rangos import RANGOS

router = APIRouter(prefix="/config", tags=["config"])


@router.get("/rangos-producto")
def rangos_producto(_: CurrentUser = Depends(get_current_user)):
    return RANGOS
