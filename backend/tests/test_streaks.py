"""Tests for the reading streak calculation logic."""

from datetime import date, timedelta

from app.routers.reading import _calculate_streaks


def test_empty_dates():
    current, longest = _calculate_streaks([])
    assert current == 0
    assert longest == 0


def test_single_day_today():
    today = date.today()
    current, longest = _calculate_streaks([today])
    assert current == 1
    assert longest == 1


def test_single_day_yesterday():
    yesterday = date.today() - timedelta(days=1)
    current, longest = _calculate_streaks([yesterday])
    assert current == 1
    assert longest == 1


def test_single_day_two_days_ago():
    """Streak is broken if the most recent read was 2+ days ago."""
    two_days_ago = date.today() - timedelta(days=2)
    current, longest = _calculate_streaks([two_days_ago])
    assert current == 0
    assert longest == 1


def test_consecutive_streak():
    today = date.today()
    dates = [today - timedelta(days=i) for i in range(5)]  # desc order
    current, longest = _calculate_streaks(dates)
    assert current == 5
    assert longest == 5


def test_broken_streak():
    """A gap breaks the current streak but longest is preserved."""
    today = date.today()
    # Today, yesterday, then skip a day, then 3 days before that
    dates = [
        today,
        today - timedelta(days=1),
        # gap on day 2
        today - timedelta(days=3),
        today - timedelta(days=4),
        today - timedelta(days=5),
    ]
    current, longest = _calculate_streaks(dates)
    assert current == 2
    assert longest == 3


def test_duplicate_dates():
    """Multiple reads on the same day should count as one day."""
    today = date.today()
    dates = [today, today, today - timedelta(days=1), today - timedelta(days=1)]
    current, longest = _calculate_streaks(dates)
    assert current == 2
    assert longest == 2


def test_streak_starting_yesterday():
    """Current streak can start from yesterday (user hasn't read today yet)."""
    yesterday = date.today() - timedelta(days=1)
    dates = [yesterday - timedelta(days=i) for i in range(3)]
    current, longest = _calculate_streaks(dates)
    assert current == 3
    assert longest == 3
