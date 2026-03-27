import json
import logging

import anthropic

from config import Config
from models.job import PipelineState
from tools.scraper import fetch_page, parse_job_page

logger = logging.getLogger(__name__)

EXTRACT_PROMPT = """You are a job posting parser. Given raw text scraped from a job posting page, extract the following fields and return ONLY valid JSON — no markdown fences, no commentary.

{
  "title": "job title",
  "company": "company name",
  "location": "location or Remote",
  "required_skills": ["skill1", "skill2"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "qualifications": ["qualification1", "qualification2"]
}

If a field cannot be determined from the text, use an empty string or empty array. Do not invent information."""


def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


class JobScraperAgent:
    def __init__(self, config: Config):
        self.config = config
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)

    def run(self, state: PipelineState) -> None:
        for job in state.jobs:
            try:
                logger.info("Scraping: %s", job.url)
                html = fetch_page(job.url)
                parsed = parse_job_page(html, job.url)
                raw_text = parsed["raw_text"]

                if not raw_text:
                    logger.warning("No content retrieved for %s", job.url)
                    continue

                message = self.client.messages.create(
                    model=self.config.model,
                    max_tokens=1024,
                    system=EXTRACT_PROMPT,
                    messages=[{"role": "user", "content": raw_text}],
                )

                data = json.loads(_clean_json(message.content[0].text))
                job.title = data.get("title") or job.title
                job.company = data.get("company") or job.company
                job.location = data.get("location", "")
                job.required_skills = data.get("required_skills", [])
                job.responsibilities = data.get("responsibilities", [])
                job.qualifications = data.get("qualifications", [])
                job.description = raw_text

            except Exception as e:
                msg = f"Failed to scrape {job.url}: {e}"
                logger.warning(msg)
                state.errors.append(msg)
