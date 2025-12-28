/**
 * Student Tile - Individual student view in teacher dashboard
 */
import { useState, useEffect, memo } from 'react';
import Editor from '@monaco-editor/react';
import { codingAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

function StudentTile({ student, isSelected, onSelect, onExpand, sessionCode }) {
    const { isDark } = useTheme();
    const [isEditing, setIsEditing] = useState(false);
    const [localCode, setLocalCode] = useState(student.code_content || '');
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [runOutput, setRunOutput] = useState(null);

    useEffect(() => {
        if (!isEditing) {
            setLocalCode(student.code_content || '');
        }
    }, [student.code_content, isEditing]);

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    // Save teacher's edits and stop editing
    const handleStopEdit = async () => {
        setIsSaving(true);
        try {
            await codingAPI.teacherSaveCode(student.id, localCode, student.language || 'python', sessionCode);
            // OPTIMIZATION: Teacher edit saved successfully
        } catch (error) {
            console.error('Failed to save teacher edit:', error);
        } finally {
            setIsSaving(false);
            setIsEditing(false);
        }
    };

    const handleCodeChange = (value) => {
        setLocalCode(value);
    };

    // Run student's code via REST API
    const handleRunCode = async () => {
        setIsRunning(true);
        setRunOutput(null);
        try {
            const response = await codingAPI.execute(localCode, student.language || 'python', sessionCode);
            setRunOutput({
                success: response.data.success,
                message: response.data.output || response.data.error
            });
        } catch (error) {
            setRunOutput({
                success: false,
                message: error.message || 'Execution failed'
            });
        } finally {
            setIsRunning(false);
        }
    };

    const getStatusColor = () => {
        if (!student.is_connected) return 'bg-gray-500';
        if (student.has_errors) return 'bg-red-500';
        return 'bg-green-500';
    };

    const getStatusText = () => {
        if (!student.is_connected) return 'Offline';
        if (student.has_errors) return 'Has Errors';
        return 'Active';
    };

    const recentOutput = runOutput || student.recent_logs?.[0];

    return (
        <div
            className={`card cursor-pointer transition-all duration-200 ${isSelected
                ? 'ring-2 ring-blue-500 border-blue-500/30'
                : 'hover:border-dark-500'
                } ${isEditing ? 'ring-2 ring-purple-500 border-purple-500/30' : ''}`}
            onClick={!isEditing ? onSelect : undefined}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center font-bold text-white text-sm">
                        {(student.full_name || student.username)[0].toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-medium text-white">{student.full_name || student.username}</h3>
                        <p className="text-xs text-gray-400">@{student.username}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Activity Alert Badge */}
                    {student.activity_alert && (
                        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-medium animate-pulse">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {student.activity_alert}
                        </div>
                    )}

                    <div className={`w-2.5 h-2.5 rounded-full ${getStatusColor()}`}
                        style={{ boxShadow: student.is_connected ? `0 0 8px ${student.has_errors ? 'rgba(239,68,68,0.6)' : 'rgba(34,197,94,0.6)'}` : 'none' }} />
                    <span className={`text-xs ${student.is_connected ? (student.has_errors ? 'text-red-400' : 'text-green-400') : 'text-gray-500'}`}>
                        {getStatusText()}
                    </span>
                </div>
            </div>

            {/* Code Preview / Editor */}
            <div className="rounded-lg overflow-hidden bg-dark-900 border border-dark-700 mb-3">
                <div className="flex items-center justify-between px-3 py-1.5 bg-dark-800 border-b border-dark-700">
                    <span className="text-xs text-gray-400 capitalize">{student.language}</span>
                    <div className="flex items-center gap-2">
                        {/* Run Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleRunCode();
                            }}
                            disabled={isRunning}
                            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1 disabled:opacity-50"
                        >
                            {isRunning ? (
                                <>
                                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Running
                                </>
                            ) : (
                                <>
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                    </svg>
                                    Run
                                </>
                            )}
                        </button>

                        {/* Terminal Toggle Button */}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onExpand && onExpand();
                            }}
                            className="text-xs text-gray-400 hover:text-white flex items-center gap-1"
                            title="Open Full Console"
                        >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                            </svg>
                            Terminal
                        </button>

                        <div className="w-px h-3 bg-dark-700 mx-1" />

                        {/* Edit/Done Button */}
                        {!isEditing ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartEdit();
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                                Edit
                            </button>
                        ) : (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleStopEdit();
                                }}
                                disabled={isSaving}
                                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                        </svg>
                                        Saving
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                        Done
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>

                <div className="h-40">
                    <Editor
                        key={`editor-${student.id}-${isEditing ? 'edit' : 'view'}`}
                        height="100%"
                        language={student.language}
                        value={localCode}
                        onChange={isEditing ? handleCodeChange : undefined}
                        theme={isDark ? "vs-dark" : "light"}
                        options={{
                            readOnly: !isEditing,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 11,
                            lineNumbers: 'on',
                            lineNumbersMinChars: 3,
                            folding: false,
                            wordWrap: 'on',
                            automaticLayout: true,
                            scrollbar: {
                                vertical: 'visible',
                                horizontal: 'visible',
                                verticalScrollbarSize: 10,
                                horizontalScrollbarSize: 10,
                            },
                        }}
                    />
                </div>
            </div>

            {/* Console Output Preview - Clickable to expand */}
            <div
                className="group rounded-lg bg-dark-900 border border-dark-700 p-3 cursor-pointer hover:border-blue-500/50 transition-colors"
                onClick={(e) => {
                    e.stopPropagation();
                    onExpand && onExpand();
                }}
                title="Click to expand console"
            >
                <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Console
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onExpand && onExpand();
                        }}
                        className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors px-2 py-1 rounded hover:bg-white/5"
                        title="Maximize Terminal"
                    >
                        <span>Maximize</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                    </button>
                </div>
                <div className="font-mono text-sm max-h-24 overflow-y-auto">
                    {recentOutput ? (
                        <pre className={`whitespace-pre-wrap break-all ${(recentOutput.log_type === 'error' || recentOutput.success === false) ? 'text-red-400' : 'text-green-400'
                            }`}>
                            {(recentOutput.message || '')?.slice(0, 300)}
                            {(recentOutput.message || '')?.length > 300 && '...'}
                        </pre>
                    ) : (
                        <span className="text-gray-600 italic">No output yet</span>
                    )}
                </div>
            </div>

            {/* Edit Mode Indicator */}
            {isEditing && (
                <div className="mt-3 flex items-center justify-center gap-2 text-purple-400 text-sm">
                    <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                    Editing - Click Done to save
                </div>
            )}
        </div>
    );
}

// Memoize component to prevent unnecessary re-renders during polling
export default memo(StudentTile, (prevProps, nextProps) => {
    // Only re-render if important props changed
    return (
        prevProps.student.id === nextProps.student.id &&
        prevProps.student.code_content === nextProps.student.code_content &&
        prevProps.student.is_connected === nextProps.student.is_connected &&
        prevProps.student.has_errors === nextProps.student.has_errors &&
        prevProps.student.activity_alert === nextProps.student.activity_alert &&
        prevProps.student.language === nextProps.student.language &&
        JSON.stringify(prevProps.student.recent_logs?.[0]) === JSON.stringify(nextProps.student.recent_logs?.[0]) &&
        prevProps.isSelected === nextProps.isSelected
    );
});
