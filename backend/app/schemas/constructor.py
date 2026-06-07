from typing import Optional, List

from pydantic import BaseModel, Field

from app.schemas.product import ProductOut


class ConstructorOptions(BaseModel):
    occasions: List[str]
    flower_types: List[str]
    flower_colors: List[str]
    sizes: List[str]


class ConstructorRequest(BaseModel):
    occasion: str
    flower_color: str
    favorite_type: str
    size: str  # "small", "medium", "large"
    budget: Optional[float] = Field(default=None, gt=0)


class SuggestionFlower(BaseModel):
    product: ProductOut
    quantity: int
    subtotal: float


class ConstructorSuggestion(BaseModel):
    name: str
    description: str
    flowers: List[SuggestionFlower]
    total_price: float
    template_image_url: Optional[str] = None


class ConstructorResponse(BaseModel):
    suggestions: List[ConstructorSuggestion]
    message: Optional[str] = None


class AIExtractRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=300)


class AIExtractResponse(BaseModel):
    types: List[str] = []
    colors: List[str] = []
    occasion: Optional[str] = None
    occasion_label: Optional[str] = None
    understood: bool = True
    message: Optional[str] = None


class BouquetTemplateOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    image_url: Optional[str] = None
    occasion: str
    size: str

    class Config:
        from_attributes = True
