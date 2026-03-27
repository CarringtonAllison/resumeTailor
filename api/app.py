import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import Config
import api.routes.resume as resume_routes
import api.routes.jobs as jobs_routes
import api.routes.download as download_routes

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")

config = Config.from_env()

app = FastAPI(title="Resume Tailor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite dev server
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inject config into route modules
resume_routes.init(config)
jobs_routes.init(config)
download_routes.init(config)

app.include_router(resume_routes.router, prefix="/api")
app.include_router(jobs_routes.router, prefix="/api")
app.include_router(download_routes.router, prefix="/api")

# Serve built React frontend — only if dist exists
frontend_dist = Path(config.frontend_dist)
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="frontend")
