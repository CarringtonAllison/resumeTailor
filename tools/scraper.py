import logging

import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}


def fetch_page(url: str, timeout: int = 15) -> str:
    try:
        response = httpx.get(url, headers=HEADERS, timeout=timeout, follow_redirects=True)
        response.raise_for_status()
        return response.text
    except httpx.HTTPError as e:
        logger.warning(f"Failed to fetch {url}: {e}")
        return ""


def parse_job_page(html: str, url: str) -> dict:
    if not html:
        return {"raw_text": "", "url": url}

    soup = BeautifulSoup(html, "html.parser")

    # Remove noise elements
    for tag in soup(["script", "style", "nav", "header", "footer", "aside"]):
        tag.decompose()

    # Try to find the main content area
    content = (
        soup.find("main")
        or soup.find("article")
        or soup.find(attrs={"class": lambda c: c and "job" in " ".join(c).lower()})
        or soup.find("body")
    )

    raw_text = content.get_text(separator="\n", strip=True) if content else ""
    # Collapse excessive blank lines
    import re
    raw_text = re.sub(r"\n{3,}", "\n\n", raw_text)

    return {"raw_text": raw_text[:8000], "url": url}  # cap at 8k chars for LLM context
