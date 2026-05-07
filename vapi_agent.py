"""Vapi assistant payloads and tool-call handlers."""

from __future__ import annotations

import os
import re
from datetime import datetime
from typing import Any, Optional

import database
from models import AppointmentCreate
from tenant import get_business_config, resolve_business_from_vapi


TOOL_NAMES = [
    "list_services",
    "get_hours",
    "check_availability",
    "book_appointment",
    "lookup_caller",
    "transfer_call",
    "end_call",
]


def _server_config(server_url: str) -> dict[str, Any]:
    config: dict[str, Any] = {
        "url": f"{server_url.rstrip('/')}/webhooks/vapi",
        "timeoutSeconds": 20,
    }
    secret = os.getenv("VAPI_WEBHOOK_SECRET", "").strip()
    if secret:
        config["headers"] = {"X-Vapi-Secret": secret}
    credential_id = os.getenv("VAPI_SERVER_CREDENTIAL_ID", "").strip()
    if credential_id:
        config["credentialId"] = credential_id
        config.pop("headers", None)
    return config


def vapi_tool_payloads(server_url: str) -> list[dict[str, Any]]:
    server = _server_config(server_url)
    return [
        {
            "type": "function",
            "function": {
                "name": "list_services",
                "description": "List the clinic services, prices, and appointment durations.",
                "parameters": {"type": "object", "properties": {}},
            },
            "server": server,
        },
        {
            "type": "function",
            "function": {
                "name": "get_hours",
                "description": "Return the clinic's working hours for each day.",
                "parameters": {"type": "object", "properties": {}},
            },
            "server": server,
        },
        {
            "type": "function",
            "function": {
                "name": "check_availability",
                "description": "Check appointment availability for a date, time, and optional service.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {"type": "string", "description": "YYYY-MM-DD date."},
                        "time": {"type": "string", "description": "HH:MM 24-hour time."},
                        "service_name": {"type": "string", "description": "Service name if known."},
                    },
                    "required": ["date", "time"],
                },
            },
            "server": server,
        },
        {
            "type": "function",
            "function": {
                "name": "book_appointment",
                "description": "Book an appointment after confirming caller name, phone, service, date, and time.",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "caller_name": {"type": "string"},
                        "caller_phone": {"type": "string"},
                        "service_name": {"type": "string"},
                        "appointment_date": {"type": "string", "description": "YYYY-MM-DD date."},
                        "appointment_time": {"type": "string", "description": "HH:MM 24-hour time."},
                        "notes": {"type": "string"},
                    },
                    "required": [
                        "caller_name",
                        "caller_phone",
                        "service_name",
                        "appointment_date",
                        "appointment_time",
                    ],
                },
            },
            "server": server,
        },
        {
            "type": "function",
            "function": {
                "name": "lookup_caller",
                "description": "Look up the caller's prior appointments at this clinic.",
                "parameters": {
                    "type": "object",
                    "properties": {"phone": {"type": "string"}},
                    "required": ["phone"],
                },
            },
            "server": server,
        },
        {
            "type": "function",
            "function": {
                "name": "transfer_call",
                "description": "Get the configured human transfer phone number.",
                "parameters": {"type": "object", "properties": {}},
            },
            "server": server,
        },
        {
            "type": "function",
            "function": {
                "name": "end_call",
                "description": "End the call politely when the caller is finished.",
                "parameters": {"type": "object", "properties": {}},
            },
            "server": server,
        },
    ]


def build_assistant_payload(
    business_id: str,
    settings: dict[str, Any],
    server_url: str,
    tool_ids: Optional[list[str]] = None,
) -> dict[str, Any]:
    """Build a HIPAA-ready Vapi assistant payload for a clinic tenant."""
    greeting = settings.get("greeting") or "Thank you for calling. How may I help you today?"
    tone = settings.get("tone") or "warm, calm, and professional"
    emergency_text = settings.get("emergency_escalation_text") or (
        "If this is a medical emergency, please hang up and call 911."
    )

    system_prompt = (
        "You are the AI receptionist for a US medical clinic. "
        f"Your tone is {tone}. "
        "You help callers understand clinic services, business hours, and appointment availability. "
        "You schedule appointments only by using the provided tools. "
        "Do not diagnose, triage, recommend treatment, discuss medications, or provide medical advice. "
        f"Emergency instruction: {emergency_text} "
        "Never claim an appointment is booked until the book_appointment tool succeeds. "
        "Do not ask for date of birth, diagnosis, insurance ID, social security number, or payment details. "
        "Use fake patient data only during demos when the caller states this is a test."
    )

    model: dict[str, Any] = {
        "provider": os.getenv("VAPI_MODEL_PROVIDER", "openai"),
        "model": os.getenv("VAPI_MODEL", "gpt-4o-mini"),
        "messages": [{"role": "system", "content": system_prompt}],
    }
    if tool_ids:
        model["toolIds"] = tool_ids

    payload: dict[str, Any] = {
        "name": f"Receptrix clinic assistant {business_id[:8]}",
        "firstMessage": greeting,
        "firstMessageMode": "assistant-speaks-first",
        "model": model,
        "server": _server_config(server_url),
        "serverMessages": ["tool-calls", "status-update", "end-of-call-report"],
        "clientMessages": [],
        "maxDurationSeconds": int(os.getenv("VAPI_MAX_CALL_SECONDS", "600")),
        "endCallMessage": "Thank you for calling. Have a good day.",
        "compliancePlan": {"hipaaEnabled": True},
        "artifactPlan": {
            "recordingEnabled": False,
            "loggingEnabled": False,
            "transcriptPlan": {"enabled": False},
        },
        "metadata": {
            "receptrix_business_id": business_id,
            "hipaa_mode": "true",
        },
    }
    return payload


