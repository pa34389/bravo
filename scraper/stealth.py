"""
Shared stealth utilities for scrapers.
Provides human-like delays, User-Agent rotation, and session management.
"""

import math
import random
import time
from typing import Optional

from scraper.logger import get_logger

log = get_logger("stealth")

USER_AGENTS = [
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
]

VIEWPORTS = [
    {"width": 1280, "height": 900},
    {"width": 1366, "height": 768},
    {"width": 1440, "height": 900},
    {"width": 1536, "height": 864},
    {"width": 1920, "height": 1080},
]

STEALTH_INIT_SCRIPT = """
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
    delete navigator.__proto__.webdriver;
    window.chrome = {runtime: {}};
    Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3, 4, 5]});
    Object.defineProperty(navigator, 'languages', {get: () => ['en-AU', 'en']});
"""


def stealth_delay(min_s: float, max_s: float, label: str = ""):
    """
    Sleep for a human-like duration using log-normal distribution.
    Most delays cluster around the lower end, with occasional longer pauses.
    """
    mu = math.log((min_s + max_s) / 2)
    sigma = 0.5
    delay = max(min_s, min(max_s, random.lognormvariate(mu, sigma)))
    if label:
        log.debug(f"{label}: sleeping {delay:.1f}s")
    time.sleep(delay)
    return delay


def session_break(min_min: float = 2.0, max_min: float = 5.0, label: str = "session break"):
    """Take a longer pause to simulate a human stepping away."""
    seconds = random.uniform(min_min * 60, max_min * 60)
    log.info(f"{label}: pausing {seconds / 60:.1f} min")
    time.sleep(seconds)
    return seconds


def pick_user_agent() -> str:
    return random.choice(USER_AGENTS)


def pick_viewport() -> dict:
    return random.choice(VIEWPORTS)


def create_stealth_context(playwright_browser, ua: Optional[str] = None):
    """Create a Playwright browser context with stealth settings."""
    viewport = pick_viewport()
    user_agent = ua or pick_user_agent()
    ctx = playwright_browser.new_context(
        viewport=viewport,
        locale="en-AU",
        timezone_id="Australia/Sydney",
        user_agent=user_agent,
    )
    ctx.add_init_script(STEALTH_INIT_SCRIPT)
    return ctx


def bot_challenge_detected(page) -> bool:
    """Check if the current page is a bot challenge."""
    try:
        title = page.title().lower()
        if any(kw in title for kw in ["pardon", "interruption", "challenge", "blocked", "access denied"]):
            return True
        body_start = page.evaluate("document.body?.innerText?.substring(0, 200) || ''").lower()
        if "pardon our interruption" in body_start:
            return True
    except Exception:
        pass
    return False
