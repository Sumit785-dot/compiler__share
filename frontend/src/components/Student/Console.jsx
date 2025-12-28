/**
 * Console component - Shows code execution output
 */
import { useEffect, useRef, useState } from 'react';

export default function Console({ output, onClear, onInput, isRunning, headerControls }) {
    const consoleRef = useRef(null);
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (onInput) {
            onInput(inputValue);
            setInputValue(''); // Clear input after sending
        }
    };


    // Auto-scroll to bottom
    useEffect(() => {
        if (consoleRef.current) {
            consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
        }
    }, [output]);

    const getLogColor = (type) => {
        switch (type) {
            case 'error':
                return 'text-red-400';
            case 'warning':
                return 'text-yellow-400';
            case 'info':
                return 'text-blue-400';
            default:
                return 'text-green-400';
        }
    };

    const getLogIcon = (type) => {
        switch (type) {
            case 'error':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                );
            case 'info':
                return (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                );
        }
    };

    return (
        <div className="h-full flex flex-col bg-dark-950">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-dark-700">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="font-medium text-gray-300">Console</span>
                    {output.length > 0 && (
                        <span className="text-xs text-gray-500">({output.length})</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {headerControls}
                    <button
                        onClick={onClear}
                        className="text-gray-500 hover:text-white text-sm flex items-center gap-1 transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Clear
                    </button>
                </div>
            </div>

            {/* Output Area */}
            <div
                ref={consoleRef}
                className="flex-1 overflow-auto p-4 font-mono text-sm"
            >
                {output.length === 0 ? (
                    <div className="text-gray-600 italic flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Click "Run Code" to execute your program
                    </div>
                ) : (
                    <div className="space-y-1">
                        {output.map((log, index) => (
                            <div
                                key={index}
                                className={`flex items-start gap-2 ${getLogColor(log.type)} ${!log.isStream ? 'animate-fadeIn' : ''}`}
                            >
                                {!log.isStream && (
                                    <span className="flex-shrink-0 mt-0.5 opacity-60">
                                        {getLogIcon(log.type)}
                                    </span>
                                )}
                                <pre className="whitespace-pre-wrap break-all flex-1 font-mono">
                                    {log.message}
                                </pre>
                            </div>
                        ))}
                    </div>
                )}

                {/* Input Field */}
                {isRunning && onInput && (
                    <form onSubmit={handleSubmit} className="flex items-center gap-2 mt-2 pt-2 border-t border-dark-800">
                        <span className="text-green-500 font-bold">{'>'}</span>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="bg-transparent border-none outline-none text-white w-full font-mono text-sm placeholder-gray-600"
                            placeholder="Type input here..."
                            autoFocus
                        />
                    </form>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-dark-700 text-xs text-gray-600">
                <span>Output from code execution appears here</span>
            </div>
        </div>
    );
}
