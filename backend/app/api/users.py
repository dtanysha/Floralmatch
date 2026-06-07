from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.auth import get_current_user
from app.core.security import hash_password
from app.db.deps import get_db
from app.models.user import User
from app.schemas.user import UserOut, UserUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserOut)
def read_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserOut)
def update_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user_in.full_name is not None:
        current_user.full_name = user_in.full_name
    if user_in.phone is not None:
        current_user.phone = user_in.phone
    if user_in.password is not None:
        current_user.hashed_password = hash_password(user_in.password)

    db.commit()
    db.refresh(current_user)
    return current_user
