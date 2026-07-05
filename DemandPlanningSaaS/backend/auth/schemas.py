"""Pydantic request/response schemas for the auth API.

Email is typed as a plain ``str`` (not ``EmailStr``) to avoid adding the
``email-validator`` dependency; format validation is not security-relevant here.
"""

from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenPair(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    organization_id: int

    model_config = {"from_attributes": True}


class PasswordResetRequest(BaseModel):
    email: str


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=8)


class MessageResponse(BaseModel):
    message: str
