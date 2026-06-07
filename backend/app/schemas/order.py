from datetime import datetime, date
from typing import Optional, List

from pydantic import BaseModel, Field

from app.schemas.product import ProductOut


class OrderCreate(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str = Field(min_length=5, max_length=20)
    delivery_address: str = Field(min_length=1, max_length=500)
    delivery_date: date
    delivery_time: str = Field(min_length=1, max_length=50)
    comment: Optional[str] = None
    image_url: Optional[str] = None
    session_id: Optional[str] = None  # для гостей


class OrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    price_at_purchase: float
    product: ProductOut

    class Config:
        from_attributes = True


class OrderOut(BaseModel):
    id: int
    user_id: Optional[int] = None
    full_name: str
    phone: str
    delivery_address: str
    delivery_date: date
    delivery_time: str
    comment: Optional[str] = None
    image_url: Optional[str] = None
    status: str
    total_price: float
    created_at: datetime
    items: List[OrderItemOut] = []

    class Config:
        from_attributes = True


class OrderListOut(BaseModel):
    items: List[OrderOut]
    total: int
    page: int
    per_page: int


class OrderStatusUpdate(BaseModel):
    status: str = Field(pattern="^(new|confirmed|assembling|ready|delivering|completed|cancelled)$")
