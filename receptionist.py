"""
AI receptionist logic with intent detection and response generation.
"""
import ollama
from typing import List, Dict, Optional
from models import ChatMessage, BusinessConfig
from config import get_config


class IntentType:
    """Intent type constants."""
    GREETING = "greeting"
    SERVICE_INQUIRY = "service_inquiry"
    PRICING_INQUIRY = "pricing_inquiry"
    WORKING_HOURS = "working_hours"
    BOOKING_REQUEST = "booking_request"
    CONTACT_INFO = "contact_info"
    FALLBACK = "fallback"


class ReceptionistAI:
    """AI-powered receptionist with intent handling."""
    
    def __init__(self, model_name: str = "llama3"):
        self.model_name = model_name
        self.config = get_config()
    
    def detect_intent(self, message: str) -> str:
        """
        Detect user intent from message using keyword matching.
        More sophisticated detection can be added later.
        
        Args:
            message: User's message
            
        Returns:
            Detected intent type
        """
        message_lower = message.lower().strip()
        
        # Greeting detection
        greetings = ["hello", "hi", "hey", "good morning", "good afternoon", "good evening"]
        if any(greeting in message_lower for greeting in greetings):
            return IntentType.GREETING
        
        # Service inquiry
        service_keywords = ["service", "services", "what do you offer", "what can you do", "what's available"]
        if any(keyword in message_lower for keyword in service_keywords):
            return IntentType.SERVICE_INQUIRY
        
        # Pricing inquiry
        pricing_keywords = ["price", "cost", "how much", "pricing", "fee", "charge"]
        if any(keyword in message_lower for keyword in pricing_keywords):
            return IntentType.PRICING_INQUIRY
        
        # Working hours
        hours_keywords = ["hours", "when are you open", "open", "closed", "availability", "time"]
        if any(keyword in message_lower for keyword in hours_keywords):
            return IntentType.WORKING_HOURS
        
        # Booking request
        booking_keywords = ["book", "appointment", "schedule", "reserve", "booking", "available time"]
        if any(keyword in message_lower for keyword in booking_keywords):
            return IntentType.BOOKING_REQUEST
        
        # Contact info
        contact_keywords = ["contact", "phone", "email", "address", "location", "reach"]
        if any(keyword in message_lower for keyword in contact_keywords):
            return IntentType.CONTACT_INFO
        
        return IntentType.FALLBACK
    
    def format_context_prompt(self, intent: str) -> str:
        """
        Format context information for the AI based on intent.
        
        Args:
            intent: Detected intent type
            
        Returns:
            Context prompt string
        """
        config = self.config
        context = f"You are a professional receptionist for {config.business_name}.\n\n"
        
        if intent == IntentType.SERVICE_INQUIRY or intent == IntentType.PRICING_INQUIRY:
            context += "Available services:\n"
            for service in config.services:
                context += f"- {service.name}: ${service.price} (Duration: {service.duration} minutes)\n"
            context += "\n"
        
        if intent == IntentType.WORKING_HOURS:
            context += "Working hours:\n"
            for day, hours in config.working_hours.model_dump().items():
                context += f"- {day.capitalize()}: {hours}\n"
            context += "\n"
        
        if intent == IntentType.CONTACT_INFO:
            contact = config.contact_info
            context += f"Contact information:\n"
            context += f"Phone: {contact.phone}\n"
            context += f"Email: {contact.email}\n"
            context += f"Address: {contact.address}\n\n"
        
        context += """You should be:
- Polite and professional
- Friendly but concise
- Always business-focused
- Helpful and eager to assist
- Encourage bookings when appropriate
- Never mention AI, models, or technical systems
- Speak as a real receptionist would

Keep responses brief and natural. If the user wants to book, guide them on what information you need (date, time, service, name)."""
        
        return context
    
    def generate_response(
        self, 
        message: str, 
        intent: str,
        conversation_history: Optional[List[ChatMessage]] = None
    ) -> str:
        """
        Generate AI response based on message and intent.
        
        Args:
            message: User's message
            intent: Detected intent type
            conversation_history: Previous messages in the conversation
            
        Returns:
            Generated response string
        """
        # For certain intents, use rule-based responses for consistency
        if intent == IntentType.SERVICE_INQUIRY:
            services_text = "Here are our services:\n"
            for service in self.config.services:
                services_text += f"• {service.name} - ${service.price} ({service.duration} minutes)\n"
            services_text += "\nWould you like to book one of these services?"
            return services_text
        
        if intent == IntentType.PRICING_INQUIRY:
            pricing_text = "Our pricing:\n"
            for service in self.config.services:
                pricing_text += f"• {service.name}: ${service.price}\n"
            pricing_text += "\nWould you like to schedule an appointment?"
            return pricing_text
        
        if intent == IntentType.WORKING_HOURS:
            hours_text = "Our working hours:\n"
            for day, hours in self.config.working_hours.model_dump().items():
                hours_text += f"• {day.capitalize()}: {hours}\n"
            hours_text += "\nWhen would you like to book?"
            return hours_text
        
        if intent == IntentType.CONTACT_INFO:
            contact = self.config.contact_info
            contact_text = f"Here's how to reach us:\n"
            contact_text += f"📞 Phone: {contact.phone}\n"
            contact_text += f"✉️ Email: {contact.email}\n"
            contact_text += f"📍 Address: {contact.address}\n"
            contact_text += "\nWould you like to book an appointment?"
            return contact_text
        
        # For greeting, booking, and fallback, use AI
        context_prompt = self.format_context_prompt(intent)
        
        # Build conversation history for context
        messages = []
        messages.append({
            "role": "system",
            "content": context_prompt
        })
        
        if conversation_history:
            # Include recent history (last 5 messages for context)
            recent_history = conversation_history[-5:]
            for msg in recent_history:
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })
        
        messages.append({
            "role": "user",
            "content": message
        })
        
        try:
            response = ollama.chat(
                model=self.model_name,
                messages=messages
            )
            # Handle different possible response formats
            if isinstance(response, dict):
                if "message" in response and isinstance(response["message"], dict):
                    content = response["message"].get("content", "")
                else:
                    content = response.get("content", "")
            else:
                content = str(response)
            
            return content.strip() if content else "I'm here to help! How can I assist you today?"
        except Exception as e:
            # Fallback response if AI fails
            print(f"Ollama error: {e}")  # Log error for debugging
            return "I apologize, but I'm having trouble processing that right now. Could you please rephrase your question?"
    
    def handle_message(
        self, 
        message: str,
        conversation_history: Optional[List[ChatMessage]] = None
    ) -> Dict[str, str]:
        """
        Handle a user message and generate appropriate response.
        
        Args:
            message: User's message
            conversation_history: Previous conversation messages
            
        Returns:
            Dictionary with 'message' and 'intent' keys
        """
        intent = self.detect_intent(message)
        response = self.generate_response(message, intent, conversation_history)
        
        return {
            "message": response,
            "intent": intent
        }