def resolve_business_from_vapi_message(message: dict[str, Any]) -> Optional[str]:
    call = message.get("call", {}) if isinstance(message.get("call"), dict) else {}
    assistant = message.get("assistant", {}) if isinstance(message.get("assistant"), dict) else {}
    phone_number = message.get("phoneNumber", {}) if isinstance(message.get("phoneNumber"), dict) else {}
    call_phone_number = call.get("phoneNumber", {}) if isinstance(call.get("phoneNumber"), dict) else {}
    call_assistant = call.get("assistant", {}) if isinstance(call.get("assistant"), dict) else {}

    return resolve_business_from_vapi(
        phone_number_id=call.get("phoneNumberId") or phone_number.get("id") or call_phone_number.get("id"),
        assistant_id=call.get("assistantId") or assistant.get("id") or call_assistant.get("id"),
        phone_number=phone_number.get("number") or call_phone_number.get("number"),
    )


def handle_tool_calls(payload: dict[str, Any]) -> dict[str, Any]:
    message = payload.get("message", payload)
    if not isinstance(message, dict):
        return {"results": []}

    business_id = resolve_business_from_vapi_message(message)
    if not business_id:
        return {
            "results": [
                {
                    "toolCallId": _tool_call_id(tool_call),
                    "error": "This phone number is not linked to a Receptrix clinic.",
                }
                for tool_call in _tool_calls(message)
            ]
        }

    results = []
    for tool_call in _tool_calls(message):
        tool_call_id = _tool_call_id(tool_call)
        name = _tool_name(tool_call)
        args = _tool_args(tool_call)
        try:
            result = dispatch_tool(name, args, business_id, message)
            results.append({"toolCallId": tool_call_id, "result": result})
        except Exception as exc:
            results.append({"toolCallId": tool_call_id, "error": str(exc)})
    return {"results": results}


def dispatch_tool(name: str, args: dict[str, Any], business_id: str, message: dict[str, Any]) -> Any:
    if name == "list_services":
        return list_services(business_id)
    if name == "get_hours":
        return get_hours(business_id)
    if name == "check_availability":
        return check_availability(business_id, args)
    if name == "book_appointment":
        return book_appointment(business_id, args, message)
    if name == "lookup_caller":
        return lookup_caller(business_id, args)
    if name == "transfer_call":
        return transfer_call(business_id)
    if name == "end_call":
        return {"message": "Thank the caller and end the call now.", "end_call": True}
    return f"Unknown tool: {name}"


def list_services(business_id: str) -> str:
    cfg = get_business_config(business_id)
    if not cfg.services:
        return "No services are configured yet."
    return "; ".join(f"{s.name}: ${s.price:.0f}, {s.duration} minutes" for s in cfg.services)


def get_hours(business_id: str) -> str:
    wh = get_business_config(business_id).working_hours
    return "; ".join([
        f"Monday {wh.monday}",
        f"Tuesday {wh.tuesday}",
        f"Wednesday {wh.wednesday}",
        f"Thursday {wh.thursday}",
        f"Friday {wh.friday}",
        f"Saturday {wh.saturday}",
        f"Sunday {wh.sunday}",
    ])


def check_availability(business_id: str, args: dict[str, Any]) -> dict[str, Any]:
    date = str(args.get("date") or args.get("appointment_date") or "").strip()
    time = normalize_time(str(args.get("time") or args.get("appointment_time") or "").strip())
    service_name = str(args.get("service_name") or "").strip()
    if not date or not time:
        return {"available": False, "message": "Please provide both date and time."}

    duration = service_duration(business_id, service_name)
    working_hours = working_hours_for_date(business_id, date)
    if not working_hours or working_hours.lower() == "closed":
        return {"available": False, "message": f"The clinic is closed on {date}."}

    available_slots = database.get_available_slots(date, working_hours, duration, business_id=business_id)
    available = time in available_slots
    return {
        "available": available,
        "date": date,
        "time": time,
        "service_name": service_name,
        "available_slots": available_slots[:12],
        "message": f"{date} at {time} is available." if available else f"{date} at {time} is not available.",
    }


