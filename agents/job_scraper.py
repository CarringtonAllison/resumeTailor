import json
import logging

import anthropic
from tavily import TavilyClient

from config import Config
from models.job import Job, PipelineState
from tools.scraper import fetch_page, parse_job_page

logger = logging.getLogger(__name__)

EXTRACT_PROMPT = """You are a job posting parser. Given raw text scraped from a job posting page, extract the following fields and return ONLY valid JSON — no markdown fences, no commentary.

{
  "title": "job title",
  "company": "company name",
  "location": "location or Remote",
  "salary": "salary or pay range if mentioned (e.g. '$120,000 - $180,000/year'), otherwise empty string",
  "about": "brief company or role overview paragraph, 2-3 sentences max summarizing what the company does and the role",
  "required_skills": ["skill1", "skill2"],
  "responsibilities": ["responsibility1", "responsibility2"],
  "qualifications": ["qualification1", "qualification2"],
  "benefits": ["benefit1", "benefit2"]
}

If a field cannot be determined from the text, use an empty string or empty array. Do not invent information."""


def _is_blocked_content(text: str) -> bool:
    """Detect captcha/challenge pages that don't contain actual job data."""
    lowered = text.lower()
    blockers = ["verification required", "just a moment", "checking your browser",
                "captcha", "access denied", "enable javascript"]
    return any(b in lowered for b in blockers) and len(text) < 2000


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
        self.tavily = TavilyClient(api_key=config.tavily_api_key)

    def run(self, state: PipelineState) -> None:
        """Batch-scrape all jobs in state. Used for testing/batch scenarios."""
        for job in state.jobs:
            try:
                self._enrich_job(job)
            except Exception as e:
                msg = f"Failed to scrape {job.url}: {e}"
                logger.warning(msg)
                state.errors.append(msg)

    def parse_text(self, job: Job, raw_text: str) -> Job:
        """Extract structured job data from user-provided text. Uses Claude only."""
        logger.info("Parsing pasted text for job %s", job.id)
        raw_text = raw_text[:8000]
        try:
            message = self.client.messages.create(
                model=self.config.model,
                max_tokens=1024,
                system=EXTRACT_PROMPT,
                messages=[{"role": "user", "content": raw_text}],
            )
            data = json.loads(_clean_json(message.content[0].text))
            job.title = data.get("title") or job.title or "Unknown Role"
            job.company = data.get("company") or job.company or "Unknown Company"
            job.location = data.get("location", "")
            job.salary = data.get("salary", "")
            job.about = data.get("about", "")
            job.required_skills = data.get("required_skills", [])
            job.responsibilities = data.get("responsibilities", [])
            job.qualifications = data.get("qualifications", [])
            job.benefits = data.get("benefits", [])
            job.description = raw_text
        except Exception as e:
            logger.warning("Claude extraction failed: %s", e)
            job.description = raw_text
        job.enriched = True
        return job

    def run_single(self, state: PipelineState, job_id: str) -> Job:
        """Scrape and enrich a single job by ID. Never raises — always returns the job."""
        job = next((j for j in state.jobs if j.id == job_id), None)
        if not job:
            raise ValueError(f"Job {job_id} not found in state")

        if job.enriched:
            return job

        self._enrich_job(job)
        return job

    def _enrich_job(self, job: Job) -> None:
        """Core enrichment logic. Gracefully degrades — always sets enriched=True."""
        logger.info("Enriching: %s", job.url)

        raw_text = ""

        # Try direct fetch first (fast, no API cost)
        try:
            html = fetch_page(job.url)
            parsed = parse_job_page(html, job.url)
            raw_text = parsed["raw_text"]
        except Exception as e:
            logger.warning("Direct fetch failed for %s: %s", job.url, e)

        # Fall back to Tavily extract (handles bot-blocked sites)
        if not raw_text:
            try:
                logger.info("Falling back to Tavily extract for %s", job.url)
                result = self.tavily.extract(urls=[job.url], extract_depth="advanced")
                for item in result.get("results", []):
                    content = item.get("raw_content", "") or item.get("text", "")
                    if content and not _is_blocked_content(content):
                        raw_text = content[:8000]
                        break
            except Exception as e:
                logger.warning("Tavily extract failed for %s: %s", job.url, e)

        if not raw_text:
            logger.warning("No content retrieved for %s", job.url)
            job.enriched = True
            raise RuntimeError(
                "Could not retrieve job content — this site blocks automated access. "
                "Try pasting a direct link from the company's career page instead "
                "(e.g. Greenhouse, Lever, or Ashby URLs work well)."
            )

        try:
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
            job.salary = data.get("salary", "")
            job.about = data.get("about", "")
            job.required_skills = data.get("required_skills", [])
            job.responsibilities = data.get("responsibilities", [])
            job.qualifications = data.get("qualifications", [])
            job.benefits = data.get("benefits", [])
            job.description = raw_text
        except Exception as e:
            logger.warning("Claude extraction failed for %s: %s", job.url, e)

        job.enriched = True
