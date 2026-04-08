import logging
import re
import uuid

from tavily import TavilyClient

from config import Config
from models.job import Job, PipelineState

logger = logging.getLogger(__name__)

_TAVILY_MAX = 20

_PRIORITY_DOMAINS = ["linkedin.com", "indeed.com"]
_ATS_DOMAINS = ["greenhouse.io", "lever.co", "jobs.ashbyhq.com"]


def _build_query(base_query: str, location: str | None, location_type: str | None) -> str:
    """Build a Tavily query targeting individual job postings with optional location."""
    parts = [base_query]

    if location_type == "remote":
        parts.append("remote")
    elif location_type == "local" and location:
        parts.append(f'"{location}"')
    elif location_type == "both" and location:
        parts.append(f'("{location}" OR remote)')

    # Terms that appear on individual posting pages, not search result listing pages
    parts.append("job description apply")
    return " ".join(parts)


def _is_listing_page(url: str) -> bool:
    """Return True if the URL is a search/listing page rather than an individual posting."""
    if "indeed.com" in url:
        return "/viewjob" not in url and "/rc/" not in url and "/pagead/" not in url
    if "linkedin.com" in url:
        return "/jobs/view/" not in url
    return False


class JobSearchAgent:
    def __init__(self, config: Config):
        self.config = config
        self.client = TavilyClient(api_key=config.tavily_api_key)

    def run(
        self,
        state: PipelineState,
        query: str | None = None,
        max_jobs: int | None = None,
        location: str | None = None,
        location_type: str | None = None,
    ) -> None:
        max_jobs = min(max_jobs or self.config.max_jobs, 60)

        if not query:
            roles = [r.title for r in (state.resume.experience or [])[:3]] if state.resume else []
            if roles:
                query = " OR ".join(f'"{r}"' for r in roles)
            else:
                skills = ", ".join(state.resume.skills[:5]) if state.resume else ""
                query = skills or "software engineer"

        query_text = _build_query(query, location, location_type)
        logger.info("Searching jobs (max=%d): %s", max_jobs, query_text)

        seen_urls: set[str] = set()
        all_results: list[dict] = []

        search_tiers = [
            (_PRIORITY_DOMAINS, "advanced"),
            (_ATS_DOMAINS, "basic"),
        ]

        for domains, depth in search_tiers:
            if len(all_results) >= max_jobs:
                break
            needed = min(max_jobs - len(all_results), _TAVILY_MAX)
            try:
                results = self.client.search(
                    query=query_text,
                    max_results=needed,
                    include_domains=domains,
                    search_depth=depth,
                )
                for r in results.get("results", []):
                    url = r.get("url", "")
                    if not url or url in seen_urls:
                        continue
                    if _is_listing_page(url):
                        continue
                    seen_urls.add(url)
                    all_results.append(r)
            except Exception as e:
                logger.warning("Tier search failed (domains=%s): %s", domains, e)

        for r in all_results[:max_jobs]:
            raw_title = r.get("title", "Unknown Role")
            company = _extract_company(r.get("url", ""), raw_title)
            title = _clean_title(raw_title, company)
            job = Job(
                id=str(uuid.uuid4()),
                title=title,
                company=company,
                location="",
                url=r.get("url", ""),
                description=r.get("content", ""),
            )
            state.jobs.append(job)

        logger.info("Found %d jobs", len(state.jobs))


# Known ATS / job board platform names to strip from titles
_PLATFORM_NAMES = [
    "Lever", "Greenhouse", "Ashby", "Indeed", "LinkedIn", "Glassdoor",
    "ZipRecruiter", "Wellfound", "AngelList", "Jobgether", "Dice",
    "SimplyHired", "Monster", "CareerBuilder", "Hired", "Built In",
]
_PLATFORM_PATTERN = "|".join(re.escape(p) for p in _PLATFORM_NAMES)


def _clean_title(title: str, company: str) -> str:
    """Strip platform names, filler prefixes, and company name from Tavily page titles."""
    # Strip trailing " - Platform" or " | Platform"
    title = re.sub(rf"\s*[|\-–—]\s*(?:{_PLATFORM_PATTERN})\s*$", "", title, flags=re.IGNORECASE)
    # Strip leading "CompanyName - " prefix if company was extracted from URL
    if company and company != "Unknown Company":
        title = re.sub(rf"^{re.escape(company)}\s*[|\-–—]\s*", "", title, flags=re.IGNORECASE)
    # Strip common filler prefixes from ATS page titles
    title = re.sub(r"^(?:Job\s+Application\s+for|Apply\s+for|Hiring)\s+", "", title, flags=re.IGNORECASE)
    return title.strip() or "Unknown Role"


def _extract_company(url: str, title: str) -> str:
    patterns = [
        r"linkedin\.com/company/([^/]+)",
        r"linkedin\.com/jobs/view/[^/]+-at-([^/]+)",
        r"indeed\.com/cmp/([^/]+)",
        r"indeed\.com/viewjob.*?company=([^&]+)",
        r"greenhouse\.io/([^/]+)",
        r"lever\.co/([^/]+)",
        r"ashbyhq\.com/([^/]+)",
        r"jobs\.([^.]+)\.",
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1).replace("-", " ").replace("+", " ").title()
    for sep in [" at ", " @ ", " - ", " | "]:
        if sep in title:
            return title.split(sep)[-1].strip()
    return "Unknown Company"
