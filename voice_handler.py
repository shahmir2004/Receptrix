"""
AI Voice Handler for phone conversations.
Supports multiple AI providers: Groq (free), HuggingFace (free), Ollama (local), OpenAI (paid).
"""
import os
import json
import re
import requests
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from abc import ABC, abstractmethod

from models import (
    ConversationState, ConversationContext, AppointmentCreate,
    VoiceResponse, Service
)
from config import get_config
from database import (
    get_or_create_caller, update_caller_name, get_caller_by_phone,
    get_conversation_state, save_conversation_state,
    get_available_slots, check_time_slot_available,
    create_appointment, get_caller_appointments, get_appointments_for_date
)


class AIProvider(ABC):
    """Abstract base class for AI providers."""
    
    @abstractmethod
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 150) -> str:
        pass


class GroqProvider(AIProvider):
    """Groq API provider - FREE with Llama 3 (very fast!)."""
    
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
        self.base_url = "https://api.groq.com/openai/v1/chat/completions"
    
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 150) -> str:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY not set")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        response = requests.post(self.base_url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()


class HuggingFaceProvider(AIProvider):
    """HuggingFace Inference API - FREE tier available."""
    
    def __init__(self):
        self.api_key = os.getenv("HUGGINGFACE_API_KEY")
        # Using a good free model
        self.model = os.getenv("HUGGINGFACE_MODEL", "mistralai/Mistral-7B-Instruct-v0.2")
        self.base_url = f"https://api-inference.huggingface.co/models/{self.model}"
    
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 150) -> str:
        if not self.api_key:
            raise ValueError("HUGGINGFACE_API_KEY not set")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        # Convert messages to a single prompt for HuggingFace
        prompt = self._messages_to_prompt(messages)
        
        data = {
            "inputs": prompt,
            "parameters": {
                "temperature": temperature,
                "max_new_tokens": max_tokens,
                "return_full_text": False
            }
        }
        
        response = requests.post(self.base_url, headers=headers, json=data, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        if isinstance(result, list) and len(result) > 0:
            return result[0].get("generated_text", "").strip()
        return str(result)
    
    def _messages_to_prompt(self, messages: List[Dict[str, str]]) -> str:
        """Convert chat messages to instruction prompt."""
        prompt_parts = []
        for msg in messages:
            role = msg["role"]
            content = msg["content"]
            if role == "system":
                prompt_parts.append(f"<s>[INST] {content} [/INST]</s>")
            elif role == "user":
                prompt_parts.append(f"[INST] {content} [/INST]")
            elif role == "assistant":
                prompt_parts.append(content)
        return "\n".join(prompt_parts)


class OllamaProvider(AIProvider):
    """Ollama local provider - completely FREE, runs locally."""
    
    def __init__(self):
        self.model = os.getenv("OLLAMA_MODEL", "llama3")
        self.base_url = os.getenv("OLLAMA_URL", "http://localhost:11434")
    
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 150) -> str:
        url = f"{self.base_url}/api/chat"
        
        data = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "num_predict": max_tokens
            }
        }
        
        response = requests.post(url, json=data, timeout=60)
        response.raise_for_status()
        
        result = response.json()
        return result.get("message", {}).get("content", "").strip()


