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
let currentUser = null;
let businessMemberships = [];
let isAuthenticated = false;

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
    const csrfToken = getCookieValue('rx_csrf_token');
    if (csrfToken) headers['X-CSRF-Token'] = csrfToken;
    return headers;
}

function getCookieValue(name) {
    const cookie = document.cookie
        .split('; ')
        .find((row) => row.startsWith(`${name}=`));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
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

function setBusinessContext(businessId) {
    currentBusinessId = businessId;
    if (businessId) localStorage.setItem('businessId', businessId);
    else localStorage.removeItem('businessId');
}

function clearAuth() {
    isAuthenticated = false;
    currentUser = null;
    businessMemberships = [];
    setBusinessContext(null);
    renderUserStatus();
}

function getErrorMessage(payload, fallback = 'Request failed') {
    if (!payload) return fallback;
    if (typeof payload.detail === 'string') return payload.detail;
    if (payload.detail && typeof payload.detail.message === 'string') return payload.detail.message;
    if (typeof payload.message === 'string') return payload.message;
    return fallback;
}

function handleUnauthorizedResponse(response) {
    if (response.status !== 401) return false;
    clearAuth();
    showAuth();
    showToast('Session expired. Please sign in again.', 'info');
    return true;
}

async function authedRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        credentials: 'include',
        ...options,
        headers: apiHeaders(options.headers || {})
    });

    const payload = await readResponsePayload(response);
    if (handleUnauthorizedResponse(response)) {
        throw new Error('Unauthorized');
    }
    if (!response.ok) {
        throw new Error(getErrorMessage(payload, 'Request failed'));
    }

    return payload;
}

function setButtonLoading(button, loading, defaultLabel) {
    if (!button) return;
    if (loading) {
        button.disabled = true;
        button.dataset.originalLabel = button.textContent.trim();
        button.textContent = 'Please wait...';
    } else {
        button.disabled = false;
        button.textContent = button.dataset.originalLabel || defaultLabel;
    }
}

function chooseBusinessId(payloadBusinesses, payloadCurrentBusinessId) {
    if (currentBusinessId && payloadBusinesses.some((biz) => biz.business_id === currentBusinessId)) {
        return currentBusinessId;
    }
    if (payloadCurrentBusinessId) return payloadCurrentBusinessId;
    return payloadBusinesses[0]?.business_id || null;
}

function applySessionContext(user, businesses = [], payloadCurrentBusinessId = null) {
    currentUser = user || null;
    businessMemberships = Array.isArray(businesses) ? businesses : [];
    isAuthenticated = Boolean(currentUser && currentUser.user_id);

    const selectedBusinessId = chooseBusinessId(businessMemberships, payloadCurrentBusinessId);
    setBusinessContext(selectedBusinessId);
    renderUserStatus();
}

function applyAuthPayload(payload) {
    const user = payload?.user || null;
    const businesses = payload?.businesses || [];
    const selectedBusinessId = payload?.current_business_id || null;
    applySessionContext(user, businesses, selectedBusinessId);
}

function applyMePayload(payload) {
    const profile = payload?.profile || {};
    const user = {
        user_id: payload?.user_id || null,
        email: profile?.email || '',
        full_name: profile?.full_name || '',
    };
    const businesses = payload?.businesses || [];
    const selectedBusinessId = payload?.current_business_id || null;
    applySessionContext(user, businesses, selectedBusinessId);
}

function renderUserStatus() {
    const nameEl = document.getElementById('user-status-name');
    const emailEl = document.getElementById('user-status-email');
    const businessEl = document.getElementById('user-status-business');
    if (!nameEl || !emailEl || !businessEl) return;

    if (!isAuthenticated || !currentUser) {
        nameEl.textContent = 'Not signed in';
        emailEl.textContent = '-';
        businessEl.textContent = 'No business selected';
        return;
    }

    const activeBusiness = businessMemberships.find((biz) => biz.business_id === currentBusinessId) || businessMemberships[0] || null;
    nameEl.textContent = currentUser.full_name || 'User';
    emailEl.textContent = currentUser.email || '-';
    businessEl.textContent = activeBusiness
        ? `${activeBusiness.business_name || 'Business'} (${activeBusiness.role})`
        : 'No business assigned';
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
    const button = event.target.querySelector('button[type="submit"]');
    const email = document.getElementById('signin-email').value;
    const password = document.getElementById('signin-password').value;
    setButtonLoading(button, true, 'Sign In');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });
        const data = await readResponsePayload(response);
        if (response.ok && data.success) {
            applyAuthPayload(data);
            showToast('Signed in successfully!', 'success');
            showDashboard();
        } else {
            document.getElementById('signin-password').value = '';
            showToast(getErrorMessage(data, 'Sign in failed'), 'error');
        }
    } catch (error) {
        console.error('Sign in error:', error);
        showToast('Connection error. Please try again.', 'error');
    } finally {
        setButtonLoading(button, false, 'Sign In');
    }
}

