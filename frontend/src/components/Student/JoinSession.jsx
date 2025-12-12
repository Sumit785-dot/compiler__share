/**
 * Join Session - Student enters session code
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { sessionsAPI } from '../../services/api';

export default function JoinSession() {
    const [sessionCode, setSessionCode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

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
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
            {/* Background effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 -left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
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
            </div>
        </div>
    );
}
