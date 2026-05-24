from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from app.auth.auth_types import TokenPayload, TokenResponse, SignupRequest, LoginRequest, UserResponse
from app.persistence.persistence import Persistence
from app.settings import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:

    def __init__(self, persistence: Persistence):
        self.persistence = persistence

    def _hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def _verify_password(self, plain: str, hashed: str) -> bool:
        return pwd_context.verify(plain, hashed)

    async def signup(self, req: SignupRequest) -> tuple[UserResponse, TokenResponse] | None:
        hashed = self._hash_password(req.password)
        user_id = await self.persistence.add_user(
            email=req.email,
            hashed_password=hashed,
            name=req.name
        )
        if user_id is None:
            return None
        user = UserResponse(id=user_id, email=req.email)
        token = self.create_token(str(user_id))
        return user, token

    async def login(self, req: LoginRequest) -> tuple[UserResponse, TokenResponse] | None:
        user_data = await self.persistence.get_user_by_email(req.email)
        if user_data is None:
            return None
        if not self._verify_password(req.password, user_data["hashed_password"]):
            return None
        user = UserResponse(id=user_data["id"], email=user_data["email"])
        token = self.create_token(str(user_data["id"]))
        return user, token
    
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