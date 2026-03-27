import logging
from pathlib import Path

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from agents.resume_reader import ResumeReaderAgent
from api.session import get, get_or_create
from config import Config

logger = logging.getLogger(__name__)
router = APIRouter()
_config: Config | None = None


def init(config: Config):
    global _config
    _config = config


@router.post("/upload")
async def upload_resume(session_id: str = Form(...), file: UploadFile = File(...)):
    if file.filename and not file.filename.lower().endswith((".pdf", ".docx")):
        raise HTTPException(status_code=400, detail="Only PDF and DOCX files are supported.")

    state = get_or_create(session_id)
    suffix = Path(file.filename).suffix.lower()
    session_dir = _config.output_dir / session_id
    session_dir.mkdir(parents=True, exist_ok=True)

    resume_path = session_dir / f"source_resume{suffix}"
    contents = await file.read()
    resume_path.write_bytes(contents)

    try:
        agent = ResumeReaderAgent(_config)
        agent.run(state, resume_path)
    except Exception as e:
        logger.error("Resume parsing failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Failed to parse resume: {e}")

    return state.resume.model_dump()


@router.get("/resume/{session_id}")
async def get_resume(session_id: str):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet")
    return state.resume.model_dump()
