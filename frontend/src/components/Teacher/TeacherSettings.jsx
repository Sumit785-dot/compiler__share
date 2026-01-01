
import { useState, useEffect } from 'react';
import { authAPI } from '../../services/api';
import Header from '../Common/Header';

export default function TeacherSettings() {
    const [settings, setSettings] = useState({
        openai_api_key: '',
        gemini_api_key: '',
        groq_api_key: '',
        is_ai_active: false
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const response = await authAPI.getSettings();
            setSettings(response.data);
        } catch (error) {
            console.error('Failed to load settings', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage({ type: '', text: '' });

        try {
            await authAPI.updateSettings(settings);
            setMessage({ type: 'success', text: 'Settings updated successfully!' });
        } catch (error) {
            setMessage({ type: 'error', text: 'Failed to update settings.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="text-center text-white mt-10">Loading settings...</div>;

    return (
        <div className="min-h-screen bg-[#0D1117]">
            {/* Header is global, but usually handled by App.jsx layout. 
                If Header is not global, include it here. 
                Assuming App.jsx renders Header conditionally. */}

            <div className="max-w-4xl mx-auto px-4 py-8">
                <h1 className="text-3xl font-bold text-white mb-2">Teacher Settings</h1>
                <p className="text-gray-400 mb-8">Configure your AI assistants and preferences.</p>

                <div className="bg-[#161B22] border border-[#30363D] rounded-xl p-6">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        AI Configuration
                    </h2>

                    {message.text && (
                        <div className={`p-4 rounded-lg mb-6 ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                            {message.text}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Master Toggle */}
                        <div className="flex items-center justify-between p-4 bg-[#0D1117] rounded-lg border border-[#30363D]">
                            <div>
                                <h3 className="text-white font-medium">Enable AI Assistant</h3>
                                <p className="text-sm text-gray-400">Allow AI to solve student errors in the dashboard.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="is_ai_active"
                                    checked={settings.is_ai_active}
                                    onChange={handleChange}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300">
                                OpenAI API Key
                            </label>
                            <input
                                type="password"
                                name="openai_api_key"
                                value={settings.openai_api_key}
                                onChange={handleChange}
                                placeholder="sk-..."
                                className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <p className="text-xs text-gray-500">Required for GPT-4/3.5 models.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300">
                                Gemini API Key
                            </label>
                            <input
                                type="password"
                                name="gemini_api_key"
                                value={settings.gemini_api_key}
                                onChange={handleChange}
                                placeholder="AIza..."
                                className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <p className="text-xs text-gray-500">Google Gemini fallback.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-sm font-medium text-gray-300">
                                Groq API Key
                            </label>
                            <input
                                type="password"
                                name="groq_api_key"
                                value={settings.groq_api_key}
                                onChange={handleChange}
                                placeholder="gsk_..."
                                className="w-full px-4 py-2 bg-[#0D1117] border border-[#30363D] rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            />
                            <p className="text-xs text-gray-500">Fast inference fallback.</p>
                        </div>

                        <div className="pt-4 border-t border-[#30363D]">
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