async function handleSignUp(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const name = document.getElementById('signup-name').value;
    const businessName = document.getElementById('signup-business').value;
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
        showToast('Password must be 8+ chars with uppercase, lowercase, and a number.', 'error');
        return;
    }

    setButtonLoading(button, true, 'Create Account');

    try {
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ email, password, full_name: name, business_name: businessName })
        });
        const data = await readResponsePayload(response);
        if (response.ok && data.success) {
            if (data.needs_email_verification) {
                clearAuth();
                showToast('Please verify your email, then sign in.', 'info');
                showAuthForm('signin');
            } else {
                applyAuthPayload(data);
                showToast('Account created! Welcome to Receptrix.', 'success');
                showDashboard();
            }
        } else {
            showToast(getErrorMessage(data, 'Sign up failed'), 'error');
        }
    } catch (error) {
        console.error('Sign up error:', error);
        showToast('Connection error. Please try again.', 'error');
    } finally {
        setButtonLoading(button, false, 'Create Account');
    }
}

async function initializeSession() {
    try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await readResponsePayload(response);
        if (response.ok && data.success) {
            applyMePayload(data);
            // Keep landing page as the default entry; dashboard opens only on explicit action.
            showLanding();
            return;
        }
    } catch (error) {
        console.warn('No active session found.', error);
    }

    clearAuth();
    showLanding();
}

async function handleLogout() {
    try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: apiHeaders()
        });
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        clearAuth();
        showLanding();
        showToast('You have been logged out.', 'info');
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

    initializeSession();
});

// ============ Landing / Dashboard / Auth Toggle ============

function showDashboard() {
    if (!isAuthenticated) {
        showAuth();
        showToast('Please sign in to access the dashboard.', 'info');
        return;
    }
    if (!currentBusinessId) {
        showAuth();
        showToast('No business found for this account. Contact support.', 'error');
        return;
    }

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
        const statsResponse = await fetch(`${API_BASE_URL}/stats`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(statsResponse)) return;
        const stats = await readResponsePayload(statsResponse);
        if (!statsResponse.ok) throw new Error(getErrorMessage(stats, 'Failed to load dashboard stats'));

        // Animate counters
        animateCounter(document.getElementById('total-appointments'), stats.total_appointments);
        animateCounter(document.getElementById('today-appointments'), stats.today_appointments);
        animateCounter(document.getElementById('total-calls'), stats.total_calls);
        animateCounter(document.getElementById('completed-calls'), stats.completed_calls);

        // Load today's schedule
        const today = new Date().toISOString().split('T')[0];
        const appointmentsResponse = await fetch(`${API_BASE_URL}/appointments?date=${today}`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(appointmentsResponse)) return;
        const appointmentsData = await readResponsePayload(appointmentsResponse);
        if (!appointmentsResponse.ok) throw new Error(getErrorMessage(appointmentsData, 'Failed to load appointments'));
        renderTodaysSchedule(appointmentsData.appointments);

        // Load recent calls
        const callsResponse = await fetch(`${API_BASE_URL}/calls?limit=5`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(callsResponse)) return;
        const callsData = await readResponsePayload(callsResponse);
        if (!callsResponse.ok) throw new Error(getErrorMessage(callsData, 'Failed to load calls'));
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
        const response = await fetch(`${API_BASE_URL}/appointments`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(response)) return;
        const data = await readResponsePayload(response);
        if (!response.ok) throw new Error(getErrorMessage(data, 'Failed to load appointments'));
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
        const response = await fetch(`${API_BASE_URL}/appointments/${id}/status?status=${status}`, {
            method: 'PATCH',
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(response)) return;
        const payload = await readResponsePayload(response);
        if (!response.ok) {
            throw new Error(getErrorMessage(payload, 'Failed to update appointment'));
        }
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
        const response = await fetch(`${API_BASE_URL}/services`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(response)) return;
        const data = await readResponsePayload(response);
        if (!response.ok) throw new Error(getErrorMessage(data, 'Failed to load services'));
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
        const response = await fetch(`${API_BASE_URL}/appointments/availability?date=${date}&service=${service || ''}`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(response)) return;
        const data = await readResponsePayload(response);
        if (!response.ok) throw new Error(getErrorMessage(data, 'Failed to load availability'));

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
            credentials: 'include',
            body: JSON.stringify(data)
        });

        if (handleUnauthorizedResponse(response)) return;
        const result = await readResponsePayload(response);

        if (response.ok && result.success) {
            showToast('Appointment created successfully!', 'success');
            closeModal();
            loadAppointments();
            loadDashboardData();
        } else {
            showToast(getErrorMessage(result, 'Failed to create appointment'), 'error');
        }
    } catch (error) {
        console.error('Error creating appointment:', error);
        showToast('Failed to create appointment', 'error');
    }
}

