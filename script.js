/**
 * Receptrix v5.0 — Premium Dashboard JavaScript
 * Theme toggle, auth, animated counters, toast notifications
 */

const API_BASE_URL = window.location.origin;

// ============ State ============
let conversationHistory = [];
let services = [];
let config = null;
let currentBusinessId = localStorage.getItem('businessId') || null;
let authToken = localStorage.getItem('authToken') || null;

// ============ Theme System ============

function getTheme() {
    return localStorage.getItem('theme') || 'dark';
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = theme === 'dark' ? '#06060b' : '#f5f5fa';
    // Update toggle icons
    updateThemeIcons(theme);
}

function toggleTheme() {
    const current = getTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    setTheme(next);
}

function updateThemeIcons(theme) {
    // Landing toggle thumb icons
    document.querySelectorAll('.moon-icon').forEach(el => {
        el.style.display = theme === 'dark' ? '' : 'none';
    });
    document.querySelectorAll('.sun-icon').forEach(el => {
        el.style.display = theme === 'light' ? '' : 'none';
    });
    // Sidebar toggle icons
    document.querySelectorAll('.theme-icon-moon').forEach(el => {
        el.style.display = theme === 'dark' ? '' : 'none';
    });
    document.querySelectorAll('.theme-icon-sun').forEach(el => {
        el.style.display = theme === 'light' ? '' : 'none';
    });
}

// ============ Toast Notifications ============

function showToast(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    const icons = {
        success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
    };

    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.classList.add('toast-exit'); setTimeout(() => this.parentElement.remove(), 250);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
        if (toast.parentElement) {
            toast.classList.add('toast-exit');
            setTimeout(() => toast.remove(), 250);
        }
    }, duration);
}

// ============ Animated Counter ============

function animateCounter(element, target) {
    const duration = 800;
    const start = parseInt(element.textContent) || 0;
    const diff = target - start;
    if (diff === 0) return;

    const startTime = performance.now();

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(start + diff * eased);
        element.textContent = current;
        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

// ============ API Headers ============

function apiHeaders(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (currentBusinessId) headers['X-Business-Id'] = currentBusinessId;
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
}

async function readResponsePayload(response) {
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    const text = await response.text();
    if (!text) return {};

    try {
        return JSON.parse(text);
    } catch {
        return { detail: text };
    }
}

function setBusinessContext(businessId, token) {
    currentBusinessId = businessId;
    authToken = token;
    if (businessId) localStorage.setItem('businessId', businessId);
    else localStorage.removeItem('businessId');
    if (token) localStorage.setItem('authToken', token);
    else localStorage.removeItem('authToken');
}

function clearAuth() {
    setBusinessContext(null, null);
}

// ============ Auth ============

function showAuth() {
    document.getElementById('landing').classList.add('hidden');
    document.querySelector('.app-container').classList.add('hidden');
    document.getElementById('auth-page').classList.remove('hidden');
    showAuthForm('signin');
}

function showAuthForm(form) {
    document.getElementById('signin-form-wrap').classList.toggle('hidden', form !== 'signin');
    document.getElementById('signup-form-wrap').classList.toggle('hidden', form !== 'signup');
}

async function handleSignIn(event) {
    event.preventDefault();
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await readResponsePayload(response);
        if (response.ok && data.access_token) {
            setBusinessContext(data.business_id || null, data.access_token);
            showToast('Signed in successfully!', 'success');
            showDashboard();
        } else {
            showToast(data.detail || 'Sign in failed', 'error');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showToast('Connection error. Please try again.', 'error');
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    const name = document.getElementById('signup-name').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, full_name: name })
        });
        const data = await readResponsePayload(response);
        if (response.ok && data.access_token) {
            setBusinessContext(data.business_id || null, data.access_token);
            showToast('Account created! Welcome to Receptrix.', 'success');
            showDashboard();
        } else {
            showToast(data.detail || 'Sign up failed', 'error');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        showToast('Connection error. Please try again.', 'error');
    }
}

// ============ Initialization ============

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    setTheme(getTheme());

    initNavigation();
    initChat();

    // Stagger feature card animations on landing
    const featureCards = document.querySelectorAll('.feature-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                entry.target.style.animationDelay = `${index * 0.1}s`;
                entry.target.style.animation = 'fadeInScale 0.5s ease-out forwards';
                entry.target.style.opacity = '1';
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    featureCards.forEach(card => {
        card.style.opacity = '0';
        observer.observe(card);
    });
});

// ============ Landing / Dashboard / Auth Toggle ============

function showDashboard() {
    document.getElementById('landing').classList.add('hidden');
    document.getElementById('auth-page').classList.add('hidden');
    document.querySelector('.app-container').classList.remove('hidden');
    loadDashboardData();
    loadConfig();
    window.scrollTo(0, 0);
}

