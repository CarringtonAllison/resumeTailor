import os
from dataclasses import dataclass, field
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()


@dataclass
class Config:
    anthropic_api_key: str
    tavily_api_key: str
    model: str = "claude-sonnet-4-6"
    max_jobs: int = 20
    output_dir: Path = field(default_factory=lambda: Path("output"))
    frontend_dist: Path = field(default_factory=lambda: Path("frontend/dist"))

    @classmethod
    def from_env(cls) -> "Config":
        anthropic_key = os.environ.get("ANTHROPIC_API_KEY", "")
        tavily_key = os.environ.get("TAVILY_API_KEY", "")
        missing = [k for k, v in [("ANTHROPIC_API_KEY", anthropic_key), ("TAVILY_API_KEY", tavily_key)] if not v]
        if missing:
            raise EnvironmentError(f"Missing required environment variables: {', '.join(missing)}")
        return cls(anthropic_api_key=anthropic_key, tavily_api_key=tavily_key)
