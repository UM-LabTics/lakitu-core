from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.auth import auth_service

router = APIRouter(prefix="/api/users")


class SignUpRequest(BaseModel):
    user_id: str


class LoginRequest(BaseModel):
    user_id: str


@router.post("/signup")
async def signup(payload: SignUpRequest):
    # TODO: llamar a persistence para crear el usuario cuando esté listo
    token = auth_service.create_token(user_id=payload.user_id)
    return token


@router.post("/login")
async def login(payload: LoginRequest):
    # TODO: llamar a persistence para validar credenciales cuando esté listo
    token = auth_service.create_token(user_id=payload.user_id)
    return token