function showLanding() {
    document.getElementById('landing').classList.remove('hidden');
    document.getElementById('auth-page').classList.add('hidden');
    document.querySelector('.app-container').classList.add('hidden');
    window.scrollTo(0, 0);
}

// ============ Navigation ============

function initNavigation() {
    const navItems = document.querySelectorAll('.nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tab = item.dataset.tab;

            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(tab).classList.add('active');

            if (tab === 'appointments') loadAppointments();
            if (tab === 'calls') loadCallLogs();
            if (tab === 'settings') loadConfig();
        });
    });
}

// ============ Dashboard ============

async function loadDashboardData() {
    try {
        const statsResponse = await fetch(`${API_BASE_URL}/stats`, { headers: apiHeaders() });
        const stats = await statsResponse.json();

        // Animate counters
        animateCounter(document.getElementById('total-appointments'), stats.total_appointments);
        animateCounter(document.getElementById('today-appointments'), stats.today_appointments);
        animateCounter(document.getElementById('total-calls'), stats.total_calls);
        animateCounter(document.getElementById('completed-calls'), stats.completed_calls);

        // Load today's schedule
        const today = new Date().toISOString().split('T')[0];
        const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments?date=${today}`, { headers: apiHeaders() });
        const appointmentsData = await appointmentsResponse.json();
        renderTodaysSchedule(appointmentsData.appointments);

        // Load recent calls
        const callsResponse = await fetch(`${API_BASE_URL}/calls?limit=5`, { headers: apiHeaders() });
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
        const response = await fetch(`${API_BASE_URL}/appointments`, { headers: apiHeaders() });
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
            method: 'PATCH',
            headers: apiHeaders()
        });
        showToast(`Appointment ${status}`, status === 'confirmed' ? 'success' : 'info');
        loadAppointments();
        loadDashboardData();
    } catch (error) {
        console.error('Error updating appointment:', error);
        showToast('Failed to update appointment', 'error');
    }
}

function filterAppointments() {
    loadAppointments();
}

// ============ New Appointment Modal ============

function showNewAppointmentModal() {
    document.getElementById('appointment-modal').classList.add('show');
    loadServicesForModal();

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('apt-date').min = today;
}

function closeModal() {
    document.getElementById('appointment-modal').classList.remove('show');
    document.getElementById('appointment-form').reset();
}

async function loadServicesForModal() {
    try {
        const response = await fetch(`${API_BASE_URL}/services`, { headers: apiHeaders() });
        const data = await response.json();
        services = data.services;

        const select = document.getElementById('apt-service');
        select.innerHTML = '<option value="">Select a service</option>' +
            services.map(s => `<option value="${s.name}">${s.name} - Rs.${s.price}</option>`).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

document.getElementById('apt-date')?.addEventListener('change', async (e) => {
    const date = e.target.value;
    const service = document.getElementById('apt-service').value;

    if (!date) return;

    try {
        const response = await fetch(`${API_BASE_URL}/appointments/availability?date=${date}&service=${service || ''}`, { headers: apiHeaders() });
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
            headers: apiHeaders(),
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            showToast('Appointment created successfully!', 'success');
            closeModal();
            loadAppointments();
            loadDashboardData();
        } else {
            showToast('Failed: ' + result.message, 'error');
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast('Failed to create appointment', 'error');
    }
}

// ============ Call Logs ============

async function loadCallLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/calls`, { headers: apiHeaders() });
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
            <td>${call.appointment_created ? '<span class="status-badge status-completed">Yes</span>' : '-'}</td>
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

// ============ Chat / Voice ============

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

    initSpeechRecognition();
}

function initSpeechRecognition() {
    const voiceHint = document.getElementById('voice-hint');

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            isListening = true;
            updateMicButton(true);
            document.getElementById('voice-status').textContent = 'Listening...';
        };

        recognition.onresult = (event) => {
            const lastResult = event.results[event.results.length - 1];
            const transcript = lastResult[0].transcript.trim();

            if (transcript) {
                document.getElementById('message-input').value = transcript;
            }

            if (lastResult.isFinal && transcript) {
                sendMessage();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            isListening = false;
            updateMicButton(false);
            const statusMessages = {
                'not-allowed': 'Microphone blocked. Allow access in browser settings.',
                'no-speech': 'No speech detected. Try again.',
                'network': 'Network error. Speech recognition requires internet.'
            };
            document.getElementById('voice-status').textContent =
                statusMessages[event.error] || 'Speech error: ' + event.error;
        };

        recognition.onend = () => {
            isListening = false;
            updateMicButton(false);
            if (isVoiceModeActive && isCallActive) {
                document.getElementById('voice-status').textContent = 'Click microphone to continue speaking';
            } else {
                document.getElementById('voice-status').textContent = 'Click microphone to speak';
            }
        };
    } else {
        const micBtn = document.getElementById('mic-button');
        if (micBtn) micBtn.style.display = 'none';
        if (voiceHint) {
            voiceHint.textContent = 'Voice not supported. Use Chrome or Edge for voice features.';
        }
    }
}

