from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from app.auth import auth_service

router = APIRouter(prefix="/api/auth")

class LoginRequest(BaseModel):
    user_id: str

@router.post("/token")
def create_token(request: LoginRequest):
    token = auth_service.create_token(user_id=request.user_id)
    return token

@router.get("/validate")
def validate_token(authorization: str = Header(...)):
    try:
        token = authorization.replace("Bearer ", "")
        payload = auth_service.validate_token(token)
        return {"valid": True, "user_id": payload.sub}
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))