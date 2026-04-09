"""Shared fixtures for Resume Tailor tests."""

import io
import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient

from config import Config
from models.resume import Resume, Role
from models.job import Job, PipelineState


@pytest.fixture(autouse=True)
def _clear_sessions():
    """Clear in-memory sessions between tests."""
    yield
    import api.session as session_mod
    session_mod._sessions.clear()


@pytest.fixture()
def config():
    return Config(
        anthropic_api_key="test-key",
        tavily_api_key="test-tavily-key",
    )


@pytest.fixture()
def client(config):
    """Create a TestClient with mocked config (no real API keys needed)."""
    with patch("api.app.Config.from_env", return_value=config):
        import importlib
        import api.app
        importlib.reload(api.app)
        yield TestClient(api.app.app)


@pytest.fixture()
def sample_resume():
    return Resume(
        contact={"name": "Test User", "email": "test@example.com"},
        summary="Experienced software engineer.",
        skills=["Python", "FastAPI", "React"],
        experience=[
            Role(
                company="Acme Corp",
                title="Software Engineer",
                dates="2020-2024",
                bullets=["Built things"],
            )
        ],
        education=[],
        extras=[],
    )


@pytest.fixture()
def session_id(client, config, sample_resume):
    """Upload a resume via the API and return the session ID."""
    fake_pdf = io.BytesIO(b"%PDF-1.4 fake content")

    with patch("api.routes.resume.ResumeReaderAgent") as MockReader:
        mock_agent = MagicMock()
        mock_agent.run.side_effect = lambda state, path: setattr(state, "resume", sample_resume)
        MockReader.return_value = mock_agent

        resp = client.post(
            "/api/upload",
            data={"session_id": "test-session"},
            files={"file": ("resume.pdf", fake_pdf, "application/pdf")},
        )
        assert resp.status_code == 200
        return "test-session"


def make_job(**overrides) -> Job:
    """Helper to create a Job with sensible defaults."""
    defaults = dict(
        id="job-1",
        title="Software Engineer",
        company="Acme Corp",
        url="https://example.com/jobs/1",
    )
    defaults.update(overrides)
    return Job(**defaults)
