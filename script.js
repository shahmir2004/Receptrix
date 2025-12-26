/**
 * AI Voice Receptionist Dashboard JavaScript
 */

const API_BASE_URL = window.location.origin;

// State
let conversationHistory = [];
let services = [];
let config = null;

// ============ Initialization ============

document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initChat();
    loadDashboardData();
    loadConfig();
});

// ============ Navigation ============

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;
            
            // Update active nav item
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            // Show corresponding tab
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tab).classList.add('active');
            
            // Load data for specific tabs
            if (tab === 'appointments') loadAppointments();
            if (tab === 'calls') loadCallLogs();
            if (tab === 'settings') loadConfig();
        });
    });
}

// ============ Dashboard ============

async function loadDashboardData() {
    try {
        // Load stats
        const statsResponse = await fetch(`${API_BASE_URL}/stats`);
        const stats = await statsResponse.json();
        
        document.getElementById('total-appointments').textContent = stats.total_appointments;
        document.getElementById('today-appointments').textContent = stats.today_appointments;
        document.getElementById('total-calls').textContent = stats.total_calls;
        document.getElementById('completed-calls').textContent = stats.completed_calls;
        
        // Load today's schedule
        const today = new Date().toISOString().split('T')[0];
        const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments?date=${today}`);
        const appointmentsData = await appointmentsResponse.json();
        
        renderTodaysSchedule(appointmentsData.appointments);
        
        // Load recent calls
        const callsResponse = await fetch(`${API_BASE_URL}/calls?limit=5`);
        const callsData = await callsResponse.json();
        
        renderRecentCalls(callsData.calls);
        
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function renderTodaysSchedule(appointments) {
    const container = document.getElementById('todays-schedule');
    
    if (!appointments || appointments.length === 0) {
        container.innerHTML = '<p class="empty-state">No appointments scheduled for today</p>';
        return;
    }
    
    container.innerHTML = appointments.map(apt => `
        <div class="schedule-item">
            <span class="time">${formatTime(apt.appointment_time)}</span>
            <div class="info">
                <div class="name">${apt.caller_name}</div>
                <div class="service">${apt.service_name}</div>
            </div>
            <span class="status-badge status-${apt.status}">${apt.status}</span>
        </div>
    `).join('');
}

function renderRecentCalls(calls) {
    const container = document.getElementById('recent-calls');
    
    if (!calls || calls.length === 0) {
        container.innerHTML = '<p class="empty-state">No recent calls</p>';
        return;
    }
    
    container.innerHTML = calls.map(call => `
        <div class="call-item">
            <div class="info">
                <div class="name">${formatPhoneNumber(call.caller_phone)}</div>
                <div class="service">${formatDateTime(call.started_at)}</div>
            </div>
            <span class="status-badge status-${call.call_status}">${call.call_status}</span>
        </div>
    `).join('');
}

// ============ Appointments ============

async function loadAppointments() {
    try {
        const response = await fetch(`${API_BASE_URL}/appointments`);
        const data = await response.json();
        
        renderAppointmentsTable(data.appointments);
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

function renderAppointmentsTable(appointments) {
    const tbody = document.getElementById('appointments-table');
    
    if (!appointments || appointments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No appointments found</td></tr>';
        return;
    }
    
    tbody.innerHTML = appointments.map(apt => `
        <tr>
            <td>${formatDate(apt.appointment_date)}</td>
            <td>${formatTime(apt.appointment_time)}</td>
            <td>${apt.caller_name}</td>
            <td>${formatPhoneNumber(apt.caller_phone)}</td>
            <td>${apt.service_name}</td>
            <td><span class="status-badge status-${apt.status}">${apt.status}</span></td>
            <td>
                <button class="btn-outline btn-small" onclick="updateAppointmentStatus(${apt.id}, 'confirmed')">Confirm</button>
                <button class="btn-outline btn-small" onclick="updateAppointmentStatus(${apt.id}, 'cancelled')">Cancel</button>
            </td>
        </tr>
    `).join('');
}

async function updateAppointmentStatus(id, status) {
    try {
        await fetch(`${API_BASE_URL}/appointments/${id}/status?status=${status}`, {
            method: 'PATCH'
        });
        loadAppointments();
        loadDashboardData();
    } catch (error) {
        console.error('Error updating appointment:', error);
        alert('Failed to update appointment status');
    }
}

function filterAppointments() {
    // Implement client-side filtering if needed
    loadAppointments();
}

// ============ New Appointment Modal ============

function showNewAppointmentModal() {
    document.getElementById('appointment-modal').classList.add('show');
    loadServicesForModal();
    
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('apt-date').min = today;
}

function closeModal() {
    document.getElementById('appointment-modal').classList.remove('show');
    document.getElementById('appointment-form').reset();
}

async function loadServicesForModal() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`);
        const data = await response.json();
        services = data.services;
        
        const select = document.getElementById('apt-service');
        select.innerHTML = '<option value="">Select a service</option>' +
            services.map(s => `<option value="${s.name}">${s.name} - Rs.${s.price}</option>`).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

// Load available time slots when date changes
document.getElementById('apt-date')?.addEventListener('change', async (e) => {
    const date = e.target.value;
    const service = document.getElementById('apt-service').value;
    
    if (!date) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments/availability?date=${date}&service=${service || ''}`);
        const data = await response.json();
        
        const timeSelect = document.getElementById('apt-time');
        
        if (!data.available || data.slots.length === 0) {
            timeSelect.innerHTML = '<option value="">No slots available</option>';
            return;
        }
        
        timeSelect.innerHTML = '<option value="">Select a time</option>' +
            data.slots.map(slot => `<option value="${slot}">${formatTime(slot)}</option>`).join('');
    } catch (error) {
        console.error('Error loading availability:', error);
    }
});

async function createAppointment(event) {
    event.preventDefault();
    
    const data = {
        caller_name: document.getElementById('apt-name').value,
        caller_phone: document.getElementById('apt-phone').value,
        service_name: document.getElementById('apt-service').value,
        appointment_date: document.getElementById('apt-date').value,
        appointment_time: document.getElementById('apt-time').value,
        notes: document.getElementById('apt-notes').value
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/appointments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Appointment created successfully!');
            closeModal();
            loadAppointments();
            loadDashboardData();
        } else {
            alert('Failed to create appointment: ' + result.message);
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        alert('Failed to create appointment');
    }
}

// ============ Call Logs ============

async function loadCallLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/calls`);
        const data = await response.json();
        
        renderCallsTable(data.calls);
    } catch (error) {
        console.error('Error loading calls:', error);
    }
}

