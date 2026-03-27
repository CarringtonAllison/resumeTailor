from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from config import Config

router = APIRouter()
_config: Config | None = None


def init(config: Config):
    global _config
    _config = config


@router.get("/download/{session_id}/{filename}")
async def download_file(session_id: str, filename: str):
    # Sanitize filename to prevent path traversal
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="Invalid filename")

    file_path = _config.output_dir / session_id / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")

    media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document" \
        if filename.endswith(".docx") else "application/pdf"

    return FileResponse(path=str(file_path), filename=filename, media_type=media_type)
