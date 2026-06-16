from fastapi import APIRouter, Depends, HTTPException, Request, Query
from app.api.rest.dependencies import get_current_user
from app.auth.auth_types import TokenPayload
from app.persistence.instance import persistence
from pydantic import BaseModel

router = APIRouter()

class ParkingAccess(BaseModel):
    id: str
    name: str

@router.get("/getParkings", response_model=list[ParkingAccess])
async def get_parkings(current_user: TokenPayload = Depends(get_current_user)):
    parkings = await persistence.list_user_parking_access(int(current_user.sub))
    if parkings is None:
        raise HTTPException(status_code=500, detail="Error al obtener los parkings")
    return parkings

    
@router.get("/takePhoto")
async def take_photo(request: Request, parking_id:str = Query(...)):
    device_id = persistence.get_device_from_parking(parking_id=parking_id)
    response = request.app.state.cloud_receptor.send_command(payload={"parking_id":parking_id,"device_id":device_id,"commandName":"request-photo"})