function renderCallsTable(calls) {
    const tbody = document.getElementById('calls-table');
    
    if (!calls || calls.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No call logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = calls.map(call => `
        <tr>
            <td>${formatDateTime(call.started_at)}</td>
            <td>${formatPhoneNumber(call.caller_phone)}</td>
            <td>${call.duration_seconds ? formatDuration(call.duration_seconds) : '-'}</td>
            <td><span class="status-badge status-${call.call_status}">${call.call_status}</span></td>
            <td>${call.appointment_created ? '✅ Yes' : '-'}</td>
            <td>
                ${call.transcript ? 
                    `<button class="btn-outline btn-small" onclick="showTranscript('${encodeURIComponent(call.transcript)}')">View</button>` : 
                    '-'}
            </td>
        </tr>
    `).join('');
}

function showTranscript(encodedTranscript) {
    const transcript = decodeURIComponent(encodedTranscript);
    document.getElementById('transcript-content').textContent = transcript;
    document.getElementById('transcript-modal').classList.add('show');
}

function closeTranscriptModal() {
    document.getElementById('transcript-modal').classList.remove('show');
}

// ============ Chat ============

// Voice state
let isVoiceModeActive = false;
let isListening = false;
let isCallActive = false;
let callStartTime = null;
let callTimer = null;
let recognition = null;
let synthesis = window.speechSynthesis;

function initChat() {
    const sendButton = document.getElementById('send-button');
    const messageInput = document.getElementById('message-input');
    
    if (sendButton && messageInput) {
        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }
    
    // Initialize speech recognition if available
    initSpeechRecognition();
}

function initSpeechRecognition() {
    const voiceStatus = document.getElementById('voice-status');
    const voiceHint = document.getElementById('voice-hint');
    
    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        console.log('Speech recognition initialized successfully');
        recognition.interimResults = true;
        recognition.lang = 'en-US';
        
        recognition.onstart = () => {
            isListening = true;
            updateMicButton(true);
            document.getElementById('voice-status').textContent = '🎤 Listening...';
        };
        
        recognition.onresult = (event) => {
            const transcript = Array.from(event.results)
                .map(result => result[0].transcript)
                .join('');
            
            document.getElementById('message-input').value = transcript;
            
            if (event.results[0].isFinal) {
                sendMessage();
            }
        };
        
        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            updateMicButton(false);
            document.getElementById('voice-status').textContent = 'Speech recognition error: ' + event.error + '. Try again.';
        };
        
        recognition.onend = () => {
            isListening = false;
            updateMicButton(false);
            if (isVoiceModeActive && isCallActive) {
                document.getElementById('voice-status').textContent = '🔊 AI is speaking...';
            } else {
                document.getElementById('voice-status').textContent = 'Click microphone to speak';
            }
        };
        
        if (voiceHint) {
            voiceHint.textContent = '💡 Voice enabled! Click 🎤 to speak or type your message';
        }
    } else {
        console.log('Speech recognition not supported');
        const micBtn = document.getElementById('mic-button');
        if (micBtn) {
            micBtn.style.display = 'none';
        }
        if (voiceHint) {
            voiceHint.innerHTML = '⚠️ <strong>Voice not supported</strong> - Please use <a href="https://www.google.com/chrome/" target="_blank">Chrome</a> or Edge for voice features. You can still type messages!';
        }
        if (voiceStatus) {
            voiceStatus.textContent = 'Voice requires Chrome or Edge browser';
        }
    }
}

