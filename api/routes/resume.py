import json
import logging
from pathlib import Path

import anthropic
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


@router.post("/suggest-roles/{session_id}")
async def suggest_roles(session_id: str):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.resume:
        raise HTTPException(status_code=400, detail="Upload a resume first")

    resume = state.resume
    lines = []
    if resume.experience:
        titles = [r.title for r in resume.experience]
        lines.append(f"Recent roles: {', '.join(titles)}")
    if resume.skills:
        lines.append(f"Skills: {', '.join(resume.skills[:15])}")
    if resume.summary:
        lines.append(f"Summary: {resume.summary[:300]}")
    resume_snippet = "\n".join(lines)

    try:
        client = anthropic.Anthropic(api_key=_config.anthropic_api_key)
        msg = client.messages.create(
            model=_config.model,
            max_tokens=200,
            messages=[{
                "role": "user",
                "content": (
                    "Based on this resume, suggest exactly 6 specific job role titles "
                    "this person should search for. Be specific and varied — include lateral "
                    "moves and natural next steps. Return ONLY a valid JSON array of strings, "
                    "no other text.\n\n" + resume_snippet
                ),
            }],
        )
        roles = json.loads(msg.content[0].text)
        if not isinstance(roles, list):
            raise ValueError("Expected a JSON array")
    except Exception as e:
        logger.error("Role suggestion failed: %s", e)
        # Fall back to experience titles
        roles = [r.title for r in (resume.experience or [])[:6]]

    return {"roles": roles}


@router.get("/resume/{session_id}")
async def get_resume(session_id: str):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.resume:
        raise HTTPException(status_code=404, detail="No resume uploaded yet")
    return state.resume.model_dump()
