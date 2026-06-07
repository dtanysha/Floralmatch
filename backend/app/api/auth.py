import logging

from fastapi.security import OAuth2PasswordRequestForm
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password, create_access_token
from app.db.deps import get_db
from app.models.user import User
from app.schemas.user import UserCreate, UserOut, Token

logger = logging.getLogger("floralmatch")

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == str(user_in.email)).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    user = User(
        email=str(user_in.email),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name,
        phone=user_in.phone,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    logger.info("User registered: %s (id=%d)", user.email, user.id)
    return user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    token = create_access_token(subject=str(user.id))
    logger.info("User logged in: %s (id=%d)", user.email, user.id)
    return {"access_token": token, "token_type": "bearer"}