def book_appointment(business_id: str, args: dict[str, Any], message: dict[str, Any]) -> dict[str, Any]:
    required = ["caller_name", "caller_phone", "service_name", "appointment_date", "appointment_time"]
    missing = [field for field in required if not str(args.get(field) or "").strip()]
    if missing:
        return {"booked": False, "message": "Missing required details: " + ", ".join(missing)}

    appointment_time = normalize_time(str(args["appointment_time"]).strip())
    availability = check_availability(
        business_id,
        {
            "date": args["appointment_date"],
            "time": appointment_time,
            "service_name": args["service_name"],
        },
    )
    if not availability["available"]:
        return {"booked": False, "message": availability["message"], "available_slots": availability.get("available_slots", [])}

    caller = database.get_or_create_caller(
        str(args["caller_phone"]).strip(),
        str(args["caller_name"]).strip(),
        business_id=business_id,
    )
    duration = service_duration(business_id, str(args["service_name"]).strip())
    appointment = AppointmentCreate(
        caller_name=str(args["caller_name"]).strip(),
        caller_phone=str(args["caller_phone"]).strip(),
        service_name=str(args["service_name"]).strip(),
        appointment_date=str(args["appointment_date"]).strip(),
        appointment_time=appointment_time,
        notes=str(args.get("notes") or "").strip() or None,
    )
    appointment_id = database.create_appointment(
        appointment,
        caller_id=caller.id,
        duration=duration,
        business_id=business_id,
    )

    call_id = provider_call_id(message)
    if call_id:
        database.mark_call_appointment_created(call_id, appointment_id, business_id=business_id)
    try:
        database.create_appointment_audit_event(
            business_id=business_id,
            appointment_id=appointment_id,
            event_type="appointment_created",
            source="vapi_tool",
            provider_call_id=call_id,
            metadata={"service_name": appointment.service_name, "appointment_date": appointment.appointment_date},
        )
    except Exception:
        pass

    return {
        "booked": True,
        "appointment_id": appointment_id,
        "message": (
            f"Appointment confirmed for {appointment.service_name} on "
            f"{appointment.appointment_date} at {appointment.appointment_time}."
        ),
    }


def lookup_caller(business_id: str, args: dict[str, Any]) -> Any:
    phone = str(args.get("phone") or args.get("caller_phone") or "").strip()
    if not phone:
        return "Please provide the caller phone number."
    appointments = database.get_caller_appointments(phone, business_id=business_id)
    if not appointments:
        return "No prior appointments found for this caller."
    return [
        {
            "service_name": appointment.service_name,
            "appointment_date": appointment.appointment_date,
            "appointment_time": appointment.appointment_time,
            "status": appointment.status.value,
        }
        for appointment in appointments[:5]
    ]


def transfer_call(business_id: str) -> dict[str, Any]:
    cfg = get_business_config(business_id)
    number = cfg.contact_info.phone
    if not number:
        return {"can_transfer": False, "message": "No transfer phone number is configured."}
    return {"can_transfer": True, "phone_number": number, "message": "Transfer the caller to the configured clinic line."}


def service_duration(business_id: str, service_name: str = "") -> int:
    cfg = get_business_config(business_id)
    for service in cfg.services:
        if service_name and service.name.lower() == service_name.lower():
            return service.duration
    return int(os.getenv("DEFAULT_APPOINTMENT_DURATION_MINUTES", "30"))


def working_hours_for_date(business_id: str, date: str) -> str:
    day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
    return getattr(get_business_config(business_id).working_hours, day_name, "Closed")


def normalize_time(value: str) -> str:
    if re.fullmatch(r"\d{1,2}:\d{2}", value):
        hour, minute = value.split(":")
        return f"{int(hour):02d}:{minute}"
    for fmt in ("%I:%M %p", "%I %p"):
        try:
            return datetime.strptime(value.upper(), fmt).strftime("%H:%M")
        except ValueError:
            continue
    return value


def provider_call_id(message: dict[str, Any]) -> Optional[str]:
    call = message.get("call", {}) if isinstance(message.get("call"), dict) else {}
    return call.get("id") or message.get("callId") or message.get("call_id")


def _tool_calls(message: dict[str, Any]) -> list[dict[str, Any]]:
    calls = message.get("toolCallList")
    if isinstance(calls, list):
        return [c for c in calls if isinstance(c, dict)]
    single = message.get("toolCall")
    if isinstance(single, dict):
        return [single]
    return []


def _tool_call_id(tool_call: dict[str, Any]) -> str:
    return str(tool_call.get("id") or tool_call.get("toolCallId") or "")


def _tool_name(tool_call: dict[str, Any]) -> str:
    if tool_call.get("name"):
        return str(tool_call["name"])
    function = tool_call.get("function", {})
    if isinstance(function, dict):
        return str(function.get("name") or "")
    return ""


def _tool_args(tool_call: dict[str, Any]) -> dict[str, Any]:
    args = tool_call.get("arguments")
    if isinstance(args, dict):
        return args
    function = tool_call.get("function", {})
    if isinstance(function, dict):
        params = function.get("parameters")
        if isinstance(params, dict):
            return params
    return {}
