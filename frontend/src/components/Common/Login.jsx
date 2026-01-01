/**
 * Login component with modern design
 */
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    // New state for pausing animation
    const [isPaused, setIsPaused] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    // Background images
    const backgroundImages = [
        '/assets/login-bg/bg1.png',
        '/assets/login-bg/bg2.png',
        '/assets/login-bg/bg3.png',
        '/assets/login-bg/bg4.png',
        '/assets/login-bg/bg5.png'
    ];

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Auto-slide effect - Pauses when isPaused is true
    useEffect(() => {
        if (isPaused) return;

        const interval = setInterval(() => {
            setCurrentImageIndex((prevIndex) =>
                prevIndex === backgroundImages.length - 1 ? 0 : prevIndex + 1
            );
        }, 5000); // Change image every 5 seconds

        return () => clearInterval(interval);
    }, [backgroundImages.length, isPaused]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(username, password);
            navigate(user.role === 'teacher' ? '/dashboard' : '/join');
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden flex items-center font-sans">
            {/* Background Slideshow */}
            <div className={`absolute inset-0 z-0 transition-all duration-700 ${isPaused ? 'scale-105 blur-sm brightness-75' : 'scale-100'}`}>
                {backgroundImages.map((img, index) => (
                    <div
                        key={index}
                        className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out transform ${index === currentImageIndex ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                            }`}
                        style={{ backgroundImage: `url(${img})` }}
                    >
                        {/* Overlay for better text readability - Increased opacity globally */}
                        <div className="absolute inset-0 bg-black/60" />
                    </div>
                ))}
            </div>

            {/* Content Container - Right Aligned */}
            <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-end items-center h-full">
                <div
                    className="w-full max-w-[420px] bg-black/30 backdrop-blur-2xl p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] animate-fadeIn ring-1 ring-white/5 transition-all duration-300"
                    // Smart Pause Interaction Handlers
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    onFocus={() => setIsPaused(true)}
                    onBlur={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget)) {
                            setIsPaused(false);
                        }
                    }}
                >
                    {/* Logo Area */}
                    <div className="text-center mb-10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-white/10 mb-6 shadow-glow">
                            <svg className="w-8 h-8 text-blue-400 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                            </svg>
                        </div>
                        <h1 className="text-4xl font-bold text-white tracking-tight mb-2 font-display">
                            Welcome Back
                        </h1>
                        <p className="text-gray-400 text-sm font-medium tracking-wide uppercase opacity-80">
                            Sign in to Observer
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-200 text-sm text-center backdrop-blur-sm animate-fadeIn">
                                {error}
                            </div>
                        )}

                        <div className="space-y-1">
                            <label htmlFor="username" className="block text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">
                                Username or Email
                            </label>
                            <div className="relative group">
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-black/70 text-white placeholder-gray-400 transition-all duration-300 outline-none group-hover:bg-black/60"
                                    placeholder="Enter your username or email"
                                    required
                                    autoComplete="username"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label htmlFor="password" className="block text-xs font-semibold text-gray-400 ml-1 uppercase tracking-wider">
                                Password
                            </label>
                            <div className="relative group">
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3.5 bg-black/50 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 focus:bg-black/70 text-white placeholder-gray-400 transition-all duration-300 outline-none group-hover:bg-black/60"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="current-password"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 px-4 mt-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:from-blue-500 hover:via-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transform transition-all duration-300 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 text-sm tracking-wide uppercase"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white/80" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Authenticating...
                                </span>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <p className="text-gray-400 text-sm">
                            Don't have an account?{' '}
                            <Link to="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors hover:underline decoration-2 underline-offset-4">
                                Create one
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Minimal Footer */}
            <div className="absolute bottom-6 left-8 text-white/30 text-xs font-medium tracking-widest uppercase">
                Observer v1.0 • Secure Environment
            </div>
        </div>
    );
}
