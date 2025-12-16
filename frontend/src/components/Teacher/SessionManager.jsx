/**
 * Session Manager - Teacher's session management page
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../../services/api';

export default function SessionManager() {
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newSession, setNewSession] = useState({ session_name: '', description: '', default_language: 'python' });
    const [creating, setCreating] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const response = await sessionsAPI.list();
            setSessions(response.data);
        } catch (error) {
            console.error('Failed to load sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const createSession = async (e) => {
        e.preventDefault();
        setCreating(true);
        try {
            const response = await sessionsAPI.create(newSession);
            setSessions([response.data, ...sessions]);
            setShowCreate(false);
            setNewSession({ session_name: '', description: '', default_language: 'python' });
        } catch (error) {
            console.error('Failed to create session:', error);
        } finally {
            setCreating(false);
        }
    };

    const endSession = async (sessionCode) => {
        if (!confirm('Are you sure you want to end this session?')) return;
        try {
            await sessionsAPI.end(sessionCode);
            loadSessions();
        } catch (error) {
            console.error('Failed to end session:', error);
        }
    };

    const copySessionCode = (code) => {
        navigator.clipboard.writeText(code);
    };

    return (
        <div className="min-h-screen p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gradient">Session Manager</h1>
                        <p className="text-gray-400 mt-1">Create and manage your coding sessions</p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="btn btn-primary"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Session
                    </button>
                </div>

                {/* Create Session Modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                        <div className="card w-full max-w-md animate-fadeIn">
                            <h2 className="text-xl font-bold mb-4">Create New Session</h2>
                            <form onSubmit={createSession} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Session Name
                                    </label>
                                    <input
                                        type="text"
                                        value={newSession.session_name}
                                        onChange={(e) => setNewSession({ ...newSession, session_name: e.target.value })}
                                        className="input"
                                        placeholder="e.g., Python Basics - Week 1"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Description (optional)
                                    </label>
                                    <textarea
                                        value={newSession.description}
                                        onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                                        className="input min-h-[80px]"
                                        placeholder="Add a description..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Default Language
                                    </label>
                                    <select
                                        value={newSession.default_language}
                                        onChange={(e) => setNewSession({ ...newSession, default_language: e.target.value })}
                                        className="input"
                                    >
                                        <option value="python">Python</option>
                                        <option value="javascript">JavaScript</option>
                                        <option value="c">C</option>
                                        <option value="cpp">C++</option>
                                        <option value="java">Java</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 btn btn-secondary"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 btn btn-primary"
                                    >
                                        {creating ? 'Creating...' : 'Create Session'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Sessions Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="card animate-pulse">
                                <div className="h-6 bg-dark-700 rounded w-3/4 mb-4" />
                                <div className="h-4 bg-dark-700 rounded w-1/2 mb-6" />
                                <div className="h-10 bg-dark-700 rounded" />
                            </div>
                        ))}
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-dark-800 flex items-center justify-center">
                            <svg className="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-300 mb-2">No sessions yet</h3>
                        <p className="text-gray-500 mb-6">Create your first coding session to get started</p>
                        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                            Create Session
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map((session) => (
                            <div key={session.id} className="card hover:border-blue-500/30 transition-all">
                                <div className="flex items-start justify-between mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg text-white">{session.session_name}</h3>
                                        {session.description && (
                                            <p className="text-gray-400 text-sm mt-1 line-clamp-2">{session.description}</p>
                                        )}
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${session.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {session.is_active ? 'Active' : 'Ended'}
                                    </span>
                                </div>

                                {/* Session Code */}
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-dark-800 mb-4">
                                    <span className="text-gray-400 text-sm">Code:</span>
                                    <span className="font-mono font-bold text-xl text-white tracking-wider">
                                        {session.session_code}
                                    </span>
                                    <button
                                        onClick={() => copySessionCode(session.session_code)}
                                        className="ml-auto p-1.5 hover:bg-dark-700 rounded text-gray-400 hover:text-white transition-colors"
                                        title="Copy code"
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                    </button>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                                    <span className="flex items-center gap-1">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        {session.participant_count || 0} students
                                    </span>
                                    <span className="capitalize">{session.default_language}</span>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2">
                                    {session.is_active ? (
                                        <>
                                            <button
                                                onClick={() => navigate(`/session/${session.session_code}`)}
                                                className="flex-1 btn btn-primary"
                                            >
                                                Open Dashboard
                                            </button>
                                            <button
                                                onClick={() => endSession(session.session_code)}
                                                className="btn btn-secondary text-red-400 hover:text-red-300"
                                            >
                                                End
                                            </button>
                                        </>
                                    ) : (
                                        <button disabled className="flex-1 btn btn-secondary opacity-50 cursor-not-allowed">
                                            Session Ended
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
