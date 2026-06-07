import logging
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.auth import get_current_user, get_optional_user
from app.db.deps import get_db
from app.models.cart import Cart, CartItem
from app.models.product import Product
from app.models.user import User
from app.schemas.cart import CartItemCreate, CartItemUpdate, CartOut, CartItemOut, CartMerge

logger = logging.getLogger("floralmatch")

router = APIRouter(prefix="/cart", tags=["cart"])


def _get_or_create_cart(
    db: Session,
    user: Optional[User] = None,
    session_id: Optional[str] = None,
) -> Cart:
    if user:
        cart = db.query(Cart).filter(Cart.user_id == user.id).first()
        if not cart:
            cart = Cart(user_id=user.id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    if session_id:
        cart = db.query(Cart).filter(Cart.session_id == session_id).first()
        if not cart:
            cart = Cart(session_id=session_id)
            db.add(cart)
            db.commit()
            db.refresh(cart)
        return cart

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Authorization or X-Session-ID header required",
    )


def _build_cart_response(cart: Cart) -> CartOut:
    items_out = []
    total = 0.0
    for item in cart.items:
        subtotal = float(item.product.price) * item.quantity
        total += subtotal
        item_out = CartItemOut(
            id=item.id,
            product_id=item.product_id,
            quantity=item.quantity,
            product=item.product,
            subtotal=subtotal,
        )
        items_out.append(item_out)
    return CartOut(id=cart.id, items=items_out, total_price=round(total, 2))


@router.get("", response_model=CartOut)
def get_cart(
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if user:
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product)
        ).filter(Cart.user_id == user.id).first()
    elif x_session_id:
        cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product)
        ).filter(Cart.session_id == x_session_id).first()
    else:
        raise HTTPException(status_code=400, detail="Authorization or X-Session-ID header required")

    if not cart:
        return CartOut(id=0, items=[], total_price=0)

    return _build_cart_response(cart)


@router.post("/items", response_model=CartOut)
def add_item(
    item_in: CartItemCreate,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    product = db.query(Product).filter(Product.id == item_in.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    cart = _get_or_create_cart(db, user=user, session_id=x_session_id)

    existing = db.query(CartItem).filter(
        CartItem.cart_id == cart.id,
        CartItem.product_id == item_in.product_id,
    ).first()

    if existing:
        existing.quantity += item_in.quantity
    else:
        db.add(CartItem(cart_id=cart.id, product_id=item_in.product_id, quantity=item_in.quantity))

    db.commit()

    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product)
    ).filter(Cart.id == cart.id).first()

    logger.info("Cart updated: cart_id=%d, product_id=%d", cart.id, item_in.product_id)
    return _build_cart_response(cart)


@router.put("/items/{item_id}", response_model=CartOut)
def update_item(
    item_id: int,
    item_in: CartItemUpdate,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    cart_item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart = db.query(Cart).filter(Cart.id == cart_item.cart_id).first()
    if user and cart.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not user and x_session_id and cart.session_id != x_session_id:
        raise HTTPException(status_code=403, detail="Access denied")

    if item_in.quantity == 0:
        db.delete(cart_item)
    else:
        cart_item.quantity = item_in.quantity

    db.commit()

    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product)
    ).filter(Cart.id == cart.id).first()

    return _build_cart_response(cart)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_item(
    item_id: int,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    cart_item = db.query(CartItem).filter(CartItem.id == item_id).first()
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")

    cart = db.query(Cart).filter(Cart.id == cart_item.cart_id).first()
    if user and cart.user_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if not user and x_session_id and cart.session_id != x_session_id:
        raise HTTPException(status_code=403, detail="Access denied")

    db.delete(cart_item)
    db.commit()

    cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product)
    ).filter(Cart.id == cart.id).first()

    return _build_cart_response(cart)


@router.post("/merge", response_model=CartOut)
def merge_cart(
    merge_in: CartMerge,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    guest_cart = db.query(Cart).options(
        joinedload(Cart.items)
    ).filter(Cart.session_id == merge_in.session_id).first()

    if not guest_cart or not guest_cart.items:
        user_cart = db.query(Cart).options(
            joinedload(Cart.items).joinedload(CartItem.product)
        ).filter(Cart.user_id == user.id).first()
        if not user_cart:
            return CartOut(id=0, items=[], total_price=0)
        return _build_cart_response(user_cart)

    user_cart = db.query(Cart).options(
        joinedload(Cart.items)
    ).filter(Cart.user_id == user.id).first()

    if not user_cart:
        user_cart = Cart(user_id=user.id)
        db.add(user_cart)
        db.commit()
        db.refresh(user_cart)

    existing_products = {item.product_id: item for item in user_cart.items}

    for guest_item in guest_cart.items:
        if guest_item.product_id in existing_products:
            existing_products[guest_item.product_id].quantity += guest_item.quantity
        else:
            db.add(CartItem(
                cart_id=user_cart.id,
                product_id=guest_item.product_id,
                quantity=guest_item.quantity,
            ))

    db.delete(guest_cart)
    db.commit()

    user_cart = db.query(Cart).options(
        joinedload(Cart.items).joinedload(CartItem.product)
    ).filter(Cart.id == user_cart.id).first()

    logger.info("Cart merged: session=%s -> user_id=%d", merge_in.session_id, user.id)
    return _build_cart_response(user_cart)
