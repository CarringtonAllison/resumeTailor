import logging
import uuid

from tavily import TavilyClient

from config import Config
from models.job import Job, PipelineState

logger = logging.getLogger(__name__)


class JobSearchAgent:
    def __init__(self, config: Config):
        self.config = config
        self.client = TavilyClient(api_key=config.tavily_api_key)

    def run(self, state: PipelineState, query: str | None = None, max_jobs: int | None = None) -> None:
        max_jobs = max_jobs or self.config.max_jobs

        if not query:
            skills = ", ".join(state.resume.skills[:5]) if state.resume else ""
            query = f"{skills} jobs site:greenhouse.io OR site:lever.co OR site:jobs.ashbyhq.com"

        logger.info("Searching jobs: %s", query)

        try:
            results = self.client.search(query, max_results=max_jobs)
            for r in results.get("results", []):
                job = Job(
                    id=str(uuid.uuid4()),
                    title=r.get("title", "Unknown Role"),
                    company=_extract_company(r.get("url", ""), r.get("title", "")),
                    location="",
                    url=r.get("url", ""),
                    description=r.get("content", ""),
                )
                state.jobs.append(job)
            logger.info("Found %d jobs", len(state.jobs))
        except Exception as e:
            msg = f"Job search failed: {e}"
            logger.error(msg)
            state.errors.append(msg)


def _extract_company(url: str, title: str) -> str:
    # Try to extract company from common ATS URL patterns
    import re
    patterns = [
        r"greenhouse\.io/([^/]+)",
        r"lever\.co/([^/]+)",
        r"ashbyhq\.com/([^/]+)",
        r"jobs\.([^.]+)\.",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1).replace("-", " ").title()
    # Fall back to title heuristic: "Role at Company" or "Role - Company"
    for sep in [" at ", " @ ", " - ", " | "]:
        if sep in title:
            return title.split(sep)[-1].strip()
    return "Unknown Company"
