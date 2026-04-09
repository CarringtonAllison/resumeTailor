"""Tests for job-related API endpoints.

Verifies that:
- Job search returns results and populates session state
- Add-by-URL creates, scrapes, and returns an enriched job
- The add-url route doesn't shadow the search or enrich routes
- Edge cases (missing session, bad URL) return proper errors
"""

from unittest.mock import patch, MagicMock
from tests.conftest import make_job


# ---------------------------------------------------------------------------
# POST /api/jobs/{session_id} — Job Search
# ---------------------------------------------------------------------------

class TestSearchJobs:
    def test_search_returns_jobs(self, client, session_id):
        """Normal search flow: returns a list of jobs."""
        with patch("api.routes.jobs.JobSearchAgent") as MockSearch:
            mock_agent = MagicMock()

            def populate_jobs(state, query=None, max_jobs=None, location=None, location_type=None):
                state.jobs = [
                    make_job(id="j1", title="Frontend Engineer", company="Co A"),
                    make_job(id="j2", title="Backend Engineer", company="Co B"),
                ]

            mock_agent.run.side_effect = populate_jobs
            MockSearch.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}",
                json={"query": "engineer", "max_jobs": 10},
            )

            assert resp.status_code == 200
            jobs = resp.json()
            assert len(jobs) == 2
            assert jobs[0]["title"] == "Frontend Engineer"
            assert jobs[1]["company"] == "Co B"

    def test_search_returns_empty_when_no_results(self, client, session_id):
        """Search returning 0 results is valid — not an error."""
        with patch("api.routes.jobs.JobSearchAgent") as MockSearch:
            mock_agent = MagicMock()
            mock_agent.run.side_effect = lambda state, **kw: None  # no jobs added
            MockSearch.return_value = mock_agent

            resp = client.post(f"/api/jobs/{session_id}", json={})
            assert resp.status_code == 200
            assert resp.json() == []

    def test_search_resets_jobs_each_call(self, client, session_id):
        """Each search clears previous results."""
        with patch("api.routes.jobs.JobSearchAgent") as MockSearch:
            mock_agent = MagicMock()
            call_count = 0

            def populate(state, **kw):
                nonlocal call_count
                call_count += 1
                state.jobs = [make_job(id=f"j{call_count}")]

            mock_agent.run.side_effect = populate
            MockSearch.return_value = mock_agent

            # First search
            resp1 = client.post(f"/api/jobs/{session_id}", json={})
            assert len(resp1.json()) == 1
            assert resp1.json()[0]["id"] == "j1"

            # Second search should NOT accumulate
            resp2 = client.post(f"/api/jobs/{session_id}", json={})
            assert len(resp2.json()) == 1
            assert resp2.json()[0]["id"] == "j2"

    def test_search_without_session_returns_404(self, client):
        resp = client.post("/api/jobs/nonexistent", json={})
        assert resp.status_code == 404

    def test_search_without_resume_returns_400(self, client):
        """Session exists but no resume uploaded."""
        from api.session import get_or_create
        get_or_create("empty-session")

        resp = client.post("/api/jobs/empty-session", json={})
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# POST /api/jobs/{session_id}/add-url — Add Job by URL
# ---------------------------------------------------------------------------

