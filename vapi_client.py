"""Small Vapi API client used by Receptrix provisioning flows."""

from __future__ import annotations

import os
from typing import Any, Optional

import httpx
from vapi import AsyncVapi


class VapiConfigError(RuntimeError):
    pass


class VapiClient:
    def __init__(self, token: Optional[str] = None, base_url: Optional[str] = None):
        self.token = (token or os.getenv("VAPI_API_KEY", "")).strip()
        self.base_url = (base_url or os.getenv("VAPI_BASE_URL", "https://api.vapi.ai")).rstrip("/")
        if not self.token:
            raise VapiConfigError("VAPI_API_KEY must be set.")
        self.sdk = AsyncVapi(token=self.token, base_url=self.base_url)

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

    async def _request(self, method: str, path: str, payload: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=45.0) as client:
            response = await client.request(
                method,
                f"{self.base_url}{path}",
                headers=self._headers(),
                json=payload,
            )
        response.raise_for_status()
        if not response.content:
            return {}
        return response.json()

    @staticmethod
    def _to_dict(value: Any) -> dict[str, Any]:
        if value is None:
            return {}
        if isinstance(value, dict):
            return value
        if hasattr(value, "model_dump"):
            return value.model_dump(by_alias=True, exclude_none=True)
        if hasattr(value, "dict"):
            return value.dict()
        return {"value": value}

    @staticmethod
    def _sdk_kwargs(payload: dict[str, Any]) -> dict[str, Any]:
        key_map = {
            "assistantId": "assistant_id",
            "phoneNumberId": "phone_number_id",
            "firstMessage": "first_message",
            "firstMessageMode": "first_message_mode",
            "clientMessages": "client_messages",
            "serverMessages": "server_messages",
            "maxDurationSeconds": "max_duration_seconds",
            "compliancePlan": "compliance_plan",
            "artifactPlan": "artifact_plan",
        }
        return {key_map.get(key, key): value for key, value in payload.items()}

    async def create_tool(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._to_dict(await self.sdk.tools.create(request=payload))
        except (AttributeError, TypeError):
            return await self._request("POST", "/tool", payload)

    async def create_assistant(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._to_dict(await self.sdk.assistants.create(**self._sdk_kwargs(payload)))
        except (AttributeError, TypeError):
            return await self._request("POST", "/assistant", payload)

    async def update_assistant(self, assistant_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._to_dict(await self.sdk.assistants.update(assistant_id, **self._sdk_kwargs(payload)))
        except (AttributeError, TypeError):
            return await self._request("PATCH", f"/assistant/{assistant_id}", payload)

    async def create_phone_number(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._to_dict(await self.sdk.phone_numbers.create(request=payload))
        except (AttributeError, TypeError):
            return await self._request("POST", "/phone-number", payload)

    async def update_phone_number(self, phone_number_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._to_dict(await self.sdk.phone_numbers.update(phone_number_id, request=payload))
        except (AttributeError, TypeError):
            return await self._request("PATCH", f"/phone-number/{phone_number_id}", payload)

    async def create_call(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            return self._to_dict(await self.sdk.calls.create(**self._sdk_kwargs(payload)))
        except (AttributeError, TypeError):
            return await self._request("POST", "/call", payload)
