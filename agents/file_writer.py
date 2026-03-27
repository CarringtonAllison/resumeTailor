import logging
from pathlib import Path

from config import Config
from models.job import PipelineState
from tools.document_writer import write_docx, write_pdf
from tools.file_io import slugify

logger = logging.getLogger(__name__)


class FileWriterAgent:
    def __init__(self, config: Config):
        self.config = config

    def run_single(self, state: PipelineState, job_id: str) -> dict[str, Path]:
        tailored = next((t for t in state.tailored if t.job_id == job_id), None)
        if not tailored:
            raise ValueError(f"No tailored resume found for job {job_id}")

        company_slug = slugify(tailored.company)
        title_slug = slugify(tailored.job_title)
        base_name = f"{company_slug}_{title_slug}_resume"

        session_dir = self.config.output_dir / state.session_id
        docx_path = session_dir / f"{base_name}.docx"
        pdf_path = session_dir / f"{base_name}.pdf"

        write_docx(tailored.resume, docx_path)
        logger.info("Wrote DOCX: %s", docx_path)

        write_pdf(tailored.resume, pdf_path)
        logger.info("Wrote PDF: %s", pdf_path)

        return {"docx": docx_path, "pdf": pdf_path}
