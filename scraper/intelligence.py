"""
Compute sale frequency and forward-looking predictions from special_history.
"""

from datetime import date, timedelta
from typing import List, Optional, Tuple


def compute_intel(
    history: List[dict],
    is_on_special_now: bool,
    current_discount: Optional[int] = None,
) -> dict:
    """
    Given a list of special_history rows for one (store, product_id),
    compute frequency metrics.

    Each history row: {first_seen: str, last_seen: str, discount_pct: int|None}
    """
    today = date.today()

    if not history:
        return {
            "avg_frequency_days": None,
            "frequency_class": None,
            "days_since_last_special": None,
            "expected_days_until_next": None,
            "is_on_special_now": is_on_special_now,
            "last_special_date": str(today) if is_on_special_now else None,
            "last_discount_pct": current_discount,
            "total_times_on_special": 1 if is_on_special_now else 0,
        }

    sorted_hist = sorted(history, key=lambda h: h["first_seen"])
    total_times = len(sorted_hist)
    if is_on_special_now:
        total_times += 1

    last_seen_date = _parse_date(sorted_hist[-1]["last_seen"])
    days_since = (today - last_seen_date).days if last_seen_date else None
    if is_on_special_now:
        days_since = 0

    avg_freq = _compute_avg_gap(sorted_hist)
    freq_class = _classify_frequency(avg_freq, total_times)

    expected = None
    if not is_on_special_now and avg_freq and days_since is not None:
        expected = max(0, avg_freq - days_since)

    last_disc = current_discount
    if not last_disc and sorted_hist:
        last_disc = sorted_hist[-1].get("discount_pct")

    return {
        "avg_frequency_days": avg_freq,
        "frequency_class": freq_class,
        "days_since_last_special": days_since,
        "expected_days_until_next": expected if not is_on_special_now else 0,
        "is_on_special_now": is_on_special_now,
        "last_special_date": str(today) if is_on_special_now else str(last_seen_date) if last_seen_date else None,
        "last_discount_pct": last_disc,
        "total_times_on_special": total_times,
    }


def _compute_avg_gap(sorted_history: List[dict]) -> Optional[int]:
    """Average days between distinct specials appearances."""
    if len(sorted_history) < 2:
        return None

    gaps = []
    for i in range(1, len(sorted_history)):
        prev_end = _parse_date(sorted_history[i - 1]["last_seen"])
        curr_start = _parse_date(sorted_history[i]["first_seen"])
        if prev_end and curr_start:
            gap = (curr_start - prev_end).days
            if gap > 1:
                gaps.append(gap)

    if not gaps:
        return None
    return round(sum(gaps) / len(gaps))


def _classify_frequency(avg_days: Optional[int], total_times: int = 1) -> Optional[str]:
    if total_times == 0:
        return "never"
    if avg_days is None:
        return None
    if avg_days <= 21:
        return "frequent"
    if avg_days <= 56:
        return "sometimes"
    return "rare"


def _parse_date(s) -> Optional[date]:
    if not s:
        return None
    if isinstance(s, date):
        return s
    try:
        return date.fromisoformat(str(s)[:10])
    except (ValueError, TypeError):
        return None
