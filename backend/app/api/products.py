from typing import Optional, List, Set

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, String
from sqlalchemy.orm import Session

from app.core.auth import get_optional_user
from app.db.deps import get_db
from app.models.favorite import Favorite
from app.models.product import Product
from app.models.user import User
from app.schemas.product import ProductOut, ProductListOut

router = APIRouter(prefix="/products", tags=["products"])


def _get_favorite_ids(db: Session, user: Optional[User]) -> Set[int]:
    if not user:
        return set()
    rows = db.query(Favorite.product_id).filter(Favorite.user_id == user.id).all()
    return {r[0] for r in rows}


def _enrich_products(products: list, favorite_ids: Set[int]) -> List[dict]:
    result = []
    for p in products:
        data = ProductOut.model_validate(p).model_dump()
        data["is_favorited"] = p.id in favorite_ids if favorite_ids is not None else None
        result.append(data)
    return result


@router.get("", response_model=ProductListOut)
def list_products(
    product_type: Optional[str] = Query(None, description="flower или bouquet"),
    occasion: Optional[str] = Query(None, description="birthday, wedding, anniversary, no_occasion"),
    flower_type: Optional[str] = Query(None, description="роза, гербера, пион, ..."),
    flower_color: Optional[str] = Query(None, description="розовый, жёлтый, белый, ..."),
    size: Optional[str] = Query(None, description="small, medium, large"),
    price_min: Optional[float] = Query(None, ge=0),
    price_max: Optional[float] = Query(None, ge=0),
    in_stock: Optional[bool] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    query = db.query(Product)

    if product_type:
        query = query.filter(Product.product_type == product_type)
    else:
        query = query.filter(Product.product_type != "wrapping")
    if occasion:
        query = query.filter(Product.occasions.contains([occasion]))
    if flower_type and flower_color:
        # Ищем элемент в composition где тип И цвет совпадают одновременно
        match_item = [{"flower_type": flower_type, "flower_color": flower_color}]
        query = query.filter(or_(
            (Product.flower_type == flower_type) & (Product.flower_color == flower_color),
            Product.composition.contains(match_item),
        ))
    elif flower_type:
        query = query.filter(or_(
            Product.flower_type == flower_type,
            Product.composition.cast(String).ilike(f'%"{flower_type}"%'),
        ))
    elif flower_color:
        query = query.filter(or_(
            Product.flower_color == flower_color,
            Product.composition.cast(String).ilike(f'%"{flower_color}"%'),
        ))
    if size:
        query = query.filter(or_(
            Product.size == size,
            Product.sizes.has_key(size),
        ))
    if price_min is not None:
        query = query.filter(Product.price >= price_min)
    if price_max is not None:
        query = query.filter(Product.price <= price_max)
    if in_stock is not None:
        query = query.filter(Product.in_stock == in_stock)

    total = query.count()
    from sqlalchemy import case
    sort_order = case(
        (Product.product_type == "bouquet", 0),
        else_=1,
    )
    items = query.order_by(sort_order, Product.id).offset((page - 1) * per_page).limit(per_page).all()

    favorite_ids = _get_favorite_ids(db, user)
    enriched = _enrich_products(items, favorite_ids if user else None)

    return ProductListOut(items=enriched, total=total, page=page, per_page=per_page)


@router.get("/available-flower-types")
def available_flower_types(
    product_type: Optional[str] = Query(None),
    occasion: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Возвращает типы цветков, доступные для текущих фильтров."""
    query = db.query(Product)
    if product_type:
        query = query.filter(Product.product_type == product_type)
    if occasion:
        query = query.filter(Product.occasions.contains([occasion]))

    products = query.all()
    types = set()
    for p in products:
        if p.flower_type:
            types.add(p.flower_type)
        if p.composition:
            for item in p.composition:
                ft = item.get("flower_type", "")
                if ft:
                    types.add(ft)
    return sorted(types)


@router.get("/available-flower-colors")
def available_flower_colors(
    product_type: Optional[str] = Query(None),
    occasion: Optional[str] = Query(None),
    flower_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Возвращает цвета цветков, доступные для текущих фильтров."""
    query = db.query(Product)
    if product_type:
        query = query.filter(Product.product_type == product_type)
    if occasion:
        query = query.filter(Product.occasions.contains([occasion]))
    if flower_type:
        query = query.filter(or_(
            Product.flower_type == flower_type,
            Product.composition.cast(String).ilike(f'%"{flower_type}"%'),
        ))

    products = query.all()
    colors = set()
    for p in products:
        if p.flower_color:
            if not flower_type or p.flower_type == flower_type:
                colors.add(p.flower_color)
        if p.composition:
            for item in p.composition:
                ft = item.get("flower_type", "")
                c = item.get("flower_color", "")
                if c and (not flower_type or ft == flower_type):
                    colors.add(c)
    return sorted(colors)


@router.get("/{product_id}", response_model=ProductOut)
def get_product(
    product_id: int,
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    favorite_ids = _get_favorite_ids(db, user)
    data = ProductOut.model_validate(product).model_dump()
    data["is_favorited"] = product.id in favorite_ids if user else None
    return data
