"""
Twilio Integration for AI Voice Receptionist.
Handles incoming calls, speech recognition, and text-to-speech.
"""
import os
from typing import Optional
from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Gather
from datetime import datetime

from database import (
    create_call_log, update_call_log, 
    delete_conversation_state, get_conversation_state,
    CallStatus
)
from voice_handler import get_voice_handler


class TwilioService:
    """Service for Twilio voice operations."""
    
    def __init__(self):
        self.account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        self.auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        self.phone_number = os.getenv("TWILIO_PHONE_NUMBER")
        self.server_url = os.getenv("SERVER_URL", "http://localhost:8000")
        
        if self.account_sid and self.auth_token:
            self.client = Client(self.account_sid, self.auth_token)
        else:
            self.client = None
            print("Warning: Twilio credentials not configured")
    
    def handle_incoming_call(self, call_sid: str, caller_phone: str) -> str:
        """
        Handle incoming call and return TwiML response.
        
        Args:
            call_sid: Twilio call SID
            caller_phone: Caller's phone number
            
        Returns:
            TwiML XML string
        """
        # Log the call
        create_call_log(call_sid, caller_phone)
        
        # Get AI greeting
        voice_handler = get_voice_handler()
        greeting = voice_handler.get_greeting(caller_phone, call_sid)
        
        # Build TwiML response
        response = VoiceResponse()
        
        # Create gather for speech input
        gather = Gather(
            input='speech',
            action='/voice/respond',
            method='POST',
            language='en-US',
            speech_timeout='auto',
            timeout=5,
            speech_model='phone_call'
        )
        
        # Say the greeting with natural voice
        gather.say(
            greeting,
            voice='Polly.Joanna',  # Natural female voice
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
            call_sid: Twilio call SID
            caller_phone: Caller's phone number
            speech_result: Transcribed speech from caller
            
        Returns:
            TwiML XML string
        """
        # Update call status (ignore if call doesn't exist)
        try:
            update_call_log(call_sid, call_status=CallStatus.IN_PROGRESS)
        except Exception as e:
            print(f"Could not update call log: {e}")
        
        # Get AI response
        voice_handler = get_voice_handler()
        ai_response = voice_handler.generate_response(
            speech_result,
            call_sid,
            caller_phone
        )
        
        response = VoiceResponse()
        
        if ai_response.should_end_call:
            # End the call gracefully
            response.say(
                ai_response.text,
                voice='Polly.Joanna',
                language='en-US'
            )
            response.hangup()
            
            # Update call log
            update_call_log(
                call_sid,
                call_status=CallStatus.COMPLETED,
                ended_at=datetime.now()
            )
            
            # Get final transcript
            conv_state = get_conversation_state(call_sid)
            if conv_state:
                transcript = self._build_transcript(conv_state.get("messages", []))
                update_call_log(call_sid, transcript=transcript)
                delete_conversation_state(call_sid)
        else:
            # Continue conversation
            gather = Gather(
                input='speech',
                action='/voice/respond',
                method='POST',
                language='en-US',
                speech_timeout='auto',
                timeout=8,
                speech_model='phone_call'
            )
            
            gather.say(
                ai_response.text,
                voice='Polly.Joanna',
                language='en-US'
            )
            
            response.append(gather)
            
            # Handle silence
            response.redirect('/voice/no-input')
        
        return str(response)
    
    def handle_no_input(self, call_sid: str, caller_phone: str) -> str:
        """
        Handle when caller doesn't respond.
        
        Returns:
            TwiML XML string
        """
        response = VoiceResponse()
        
        gather = Gather(
            input='speech',
            action='/voice/respond',
            method='POST',
            language='en-US',
            speech_timeout='auto',
            timeout=5,
            speech_model='phone_call'
        )
        
        gather.say(
            "I'm sorry, I didn't catch that. Could you please repeat?",
            voice='Polly.Joanna',
            language='en-US'
        )
        
        response.append(gather)
        
        # After second silence, end call
        response.say(
            "I'm sorry, I'm having trouble hearing you. Please call back when you're ready. Goodbye!",
            voice='Polly.Joanna',
            language='en-US'
        )
        response.hangup()
        
        return str(response)
    
    def handle_call_status(self, call_sid: str, call_status: str) -> None:
        """Handle call status webhook."""
        status_map = {
            "completed": CallStatus.COMPLETED,
            "busy": CallStatus.MISSED,
            "failed": CallStatus.FAILED,
            "no-answer": CallStatus.MISSED,
            "canceled": CallStatus.MISSED
        }
        
        db_status = status_map.get(call_status.lower(), CallStatus.COMPLETED)
        
        update_call_log(
            call_sid,
            call_status=db_status,
            ended_at=datetime.now()
        )
        
        # Cleanup conversation state
        delete_conversation_state(call_sid)
    
    def _build_transcript(self, messages: list) -> str:
        """Build transcript from conversation messages."""
        transcript_lines = []
        for msg in messages:
            role = "Caller" if msg["role"] == "user" else "Receptionist"
            transcript_lines.append(f"{role}: {msg['content']}")
        return "\n".join(transcript_lines)
    
    def make_outbound_call(self, to_number: str, message: str) -> Optional[str]:
        """
        Make an outbound call (for reminders, etc.)
        
        Args:
            to_number: Phone number to call
            message: Message to speak
            
        Returns:
            Call SID or None if failed
        """
        if not self.client:
            print("Twilio client not configured")
            return None
        
        try:
            # Create TwiML for outbound message
            twiml = f'''
            <Response>
                <Say voice="Polly.Joanna" language="en-US">{message}</Say>
                <Pause length="1"/>
                <Say voice="Polly.Joanna" language="en-US">Goodbye!</Say>
            </Response>
            '''
            
            call = self.client.calls.create(
                to=to_number,
                from_=self.phone_number,
                twiml=twiml
            )
            
            return call.sid
            
        except Exception as e:
            print(f"Outbound call error: {e}")
            return None
    
    def send_sms(self, to_number: str, message: str) -> bool:
        """
        Send an SMS message.
        
        Args:
            to_number: Phone number to send to
            message: Message content
            
        Returns:
            True if sent successfully
        """
        if not self.client:
            print("Twilio client not configured")
            return False
        
        try:
            self.client.messages.create(
                to=to_number,
                from_=self.phone_number,
                body=message
            )
            return True
        except Exception as e:
            print(f"SMS error: {e}")
            return False


# Singleton instance
_twilio_service: Optional[TwilioService] = None

def get_twilio_service() -> TwilioService:
    """Get or create Twilio service instance."""
    global _twilio_service
    if _twilio_service is None:
        _twilio_service = TwilioService()
    return _twilio_service
