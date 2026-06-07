from datetime import datetime
from typing import List

from pydantic import BaseModel

from app.schemas.product import ProductOut


class FavoriteOut(BaseModel):
    id: int
    product_id: int
    product: ProductOut
    created_at: datetime

    class Config:
        from_attributes = True


class FavoriteListOut(BaseModel):
    items: List[FavoriteOut]
    total: int
