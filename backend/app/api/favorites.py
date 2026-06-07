from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user
from app.db.deps import get_db
from app.models.favorite import Favorite
from app.models.product import Product
from app.models.user import User
from app.schemas.favorite import FavoriteOut, FavoriteListOut

router = APIRouter(prefix="/favorites", tags=["favorites"])


@router.get("", response_model=FavoriteListOut)
def list_favorites(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    favorites = db.query(Favorite).options(
        joinedload(Favorite.product)
    ).filter(Favorite.user_id == user.id).order_by(Favorite.created_at.desc()).all()

    return FavoriteListOut(items=favorites, total=len(favorites))


@router.post("/{product_id}", response_model=FavoriteOut, status_code=status.HTTP_201_CREATED)
def add_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    existing = db.query(Favorite).filter(
        Favorite.user_id == user.id, Favorite.product_id == product_id
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already in favorites")

    fav = Favorite(user_id=user.id, product_id=product_id)
    db.add(fav)
    db.commit()

    fav = db.query(Favorite).options(
        joinedload(Favorite.product)
    ).filter(Favorite.id == fav.id).first()
    return fav


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_favorite(
    product_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    fav = db.query(Favorite).filter(
        Favorite.user_id == user.id, Favorite.product_id == product_id
    ).first()
    if not fav:
        raise HTTPException(status_code=404, detail="Not in favorites")

    db.delete(fav)
    db.commit()
