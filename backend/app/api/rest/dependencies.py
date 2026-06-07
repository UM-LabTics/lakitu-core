from fastapi import Depends, HTTPException, Header
from app.auth.instance import auth_service
from app.auth.auth_types import TokenPayload

async def get_current_user(authorization: str = Header(...)) -> TokenPayload:
    try:
        token = authorization.removeprefix("Bearer ")
        return auth_service.validate_token(token)
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))