/**
 * Header component with navigation and user info
 */
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useWebSocket } from '../../context/WebSocketContext';
import { useTheme } from '../../context/ThemeContext';

export default function Header() {
    const { user, logout } = useAuth();
    const { isConnected, sessionCode, disconnect } = useWebSocket();
    const { theme, toggleTheme } = useTheme();
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
                        <span className="text-xl font-bold text-gradient">Observer</span>
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
                                    <button
                                        onClick={() => navigate('/dashboard')}
                                        className="text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                                    >
                                        Dashboard
                                    </button>
                                    <button
                                        onClick={() => navigate('/personal-console')}
                                        className="text-gray-300 hover:text-green-400 transition-colors bg-transparent border-none cursor-pointer"
                                    >
                                        Personal Console
                                    </button>
                                    <button
                                        onClick={() => navigate('/settings')}
                                        className="text-gray-300 hover:text-purple-400 transition-colors bg-transparent border-none cursor-pointer"
                                    >
                                        Settings
                                    </button>
                                    <button
                                        onClick={() => navigate('/join')}
                                        className="text-gray-300 hover:text-blue-400 transition-colors bg-transparent border-none cursor-pointer"
                                    >
                                        Join Session
                                    </button>
                                </>
                            )}
                            {user?.role === 'student' && (
                                <>
                                    <button
                                        onClick={() => navigate('/join')}
                                        className="text-gray-300 hover:text-white transition-colors bg-transparent border-none cursor-pointer"
                                    >
                                        Join Session
                                    </button>
                                    <button
                                        onClick={() => navigate('/personal-console')}
                                        className="text-gray-300 hover:text-green-400 transition-colors bg-transparent border-none cursor-pointer"
                                    >
                                        Personal Console
                                    </button>
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

                            {/* Theme Toggle Button */}
                            <button
                                onClick={toggleTheme}
                                className="p-2 text-blue-200 hover:text-white hover:bg-white/10 rounded-lg transition-all"
                                title={theme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
                            >
                                {theme === 'dark' ? (
                                    /* Moon Icon - showing current dark/blue theme */
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                                    </svg>
                                ) : (
                                    /* Sun Icon - showing current light/white theme */
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                    </svg>
                                )}
                            </button>

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