function updateMicButton(listening) {
    const micBtn = document.getElementById('mic-button');
    if (micBtn) {
        micBtn.classList.toggle('listening', listening);
    }
}

async function toggleListening() {
    if (!recognition) {
        showToast('Speech recognition not supported. Use Chrome or Edge.', 'error');
        return;
    }

    try {
        if (isListening) {
            recognition.stop();
            if (window._micStream) {
                window._micStream.getTracks().forEach(t => t.stop());
                window._micStream = null;
            }
        } else {
            document.getElementById('voice-status').textContent = 'Starting microphone...';
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                stream.getTracks().forEach(t => t.stop());
            } catch (micErr) {
                document.getElementById('voice-status').textContent = 'Microphone access denied.';
                return;
            }

            try {
                recognition.start();
            } catch (e) {
                recognition.abort();
                setTimeout(() => recognition.start(), 200);
            }
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
        btn.querySelector('span:last-child').textContent = 'Voice Mode Active';
        status.textContent = 'AI will speak responses. Click "Start Call" to begin!';
    } else {
        btn.classList.remove('active');
        btn.querySelector('span:last-child').textContent = 'Enable Voice Mode';
        status.textContent = 'Click to start voice conversation';
        synthesis.cancel();
    }
}

function startCall() {
    isCallActive = true;
    callStartTime = Date.now();

    document.getElementById('start-call-btn').style.display = 'none';
    document.getElementById('end-call-btn').style.display = 'inline-flex';
    document.getElementById('voice-status').textContent = 'Call in progress...';

    callTimer = setInterval(updateCallDuration, 1000);

    conversationHistory = [];
    const container = document.getElementById('chat-container');
    container.innerHTML = '';

    const greeting = "Thank you for calling. My name is Sarah, how may I assist you today?";
    addChatMessage(greeting, false, 'AI Receptionist');
    speakText(greeting);

    if (!isVoiceModeActive) {
        toggleVoiceMode();
    }
}

function endCall() {
    isCallActive = false;

    document.getElementById('start-call-btn').style.display = 'inline-flex';
    document.getElementById('end-call-btn').style.display = 'none';
    document.getElementById('voice-status').textContent = 'Call ended.';

    if (callTimer) {
        clearInterval(callTimer);
        callTimer = null;
    }

    synthesis.cancel();
    if (isListening && recognition) {
        recognition.stop();
    }

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
        document.getElementById('voice-status').textContent = 'AI is speaking...';
    };

    utterance.onend = () => {
        if (isCallActive && isVoiceModeActive) {
            document.getElementById('voice-status').textContent = 'Your turn to speak...';
            setTimeout(() => {
                if (isCallActive && recognition && !isListening) {
                    try {
                        recognition.start();
                    } catch (e) {
                        document.getElementById('voice-status').textContent = 'Click microphone to continue speaking';
                    }
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

    addChatMessage(message, true, 'You');
    input.value = '';

    conversationHistory.push({ role: 'user', content: message });

    try {
        const response = await fetch(`${API_BASE_URL}/chat`, {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({
                message: message,
                conversation_history: conversationHistory
            })
        });

        const data = await readResponsePayload(response);

        if (!response.ok) {
            throw new Error(data.detail || data.message || `Request failed with status ${response.status}`);
        }

        addChatMessage(data.message, false, 'AI Receptionist');
        conversationHistory.push({ role: 'assistant', content: data.message });

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

    const avatarSvg = isUser
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';

    messageDiv.innerHTML = `
        <div class="message-avatar">${avatarSvg}</div>
        <div class="message-content">
            <strong>${senderName}</strong>
            <p>${content}</p>
        </div>
    `;

    container.appendChild(messageDiv);
    container.scrollTop = container.scrollHeight;
}

// Load voices
if (synthesis) {
    synthesis.onvoiceschanged = () => synthesis.getVoices();
}

// ============ Settings ============

async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE_URL}/config`, { headers: apiHeaders() });
        config = await response.json();

        document.getElementById('config-name').textContent = config.business_name;
        document.getElementById('config-phone').textContent = config.contact_info.phone;
        document.getElementById('config-email').textContent = config.contact_info.email;
        document.getElementById('config-address').textContent = config.contact_info.address;

        const hoursHtml = Object.entries(config.working_hours)
            .map(([day, hours]) => `<p><strong>${capitalize(day)}:</strong> ${hours}</p>`)
            .join('');
        document.getElementById('working-hours').innerHTML = hoursHtml;

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
    return phone.replace(/^\+92/, '+92 ').replace(/(\d{3})(\d{7})$/, '$1 $2');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}
