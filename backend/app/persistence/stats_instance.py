from app.persistence.database import build_engine
from app.persistence.stats import Stats

engine = build_engine()
stats = Stats(engine)