class OpenAIProvider(AIProvider):
    """OpenAI provider - paid but high quality."""
    
    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        self.base_url = "https://api.openai.com/v1/chat/completions"
    
    def chat(self, messages: List[Dict[str, str]], temperature: float = 0.7, max_tokens: int = 150) -> str:
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY not set")
        
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        data = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
            "max_tokens": max_tokens
        }
        
        response = requests.post(self.base_url, headers=headers, json=data, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        return result["choices"][0]["message"]["content"].strip()


def get_ai_provider() -> AIProvider:
    """Get the configured AI provider based on environment."""
    provider_name = os.getenv("AI_PROVIDER", "groq").lower()
    
    providers = {
        "groq": GroqProvider,
        "huggingface": HuggingFaceProvider,
        "ollama": OllamaProvider,
        "openai": OpenAIProvider
    }
    
    if provider_name not in providers:
        print(f"Unknown provider '{provider_name}', defaulting to Groq")
        provider_name = "groq"
    
    return providers[provider_name]()


class AIVoiceHandler:
    """Handles AI-powered voice conversations for the receptionist."""
    
    def __init__(self):
        self.provider = get_ai_provider()
        self.config = get_config()
        print(f"AI Voice Handler initialized with provider: {type(self.provider).__name__}")
        
    def get_system_prompt(self) -> str:
        """Generate the system prompt for the AI."""
        services_text = "\n".join([
            f"- {s.name}: Rs.{s.price} ({s.duration} minutes)"
            for s in self.config.services
        ])
        
        hours_text = "\n".join([
            f"- {day.capitalize()}: {hours}"
            for day, hours in self.config.working_hours.model_dump().items()
        ])
        
        return f"""You are a professional, friendly AI receptionist for {self.config.business_name}.
Your role is to answer phone calls, provide information, and help callers book appointments.

BUSINESS INFORMATION:
- Business Name: {self.config.business_name}
- Phone: {self.config.contact_info.phone}
- Email: {self.config.contact_info.email}
- Address: {self.config.contact_info.address}

SERVICES OFFERED:
{services_text}

WORKING HOURS:
{hours_text}

CONVERSATION GUIDELINES:
1. Be warm, professional, and conversational - speak naturally like a real receptionist
2. Keep responses concise (1-3 sentences max) - this is a phone call, not text
3. When booking appointments, collect: name, service, preferred date, and time
4. Always confirm details before finalizing a booking
5. If a time slot is unavailable, suggest alternatives
6. Use Pakistani Rupees (Rs.) for prices
7. The timezone is Pakistan Standard Time (PKT)
8. Today's date is {datetime.now().strftime('%A, %B %d, %Y')}

IMPORTANT:
- Never mention you are an AI - act as a human receptionist
- Don't use emojis or special characters (this is voice)
- Speak naturally with proper pauses indicated by commas
- If you don't understand something, politely ask for clarification
- Always be helpful and guide the conversation towards booking if appropriate"""

    def extract_booking_info(self, text: str, current_context: dict) -> dict:
        """Extract booking information from conversation using AI."""
        extraction_prompt = f"""Extract appointment booking information from this conversation.
        
Current known information:
- Name: {current_context.get('caller_name', 'Unknown')}
- Service: {current_context.get('requested_service', 'Not specified')}
- Date: {current_context.get('requested_date', 'Not specified')}
- Time: {current_context.get('requested_time', 'Not specified')}

Latest message: "{text}"

Available services: {[s.name for s in self.config.services]}

Today is {datetime.now().strftime('%Y-%m-%d')} ({datetime.now().strftime('%A')}).

Return a JSON object with these fields (use null if not mentioned):
{{
    "name": "caller's name or null",
    "service": "service name or null",
    "date": "YYYY-MM-DD format or null",
    "time": "HH:MM 24-hour format or null",
    "is_confirming": true/false (if caller is confirming the booking)
}}

Only extract explicitly stated information. Convert relative dates like "tomorrow", "next Monday" to actual dates.
For times, convert to 24-hour format (e.g., "3 PM" -> "15:00").
Return ONLY the JSON object, no other text."""

        try:
            response = self.provider.chat(
                messages=[
                    {"role": "system", "content": "You extract structured data from conversations. Return only valid JSON, nothing else."},
                    {"role": "user", "content": extraction_prompt}
                ],
                temperature=0,
                max_tokens=200
            )
            
            # Clean up the response to ensure valid JSON
            result = response.strip()
            if result.startswith("```"):
                result = result.split("```")[1]
                if result.startswith("json"):
                    result = result[4:]
            
            # Find JSON in response
            json_match = re.search(r'\{[^{}]*\}', result, re.DOTALL)
            if json_match:
                return json.loads(json_match.group())
            
            return json.loads(result)
        except Exception as e:
            print(f"Extraction error: {e}")
            return {}
    
    def generate_response(
        self, 
        caller_input: str, 
        call_sid: str,
        caller_phone: str
    ) -> VoiceResponse:
        """Generate AI response for caller input."""
        
        # Get or create conversation context
        context = get_conversation_state(call_sid) or {
            "call_sid": call_sid,
            "caller_phone": caller_phone,
            "state": ConversationState.GREETING.value,
            "messages": [],
            "extracted_info": {}
        }
        
        # Get caller info from database
        caller = get_or_create_caller(caller_phone)
        if caller.name:
            context["caller_name"] = caller.name
        
        # Add user message to history
        context["messages"].append({
            "role": "user",
            "content": caller_input
        })
        
        # Extract any booking information
        extracted = self.extract_booking_info(caller_input, context)
        
        # Update context with extracted info
        if extracted.get("name"):
            context["caller_name"] = extracted["name"]
            update_caller_name(caller_phone, extracted["name"])
        if extracted.get("service"):
            context["requested_service"] = extracted["service"]
        if extracted.get("date"):
            context["requested_date"] = extracted["date"]
        if extracted.get("time"):
            context["requested_time"] = extracted["time"]
        
        # Build conversation messages for AI
        messages = [
            {"role": "system", "content": self.get_system_prompt()}
        ]
        
        # Add context about what we know
        context_info = self._build_context_info(context, extracted)
        if context_info:
            messages.append({
                "role": "system", 
                "content": f"Current booking context:\n{context_info}"
            })
        
        # Add conversation history (last 10 messages)
        for msg in context["messages"][-10:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })
        
        # Check if we should finalize booking
        should_book = self._should_finalize_booking(context, extracted)
        
        if should_book:
            booking_result = self._attempt_booking(context)
            if booking_result["success"]:
                messages.append({
                    "role": "system",
                    "content": f"BOOKING CONFIRMED: {booking_result['message']}. Thank the caller warmly and confirm the details."
                })
            else:
                messages.append({
                    "role": "system",
                    "content": f"BOOKING ISSUE: {booking_result['message']}. Inform the caller and suggest alternatives."
                })
        
        # Generate response
        try:
            ai_response = self.provider.chat(
                messages=messages,
                temperature=0.7,
                max_tokens=150
            )
            
            # Add assistant response to history
            context["messages"].append({
                "role": "assistant",
                "content": ai_response
            })
            
            # Save conversation state
            save_conversation_state(call_sid, context)
            
            # Determine if call should end
            should_end = self._should_end_call(caller_input, ai_response)
            
            return VoiceResponse(
                text=ai_response,
                should_end_call=should_end
            )
            
        except Exception as e:
            print(f"AI response error: {e}")
            return VoiceResponse(
                text="I apologize, I'm having a bit of trouble. Could you please repeat that?",
                should_end_call=False
            )
    
    def _build_context_info(self, context: dict, extracted: dict) -> str:
        """Build context information string."""
        info_parts = []
        
        if context.get("caller_name"):
            info_parts.append(f"Caller name: {context['caller_name']}")
        if context.get("requested_service"):
            info_parts.append(f"Requested service: {context['requested_service']}")
        if context.get("requested_date"):
            info_parts.append(f"Requested date: {context['requested_date']}")
        if context.get("requested_time"):
            info_parts.append(f"Requested time: {context['requested_time']}")
        
        # Add availability info if we have date
        if context.get("requested_date"):
            try:
                day_name = datetime.strptime(context["requested_date"], "%Y-%m-%d").strftime("%A").lower()
                working_hours = getattr(self.config.working_hours, day_name, "Closed")
                
                if working_hours.lower() != "closed":
                    service_duration = 30
                    if context.get("requested_service"):
                        for s in self.config.services:
                            if s.name.lower() == context["requested_service"].lower():
                                service_duration = s.duration
                                break
                    
                    available = get_available_slots(
                        context["requested_date"], 
                        working_hours,
                        service_duration
                    )
                    if available:
                        # Show a few available slots
                        slots_preview = available[:5]
                        info_parts.append(f"Available times: {', '.join(slots_preview)}")
                else:
                    info_parts.append(f"Note: Business is closed on {day_name.capitalize()}")
            except Exception as e:
                print(f"Error getting availability: {e}")
        
        return "\n".join(info_parts)
    
    def _should_finalize_booking(self, context: dict, extracted: dict) -> bool:
        """Determine if we have enough info to finalize booking."""
        has_name = bool(context.get("caller_name"))
        has_service = bool(context.get("requested_service"))
        has_date = bool(context.get("requested_date"))
        has_time = bool(context.get("requested_time"))
        is_confirming = extracted.get("is_confirming", False)
        
        return has_name and has_service and has_date and has_time and is_confirming
    
    def _attempt_booking(self, context: dict) -> dict:
        """Attempt to create a booking."""
        try:
            # Validate service
            service_name = context["requested_service"]
            service = None
            for s in self.config.services:
                if s.name.lower() == service_name.lower():
                    service = s
                    break
            
            if not service:
                return {
                    "success": False,
                    "message": f"Service '{service_name}' not found"
                }
            
            # Check availability
            date = context["requested_date"]
            time = context["requested_time"]
            
            if not check_time_slot_available(date, time, service.duration):
                # Find alternatives
                day_name = datetime.strptime(date, "%Y-%m-%d").strftime("%A").lower()
                working_hours = getattr(self.config.working_hours, day_name, "Closed")
                alternatives = get_available_slots(date, working_hours, service.duration)[:3]
                
                return {
                    "success": False,
                    "message": f"Time slot not available. Alternatives: {', '.join(alternatives)}"
                }
            
            # Get caller
            caller = get_caller_by_phone(context["caller_phone"])
            
            # Create appointment
            appointment_data = AppointmentCreate(
                caller_name=context["caller_name"],
                caller_phone=context["caller_phone"],
                service_name=service.name,
                appointment_date=date,
                appointment_time=time
            )
            
            appointment_id = create_appointment(
                appointment_data,
                caller_id=caller.id if caller else None,
                duration=service.duration
            )
            
            return {
                "success": True,
                "message": f"Appointment #{appointment_id} booked for {context['caller_name']}: "
                          f"{service.name} on {date} at {time}",
                "appointment_id": appointment_id
            }
            
        except Exception as e:
            return {
                "success": False,
                "message": f"Booking error: {str(e)}"
            }
    
    def _should_end_call(self, user_input: str, ai_response: str) -> bool:
        """Determine if the call should end."""
        farewell_phrases = [
            "goodbye", "bye", "thank you", "thanks", "that's all",
            "have a good", "take care", "see you", "nothing else"
        ]
        
        user_lower = user_input.lower()
        response_lower = ai_response.lower()
        
        # Check if user is saying goodbye
        user_farewell = any(phrase in user_lower for phrase in farewell_phrases)
        # Check if AI is saying goodbye
        ai_farewell = any(phrase in response_lower for phrase in ["goodbye", "bye", "take care", "have a great"])
        
        return user_farewell and ai_farewell
    
    def get_greeting(self, caller_phone: str, call_sid: str) -> str:
        """Generate initial greeting for incoming call."""
        caller = get_or_create_caller(caller_phone)
        
        # Initialize conversation state
        context = {
            "call_sid": call_sid,
            "caller_phone": caller_phone,
            "state": ConversationState.GREETING.value,
            "messages": [],
            "extracted_info": {}
        }
        
        if caller.name:
            context["caller_name"] = caller.name
        
        save_conversation_state(call_sid, context)
        
        # Generate personalized greeting
        if caller.name and caller.total_calls > 1:
            greeting = f"Hello {caller.name}, welcome back to {self.config.business_name}! How can I help you today?"
        else:
            greeting = f"Thank you for calling {self.config.business_name}. My name is Sarah, how may I assist you today?"
        
        # Add greeting to conversation history
        context["messages"].append({
            "role": "assistant",
            "content": greeting
        })
        save_conversation_state(call_sid, context)
        
        return greeting


# Singleton instance
_voice_handler: Optional[AIVoiceHandler] = None

def get_voice_handler() -> AIVoiceHandler:
    """Get or create the voice handler instance."""
    global _voice_handler
    if _voice_handler is None:
        _voice_handler = AIVoiceHandler()
    return _voice_handler
