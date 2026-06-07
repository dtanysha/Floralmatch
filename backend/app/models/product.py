from datetime import datetime
from typing import Optional

from sqlalchemy import String, Integer, Numeric, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.database import Base


class Product(Base):
    __tablename__ = "products"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String(1000), nullable=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    product_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "flower" или "bouquet"
    flower_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # "роза", "гербера", "пион", ...
    flower_color: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)  # "розовый", "жёлтый", "белый", ...
    occasions: Mapped[Optional[list]] = mapped_column(ARRAY(String), nullable=True)  # ["birthday", "wedding", ...]
    size: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)  # "small", "medium", "large"
    composition: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True)  # [{"flower_type": "роза", "flower_color": "красный"}, ...]
    sizes: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)  # {"small": {"quantities": [1,3], "price": 730}, "medium": {...}, "large": {...}}
    care_tips: Mapped[Optional[str]] = mapped_column(String(2000), nullable=True)
    in_stock: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
