/**
 * Student Dashboard
 * Shows comprehensive stats and quick actions
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogIn, Terminal, Activity, BookOpen, AlertCircle, PlayCircle } from 'lucide-react';
import { sessionsAPI } from '../../services/api';

export default function StudentDashboard() {
    const [stats, setStats] = useState({
        active_sessions: 0,
        attended_sessions: 0,
        total_sessions: 0,
        missed_sessions: 0
    });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const loadStats = async () => {
            try {
                const response = await sessionsAPI.getStudentStats();
                setStats(response.data);
            } catch (error) {
                console.error("Failed to load dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };
        loadStats();
    }, []);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
    };

    // Card component for stats
    const StatCard = ({ title, value, icon: Icon, color, subtext }) => (
        <motion.div
            variants={itemVariants}
            className={`glass p-6 rounded-2xl relative overflow-hidden group hover:border-${color}-500/30 transition-colors`}
        >
            <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl bg-${color}-500 group-hover:opacity-20 transition-opacity`} />

            <div className="relative z-10 flex justify-between items-start">
                <div>
                    <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
                    <div className="text-3xl font-bold font-mono text-white">{value}</div>
                    {subtext && <div className="text-xs text-gray-500 mt-2">{subtext}</div>}
                </div>
                <div className={`p-3 rounded-xl bg-${color}-500/10 text-${color}-500`}>
                    <Icon className="w-6 h-6" />
                </div>
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-transparent px-6 py-10 font-sans relative overflow-hidden">
            {/* Ambient Background (Dark Mode Only) */}
            <div className="absolute inset-0 pointer-events-none dark:block hidden">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[100px]" />
            </div>

            <motion.div
                className="max-w-5xl mx-auto relative z-10"
                initial="hidden"
                animate="visible"
                variants={containerVariants}
            >
                {/* Header */}
                <motion.div variants={itemVariants} className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Student Dashboard</h1>
                    <p className="text-gray-400">Welcome back! Here's an overview of your coding journey.</p>
                </motion.div>

                {/* Main Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    <StatCard
                        title="Attended Sessions"
                        value={stats.attended_sessions}
                        icon={BookOpen}
                        color="blue"
                        subtext="Classes you've joined"
                    />
                    <StatCard
                        title="Missed Sessions"
                        value={stats.missed_sessions}
                        icon={AlertCircle}
                        color="red"
                        subtext={`${Math.round((stats.missed_sessions / (stats.total_sessions || 1)) * 100)}% of total sessions`}
                    />
                    <motion.div
                        variants={itemVariants}
                        className="glass p-6 rounded-2xl relative overflow-hidden group hover:border-green-500/30 transition-colors"
                    >
                        <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 blur-2xl bg-green-500 group-hover:opacity-20 transition-opacity" />
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <h3 className="text-gray-400 text-sm font-medium mb-1">Live Activity</h3>
                                <div className="text-3xl font-bold text-white font-mono flex items-center gap-2">
                                    {stats.active_sessions}
                                    {stats.active_sessions > 0 && <span className="flex h-3 w-3 relative"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span></span>}
                                </div>
                                <div className="text-xs text-gray-500 mt-2">Sessions currently running</div>
                            </div>
                            <div className="p-3 rounded-xl bg-green-500/10 text-green-500">
                                <Activity className="w-6 h-6" />
                            </div>
                        </div>
                    </motion.div>
                </div>

                {/* Quick Actions */}
                <motion.div variants={itemVariants}>
                    <h2 className="text-xl font-semibold text-white mb-6">Quick Actions</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Join Session Card */}
                        <div
                            onClick={() => navigate('/join')}
                            className="glass group cursor-pointer hover:border-blue-500/30 rounded-2xl p-6 transition-all hover:shadow-lg md:col-span-1"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                                    <LogIn className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Join a Session</h3>
                                    <p className="text-blue-400/80 text-sm">Enter a classroom code</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Ready to code? Join a live session hosted by your teacher and start completing tasks in real-time.
                            </p>
                            <span className="inline-flex items-center gap-2 text-blue-500 font-semibold group-hover:translate-x-1 transition-transform">
                                Go to Join Page <PlayCircle className="w-4 h-4" />
                            </span>
                        </div>

                        {/* Personal Console Card */}
                        <div
                            onClick={() => navigate('/personal-console')}
                            className="glass group cursor-pointer hover:border-gray-500/30 rounded-2xl p-6 transition-all md:col-span-1"
                        >
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 rounded-xl bg-gray-700 text-white group-hover:scale-110 transition-transform">
                                    <Terminal className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-white">Personal Console</h3>
                                    <p className="text-gray-400 text-sm">Practice on your own</p>
                                </div>
                            </div>
                            <p className="text-gray-400 text-sm leading-relaxed mb-6">
                                Improve your skills in a private environment. Write, run, and test code without joining a class.
                            </p>
                            <span className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-300 font-semibold group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                                Launch Console <Terminal className="w-4 h-4" />
                            </span>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
