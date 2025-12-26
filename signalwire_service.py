"""
SignalWire Integration for AI Voice Receptionist.
SignalWire uses Twilio-compatible TwiML format, so we use the same TwiML classes.
No SignalWire SDK needed - webhooks work the same way as Twilio.
"""
import os
from typing import Optional
from twilio.twiml.voice_response import VoiceResponse, Gather
from datetime import datetime

from database import (
    create_call_log, update_call_log, 
    delete_conversation_state, get_conversation_state,
    CallStatus
)
from voice_handler import get_voice_handler


class SignalWireService:
    """Service for SignalWire voice operations using TwiML format."""
    
    def __init__(self):
        self.project_id = os.getenv("SIGNALWIRE_PROJECT_ID")
        self.api_token = os.getenv("SIGNALWIRE_API_TOKEN")
        self.space_url = os.getenv("SIGNALWIRE_SPACE_URL")
        self.phone_number = os.getenv("SIGNALWIRE_PHONE_NUMBER")
        self.server_url = os.getenv("SERVER_URL", "http://localhost:8000")
        
        if not self.project_id:
            print("Warning: SignalWire credentials not configured")
    
    def handle_incoming_call(self, call_sid: str, caller_phone: str) -> str:
        """
        Handle incoming call and return TwiML response.
        
        Args:
            call_sid: Call SID
            caller_phone: Caller's phone number
            
        Returns:
            TwiML XML string
        """
        # Log the call
        create_call_log(call_sid, caller_phone)
        
        # Get AI greeting
        voice_handler = get_voice_handler()
        greeting = voice_handler.get_greeting(caller_phone, call_sid)
        
        # Build TwiML response (same format as Twilio)
        response = VoiceResponse()
        
        # Create gather for speech input
        gather = Gather(
            input='speech',
            action='/voice/respond',
            method='POST',
            language='en-US',
            speech_timeout='auto',
            timeout=5
        )
        
        # Say the greeting with natural voice
        gather.say(
            greeting,
            voice='Polly.Joanna',  # AWS Polly voice (supported by SignalWire)
            language='en-US'
        )
        
        response.append(gather)
        
        # If no input, prompt again
        response.redirect('/voice/no-input')
        
        return str(response)
    
    def handle_speech_input(self, call_sid: str, caller_phone: str, speech_result: str) -> str:
        """
        Handle speech input from caller and generate response.
        
        Args:
            call_sid: Call SID
            caller_phone: Caller's phone number
            speech_result: Transcribed speech from caller
            
        Returns:
            TwiML XML string
        """
        # Update call status
        try:
            update_call_log(call_sid, call_status=CallStatus.IN_PROGRESS)
        except Exception as e:
            print(f"Could not update call log: {e}")
        
        # Get AI response
        voice_handler = get_voice_handler()
        ai_response = voice_handler.generate_response(
            caller_phone=caller_phone,
            user_message=speech_result,
            call_sid=call_sid
        )
        
        # Build TwiML response
        response = VoiceResponse()
        
        # Check if call should end
        if voice_handler.should_end_call(ai_response):
            # Final message and hang up
            response.say(
                ai_response,
                voice='Polly.Joanna',
                language='en-US'
            )
            response.hangup()
            
            # Clean up
            try:
                update_call_log(call_sid, call_status=CallStatus.COMPLETED)
            except:
                pass
            delete_conversation_state(call_sid)
        else:
            # Continue conversation
            gather = Gather(
                input='speech',
                action='/voice/respond',
                method='POST',
                language='en-US',
                speech_timeout='auto',
                timeout=8
            )
            
            gather.say(
                ai_response,
                voice='Polly.Joanna',
                language='en-US'
            )
            
            response.append(gather)
            response.redirect('/voice/no-input')
        
        return str(response)
    
    def handle_no_input(self, call_sid: str) -> str:
        """Handle when caller doesn't speak."""
        response = VoiceResponse()
        
        gather = Gather(
            input='speech',
            action='/voice/respond',
            method='POST',
            language='en-US',
            speech_timeout='auto',
            timeout=5
        )
        
        gather.say(
            "I'm sorry, I didn't catch that. Could you please repeat?",
            voice='Polly.Joanna',
            language='en-US'
        )
        
        response.append(gather)
        
        # After second no-input, offer to end call
        response.say(
            "I'm having trouble hearing you. Please call back when you have a better connection. Goodbye.",
            voice='Polly.Joanna',
            language='en-US'
        )
        response.hangup()
        
        return str(response)
    
    def handle_call_status(self, call_sid: str, call_status: str):
        """Handle call status callbacks."""
        status_map = {
            'completed': CallStatus.COMPLETED,
            'busy': CallStatus.FAILED,
            'failed': CallStatus.FAILED,
            'no-answer': CallStatus.FAILED,
            'canceled': CallStatus.FAILED
        }
        
        if call_status in status_map:
            try:
                update_call_log(call_sid, call_status=status_map[call_status])
            except:
                pass
            
            if call_status in ['completed', 'failed', 'busy', 'no-answer', 'canceled']:
                delete_conversation_state(call_sid)


# Singleton instance
_signalwire_service: Optional[SignalWireService] = None


def get_signalwire_service() -> SignalWireService:
    """Get or create SignalWire service instance."""
    global _signalwire_service
    if _signalwire_service is None:
        _signalwire_service = SignalWireService()
    return _signalwire_service