class TestAddJobByUrl:
    def test_add_url_returns_enriched_job(self, client, session_id):
        """Pasting a URL should create a job, scrape it, and return enriched data."""
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def enrich(state, job_id):
                job = next(j for j in state.jobs if j.id == job_id)
                job.title = "Senior Engineer"
                job.company = "Great Co"
                job.location = "Remote"
                job.enriched = True
                return job

            mock_agent.run_single.side_effect = enrich
            MockScraper.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}/add-url",
                json={"url": "https://example.com/jobs/senior-eng"},
            )

            assert resp.status_code == 200
            job = resp.json()
            assert job["title"] == "Senior Engineer"
            assert job["company"] == "Great Co"
            assert job["url"] == "https://example.com/jobs/senior-eng"
            assert job["enriched"] is True

    def test_add_url_prepends_to_session_jobs(self, client, session_id):
        """The job added by URL should be at index 0 in the session's job list."""
        # First, populate with a search
        with patch("api.routes.jobs.JobSearchAgent") as MockSearch:
            mock_agent = MagicMock()
            mock_agent.run.side_effect = lambda state, **kw: state.jobs.append(
                make_job(id="existing-job", title="Existing")
            )
            MockSearch.return_value = mock_agent
            client.post(f"/api/jobs/{session_id}", json={})

        # Now add by URL
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def enrich(state, job_id):
                job = next(j for j in state.jobs if j.id == job_id)
                job.title = "URL Job"
                job.enriched = True
                return job

            mock_agent.run_single.side_effect = enrich
            MockScraper.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}/add-url",
                json={"url": "https://example.com/jobs/new"},
            )
            assert resp.status_code == 200

        # Verify the URL job is first, existing job is second
        from api.session import get
        state = get(session_id)
        assert len(state.jobs) == 2
        assert state.jobs[0].title == "URL Job"
        assert state.jobs[1].title == "Existing"

    def test_add_url_without_session_returns_404(self, client):
        resp = client.post(
            "/api/jobs/nonexistent/add-url",
            json={"url": "https://example.com/jobs/1"},
        )
        assert resp.status_code == 404

    def test_add_url_scrape_failure_returns_422_and_cleans_up(self, client, session_id):
        """If scraping fails, return 422 with message and remove ghost job."""
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()
            mock_agent.run_single.side_effect = RuntimeError(
                "Could not retrieve job content — this site blocks automated access."
            )
            MockScraper.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}/add-url",
                json={"url": "https://www.indeed.com/viewjob?jk=abc123"},
            )
            assert resp.status_code == 422
            assert "blocks automated access" in resp.json()["detail"]

            # Verify the ghost job was cleaned up
            from api.session import get
            state = get(session_id)
            assert len(state.jobs) == 0

    def test_add_url_rejects_search_results_pages(self, client, session_id):
        """Search/listing page URLs should be rejected with a helpful message."""
        search_urls = [
            "https://www.ziprecruiter.com/jobs-search?search=software+engineer&location=Chandler",
            "https://www.indeed.com/jobs?q=software+engineer&l=Phoenix",
            "https://www.linkedin.com/jobs/search/?keywords=engineer",
            "https://www.google.com/search?q=software+engineer+jobs",
        ]
        for url in search_urls:
            resp = client.post(
                f"/api/jobs/{session_id}/add-url",
                json={"url": url},
            )
            assert resp.status_code == 400, f"Expected 400 for {url}, got {resp.status_code}"
            assert "search results page" in resp.json()["detail"].lower()

    def test_add_url_accepts_direct_job_links(self, client, session_id):
        """Direct job posting URLs should be accepted (not rejected by validation)."""
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def enrich(state, job_id):
                job = next(j for j in state.jobs if j.id == job_id)
                job.title = "Engineer"
                job.enriched = True
                return job

            mock_agent.run_single.side_effect = enrich
            MockScraper.return_value = mock_agent

            valid_urls = [
                "https://www.linkedin.com/jobs/view/123456",
                "https://boards.greenhouse.io/company/jobs/123",
                "https://jobs.lever.co/company/abc-def",
                "https://www.indeed.com/viewjob?jk=abc123",
                "https://www.ziprecruiter.com/k/engineer/j/ABC123",
            ]
            for url in valid_urls:
                resp = client.post(
                    f"/api/jobs/{session_id}/add-url",
                    json={"url": url},
                )
                assert resp.status_code == 200, f"Expected 200 for {url}, got {resp.status_code}"


# ---------------------------------------------------------------------------
# POST /api/jobs/{session_id}/add-text — Add Job by Pasted Text
# ---------------------------------------------------------------------------

class TestAddJobByText:
    def test_add_text_returns_enriched_job(self, client, session_id):
        """Pasting a job description should create and return a structured job."""
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def parse(job, raw_text):
                job.title = "Software Engineer"
                job.company = "Acme Corp"
                job.location = "Remote"
                job.required_skills = ["Python", "React"]
                job.enriched = True
                return job

            mock_agent.parse_text.side_effect = parse
            MockScraper.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}/add-text",
                json={"text": "x" * 100, "url": "https://example.com/jobs/1"},
            )

            assert resp.status_code == 200
            job = resp.json()
            assert job["title"] == "Software Engineer"
            assert job["company"] == "Acme Corp"
            assert job["enriched"] is True
            assert job["url"] == "https://example.com/jobs/1"

    def test_add_text_works_without_url(self, client, session_id):
        """URL is optional when pasting text."""
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def parse(job, raw_text):
                job.title = "Designer"
                job.enriched = True
                return job

            mock_agent.parse_text.side_effect = parse
            MockScraper.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}/add-text",
                json={"text": "x" * 100},
            )
            assert resp.status_code == 200
            assert resp.json()["url"] == ""

    def test_add_text_rejects_short_input(self, client, session_id):
        resp = client.post(
            f"/api/jobs/{session_id}/add-text",
            json={"text": "too short"},
        )
        assert resp.status_code == 400
        assert "more of the job description" in resp.json()["detail"]

    def test_add_text_without_session_returns_404(self, client):
        resp = client.post(
            "/api/jobs/nonexistent/add-text",
            json={"text": "x" * 100},
        )
        assert resp.status_code == 404

    def test_add_text_prepends_to_session_jobs(self, client, session_id):
        """Pasted job should appear at index 0."""
        from api.session import get
        state = get(session_id)
        state.jobs.append(make_job(id="existing"))

        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def parse(job, raw_text):
                job.title = "Pasted Job"
                job.enriched = True
                return job

            mock_agent.parse_text.side_effect = parse
            MockScraper.return_value = mock_agent

            client.post(
                f"/api/jobs/{session_id}/add-text",
                json={"text": "x" * 100},
            )

        assert len(state.jobs) == 2
        assert state.jobs[0].title == "Pasted Job"
        assert state.jobs[1].id == "existing"


