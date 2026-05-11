from pydantic import BaseModel

class TokenPayload(BaseModel):
    sub: str        # id del usuario
    exp: int        # expiración
    iat: int        # fecha de creación

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"