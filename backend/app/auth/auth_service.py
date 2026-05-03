from datetime import datetime, timedelta
import jwt
from app.auth.auth_types import TokenPayload, TokenResponse
from app.settings import settings

class AuthService:
    
    def create_token(self, user_id: str) -> TokenResponse:
        now = datetime.utcnow()
        payload = {
            "sub": user_id,
            "iat": now,
            "exp": now + timedelta(minutes=settings.jwt_expire_minutes)
        }
        token = jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)
        return TokenResponse(access_token=token)

    def validate_token(self, token: str) -> TokenPayload:
        try:
            payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
            return TokenPayload(**payload)
        except jwt.ExpiredSignatureError:
            raise ValueError("Token expirado")
        except jwt.InvalidTokenError:
            raise ValueError("Token inválido")