from __future__ import annotations
from pydantic import BaseModel
from models.resume import Resume, TailoredResume


class Job(BaseModel):
    id: str
    title: str
    company: str
    location: str = ""
    url: str
    description: str = ""
    required_skills: list[str] = []
    responsibilities: list[str] = []
    qualifications: list[str] = []
    salary: str = ""
    about: str = ""
    benefits: list[str] = []
    enriched: bool = False


class PipelineState(BaseModel):
    session_id: str
    resume: Resume | None = None
    jobs: list[Job] = []
    tailored: list[TailoredResume] = []
    errors: list[str] = []
