/**
 * Join Session - Student enters session code
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../../services/api';

export default function JoinSession() {
    const [sessionCode, setSessionCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ active_sessions: 0, attended_sessions: 0 });
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await sessionsAPI.getStudentStats();
            setStats(response.data);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await sessionsAPI.join(sessionCode.toUpperCase());
            navigate(`/code/${sessionCode.toUpperCase()}`);
        } catch (err) {
            setError(err.response?.data?.session_code?.[0] || 'Invalid session code. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCodeChange = (e) => {
        setSessionCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6));
    };

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-12 flex-col">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            {/* Stats Header */}
            <div className="absolute top-8 right-8 flex gap-6 text-sm font-medium z-10 hidden md:flex">
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">Live Activty</span>
                    <span className="text-green-400 flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        {stats.active_sessions} Sessions Active
                    </span>
                </div>
                <div className="w-px bg-white/10 h-10"></div>
                <div className="flex flex-col items-end">
                    <span className="text-gray-400">Your Journey</span>
                    <span className="text-blue-400 flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                        {stats.attended_sessions} Classes Attended
                    </span>
                </div>
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-green-500 to-blue-600 shadow-2xl mb-4">
                        <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-gradient">Join Session</h1>
                    <p className="text-gray-400 mt-2">Enter the code provided by your teacher</p>
                </div>

                {/* Form Card */}
                <div className="card animate-fadeIn">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm animate-fadeIn">
                                {error}
                            </div>
                        )}

                        <div>
                            <label htmlFor="sessionCode" className="block text-sm font-medium text-gray-300 mb-3">
                                Session Code
                            </label>
                            <input
                                id="sessionCode"
                                type="text"
                                value={sessionCode}
                                onChange={handleCodeChange}
                                className="input text-center text-3xl font-mono font-bold tracking-[0.5em] h-16"
                                placeholder="______"
                                maxLength={6}
                                autoComplete="off"
                                autoFocus
                            />
                            <p className="text-center text-sm text-gray-500 mt-2">
                                6-character code (letters and numbers)
                            </p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading || sessionCode.length < 6}
                            className="w-full btn btn-primary py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Joining...
                                </span>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                    </svg>
                                    Join Session
                                </>
                            )}
                        </button>
                    </form>
                </div>

                {/* Instructions */}
                <div className="mt-8 text-center">
                    <div className="p-4 rounded-xl glass-light">
                        <h3 className="font-medium text-white mb-2">How to join:</h3>
                        <ol className="text-sm text-gray-400 text-left space-y-1 list-decimal list-inside">
                            <li>Ask your teacher for the session code</li>
                            <li>Enter the 6-character code above</li>
                            <li>Click "Join Session" to start coding</li>
                        </ol>
                    </div>
                </div>

                {/* Personal Console Option */}
                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-dark-600"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-dark-900 text-gray-500">or</span>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/personal-console')}
                        className="mt-6 w-full btn btn-secondary py-3 text-lg flex items-center justify-center gap-2 hover:border-green-500/50 hover:text-green-400 transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Open Personal Console
                    </button>
                    <p className="text-center text-sm text-gray-500 mt-2">
                        Practice coding on your own without joining a session
                    </p>
                </div>
            </div>
        </div>
    );
}
