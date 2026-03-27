from pydantic import BaseModel


class Role(BaseModel):
    company: str
    title: str
    dates: str
    bullets: list[str]


class Resume(BaseModel):
    contact: dict
    summary: str
    skills: list[str]
    experience: list[Role]
    education: list[dict]
    extras: list[dict]
    raw_text: str = ""


class TailoredResume(BaseModel):
    job_id: str
    job_title: str
    company: str
    resume: Resume
