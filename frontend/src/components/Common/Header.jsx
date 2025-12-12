/**
 * Header component with navigation and user info
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';

export default function Header() {
    const { user, logout } = useAuth();
    const { isConnected, sessionCode, disconnect } = useWebSocket();
    const navigate = useNavigate();

    const handleLogout = async () => {
        disconnect();
        await logout();
        navigate('/login');
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-gradient">CodeMonitor</span>
                    </Link>

                    {/* Center - Connection Status */}
                    {isConnected && sessionCode && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full glass-light">
                            <div className="status-online" />
                            <span className="text-sm text-gray-300">
                                Session: <span className="font-mono font-bold text-white">{sessionCode}</span>
                            </span>
                        </div>
                    )}

                    {/* Right - User Info & Nav */}
                    <div className="flex items-center gap-6">
                        {/* Navigation */}
                        <nav className="hidden md:flex items-center gap-4">
                            {user?.role === 'teacher' && (
                                <>
                                    <Link
                                        to="/dashboard"
                                        className="text-gray-300 hover:text-white transition-colors"
                                    >
                                        Dashboard
                                    </Link>
                                </>
                            )}
                            {user?.role === 'student' && (
                                <>
                                    <Link
                                        to="/join"
                                        className="text-gray-300 hover:text-white transition-colors"
                                    >
                                        Join Session
                                    </Link>
                                </>
                            )}
                        </nav>

                        {/* User Info */}
                        <div className="flex items-center gap-3">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-white">
                                    {user?.full_name || user?.username}
                                </p>
                                <p className="text-xs text-gray-400 capitalize">
                                    {user?.role}
                                </p>
                            </div>

                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-white">
                                {(user?.full_name || user?.username || 'U')[0].toUpperCase()}
                            </div>

                            <button
                                onClick={handleLogout}
                                className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
                                title="Logout"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
