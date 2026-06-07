import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_admin
from app.db.deps import get_db
from app.models.order import Order, OrderItem
from app.models.product import Product
from app.models.user import User
from app.schemas.order import OrderOut, OrderListOut, OrderStatusUpdate
from app.schemas.product import ProductCreate, ProductUpdate, ProductOut
from app.schemas.user import UserOut

router = APIRouter(prefix="/admin", tags=["admin"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "uploads")


# --- Products ---

@router.post("/products", response_model=ProductOut, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = Product(**product_in.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/products/{product_id}", response_model=ProductOut)
def update_product(
    product_id: int,
    product_in: ProductUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    db.delete(product)
    db.commit()


# --- Upload ---

@router.post("/upload")
def upload_image(
    file: UploadFile = File(...),
    admin: User = Depends(get_current_admin),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "img.png")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        ext = ".png"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return {"url": f"/uploads/{filename}"}


# --- Orders ---

@router.get("/orders/new-count")
def get_new_orders_count(
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    count = db.query(func.count(Order.id)).filter(Order.status == "new").scalar()
    return {"count": count}


@router.get("/orders", response_model=OrderListOut)
def list_all_orders(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    query = db.query(Order)
    if status_filter:
        query = query.filter(Order.status == status_filter)

    total = query.count()
    orders = query.options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    seen = set()
    unique_orders = []
    for o in orders:
        if o.id not in seen:
            seen.add(o.id)
            unique_orders.append(o)

    return OrderListOut(items=unique_orders, total=total, page=page, per_page=per_page)


@router.put("/orders/{order_id}/status", response_model=OrderOut)
def update_order_status(
    order_id: int,
    status_in: OrderStatusUpdate,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.status = status_in.status
    db.commit()
    db.refresh(order)
    return order


# --- Users ---

@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    total = db.query(func.count(User.id)).scalar()
    users = db.query(User).order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "phone": u.phone,
                "is_admin": u.is_admin,
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ],
        "total": total,
        "page": page,
        "per_page": per_page,
    }
