from typing import Optional
from pydantic import ConfigDict, BaseModel, EmailStr, Field

class RegisterRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    password: str = Field(..., min_length=8, max_length=128)

class LoginRequest(BaseModel):
    remember_me: bool = False
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    role: str
    is_active: bool

    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True)

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

