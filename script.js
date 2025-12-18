// Frontend JavaScript for chat interface
const API_BASE_URL = 'http://localhost:8000';

const chatContainer = document.getElementById('chat-container');
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const businessNameElement = document.getElementById('business-name');

let conversationHistory = [];

// Initialize: Load business name
async function loadBusinessInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        const config = await response.json();
        businessNameElement.textContent = config.business_name;
    } catch (error) {
        console.error('Error loading business info:', error);
    }
}

// Add message to chat
function addMessage(content, isUser = false, timestamp = null) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'receptionist-message'}`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.textContent = content;
    
    const timeDiv = document.createElement('div');
    timeDiv.className = 'message-time';
    timeDiv.textContent = timestamp || getCurrentTime();
    
    messageDiv.appendChild(contentDiv);
    messageDiv.appendChild(timeDiv);
    chatContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return messageDiv;
}

// Show typing indicator
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message receptionist-message typing-indicator-wrapper';
    typingDiv.id = 'typing-indicator';
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator';
    indicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    typingDiv.appendChild(indicator);
    chatContainer.appendChild(typingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    
    return typingDiv;
}

// Remove typing indicator
function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Get current time string
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Send message to backend
async function sendMessage(message) {
    if (!message.trim()) return;
    
    // Add user message to UI
    addMessage(message, true);
    
    // Add to conversation history
    conversationHistory.push({
        role: 'user',
        content: message
    });
    
    // Disable input while processing
    messageInput.disabled = true;
    sendButton.disabled = true;
    
    // Show typing indicator
    const typingIndicator = showTypingIndicator();
    
    try {
        // Send to backend
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message,
                conversation_history: conversationHistory
            })
        });
        
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        // Add receptionist response to UI
        addMessage(data.message, false);
        
        // Add to conversation history
        conversationHistory.push({
            role: 'assistant',
            content: data.message
        });
        
        // Check if intent is booking_request and guide user
        if (data.intent === 'booking_request') {
            handleBookingFlow(data.message);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        removeTypingIndicator();
        addMessage('Sorry, I encountered an error. Please try again.', false);
    } finally {
        // Re-enable input
        messageInput.disabled = false;
        sendButton.disabled = false;
        messageInput.focus();
    }
}

// Handle booking flow (simplified - could be enhanced)
function handleBookingFlow(message) {
    // This could trigger a booking form or guide the user
    // For now, we'll let the AI handle it naturally
    console.log('Booking intent detected');
}

// Handle send button click
sendButton.addEventListener('click', () => {
    const message = messageInput.value.trim();
    if (message) {
        messageInput.value = '';
        sendMessage(message);
    }
});

// Handle Enter key press
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendButton.click();
    }
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
    loadBusinessInfo();
    messageInput.focus();
});


