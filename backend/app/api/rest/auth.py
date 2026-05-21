from fastapi import APIRouter, HTTPException, Query
from app.auth.instance import auth_service
from app.auth.auth_types import SignupRequest, LoginRequest

router = APIRouter(prefix="/api")


@router.post("/signup")
async def signup(
    email: str = Query(...),
    password: str = Query(...),
    name: str = Query(...),
):
    req = SignupRequest(email=email, password=password, name=name)
    result = await auth_service.signup(req)
    if result is None:
        raise HTTPException(status_code=409, detail="Email already in use")
    user, token = result
    return {"user": user, "token": token.access_token}


@router.post("/login")
async def login(
    email: str = Query(...),
    password: str = Query(...),
):
    req = LoginRequest(email=email, password=password)
    result = await auth_service.login(req)
    if result is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user, token = result
    return {"token": token.access_token, "user": user}