// ============ Call Logs ============

async function loadCallLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/calls`, {
            headers: apiHeaders(),
            credentials: 'include'
        });
        if (handleUnauthorizedResponse(response)) return;
        const data = await readResponsePayload(response);
        if (!response.ok) throw new Error(getErrorMessage(data, 'Failed to load calls'));
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
            credentials: 'include',
            body: JSON.stringify({
                message: message,
                conversation_history: conversationHistory
            })
        });

        const data = await readResponsePayload(response);

        if (handleUnauthorizedResponse(response)) return;
        if (!response.ok) {
            throw new Error(getErrorMessage(data, `Request failed with status ${response.status}`));
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
    if (!isAuthenticated || !currentBusinessId) return;

    try {
        const meData = await authedRequest('/auth/me', { method: 'GET' });
        if (meData.success) {
            applyMePayload(meData);
        }

        const businessSettings = await authedRequest('/business/settings', { method: 'GET' });
        const serviceData = await authedRequest('/business/services', { method: 'GET' });

        config = businessSettings;
        services = (serviceData.services || []).filter((service) => service.is_active !== false);
        fillSettingsForms();
    } catch (error) {
        if (error.message !== 'Unauthorized') {
            showToast(error.message || 'Failed to load settings', 'error');
        }
        console.error('Error loading config:', error);
    }
}

function fillSettingsForms() {
    document.getElementById('profile-full-name').value = currentUser?.full_name || '';
    document.getElementById('profile-email').value = currentUser?.email || '';

    document.getElementById('business-name').value = config?.name || '';
    document.getElementById('business-phone').value = config?.phone || '';
    document.getElementById('business-email').value = config?.email || '';
    document.getElementById('business-address').value = config?.address || '';
    document.getElementById('business-timezone').value = config?.timezone || 'Asia/Karachi';
    document.getElementById('business-greeting').value = config?.greeting_message || '';

    const workingHours = config?.working_hours || {};
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].forEach((day) => {
        const field = document.getElementById(`hours-${day}`);
        if (field) {
            field.value = workingHours[day] || 'Closed';
        }
    });

    renderServicesEditor();
    renderUserStatus();
}

function renderServicesEditor() {
    const container = document.getElementById('services-list');
    if (!container) return;

    container.innerHTML = '';
    if (!services || services.length === 0) {
        addServiceRow();
        return;
    }

    services.forEach((service) => addServiceRow(service));
}

function addServiceRow(service = null) {
    const container = document.getElementById('services-list');
    if (!container) return;

    const row = document.createElement('div');
    row.className = 'service-row';
    if (service?.id) {
        row.dataset.serviceId = String(service.id);
    }

    row.innerHTML = `
        <input type="text" class="form-input service-name" placeholder="Service name" value="${service?.name || ''}">
        <input type="number" class="form-input service-price" placeholder="Price" min="0" step="0.01" value="${service?.price ?? ''}">
        <input type="number" class="form-input service-duration" placeholder="Minutes" min="5" step="5" value="${service?.duration ?? 30}">
        <button type="button" class="btn-outline btn-small" onclick="removeServiceRow(this)">Remove</button>
    `;

    container.appendChild(row);
}

function removeServiceRow(button) {
    const row = button.closest('.service-row');
    if (row) row.remove();

    const container = document.getElementById('services-list');
    if (container && container.children.length === 0) {
        addServiceRow();
    }
}

function collectWorkingHours() {
    return {
        monday: document.getElementById('hours-monday').value.trim() || 'Closed',
        tuesday: document.getElementById('hours-tuesday').value.trim() || 'Closed',
        wednesday: document.getElementById('hours-wednesday').value.trim() || 'Closed',
        thursday: document.getElementById('hours-thursday').value.trim() || 'Closed',
        friday: document.getElementById('hours-friday').value.trim() || 'Closed',
        saturday: document.getElementById('hours-saturday').value.trim() || 'Closed',
        sunday: document.getElementById('hours-sunday').value.trim() || 'Closed',
    };
}

async function saveProfile(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Save Profile');

    const payload = {
        full_name: document.getElementById('profile-full-name').value.trim(),
        email: document.getElementById('profile-email').value.trim(),
    };

    try {
        const result = await authedRequest('/auth/profile', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        if (result.success) {
            applyMePayload(result);
            showToast('Profile updated successfully.', 'success');
        }
    } catch (error) {
        showToast(error.message || 'Failed to update profile', 'error');
    } finally {
        setButtonLoading(button, false, 'Save Profile');
    }
}

async function changePassword(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (newPassword !== confirmPassword) {
        showToast('New password and confirmation do not match.', 'error');
        return;
    }

    setButtonLoading(button, true, 'Update Password');

    try {
        await authedRequest('/auth/password', {
            method: 'PATCH',
            body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
        });
        showToast('Password updated successfully.', 'success');
        document.getElementById('password-form').reset();
    } catch (error) {
        showToast(error.message || 'Failed to update password', 'error');
    } finally {
        setButtonLoading(button, false, 'Update Password');
    }
}

async function saveBusinessInfo(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Save Business Info');

    const payload = {
        business_name: document.getElementById('business-name').value.trim(),
        phone: document.getElementById('business-phone').value.trim(),
        email: document.getElementById('business-email').value.trim(),
        address: document.getElementById('business-address').value.trim(),
        timezone: document.getElementById('business-timezone').value.trim(),
        greeting_message: document.getElementById('business-greeting').value.trim(),
    };

    try {
        await authedRequest('/business/settings', {
            method: 'PATCH',
            body: JSON.stringify(payload),
        });
        showToast('Business information updated.', 'success');
        await loadConfig();
        await loadDashboardData();
    } catch (error) {
        showToast(error.message || 'Failed to save business info', 'error');
    } finally {
        setButtonLoading(button, false, 'Save Business Info');
    }
}

async function saveWorkingHours(event) {
    event.preventDefault();
    const button = event.target.querySelector('button[type="submit"]');
    setButtonLoading(button, true, 'Save Working Hours');

    try {
        await authedRequest('/business/settings', {
            method: 'PATCH',
            body: JSON.stringify({ working_hours: collectWorkingHours() }),
        });
        showToast('Working hours updated.', 'success');
        await loadConfig();
    } catch (error) {
        showToast(error.message || 'Failed to save working hours', 'error');
    } finally {
        setButtonLoading(button, false, 'Save Working Hours');
    }
}

async function saveServices() {
    const rows = Array.from(document.querySelectorAll('#services-list .service-row'));
    const parsedServices = rows
        .map((row) => ({
            id: row.dataset.serviceId || null,
            name: row.querySelector('.service-name')?.value.trim() || '',
            price: Number(row.querySelector('.service-price')?.value || 0),
            duration: Number(row.querySelector('.service-duration')?.value || 0),
        }))
        .filter((item) => item.name);

    if (parsedServices.length === 0) {
        showToast('Add at least one service before saving.', 'error');
        return;
    }

    try {
        const existingActive = services.filter((service) => service.is_active !== false);
        const submittedIds = new Set(parsedServices.filter((item) => item.id).map((item) => String(item.id)));

        for (const service of parsedServices) {
            const payload = {
                name: service.name,
                price: service.price,
                duration: service.duration,
            };
            if (service.id) {
                await authedRequest(`/business/services/${service.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify(payload),
                });
            } else {
                await authedRequest('/business/services', {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });
            }
        }

        for (const existing of existingActive) {
            if (!submittedIds.has(String(existing.id))) {
                await authedRequest(`/business/services/${existing.id}`, {
                    method: 'DELETE',
                });
            }
        }

        showToast('Services updated successfully.', 'success');
        await loadConfig();
    } catch (error) {
        showToast(error.message || 'Failed to save services', 'error');
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
