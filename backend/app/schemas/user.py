from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=2, max_length=100)
    phone: str = Field(min_length=7, max_length=20)

    @field_validator("password")
    @classmethod
    def password_max_72_bytes(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return v

    @field_validator("phone")
    @classmethod
    def phone_valid(cls, v: str) -> str:
        import re
        cleaned = re.sub(r"[\s\-\(\)]+", "", v)
        if not re.match(r"^\+?\d{7,15}$", cleaned):
            raise ValueError("Некорректный номер телефона")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(default=None, min_length=6)

    @field_validator("password")
    @classmethod
    def password_max_72_bytes(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 bytes.")
        return v


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str] = None
    phone: Optional[str] = None
    is_admin: bool = False
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
