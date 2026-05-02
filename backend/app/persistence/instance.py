from .database import build_engine
from .persistence import Persistence

engine = build_engine()
persistence = Persistence(engine)