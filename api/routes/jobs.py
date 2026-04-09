import logging
import uuid
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.job_scraper import JobScraperAgent
from agents.job_search import JobSearchAgent
from agents.file_writer import FileWriterAgent
from agents.resume_tailor import ResumeTailorAgent
from api.session import get
from config import Config

logger = logging.getLogger(__name__)
router = APIRouter()
_config: Config | None = None


def init(config: Config):
    global _config
    _config = config


class JobSearchRequest(BaseModel):
    query: str | None = None
    max_jobs: int | None = None
    location: str | None = None
    location_type: Literal["local", "remote", "both"] | None = None


class AddJobByUrlRequest(BaseModel):
    url: str


@router.post("/jobs/{session_id}")
async def search_jobs(session_id: str, body: JobSearchRequest = JobSearchRequest()):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.resume:
        raise HTTPException(status_code=400, detail="Upload a resume first")

    # Reset jobs list for a fresh search
    state.jobs = []
    state.errors = []

    try:
        JobSearchAgent(_config).run(
            state,
            query=body.query,
            max_jobs=body.max_jobs,
            location=body.location,
            location_type=body.location_type,
        )
    except Exception as e:
        logger.error("Job search failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return [j.model_dump() for j in state.jobs]


@router.post("/jobs/{session_id}/add-url")
async def add_job_by_url(session_id: str, body: AddJobByUrlRequest):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")

    from models.job import Job

    job = Job(id=str(uuid.uuid4()), title="", company="", url=body.url)
    state.jobs.insert(0, job)

    try:
        job = JobScraperAgent(_config).run_single(state, job.id)
    except Exception as e:
        logger.error("Failed to scrape job from URL %s: %s", body.url, e)
        raise HTTPException(status_code=500, detail=f"Failed to scrape job: {e}")

    return job.model_dump()


@router.post("/jobs/{session_id}/{job_id}/enrich")
async def enrich_job(session_id: str, job_id: str):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        job = JobScraperAgent(_config).run_single(state, job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Enrichment failed for job %s: %s", job_id, e)
        raise HTTPException(status_code=500, detail=f"Failed to enrich job: {e}")

    return job.model_dump()


@router.post("/tailor/{session_id}/{job_id}")
async def tailor_resume(session_id: str, job_id: str):
    try:
        state = get(session_id)
    except KeyError:
        raise HTTPException(status_code=404, detail="Session not found")

    # Return cached result if already tailored
    cached = next((t for t in state.tailored if t.job_id == job_id), None)
    if cached:
        return cached.model_dump()

    # Ensure job is enriched before tailoring
    job = next((j for j in state.jobs if j.id == job_id), None)
    if not job:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")
    if not job.enriched:
        try:
            JobScraperAgent(_config).run_single(state, job_id)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Job must be enriched first; auto-enrich failed: {e}")

    try:
        tailored = ResumeTailorAgent(_config).run_single(state, job_id)
        FileWriterAgent(_config).run_single(state, job_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error("Tailoring failed: %s", e)
        raise HTTPException(status_code=500, detail=str(e))

    return tailored.model_dump()
