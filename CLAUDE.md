# CLAUDE.md — Resume Tailor Project Rules

## Git Workflow
- Commit after every meaningful change
- Use conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`
- **Always ask the user for permission before pushing to GitHub**

## Stack
- Backend: Python 3.11+, FastAPI, Anthropic SDK (`claude-sonnet-4-6`)
- Frontend: React + Vite + Tailwind CSS + Framer Motion + Zustand
- Agents: ResumeReader, JobSearch, JobScraper, ResumeTailor, FileWriter

## Project Structure
- `models/` — Pydantic v2 data models (Resume, Job, PipelineState)
- `agents/` — one agent per file, each with a `run()` or `run_single()` method
- `tools/` — stateless utility functions (file I/O, scraping, document writing)
- `api/` — FastAPI app + routes, session state
- `frontend/` — React SPA, built with Vite, served by FastAPI from `frontend/dist/`
- `prompts/` — LLM system prompt text files

## API Endpoints
- `POST /api/upload` — upload resume, returns parsed Resume JSON
- `POST /api/jobs/{session_id}` — search + scrape jobs, returns list of Job JSON
- `POST /api/tailor/{session_id}/{job_id}` — tailor resume for a job, returns TailoredResume JSON
- `GET /api/download/{session_id}/{filename}` — download DOCX or PDF

## Environment Variables Required
- `ANTHROPIC_API_KEY`
- `TAVILY_API_KEY`
