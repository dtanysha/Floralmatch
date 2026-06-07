import logging
import os
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, UploadFile, File, status
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user, get_optional_user
from app.db.deps import get_db
from app.models.cart import Cart, CartItem
from app.models.order import Order, OrderItem
from app.models.user import User
from app.schemas.order import OrderCreate, OrderOut, OrderListOut

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "..", "frontend", "public", "uploads")

logger = logging.getLogger("floralmatch")

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post("/upload-screenshot")
def upload_bouquet_screenshot(
    file: UploadFile = File(...),
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    os.makedirs(UPLOAD_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename or "img.png")[1].lower()
    if ext not in (".png", ".jpg", ".jpeg", ".webp"):
        ext = ".png"
    filename = f"bouquet-{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return {"url": f"/uploads/{filename}"}


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    order_in: OrderCreate,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    # Находим корзину
    if user:
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product)
        ).filter(Cart.user_id == user.id).first()
    elif order_in.session_id or x_session_id:
        sid = order_in.session_id or x_session_id
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product)
        ).filter(Cart.session_id == sid).first()
    else:
        raise HTTPException(status_code=400, detail="Authorization or session_id required")

    if not cart or not cart.items:
        raise HTTPException(status_code=400, detail="Cart is empty")

    # Считаем итог и создаём заказ
    total = 0.0
    order_items = []
    for cart_item in cart.items:
        price = float(cart_item.product.price)
        subtotal = price * cart_item.quantity
        total += subtotal
        order_items.append(OrderItem(
            product_id=cart_item.product_id,
            quantity=cart_item.quantity,
            price_at_purchase=price,
        ))

    order = Order(
        user_id=user.id if user else None,
        full_name=order_in.full_name,
        phone=order_in.phone,
        delivery_address=order_in.delivery_address,
        delivery_date=order_in.delivery_date,
        delivery_time=order_in.delivery_time,
        comment=order_in.comment,
        image_url=order_in.image_url,
        total_price=round(total, 2),
        items=order_items,
    )
    db.add(order)

    # Очищаем корзину
    for item in cart.items:
        db.delete(item)

    db.commit()
    db.refresh(order)

    # Загружаем с продуктами для ответа
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order.id).first()

    logger.info("Order created: id=%d, user=%s, total=%.2f, items=%d",
                order.id, user.email if user else "guest", order.total_price, len(order.items))
    return order


@router.get("", response_model=OrderListOut)
def list_orders(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Order).filter(Order.user_id == user.id)
    total = query.count()
    orders = query.options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).order_by(Order.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    # Убираем дубликаты из-за joinedload
    seen = set()
    unique_orders = []
    for o in orders:
        if o.id not in seen:
            seen.add(o.id)
            unique_orders.append(o)

    return OrderListOut(items=unique_orders, total=total, page=page, per_page=per_page)


@router.get("/{order_id}", response_model=OrderOut)
def get_order(
    order_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    order = db.query(Order).options(
        joinedload(Order.items).joinedload(OrderItem.product)
    ).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.user_id != user.id and not user.is_admin:
        raise HTTPException(status_code=403, detail="Access denied")

    return order
