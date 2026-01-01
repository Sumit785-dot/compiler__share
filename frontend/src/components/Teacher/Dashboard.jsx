/**
 * Teacher Dashboard - Real-time student monitoring
 */
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../context/WebSocketContext';
import { useTheme } from '../../context/ThemeContext';
import { sessionsAPI, codingAPI } from '../../services/api';
import StudentTile from './StudentTile';
import ErrorNotifications from './ErrorNotifications';
import AIChatWidget from './AIChatWidget';
import Editor from '@monaco-editor/react';

export default function TeacherDashboard() {
    const { sessionCode } = useParams();
    const navigate = useNavigate();
    const { connect, disconnect, isConnected, on, off } = useWebSocket();
    const { isDark } = useTheme();

    const [session, setSession] = useState(null);
    const [students, setStudents] = useState([]);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [errors, setErrors] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [expandedStudent, setExpandedStudent] = useState(null);
    const [expandedCode, setExpandedCode] = useState('');
    const [expandedOutput, setExpandedOutput] = useState(null);
    const [isExpandedRunning, setIsExpandedRunning] = useState(false);
    const [isExpandedEditing, setIsExpandedEditing] = useState(false);
    const [isExpandedSaving, setIsExpandedSaving] = useState(false);

    // Load initial session data
    useEffect(() => {
        const loadSession = async () => {
            try {
                const response = await sessionsAPI.getDashboard(sessionCode);
                setSession(response.data.session);
                const sortedStudents = [...response.data.students].sort((a, b) => a.id - b.id);
                setStudents(sortedStudents);

                const errorsResponse = await sessionsAPI.getErrors(sessionCode);
                setErrors(errorsResponse.data);
                setLoading(false);
            } catch (error) {
                console.error('Failed to load session:', error);

                if (error.response?.status === 403) {
                    setError('You do not have permission to view this session.');
                } else if (error.response?.status === 404) {
                    setError('Session not found.');
                } else {
                    setError('Failed to load session.');
                }
                setLoading(false);
            }
        };

        loadSession();
    }, [sessionCode, navigate]);

    // Connect to WebSocket for real-time updates
    useEffect(() => {
        if (sessionCode) {
            // OPTIMIZATION: Connecting to WebSocket for session
            connect(sessionCode);
        }

        return () => {
            disconnect();
        };
    }, [sessionCode, connect, disconnect]);

    // Poll for updates every 10 seconds (fallback for WebSocket)
    useEffect(() => {
        if (!sessionCode) return;

        const pollData = async () => {
            try {
                const response = await sessionsAPI.getDashboard(sessionCode);
                // Sort students by ID to ensure stable ordering and prevent UI flickering
                const sortedStudents = [...response.data.students].sort((a, b) => a.id - b.id);
                setStudents(sortedStudents);
                // Also update session data to sync language changes
                setSession(response.data.session);

                const errorsResponse = await sessionsAPI.getErrors(sessionCode);
                setErrors(errorsResponse.data);
            } catch (error) {
                console.error('Polling error:', error);
            }
        };

        // Poll every 10 seconds (WebSocket handles real-time, this is fallback)
        const interval = setInterval(pollData, 10000);

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
            console.log('🔔 Activity received:', data);  // DEBUG
            setStudents(prev => prev.map(s => {
                if (s.id === data.student_id) {
                    if (data.activity_type === 'tab_hidden') {
                        return { ...s, last_active: data.timestamp, activity_alert: 'Tab Hidden' };
                    } else if (data.activity_type === 'window_blur') {
                        return { ...s, last_active: data.timestamp, activity_alert: 'Window Blur' };
                    } else if (data.activity_type === 'split_screen') {
                        return { ...s, last_active: data.timestamp, activity_alert: 'Split Screen' };
                    } else if (data.activity_type === 'tab_visible' || data.activity_type === 'fullscreen_restored') {
                        return { ...s, last_active: data.timestamp, activity_alert: null };
                    }
                    return { ...s, last_active: data.timestamp };
                }
                return s;
            }));
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

    if (!session) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-red-500 text-6xl mb-4">
                        <svg className="w-20 h-20 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {typeof error === 'string' ? error : 'Failed to load session'}
                    </h2>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="btn btn-primary mt-4"
                    >
                        Return to Dashboard
                    </button>
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
                                            onExpand={() => setExpandedStudent(student)}
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

            {/* Expanded Student Modal - Rendered at Dashboard level for proper full-screen overlay */}
            {expandedStudent && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95"
                    onClick={() => {
                        setExpandedStudent(null);
                        setExpandedCode('');
                        setExpandedOutput(null);
                        setIsExpandedEditing(false);
                    }}
                >
                    <div
                        className="bg-dark-800 border border-dark-600 rounded-xl w-[95vw] h-[90vh] flex flex-col shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-dark-600 bg-dark-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-white">
                                    {(expandedStudent.full_name || expandedStudent.username)[0].toUpperCase()}
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white">{expandedStudent.full_name || expandedStudent.username}</h3>
                                    <p className="text-sm text-gray-400">Code & Console View</p>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex items-center gap-3">
                                {/* Run Button */}
                                <button
                                    onClick={async () => {
                                        setIsExpandedRunning(true);
                                        setExpandedOutput(null);
                                        try {
                                            const codeToRun = expandedCode || expandedStudent.code_content;
                                            const response = await codingAPI.execute(codeToRun, expandedStudent.language || 'python', sessionCode);
                                            setExpandedOutput({
                                                success: response.data.success,
                                                message: response.data.output || response.data.error
                                            });
                                        } catch (error) {
                                            setExpandedOutput({
                                                success: false,
                                                message: error.message || 'Execution failed'
                                            });
                                        } finally {
                                            setIsExpandedRunning(false);
                                        }
                                    }}
                                    disabled={isExpandedRunning}
                                    className="btn btn-primary disabled:opacity-50"
                                >
                                    {isExpandedRunning ? (
                                        <>
                                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                            </svg>
                                            Running...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                            </svg>
                                            Run
                                        </>
                                    )}
                                </button>

                                {/* Edit/Save Button */}
                                {!isExpandedEditing ? (
                                    <button
                                        onClick={() => {
                                            setExpandedCode(expandedStudent.code_content || '');
                                            setIsExpandedEditing(true);
                                        }}
                                        className="btn btn-secondary"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                        </svg>
                                        Edit
                                    </button>
                                ) : (
                                    <button
                                        onClick={async () => {
                                            setIsExpandedSaving(true);
                                            try {
                                                await codingAPI.teacherSaveCode(expandedStudent.id, expandedCode, expandedStudent.language || 'python', sessionCode);
                                                // Update local student data
                                                setStudents(prev => prev.map(s =>
                                                    s.id === expandedStudent.id ? { ...s, code_content: expandedCode } : s
                                                ));
                                                setExpandedStudent(prev => ({ ...prev, code_content: expandedCode }));
                                                setIsExpandedEditing(false);
                                            } catch (error) {
                                                console.error('Failed to save:', error);
                                            } finally {
                                                setIsExpandedSaving(false);
                                            }
                                        }}
                                        disabled={isExpandedSaving}
                                        className="btn bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50"
                                    >
                                        {isExpandedSaving ? (
                                            <>
                                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                                </svg>
                                                Saving...
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Save
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Close Button */}
                                <button
                                    onClick={() => {
                                        setExpandedStudent(null);
                                        setExpandedCode('');
                                        setExpandedOutput(null);
                                        setIsExpandedEditing(false);
                                    }}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Modal Body - Split View */}
                        <div className="flex-1 flex flex-row overflow-hidden">
                            {/* Code Editor Side */}
                            <div className="flex-1 flex flex-col border-r border-dark-600">
                                <div className="px-3 py-2 bg-dark-900 border-b border-dark-700 text-xs text-gray-400 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                                        </svg>
                                        Code ({expandedStudent.language || 'python'})
                                    </div>
                                    {isExpandedEditing && (
                                        <span className="text-purple-400 flex items-center gap-1">
                                            <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                                            Editing Mode
                                        </span>
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Editor
                                        height="100%"
                                        language={expandedStudent.language || 'python'}
                                        value={isExpandedEditing ? expandedCode : (expandedStudent.code_content || '// No code yet')}
                                        onChange={isExpandedEditing ? (value) => setExpandedCode(value) : undefined}
                                        theme={isDark ? "vs-dark" : "light"}
                                        options={{
                                            readOnly: !isExpandedEditing,
                                            minimap: { enabled: true },
                                            scrollBeyondLastLine: false,
                                            fontSize: 14,
                                            lineNumbers: 'on',
                                            folding: true,
                                            wordWrap: 'on',
                                            automaticLayout: true,
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Console Output Side */}
                            <div className="w-[40%] flex flex-col bg-dark-900">
                                <div className="px-3 py-2 bg-dark-900 border-b border-dark-700 text-xs text-gray-400 flex items-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    Console Output
                                </div>
                                <div className="flex-1 overflow-y-auto p-4 font-mono text-sm">
                                    {expandedOutput ? (
                                        <pre className={`whitespace-pre-wrap break-words ${expandedOutput.success === false ? 'text-red-400' : 'text-green-400'}`}>
                                            {expandedOutput.message || 'No output'}
                                        </pre>
                                    ) : expandedStudent.recent_logs?.[0] ? (
                                        <pre className={`whitespace-pre-wrap break-words ${expandedStudent.recent_logs[0].log_type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                                            {expandedStudent.recent_logs[0].message || 'No output'}
                                        </pre>
                                    ) : (
                                        <span className="text-gray-500 italic">No output yet. Click "Run" to execute the code.</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AIChatWidget activeSession={session} />
        </div>
    );
}
