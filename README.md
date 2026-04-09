# Resume Tailor

An AI-powered tool that reads your resume, finds relevant job postings, and tailors your resume for each one — highlighting exactly what changed.

![Python](https://img.shields.io/badge/Python-3.11+-blue)
![React](https://img.shields.io/badge/React-18-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-green)
![Claude](https://img.shields.io/badge/Claude-Sonnet%204.6-orange)

## Demo

https://github.com/user-attachments/assets/f8237bf9-0040-424c-abe5-dd1d232e9512

## How It Works

1. **Upload** your resume (PDF or DOCX)
2. **Select roles** from AI-suggested titles or type your own
3. **Set location** preference (Local, Remote, or Both)
4. **Add a specific job** by URL or paste the job description directly
5. **Browse** job postings found from LinkedIn, Indeed, Greenhouse, Lever, and more
6. **View** full job details — skills, responsibilities, qualifications, salary
7. **Tailor** your resume with one click — the AI rewrites it to match the job
8. **See the diff** — changed sections are highlighted in green
9. **Download** tailored resumes as DOCX or PDF

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI, Uvicorn |
| AI | Anthropic Claude (Sonnet 4.6) |
| Job Search | Tavily Search API |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion, Zustand |
| Documents | python-docx (DOCX), ReportLab (PDF) |

## Project Structure

```
resumeTailor/
  agents/          # AI agent modules (one per file)
    resume_reader.py    # Parses uploaded resumes
    job_search.py       # Searches for jobs via Tavily
    job_scraper.py      # Scrapes and enriches job postings with Claude
    resume_tailor.py    # Tailors resume content for a specific job
    file_writer.py      # Generates DOCX/PDF output files
  api/             # FastAPI application and routes
  models/          # Pydantic v2 data models (Resume, Job, TailoredResume)
  tools/           # Stateless utilities (scraping, file I/O)
  prompts/         # LLM system prompt text files
  frontend/        # React SPA (Vite + Tailwind)
  tests/           # pytest test suite
  config.py        # App configuration (loads from .env)
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)
- A [Tavily API key](https://tavily.com/)

### Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/CarringtonAllison/resumeTailor.git
   cd resumeTailor
   ```

2. **Create a `.env` file** in the project root
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   TAVILY_API_KEY=tvly-...
   ```

3. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Install frontend dependencies**
   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running Locally

Start both servers in separate terminals:

**Backend** (port 8000)
```bash
uvicorn api.app:app --reload --port 8000
```

**Frontend** (port 5173)
```bash
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Running Tests

```bash
python -m pytest tests/ -v
```

### Production Build

Build the frontend and serve it from FastAPI:

```bash
cd frontend
npm run build
cd ..
uvicorn api.app:app --port 8000
```

The built SPA is served from `frontend/dist/` at the root URL.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload a resume (PDF/DOCX), returns parsed Resume JSON |
| `POST` | `/api/suggest-roles/{session_id}` | Get AI-suggested job roles based on resume |
| `POST` | `/api/jobs/{session_id}` | Search for jobs with role query, location, and filters |
| `POST` | `/api/jobs/{session_id}/add-url` | Add a specific job by URL (scrapes and enriches it) |
| `POST` | `/api/jobs/{session_id}/add-text` | Add a job by pasting its description (Claude extracts structured data) |
| `POST` | `/api/jobs/{session_id}/{job_id}/enrich` | Scrape and enrich a single job with full details |
| `POST` | `/api/tailor/{session_id}/{job_id}` | Tailor resume for a specific job |
| `GET` | `/api/download/{session_id}/{filename}` | Download a tailored resume (DOCX or PDF) |

## Features

- **Smart role suggestions** — Claude analyzes your resume and suggests 6 relevant job titles
- **Multi-source job search** — Searches LinkedIn, Indeed, Greenhouse, Lever, and Ashby
- **Add job by URL** — Paste a direct job posting link to scrape and add it to results
- **Paste job description** — For sites that block scraping (Indeed, LinkedIn), paste the description directly
- **Lazy enrichment** — Job details load on-demand when you click, keeping search fast
- **Structured job details** — Modal shows salary, about, skills, responsibilities, qualifications, and benefits
- **Resume diff highlighting** — Green highlights show exactly what changed in the tailored version
- **My Resumes drawer** — Quick access to all tailored resumes with DOCX/PDF download
- **Location filter** — Search by city, remote only, or both
- **Mobile responsive** — Works on desktop, tablet, and mobile
- **Earth tone UI** — Dark brown theme with amber accents

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key for Claude |
| `TAVILY_API_KEY` | Yes | Tavily API key for job search |

## License

MIT
