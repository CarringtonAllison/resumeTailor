import json
import logging
from pathlib import Path

import anthropic

from config import Config
from models.job import PipelineState
from models.resume import Resume, TailoredResume

logger = logging.getLogger(__name__)


def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


class ResumeTailorAgent:
    def __init__(self, config: Config):
        self.config = config
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        prompt_path = Path("prompts/tailor_resume.txt")
        self.system_prompt = prompt_path.read_text(encoding="utf-8")

    def run_single(self, state: PipelineState, job_id: str) -> TailoredResume:
        job = next((j for j in state.jobs if j.id == job_id), None)
        if not job:
            raise ValueError(f"Job {job_id} not found in state")
        if not state.resume:
            raise ValueError("No resume in state")

        logger.info("Tailoring resume for: %s @ %s", job.title, job.company)

        job_description = f"""Title: {job.title}
Company: {job.company}
Location: {job.location}

{job.description}

Required Skills: {', '.join(job.required_skills)}
Responsibilities: {chr(10).join(f'- {r}' for r in job.responsibilities)}
Qualifications: {chr(10).join(f'- {q}' for q in job.qualifications)}"""

        user_message = (
            f"RESUME JSON:\n{state.resume.model_dump_json(indent=2)}\n\n"
            f"JOB DESCRIPTION:\n{job_description}"
        )

        message = self.client.messages.create(
            model=self.config.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[{"role": "user", "content": user_message}],
        )

        data = json.loads(_clean_json(message.content[0].text))
        data["raw_text"] = state.resume.raw_text
        tailored_resume = TailoredResume(
            job_id=job_id,
            job_title=job.title,
            company=job.company,
            resume=Resume(**data),
        )
        state.tailored.append(tailored_resume)
        return tailored_resume
