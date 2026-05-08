"""Billing helper tests."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from billing import is_subscription_active


def test_lemon_trial_status_enables_subscription_features():
    assert is_subscription_active("on_trial") is True