# ---------------------------------------------------------------------------
# POST /api/jobs/{session_id}/{job_id}/enrich — Enrich a Job
# ---------------------------------------------------------------------------

class TestEnrichJob:
    def test_enrich_returns_enriched_job(self, client, session_id):
        """Enrich endpoint works on an existing job."""
        # Add a job to the session first
        from api.session import get
        state = get(session_id)
        state.jobs.append(make_job(id="enrich-me"))

        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def enrich(state, job_id):
                job = next(j for j in state.jobs if j.id == job_id)
                job.enriched = True
                job.about = "Great company"
                return job

            mock_agent.run_single.side_effect = enrich
            MockScraper.return_value = mock_agent

            resp = client.post(f"/api/jobs/{session_id}/enrich-me/enrich")
            assert resp.status_code == 200
            assert resp.json()["enriched"] is True

    def test_enrich_missing_job_returns_404(self, client, session_id):
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()
            mock_agent.run_single.side_effect = ValueError("Job not found")
            MockScraper.return_value = mock_agent

            resp = client.post(f"/api/jobs/{session_id}/fake-id/enrich")
            assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Route Compatibility — add-url doesn't shadow other routes
# ---------------------------------------------------------------------------

class TestRouteCompatibility:
    def test_search_still_works_after_add_url_defined(self, client, session_id):
        """The /add-url route must not interfere with the search route."""
        with patch("api.routes.jobs.JobSearchAgent") as MockSearch:
            mock_agent = MagicMock()
            mock_agent.run.side_effect = lambda state, **kw: state.jobs.append(
                make_job(id="from-search", title="Search Result")
            )
            MockSearch.return_value = mock_agent

            resp = client.post(f"/api/jobs/{session_id}", json={"query": "test"})
            assert resp.status_code == 200
            assert len(resp.json()) == 1
            assert resp.json()[0]["title"] == "Search Result"

    def test_enrich_still_works_after_add_url_defined(self, client, session_id):
        """The /add-url route must not interfere with the enrich route."""
        from api.session import get
        state = get(session_id)
        state.jobs.append(make_job(id="to-enrich"))

        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def enrich(state, job_id):
                job = next(j for j in state.jobs if j.id == job_id)
                job.enriched = True
                return job

            mock_agent.run_single.side_effect = enrich
            MockScraper.return_value = mock_agent

            resp = client.post(f"/api/jobs/{session_id}/to-enrich/enrich")
            assert resp.status_code == 200
            assert resp.json()["enriched"] is True

    def test_add_url_and_search_coexist(self, client, session_id):
        """Add a job by URL, then search — search should replace the list."""
        # Add by URL first
        with patch("api.routes.jobs.JobScraperAgent") as MockScraper:
            mock_agent = MagicMock()

            def enrich(state, job_id):
                job = next(j for j in state.jobs if j.id == job_id)
                job.title = "URL Job"
                job.enriched = True
                return job

            mock_agent.run_single.side_effect = enrich
            MockScraper.return_value = mock_agent

            resp = client.post(
                f"/api/jobs/{session_id}/add-url",
                json={"url": "https://example.com/jobs/1"},
            )
            assert resp.status_code == 200

        # Now search — should clear the URL job and return fresh results
        with patch("api.routes.jobs.JobSearchAgent") as MockSearch:
            mock_agent = MagicMock()
            mock_agent.run.side_effect = lambda state, **kw: state.jobs.extend([
                make_job(id="s1", title="Search 1"),
                make_job(id="s2", title="Search 2"),
            ])
            MockSearch.return_value = mock_agent

            resp = client.post(f"/api/jobs/{session_id}", json={})
            assert resp.status_code == 200
            jobs = resp.json()
            assert len(jobs) == 2
            assert all(j["title"].startswith("Search") for j in jobs)