function updateMicButton(listening) {
    const micBtn = document.getElementById('mic-button');
    if (micBtn) {
        micBtn.classList.toggle('listening', listening);
        micBtn.textContent = listening ? '🔴' : '🎤';
    }
}

function toggleListening() {
    if (!recognition) {
        alert('Speech recognition is not supported in your browser.\n\nPlease use Chrome or Edge for voice features.\n\nYou can still type messages below!');
        return;
    }
    
    try {
        if (isListening) {
            recognition.stop();
        } else {
            document.getElementById('voice-status').textContent = '🎤 Starting microphone...';
            recognition.start();
        }
    } catch (error) {
        console.error('Speech recognition error:', error);
        document.getElementById('voice-status').textContent = 'Error: ' + error.message;
    }
}

function toggleVoiceMode() {
    isVoiceModeActive = !isVoiceModeActive;
    const btn = document.getElementById('voice-mode-btn');
    const status = document.getElementById('voice-status');
    
    if (isVoiceModeActive) {
        btn.classList.add('active');
        btn.innerHTML = '<span class="voice-icon">🎤</span><span>Voice Mode Active</span>';
        status.textContent = 'AI will speak responses. Click "Start Call" to begin!';
    } else {
        btn.classList.remove('active');
        btn.innerHTML = '<span class="voice-icon">🎤</span><span>Enable Voice Mode</span>';
        status.textContent = 'Click to start voice conversation';
        synthesis.cancel();
    }
}

function startCall() {
    isCallActive = true;
    callStartTime = Date.now();
    
    document.getElementById('start-call-btn').style.display = 'none';
    document.getElementById('end-call-btn').style.display = 'inline-block';
    document.getElementById('voice-status').textContent = '📞 Call in progress...';
    
    // Start timer
    callTimer = setInterval(updateCallDuration, 1000);
    
    // Clear previous conversation
    conversationHistory = [];
    const container = document.getElementById('chat-container');
    container.innerHTML = '';
    
    // AI greeting
    const greeting = "Thank you for calling. My name is Sarah, how may I assist you today?";
    addChatMessage(greeting, false, 'AI Receptionist');
    speakText(greeting);
    
    // Auto-enable voice mode
    if (!isVoiceModeActive) {
        toggleVoiceMode();
    }
}

