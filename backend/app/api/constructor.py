import logging
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models.bouquet_template import BouquetTemplate
from app.models.product import Product
from app.schemas.constructor import (
    AIExtractRequest,
    AIExtractResponse,
    ConstructorOptions,
    BouquetTemplateOut,
)
from app.services.yandex_gpt import YandexGPTError, extract_filters

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/constructor", tags=["constructor"])


@router.get("/options", response_model=ConstructorOptions)
def get_options(db: Session = Depends(get_db)):
    """Возвращает доступные повод/тип цветка/цвет из товаров в наличии."""
    flowers = db.query(Product).filter(
        Product.product_type == "flower",
        Product.in_stock == True,
    ).all()

    occasions_set = set()
    types_set = set()
    colors_set = set()
    sizes_set = set()

    for f in flowers:
        if f.occasions:
            for occ in f.occasions:
                occasions_set.add(occ)
        if f.flower_type:
            types_set.add(f.flower_type)
        if f.flower_color:
            colors_set.add(f.flower_color)
        if f.size:
            sizes_set.add(f.size)

    return ConstructorOptions(
        occasions=sorted(occasions_set),
        flower_types=sorted(types_set),
        flower_colors=sorted(colors_set),
        sizes=["small", "medium", "large"],
    )



@router.get("/templates", response_model=List[BouquetTemplateOut])
def get_templates(
    occasion: Optional[str] = Query(None),
    size: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Возвращает референсные фото букетов по параметрам."""
    query = db.query(BouquetTemplate)

    if occasion:
        query = query.filter(BouquetTemplate.occasion == occasion)
    if size:
        query = query.filter(BouquetTemplate.size == size)

    return query.all()


@router.post("/ai-extract", response_model=AIExtractResponse)
def ai_extract(payload: AIExtractRequest):
    """Через YandexGPT извлекает теги (типы цветов и цвета) из произвольного текста."""
    try:
        result = extract_filters(payload.query)
    except YandexGPTError as e:
        logger.warning("AI extract failed: %s", e)
        raise HTTPException(
            status_code=503,
            detail="AI-поиск временно недоступен. Воспользуйтесь фильтрами вручную.",
        )
    return AIExtractResponse(**result)
