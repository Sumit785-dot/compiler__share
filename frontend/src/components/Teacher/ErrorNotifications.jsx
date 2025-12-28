/**
 * Error Notifications Panel - Shows student errors to teacher
 */
import { useEffect, useRef } from 'react';

// Play notification sound
const playNotificationSound = () => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;

    oscillator.start();
    setTimeout(() => {
        oscillator.stop();
        audioContext.close();
    }, 200);
};

// Show browser notification
const showBrowserNotification = (studentName, errorMessage) => {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`⚠️ Error from ${studentName}`, {
            body: errorMessage.slice(0, 100),
            icon: '🚨',
            tag: 'student-error'
        });
    }
};

export default function ErrorNotifications({ errors, onMarkRead, onClearAll }) {
    const unreadErrors = errors.filter(e => !e.is_read);
    const prevErrorCountRef = useRef(0);

    // Request notification permission on mount
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Play sound and show notification when new error arrives
    useEffect(() => {
        if (unreadErrors.length > prevErrorCountRef.current && prevErrorCountRef.current !== 0) {
            // New error arrived
            const latestError = unreadErrors[0];
            playNotificationSound();
            showBrowserNotification(
                latestError?.student?.full_name || latestError?.student?.username || 'Student',
                latestError?.error_message || 'An error occurred'
            );
        }
        prevErrorCountRef.current = unreadErrors.length;
    }, [unreadErrors]);

    return (
        <div className="card">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-white flex items-center gap-2">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Errors
                    {unreadErrors.length > 0 && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                            {unreadErrors.length}
                        </span>
                    )}
                </h3>
                {errors.length > 0 && (
                    <button
                        onClick={onClearAll}
                        className="text-xs text-gray-400 hover:text-white"
                    >
                        Clear all
                    </button>
                )}
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
                {unreadErrors.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">
                        <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <p className="text-sm">No new errors</p>
                    </div>
                ) : (
                    unreadErrors.map((error) => (
                        <div
                            key={error.id}
                            className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-fadeIn"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                        {(error.student?.full_name || error.student?.username || 'U')[0].toUpperCase()}
                                    </div>
                                    <span className="text-sm font-medium text-white truncate">
                                        {error.student?.full_name || error.student?.username}
                                    </span>
                                </div>
                                <button
                                    onClick={() => onMarkRead(error.id)}
                                    className="text-gray-400 hover:text-white flex-shrink-0"
                                    title="Mark as read"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <pre className="mt-2 text-xs text-red-400 font-mono whitespace-pre-wrap break-all overflow-hidden max-h-20">
                                {error.error_message}
                            </pre>
                            <p className="mt-2 text-xs text-gray-500">
                                {new Date(error.created_at).toLocaleTimeString()}
                            </p>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