function endCall() {
    isCallActive = false;
    
    document.getElementById('start-call-btn').style.display = 'inline-block';
    document.getElementById('end-call-btn').style.display = 'none';
    document.getElementById('voice-status').textContent = 'Call ended. Click "Start Call" to begin a new call.';
    
    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }
    
    synthesis.cancel();
    if (isListening && recognition) {
        recognition.stop();
    }
    
    // Goodbye message
    addChatMessage("Thank you for calling. Have a great day!", false, 'AI Receptionist');
}

function updateCallDuration() {
    if (!callStartTime) return;
    
    const elapsed = Math.floor((Date.now() - callStartTime) / 1000);
    const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const secs = (elapsed % 60).toString().padStart(2, '0');
    
    document.getElementById('call-duration').textContent = `${mins}:${secs}`;
}

function speakText(text) {
    if (!synthesis) return;
    
    synthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.1;
    utterance.volume = 1;
    
    // Try to find a good voice
    const voices = synthesis.getVoices();
    const preferredVoice = voices.find(v => 
        v.name.includes('Female') || 
        v.name.includes('Samantha') || 
        v.name.includes('Google UK English Female') ||
        v.name.includes('Microsoft Zira')
    ) || voices.find(v => v.lang.startsWith('en')) || voices[0];
    
    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }
    
    utterance.onstart = () => {
        document.getElementById('voice-status').textContent = '🔊 AI is speaking...';
    };
    
    utterance.onend = () => {
        if (isCallActive && isVoiceModeActive) {
            document.getElementById('voice-status').textContent = '🎤 Your turn to speak...';
            // Auto-start listening after AI speaks
            setTimeout(() => {
                if (isCallActive && recognition && !isListening) {
                    recognition.start();
                }
            }, 500);
        }
    };
    
    synthesis.speak(utterance);
}

async function sendMessage() {
    const input = document.getElementById('message-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Add user message
    addChatMessage(message, true, 'You');
    input.value = '';
    
    // Add to conversation history
    conversationHistory.push({ role: 'user', content: message });
    
    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                conversation_history: conversationHistory
            })
        });
        
        const data = await response.json();
        
        addChatMessage(data.message, false, 'AI Receptionist');
        conversationHistory.push({ role: 'assistant', content: data.message });
        
        // Speak the response if voice mode is active
        if (isVoiceModeActive) {
            speakText(data.message);
        }
        
    } catch (error) {
        console.error('Error sending message:', error);
        addChatMessage('Sorry, I encountered an error. Please try again.', false, 'AI Receptionist');
    }
}

function addChatMessage(content, isUser, senderName = '') {
    const container = document.getElementById('chat-container');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'receptionist-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = isUser ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = `<strong>${senderName}</strong><p>${content}</p>`;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    container.appendChild(messageDiv);
    
    container.scrollTop = container.scrollHeight;
}

// Load voices when available
if (synthesis) {
    synthesis.onvoiceschanged = () => {
        synthesis.getVoices();
    };
}

// ============ Settings ============

async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`);
        config = await response.json();
        
        // Business info
        document.getElementById('config-name').textContent = config.business_name;
        document.getElementById('config-phone').textContent = config.contact_info.phone;
        document.getElementById('config-email').textContent = config.contact_info.email;
        document.getElementById('config-address').textContent = config.contact_info.address;
        
        // Working hours
        const hoursHtml = Object.entries(config.working_hours)
            .map(([day, hours]) => `<p><strong>${capitalize(day)}:</strong> ${hours}</p>`)
            .join('');
        document.getElementById('working-hours').innerHTML = hoursHtml;
        
        // Services
        const servicesHtml = config.services
            .map(s => `<p><strong>${s.name}:</strong> Rs.${s.price} (${s.duration} min)</p>`)
            .join('');
        document.getElementById('services-list').innerHTML = servicesHtml;
        
    } catch (error) {
        console.error('Error loading config:', error);
    }
}

// ============ Utility Functions ============

function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-PK', { 
        weekday: 'short', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function formatDateTime(isoStr) {
    if (!isoStr) return '';
    const date = new Date(isoStr);
    return date.toLocaleString('en-PK', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    // Simple formatting for Pakistani numbers
    return phone.replace(/^\+92/, '+92 ').replace(/(\d{3})(\d{7})$/, '$1 $2');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCurrentTime() {
    return new Date().toLocaleTimeString('en-PK', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}