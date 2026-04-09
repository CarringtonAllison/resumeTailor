"""Tests for scraper utilities and content detection."""

from agents.job_scraper import _is_blocked_content


class TestBlockedContentDetection:
    def test_detects_cloudflare_challenge(self):
        content = "Just a moment...\nChecking your browser before accessing the site."
        assert _is_blocked_content(content) is True

    def test_detects_verification_required(self):
        content = "Additional Verification Required\nYour Ray ID for this request is abc123"
        assert _is_blocked_content(content) is True

    def test_detects_captcha(self):
        content = "Please complete the CAPTCHA to continue"
        assert _is_blocked_content(content) is True

    def test_allows_real_job_content(self):
        content = (
            "Software Engineer at Acme Corp\n"
            "We're looking for a talented engineer to join our team.\n"
            "Requirements: Python, FastAPI, React\n"
            "Benefits: Health insurance, 401k\n"
        ) * 10  # Make it long enough to not trigger length check
        assert _is_blocked_content(content) is False

    def test_allows_short_real_content(self):
        """Short content without blocker keywords should pass."""
        content = "Senior Engineer - Remote\nApply now at Acme Corp"
        assert _is_blocked_content(content) is False

    def test_long_page_with_blocker_keyword_is_allowed(self):
        """A real job page that happens to mention 'javascript' shouldn't be blocked."""
        content = "x" * 3000 + " enable javascript for best experience"
        assert _is_blocked_content(content) is False
