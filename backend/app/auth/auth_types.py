from pydantic import BaseModel

class TokenPayload(BaseModel):
    sub: str        # id del usuario
    exp: int        # expiración
    iat: int        # fecha de creación
    is_admin: bool

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class SignupRequest(BaseModel):
    email: str
    password: str
    name: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    is_admin: int