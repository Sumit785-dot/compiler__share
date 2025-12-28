/**
 * Session Manager - Premium Teacher Dashboard
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus,
    Code2,
    Users,
    Terminal,
    MoreVertical,
    Trash2,
    Copy,
    ExternalLink,
    Play,
    Clock,
    Search
} from 'lucide-react';
import { sessionsAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function SessionManager() {
    const { isDark } = useTheme();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newSession, setNewSession] = useState({ session_name: '', description: '', default_language: 'python' });
    const [creating, setCreating] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
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
        // Could add a toast notification here later
    };

    const filteredSessions = sessions.filter(s =>
        s.session_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.session_code.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeSessionsCount = sessions.filter(s => s.is_active).length;
    const totalStudents = sessions.reduce((acc, curr) => acc + (curr.participant_count || 0), 0);

    return (
        <div className={`min-h-screen p-6 font-sans ${isDark ? 'bg-[#0f1117] text-white' : 'bg-gray-50 text-gray-900'}`}>
            <div className="max-w-7xl mx-auto">
                {/* Header Section */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12"
                >
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2 font-display">
                            Command Center
                        </h1>
                        <p className={`font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>Manage your active coding classrooms</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className={`hidden md:flex items-center gap-6 px-6 py-3 rounded-2xl border backdrop-blur-sm ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Active</div>
                                <div className="text-xl font-bold text-green-400">{activeSessionsCount}</div>
                            </div>
                            <div className="w-px h-8 bg-white/10" />
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Students</div>
                                <div className="text-xl font-bold text-blue-400">{totalStudents}</div>
                            </div>
                        </div>
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => setShowCreate(true)}
                            className="btn btn-primary px-6 py-3 rounded-xl shadow-lg shadow-blue-500/20 flex items-center gap-2"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-semibold">New Session</span>
                        </motion.button>
                    </div>
                </motion.div>

                {/* Search Bar */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="relative mb-8 max-w-md"
                >
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search sessions..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${isDark ? 'bg-white/5 border border-white/10 text-gray-300 placeholder-gray-600' : 'bg-white border border-gray-200 text-gray-900 placeholder-gray-400 shadow-sm'}`}
                    />
                </motion.div>

                {/* Sessions Grid */}
                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className={`h-64 rounded-3xl animate-pulse ${isDark ? 'bg-white/5' : 'bg-gray-200'}`} />
                        ))}
                    </div>
                ) : filteredSessions.length === 0 ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`text-center py-20 rounded-3xl border border-dashed ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-300 shadow-sm'}`}
                    >
                        <div className={`w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center ${isDark ? 'bg-blue-500/10' : 'bg-blue-100'}`}>
                            <Code2 className="w-12 h-12 text-blue-400" />
                        </div>
                        <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>No active sessions</h3>
                        <p className={`mb-8 max-w-sm mx-auto ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                            Start a new coding environment to begin monitoring students in real-time.
                        </p>
                        <button onClick={() => setShowCreate(true)} className="btn btn-primary">
                            Create First Session
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        layout
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        <AnimatePresence>
                            {filteredSessions.map((session, index) => (
                                <motion.div
                                    layout
                                    key={session.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3, delay: index * 0.05 }}
                                    className={`group relative rounded-3xl p-6 border transition-all duration-300 ${isDark ? 'bg-[#161b22] hover:bg-[#1a202a] border-white/5 hover:border-blue-500/30 shadow-xl hover:shadow-2xl hover:shadow-blue-500/10' : 'bg-white hover:bg-gray-50 border-gray-200 hover:border-blue-300 shadow-md hover:shadow-lg'}`}
                                >
                                    {/* Status Badge */}
                                    <div className="flex justify-between items-start mb-6">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${session.is_active
                                            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                                            : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                                            }`}>
                                            <span className={`w-2 h-2 rounded-full ${session.is_active ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                                            {session.is_active ? 'Live' : 'Archived'}
                                        </span>

                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {session.is_active && (
                                                <button
                                                    onClick={() => endSession(session.session_code)}
                                                    className="p-2 hover:bg-red-500/20 rounded-lg text-gray-400 hover:text-red-400 transition-colors"
                                                    title="End Session"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-6">
                                        <h3 className={`font-bold text-xl mb-2 line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{session.session_name}</h3>
                                        <p className={`text-sm line-clamp-2 h-10 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                            {session.description || 'No description provided.'}
                                        </p>
                                    </div>

                                    {/* Code Snippet Box */}
                                    <div className={`rounded-xl p-4 mb-6 relative group/code border ${isDark ? 'bg-black/30 border-white/5' : 'bg-gray-100 border-gray-200'}`}>
                                        <div className="text-xs text-gray-500 uppercase font-bold mb-1">Session Code</div>
                                        <div className="font-mono text-2xl font-bold text-blue-400 tracking-wider">
                                            {session.session_code}
                                        </div>
                                        <button
                                            onClick={() => copySessionCode(session.session_code)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {/* Footer Stats & Action */}
                                    <div className={`flex items-center justify-between pt-4 border-t ${isDark ? 'border-white/5' : 'border-gray-200'}`}>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 font-medium">
                                            <div className="flex items-center gap-1.5" title="Students">
                                                <Users className="w-4 h-4" />
                                                {session.participant_count || 0}
                                            </div>
                                            <div className="flex items-center gap-1.5 capitalize" title="Language">
                                                <Terminal className="w-4 h-4" />
                                                {session.default_language}
                                            </div>
                                        </div>

                                        {session.is_active ? (
                                            <button
                                                onClick={() => navigate(`/session/${session.session_code}`)}
                                                className="flex items-center gap-2 text-sm font-bold text-blue-400 hover:text-blue-300 transition-colors"
                                            >
                                                Monitor <ExternalLink className="w-4 h-4" />
                                            </button>
                                        ) : (
                                            <span className="text-xs font-semibold text-gray-600 uppercase">Closed</span>
                                        )}
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Create Session Modal */}
                <AnimatePresence>
                    {showCreate && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                                onClick={() => setShowCreate(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                className={`relative w-full max-w-lg rounded-3xl border shadow-2xl p-8 z-10 ${isDark ? 'bg-[#1e232e] border-white/10' : 'bg-white border-gray-200'}`}
                            >
                                <h2 className={`text-2xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>Create New Environment</h2>
                                <form onSubmit={createSession} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Session Name</label>
                                        <input
                                            type="text"
                                            value={newSession.session_name}
                                            onChange={(e) => setNewSession({ ...newSession, session_name: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all outline-none ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                            placeholder="e.g. Algorithms 101"
                                            required
                                            autoFocus
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Description</label>
                                        <textarea
                                            value={newSession.description}
                                            onChange={(e) => setNewSession({ ...newSession, description: e.target.value })}
                                            className={`w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all outline-none min-h-[100px] ${isDark ? 'bg-black/20 border-white/10 text-white' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
                                            placeholder="Briefly describe the session goals..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Language Stack</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {['python', 'javascript', 'java', 'cpp', 'c'].map((lang) => (
                                                <button
                                                    key={lang}
                                                    type="button"
                                                    onClick={() => setNewSession({ ...newSession, default_language: lang })}
                                                    className={`px-4 py-3 rounded-xl border font-medium capitalize transition-all ${newSession.default_language === lang
                                                        ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                                                        : isDark ? 'bg-black/20 border-white/5 text-gray-400 hover:bg-white/5' : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
                                                        }`}
                                                >
                                                    {lang === 'cpp' ? 'C++' : lang}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 pt-4">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreate(false)}
                                            className={`flex-1 px-6 py-3 rounded-xl font-semibold transition-colors ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={creating}
                                            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all"
                                        >
                                            {creating ? 'initializing...' : 'Launch Session'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
