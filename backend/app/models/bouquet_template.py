from datetime import datetime

from sqlalchemy import String, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class BouquetTemplate(Base):
    __tablename__ = "bouquet_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), nullable=True)
    image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    occasion: Mapped[str] = mapped_column(String(50), nullable=False)
    color_palette: Mapped[str] = mapped_column(String(50), nullable=False)
    size: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    items: Mapped[list["BouquetTemplateItem"]] = relationship(
        "BouquetTemplateItem", back_populates="template", cascade="all, delete-orphan"
    )


class BouquetTemplateItem(Base):
    __tablename__ = "bouquet_template_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    template_id: Mapped[int] = mapped_column(Integer, ForeignKey("bouquet_templates.id", ondelete="CASCADE"), nullable=False)
    product_id: Mapped[int] = mapped_column(Integer, ForeignKey("products.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)

    template: Mapped["BouquetTemplate"] = relationship("BouquetTemplate", back_populates="items")
    product: Mapped["Product"] = relationship("Product")
