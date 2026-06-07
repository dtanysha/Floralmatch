from datetime import datetime
from typing import Optional, List, Any

from pydantic import BaseModel, Field


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None
    price: float = Field(gt=0)
    image_url: Optional[str] = None
    product_type: str = Field(pattern="^(flower|bouquet)$")
    flower_type: Optional[str] = None
    flower_color: Optional[str] = None
    composition: Optional[List[Any]] = None
    sizes: Optional[dict] = None
    care_tips: Optional[str] = None
    occasions: Optional[List[str]] = None
    size: Optional[str] = None
    in_stock: bool = True


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    image_url: Optional[str] = None
    product_type: Optional[str] = Field(default=None, pattern="^(flower|bouquet)$")
    flower_type: Optional[str] = None
    flower_color: Optional[str] = None
    composition: Optional[List[Any]] = None
    sizes: Optional[dict] = None
    care_tips: Optional[str] = None
    occasions: Optional[List[str]] = None
    size: Optional[str] = None
    in_stock: Optional[bool] = None


class ProductOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    price: float
    image_url: Optional[str] = None
    product_type: str
    flower_type: Optional[str] = None
    flower_color: Optional[str] = None
    composition: Optional[List[Any]] = None
    sizes: Optional[dict] = None
    care_tips: Optional[str] = None
    occasions: Optional[List[str]] = None
    size: Optional[str] = None
    in_stock: bool
    created_at: datetime
    is_favorited: Optional[bool] = None

    class Config:
        from_attributes = True


class ProductListOut(BaseModel):
    items: List[ProductOut]
    total: int
    page: int
    per_page: int
