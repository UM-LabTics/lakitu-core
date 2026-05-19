from app.persistence.instance import persistence
from .auth_service import AuthService

auth_service = AuthService(persistence)