/**
 * Teacher Dashboard - Real-time student monitoring
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../context/WebSocketContext';
import { sessionsAPI } from '../../services/api';
import StudentTile from './StudentTile';
import ErrorNotifications from './ErrorNotifications';

export default function TeacherDashboard() {
    const { sessionCode } = useParams();
    const navigate = useNavigate();
    const { connect, disconnect, isConnected, on, off } = useWebSocket();

    const [session, setSession] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');

    // Load initial session data
    useEffect(() => {
        const loadSession = async () => {
            try {
                const response = await sessionsAPI.getDashboard(sessionCode);
                setSession(response.data.session);
                // Sort students by ID to ensure stable ordering
                const sortedStudents = [...response.data.students].sort((a, b) => a.id - b.id);
                setStudents(sortedStudents);

                // Load errors
                const errorsResponse = await sessionsAPI.getErrors(sessionCode);
                setErrors(errorsResponse.data);
            } catch (error) {
                console.error('Failed to load session:', error);
                navigate('/dashboard');
            } finally {
                setLoading(false);
            }
        };

        loadSession();
    }, [sessionCode, navigate]);

    // Connect to WebSocket - DISABLED for now due to connection issues
    // Dashboard works via REST API polling
    useEffect(() => {
        console.log('WebSocket disabled on Teacher Dashboard - using REST API polling');
    }, [sessionCode]);

    // Poll for updates every 3 seconds (replaces WebSocket real-time updates)
    useEffect(() => {
        if (!sessionCode) return;

        const pollData = async () => {
            try {
                const response = await sessionsAPI.getDashboard(sessionCode);
                // Sort students by ID to ensure stable ordering and prevent UI flickering
                const sortedStudents = [...response.data.students].sort((a, b) => a.id - b.id);
                setStudents(sortedStudents);

                const errorsResponse = await sessionsAPI.getErrors(sessionCode);
                setErrors(errorsResponse.data);
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Poll every 3 seconds
        const interval = setInterval(pollData, 3000);

        return () => clearInterval(interval);
    }, [sessionCode]);

    // Handle WebSocket events
    useEffect(() => {
        const handleCodeUpdate = (data) => {
            setStudents(prev => prev.map(s =>
                s.id === data.student_id
                    ? { ...s, code_content: data.code, language: data.language }
                    : s
            ));
        };

        const handleOutput = (data) => {
            setStudents(prev => prev.map(s =>
                s.id === data.student_id
                    ? {
                        ...s,
                        recent_logs: [
                            { log_type: data.success ? 'output' : 'error', message: data.output || data.error, created_at: data.timestamp },
                            ...(s.recent_logs || []).slice(0, 9)
                        ],
                        has_errors: !data.success ? true : s.has_errors
                    }
                    : s
            ));

            if (!data.success) {
                setErrors(prev => [{
                    id: Date.now(),
                    student: { username: data.username, full_name: data.full_name },
                    error_message: data.error,
                    created_at: data.timestamp,
                    is_read: false
                }, ...prev]);
            }
        };

        const handleConnect = (data) => {
            if (data.role === 'student') {
                setStudents(prev => {
                    const exists = prev.find(s => s.id === data.user_id);
                    if (exists) {
                        return prev.map(s =>
                            s.id === data.user_id ? { ...s, is_connected: true } : s
                        );
                    }
                    return [...prev, {
                        id: data.user_id,
                        username: data.username,
                        full_name: data.full_name,
                        is_connected: true,
                        code_content: '',
                        language: 'python',
                        recent_logs: [],
                        has_errors: false
                    }];
                });
            }
        };

        const handleDisconnect = (data) => {
            if (data.role === 'student') {
                setStudents(prev => prev.map(s =>
                    s.id === data.user_id ? { ...s, is_connected: false } : s
                ));
            }
        };

        const handleActivity = (data) => {
            setStudents(prev => prev.map(s =>
                s.id === data.student_id
                    ? { ...s, last_active: data.timestamp }
                    : s
            ));
        };

        on('student_code_update', handleCodeUpdate);
        on('student_output', handleOutput);
        on('user_connected', handleConnect);
        on('user_disconnected', handleDisconnect);
        on('student_activity', handleActivity);

        return () => {
            off('student_code_update', handleCodeUpdate);
            off('student_output', handleOutput);
            off('user_connected', handleConnect);
            off('user_disconnected', handleDisconnect);
            off('student_activity', handleActivity);
        };
    }, [on, off]);

    // Filter and search students
    const filteredStudents = students.filter(student => {
        const matchesFilter = filter === 'all' ||
            (filter === 'online' && student.is_connected) ||
            (filter === 'offline' && !student.is_connected) ||
            (filter === 'errors' && student.has_errors);

        const matchesSearch = !search ||
            student.username.toLowerCase().includes(search.toLowerCase()) ||
            (student.full_name || '').toLowerCase().includes(search.toLowerCase());

        return matchesFilter && matchesSearch;
    });

    const onlineCount = students.filter(s => s.is_connected).length;
    const errorCount = errors.filter(e => !e.is_read).length;

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 animate-spin" />
                    <p className="text-gray-400">Loading session...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative p-6">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-white">{session?.session_name}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="flex items-center gap-2 text-sm">
                                    <div className={isConnected ? 'status-online' : 'status-offline'} />
                                    {isConnected ? 'Connected' : 'Disconnected'}
                                </span>
                                <span className="text-gray-400 text-sm">
                                    {onlineCount} / {students.length} students online
                                </span>
                                {errorCount > 0 && (
                                    <span className="text-red-400 text-sm flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                        </svg>
                                        {errorCount} errors
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="input pl-10 pr-4 py-2 w-48"
                                />
                                <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>

                            {/* Filter */}
                            <select
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                                className="input py-2 w-32"
                            >
                                <option value="all">All</option>
                                <option value="online">Online</option>
                                <option value="offline">Offline</option>
                                <option value="errors">Has Errors</option>
                            </select>

                            {/* Language */}
                            <select
                                value={session?.default_language || 'python'}
                                onChange={async (e) => {
                                    try {
                                        await sessionsAPI.update(sessionCode, { default_language: e.target.value });
                                        setSession(prev => ({ ...prev, default_language: e.target.value }));
                                    } catch (error) {
                                        console.error('Failed to update language:', error);
                                    }
                                }}
                                className="input py-2 w-36"
                                title="Session Language"
                            >
                                <option value="python">Python</option>
                                <option value="javascript">JavaScript</option>
                                <option value="c">C</option>
                                <option value="cpp">C++</option>
                                <option value="java">Java</option>
                            </select>

                            {/* Back button */}
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="btn btn-secondary"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-6">
                        {/* Main Grid */}
                        <div className="flex-1">
                            {filteredStudents.length === 0 ? (
                                <div className="text-center py-20 card">
                                    <svg className="w-16 h-16 mx-auto text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                    <p className="text-gray-400">No students found</p>
                                    <p className="text-gray-500 text-sm mt-2">
                                        Share the session code <span className="font-mono font-bold text-white">{sessionCode}</span> with your students
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {filteredStudents.map((student) => (
                                        <StudentTile
                                            key={student.id}
                                            student={student}
                                            isSelected={selectedStudent?.id === student.id}
                                            onSelect={() => setSelectedStudent(student)}
                                            sessionCode={sessionCode}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Error Notifications Panel */}
                        {errors.length > 0 && (
                            <div className="w-80 flex-shrink-0 hidden xl:block">
                                <ErrorNotifications
                                    errors={errors}
                                    onMarkRead={(id) => {
                                        sessionsAPI.markErrorRead(id);
                                        setErrors(prev => prev.map(e =>
                                            e.id === id ? { ...e, is_read: true } : e
                                        ));
                                    }}
                                    onClearAll={() => setErrors([])}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
