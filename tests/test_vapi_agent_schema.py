"""
Vapi assistant/tool schema smoke tests.
Run with: python tests/test_vapi_agent_schema.py
"""

import os
import sys
from pathlib import Path

os.environ.setdefault("VAPI_WEBHOOK_SECRET", "test-secret")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vapi_agent import TOOL_NAMES, build_assistant_payload, resolve_business_from_vapi_message, vapi_tool_payloads


def test_all_tools_present():
    payloads = vapi_tool_payloads("https://example.com")
    registered = {payload["function"]["name"] for payload in payloads}
    missing = set(TOOL_NAMES) - registered
    assert not missing, f"Missing Vapi tools: {missing}"
    print(f"PASS - all {len(TOOL_NAMES)} Vapi tools present: {sorted(registered)}")


def test_tool_server_uses_vapi_webhook():
    payloads = vapi_tool_payloads("https://example.com")
    for payload in payloads:
        assert payload["server"]["url"] == "https://example.com/webhooks/vapi"
        assert payload["server"]["headers"]["X-Vapi-Secret"] == "test-secret"
    print("PASS - tool server URL and secret header configured")


def test_assistant_payload_is_hipaa_ready():
    payload = build_assistant_payload(
        "00000000-0000-0000-0000-000000000001",
        {"greeting": "Hello from Receptrix."},
        "https://example.com",
        ["tool_1"],
    )
    assert payload["compliancePlan"]["hipaaEnabled"] is True
    assert payload["artifactPlan"]["recordingEnabled"] is False
    assert payload["artifactPlan"]["loggingEnabled"] is False
    assert payload["artifactPlan"]["transcriptPlan"]["enabled"] is False
    assert payload["model"]["toolIds"] == ["tool_1"]
    print("PASS - assistant payload disables Vapi storage artifacts")


def test_vapi_metadata_resolves_demo_business():
    business_id = "00000000-0000-0000-0000-000000000001"
    message = {
        "type": "tool-calls",
        "call": {
            "id": "call_demo",
            "assistantOverrides": {
                "metadata": {"receptrix_business_id": business_id},
            },
        },
    }
    assert resolve_business_from_vapi_message(message) == business_id
    print("PASS - Vapi assistant override metadata resolves landing demo business")


if __name__ == "__main__":
    tests = [
        test_all_tools_present,
        test_tool_server_uses_vapi_webhook,
        test_assistant_payload_is_hipaa_ready,
        test_vapi_metadata_resolves_demo_business,
    ]
    failures = []
    for test in tests:
        try:
            test()
        except Exception as exc:
            print(f"FAIL - {test.__name__}: {exc}")
            failures.append(test.__name__)
    if failures:
        raise SystemExit(1)
    print(f"\nAll {len(tests)} Vapi schema tests passed.")
