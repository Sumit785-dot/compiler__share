/**
 * API service for backend communication
 */
import axios from 'axios';

// Use environment variable for production, fallback to /api for local dev
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

// Create axios instance with defaults
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});


// Add auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle token refresh on 401
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/auth/token/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = response.data;
                    localStorage.setItem('accessToken', access);

                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, clear tokens
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login';
                }
            } else {
                // No refresh token available, force logout
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// Auth API
export const authAPI = {
    login: (username, password) =>
        api.post('/auth/login/', { username, password }),

    register: (data) =>
        api.post('/auth/register/', data),

    logout: () =>
        api.post('/auth/logout/', { refresh: localStorage.getItem('refreshToken') }),

    getProfile: () =>
        api.get('/auth/profile/'),

    updateProfile: (data) =>
        api.patch('/auth/profile/', data),

    // Teacher Settings
    getSettings: () =>
        api.get('/auth/settings/'),

    updateSettings: (data) =>
        api.post('/auth/settings/', data),
};


// Sessions API
export const sessionsAPI = {
    list: () =>
        api.get('/sessions/'),

    create: (data) =>
        api.post('/sessions/create/', data),

    getDetail: (sessionCode) =>
        api.get(`/sessions/${sessionCode}/`),

    join: (sessionCode) =>
        api.post('/sessions/join/', { session_code: sessionCode }),

    end: (sessionCode) =>
        api.post(`/sessions/${sessionCode}/end/`),

    update: (sessionCode, data) =>
        api.patch(`/sessions/${sessionCode}/`, data),

    getParticipants: (sessionCode) =>
        api.get(`/sessions/${sessionCode}/participants/`),

    getDashboard: (sessionCode) =>
        api.get(`/sessions/${sessionCode}/dashboard/`),

    getStudentCode: (sessionCode, studentId) =>
        api.get(`/sessions/${sessionCode}/students/${studentId}/code/`),

    getErrors: (sessionCode) =>
        api.get(`/sessions/${sessionCode}/errors/`),

    markErrorRead: (notificationId) =>
        api.post(`/sessions/errors/${notificationId}/read/`),

    getStudentStats: () =>
        api.get('/sessions/student/stats/'),
};

// Coding API
export const codingAPI = {
    execute: (code, language, sessionCode = null) =>
        api.post('/coding/execute/', { code, language, session_code: sessionCode }),

    saveCode: (code, language, sessionCode) =>
        api.post('/coding/save/', { code, language, session_code: sessionCode }),

    // Teacher saves edit to student's code
    teacherSaveCode: (studentId, code, language, sessionCode) =>
        api.post('/coding/teacher-save/', { student_id: studentId, code, language, session_code: sessionCode }),

    // Student gets their code (for polling teacher edits)
    getMyCode: (sessionCode) =>
        api.get(`/coding/my-code/?session_code=${sessionCode}`),

    heartbeat: (sessionCode) =>
        api.post('/coding/heartbeat/', { session_code: sessionCode }),

    sendNotification: (message, sessionCode) =>
        api.post('/coding/notify/', { message, session_code: sessionCode }),

    getLanguages: () =>
        api.get('/coding/languages/'),

    // Report student activity (split screen, tab switch, etc.)
    reportActivity: (sessionCode, activityType) =>
        api.post(`/sessions/${sessionCode}/activity/`, { type: activityType }),

    // AI Solver
    solveError: (prompt, code, language) =>
        api.post('/coding/ai/solve/', { prompt, code, language }),
};

// GitHub API
export const githubAPI = {
    // Get connection status
    getStatus: () =>
        api.get('/auth/github/status/'),

    // Get OAuth auth URL
    getAuthUrl: (nextPath) =>
        api.get(`/auth/github/auth/${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ''}`),

    // List user's repos
    getRepos: () =>
        api.get('/auth/github/repos/'),

    // Push code to repo
    pushCode: (repo, filename, code, message) =>
        api.post('/auth/github/push/', { repo, filename, code, message }),

    // Create new repo
    createRepo: (name, description = '', isPrivate = false) =>
        api.post('/auth/github/create-repo/', { name, description, private: isPrivate }),
};

export default api;
