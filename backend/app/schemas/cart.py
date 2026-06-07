from typing import List, Optional

from pydantic import BaseModel, Field

from app.schemas.product import ProductOut


class CartItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(ge=0)


class CartItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    product: ProductOut
    subtotal: float = 0

    class Config:
        from_attributes = True


class CartOut(BaseModel):
    id: int
    items: List[CartItemOut] = []
    total_price: float = 0


class CartMerge(BaseModel):
    session_id: str
