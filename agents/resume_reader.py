import json
import logging
from pathlib import Path

import anthropic

from config import Config
from models.job import PipelineState
from models.resume import Resume
from tools.file_io import read_resume_file

logger = logging.getLogger(__name__)


def _clean_json(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[-1]
        text = text.rsplit("```", 1)[0]
    return text.strip()


class ResumeReaderAgent:
    def __init__(self, config: Config):
        self.config = config
        self.client = anthropic.Anthropic(api_key=config.anthropic_api_key)
        prompt_path = Path("prompts/extract_resume.txt")
        self.system_prompt = prompt_path.read_text(encoding="utf-8")

    def run(self, state: PipelineState, resume_path: Path) -> None:
        logger.info("Reading resume file: %s", resume_path)
        raw_text = read_resume_file(resume_path)

        logger.info("Extracting resume structure with Claude...")
        message = self.client.messages.create(
            model=self.config.model,
            max_tokens=4096,
            system=self.system_prompt,
            messages=[{"role": "user", "content": raw_text}],
        )

        raw_json = _clean_json(message.content[0].text)
        data = json.loads(raw_json)
        data["raw_text"] = raw_text
        state.resume = Resume(**data)
        logger.info("Resume parsed: %s", state.resume.contact.get("name", "unknown"))
