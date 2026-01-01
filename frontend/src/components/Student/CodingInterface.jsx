/**
 * Student Coding Interface - Full code editor with console
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { sessionsAPI, codingAPI, githubAPI } from '../../services/api';
import Console from './Console';
import { registerSuggestions } from '../../utils/editorSuggestions';

// Map our language IDs to Monaco editor language IDs
const getMonacoLanguage = (lang) => {
    const langMap = {
        python: 'python',
        javascript: 'javascript',
        c: 'c',
        cpp: 'cpp',
        java: 'java'
    };
    return langMap[lang] || 'python';
};

export default function CodingInterface() {
    const { sessionCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [session, setSession] = useState(null);
    const [code, setCode] = useState('# Write your code here\nprint("Hello, World!")\n');
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const debounceRef = useRef(null);
    const heartbeatRef = useRef(null);
    const lastTypedRef = useRef(0); // Track last typing time to prevent overwrites
    const lastSavedCodeRef = useRef(''); // Track what was last saved to detect unsaved changes

    // GitHub integration state
    const [githubConnected, setGithubConnected] = useState(false);
    const [githubUsername, setGithubUsername] = useState('');
    const [showGithubModal, setShowGithubModal] = useState(false);
    const [githubRepos, setGithubRepos] = useState([]);
    const [selectedRepo, setSelectedRepo] = useState('');
    const [githubFilename, setGithubFilename] = useState('');
    const [isPushing, setIsPushing] = useState(false);
    // New repo creation state
    const [showCreateRepo, setShowCreateRepo] = useState(false);
    const [newRepoName, setNewRepoName] = useState('');
    const [newRepoPrivate, setNewRepoPrivate] = useState(false);
    const [isCreatingRepo, setIsCreatingRepo] = useState(false);

    // If no session code, redirect to join
    useEffect(() => {
        if (!sessionCode) {
            navigate('/join');
        }
    }, [sessionCode, navigate]);

    // Check GitHub connection status
    useEffect(() => {
        const checkGitHub = async () => {
            try {
                const response = await githubAPI.getStatus();
                setGithubConnected(response.data.connected);
                setGithubUsername(response.data.github_username || '');
            } catch (error) {
                // OPTIMIZATION: GitHub not connected - silently ignore
            }
        };
        checkGitHub();

        // Check for OAuth callback success/error
        const params = new URLSearchParams(location.search);
        if (params.get('github') === 'success') {
            checkGitHub();
        }
    }, [location.search]);

    // Load session data and saved code
    useEffect(() => {
        const loadSession = async () => {
            if (!sessionCode) return;
            try {
                // Load session details
                const response = await sessionsAPI.getDetail(sessionCode);
                setSession(response.data);
                setLanguage(response.data.default_language || 'python');

                // Load saved code (including any teacher edits)
                try {
                    const codeResponse = await codingAPI.getMyCode(sessionCode);
                    if (codeResponse.data.code) {
                        setCode(codeResponse.data.code);
                        setLanguage(codeResponse.data.language || 'python');
                    }
                } catch (codeError) {
                    // OPTIMIZATION: No saved code found, using default template
                }
            } catch (error) {
                console.error('Failed to load session:', error);
                navigate('/join');
            }
        };

        loadSession();
    }, [sessionCode, navigate]);

    // Heartbeat and poll for teacher edits every 5 seconds
    useEffect(() => {
        if (!sessionCode) return;

        let lastCodeFromServer = '';

        const pollAndHeartbeat = async () => {
            try {
                // Send heartbeat
                await codingAPI.heartbeat(sessionCode);

                // Skip code polling while saving or if user typed recently (3 seconds)
                const timeSinceLastTyped = Date.now() - lastTypedRef.current;
                if (isSaving || timeSinceLastTyped < 3000) {
                    return;
                }

                // Check for code updates (teacher edits)
                const codeResponse = await codingAPI.getMyCode(sessionCode);
                const serverCode = codeResponse.data.code || '';

                // Only update if code changed on server AND is different from what we have
                // This prevents overwriting student's current edits
                if (serverCode && serverCode !== lastCodeFromServer) {
                    lastCodeFromServer = serverCode;
                    // Only apply if it's actually different from current code
                    // AND the current code matches what we last saved (no unsaved changes)
                    setCode(prevCode => {
                        // Check if user has unsaved changes
                        const hasUnsavedChanges = prevCode !== lastSavedCodeRef.current && lastSavedCodeRef.current !== '';
                        if (hasUnsavedChanges) {
                            // OPTIMIZATION: Skipping server update - user has unsaved changes
                            return prevCode;
                        }
                        if (prevCode !== serverCode) {
                            // Teacher edit received
                            return serverCode;
                        }
                        return prevCode;
                    });
                    setLanguage(codeResponse.data.language || 'python');
                }
            } catch (error) {
                console.error('Poll/heartbeat failed:', error);
            }
        };

        // Initial poll
        pollAndHeartbeat();

        // Poll every 5 seconds
        heartbeatRef.current = setInterval(pollAndHeartbeat, 5000);

        return () => {
            if (heartbeatRef.current) {
                clearInterval(heartbeatRef.current);
            }
        };
    }, [sessionCode]);


    // Register suggestions on editor mount
    const handleEditorDidMount = (editor, monaco) => {
        registerSuggestions(monaco);
    };

    // Auto-save code on change (debounced)
    const saveCode = useCallback(async (codeToSave) => {
        if (!sessionCode) return;
        setIsSaving(true);
        try {
            await codingAPI.saveCode(codeToSave, language, sessionCode);
            lastSavedCodeRef.current = codeToSave; // Track what we saved
            setLastSaved(new Date());
        } catch (error) {
            console.error('Save failed:', error);
        } finally {
            setIsSaving(false);
        }
    }, [sessionCode, language]);

    // Handle code changes with debounce
    const handleCodeChange = useCallback((value) => {
        setCode(value);
        lastTypedRef.current = Date.now(); // Track typing time

        // Debounce saving to server
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }
        debounceRef.current = setTimeout(() => {
            saveCode(value);
        }, 1000);
    }, [saveCode]);

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        // Update code template based on language
        const templates = {
            python: '# Write your Python code here\nprint("Hello, World!")\n',
            javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");\n',
            c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
            cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
            java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n'
        };
        setCode(templates[newLang] || templates.python);
    };

    // Run code using REST API
    const runCode = async () => {
        setIsRunning(true);
        setOutput(prev => [...prev, {
            type: 'info',
            message: `Running ${language}...`,
            timestamp: new Date().toISOString()
        }]);

        try {
            const response = await codingAPI.execute(code, language, sessionCode);

            setOutput(prev => [...prev, {
                type: response.data.success ? 'output' : 'error',
                message: response.data.output || response.data.error,
                timestamp: new Date().toISOString()
            }]);
        } catch (error) {
            setOutput(prev => [...prev, {
                type: 'error',
                message: error.message || 'Execution failed',
                timestamp: new Date().toISOString()
            }]);
        } finally {
            setIsRunning(false);
        }
    };

    const clearConsole = () => setOutput([]);

    // Download code to device
    const downloadCode = () => {
        const extensions = {
            python: 'py',
            javascript: 'js',
            c: 'c',
            cpp: 'cpp',
            java: 'java'
        };
        const ext = extensions[language] || 'txt';
        const filename = `code_${new Date().toISOString().slice(0, 10)}.${ext}`;

        const blob = new Blob([code], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Connect GitHub account
    const connectGitHub = async () => {
        try {
            const response = await githubAPI.getAuthUrl();
            window.location.href = response.data.auth_url;
        } catch (error) {
            console.error('Failed to get GitHub auth URL:', error);
        }
    };

    // Open push to GitHub modal
    const openPushModal = async () => {
        try {
            const response = await githubAPI.getRepos();
            setGithubRepos(response.data.repos || []);

            // Auto-fill from localStorage if available
            const lastRepo = localStorage.getItem('lastPushedRepo');
            const lastFile = localStorage.getItem('lastPushedFile');

            if (lastRepo) setSelectedRepo(lastRepo);

            // Set default filename based on language OR use last used
            if (lastFile) {
                setGithubFilename(lastFile);
            } else {
                const extensions = { python: 'py', javascript: 'js', c: 'c', cpp: 'cpp', java: 'java' };
                setGithubFilename(`main.${extensions[language] || 'txt'}`);
            }

            setShowGithubModal(true);
        } catch (error) {
            console.error('Failed to load repos:', error);
        }
    };

    // Push code to GitHub
    const pushToGitHub = async () => {
        if (!selectedRepo || !githubFilename) return;

        setIsPushing(true);
        try {
            const response = await githubAPI.pushCode(
                selectedRepo,
                githubFilename,
                code,
                `Update ${githubFilename} from Observer`
            );

            if (response.data.success) {
                alert(`✅ Code pushed successfully!\n\nView: ${response.data.file_url}`);
                // Save to localStorage for next time
                localStorage.setItem('lastPushedRepo', selectedRepo);
                localStorage.setItem('lastPushedFile', githubFilename);
                setShowGithubModal(false);
            } else {
                alert(`❌ Push failed: ${response.data.error}`);
            }
        } catch (error) {
            alert(`❌ Push failed: ${error.message}`);
        } finally {
            setIsPushing(false);
        }
    };

    // Proctoring: Detect tab switching/blur
    useEffect(() => {
        if (!sessionCode) return;

        const handleVisibilityChange = async () => {
            if (document.hidden) {
                // User switched tabs or minimized window
                try {
                    await codingAPI.reportActivity(sessionCode, 'tab_hidden');
                    // OPTIMIZATION: Tab hidden activity reported
                } catch (e) {
                    // Silently fail proctoring report
                }
            } else {
                // User returned
                try {
                    await codingAPI.reportActivity(sessionCode, 'tab_visible');
                    // OPTIMIZATION: Tab visible activity reported
                } catch (e) {
                    // Silently fail proctoring report
                }
            }
        };

        const handleBlur = async () => {
            // Window lost focus (e.g. clicked outside)
            // We can treat this similar to hidden, or just log it
            // For strict proctoring, we report it.
            if (!document.hidden) { // Only report if not already covered by hidden
                try {
                    await codingAPI.reportActivity(sessionCode, 'window_blur');
                } catch (e) { }
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, [sessionCode]);

    // Proctoring: Detect split-screen / window resize (Production Ready)
    useEffect(() => {
        if (!sessionCode) return;

        let lastState = null;
        let debounceTimer = null;

        const checkSplitScreen = async () => {
            const screenW = window.screen.availWidth;
            const screenH = window.screen.availHeight;

            const winW = window.innerWidth;
            const winH = window.innerHeight;

            // Calculate % usage of available screen
            const widthRatio = winW / screenW;
            const heightRatio = winH / screenH;

            // Real split screen condition: either width OR height is less than 75%
            const isSplit = widthRatio < 0.75 || heightRatio < 0.75;

            if (isSplit && lastState !== 'split') {
                lastState = 'split';
                try {
                    await codingAPI.reportActivity(sessionCode, 'split_screen');
                } catch (e) {
                    // Silently fail proctoring report
                }
            }

            if (!isSplit && lastState === 'split') {
                lastState = 'full';
                try {
                    await codingAPI.reportActivity(sessionCode, 'fullscreen_restored');
                } catch (e) {
                    // Silently fail proctoring report
                }
            }
        };

        // Debounced resize handler to prevent spam
        const onResize = () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(checkSplitScreen, 400);
        };

        window.addEventListener('resize', onResize);

        // Initial check on mount
        checkSplitScreen();

        return () => {
            window.removeEventListener('resize', onResize);
            clearTimeout(debounceTimer);
        };
    }, [sessionCode]);

    // Create new GitHub repo
    const createNewRepo = async () => {
        if (!newRepoName.trim()) return;

        setIsCreatingRepo(true);
        try {
            const response = await githubAPI.createRepo(
                newRepoName.trim(),
                'Created from Observer',
                newRepoPrivate
            );

            if (response.data.success) {
                alert(`✅ Repository created: ${response.data.repo.html_url}`);
                // Add to repos list and select it
                const newRepo = response.data.repo;
                setGithubRepos(prev => [newRepo, ...prev]);
                setSelectedRepo(newRepo.full_name);
                setShowCreateRepo(false);
                setNewRepoName('');
            } else {
                alert(`❌ Failed: ${response.data.error}`);
            }
        } catch (error) {
            alert(`❌ Failed: ${error.response?.data?.error || error.message}`);
        } finally {
            setIsCreatingRepo(false);
        }
    };

    // Layout state
    const [layout, setLayout] = useState('horizontal'); // 'horizontal' | 'vertical'
    const [consoleSize, setConsoleSize] = useState(400); // Width or Height in pixels
    const [isResizing, setIsResizing] = useState(false);

    // Handle resizing
    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsResizing(true);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = useCallback((e) => {
        if (layout === 'horizontal') {
            const newWidth = window.innerWidth - e.clientX;
            setConsoleSize(Math.max(200, Math.min(newWidth, window.innerWidth - 300)));
        } else {
            const newHeight = window.innerHeight - e.clientY;
            setConsoleSize(Math.max(150, Math.min(newHeight, window.innerHeight - 200)));
        }
    }, [layout]);

    const handleMouseUp = useCallback(() => {
        setIsResizing(false);
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    }, [handleMouseMove]);

    // Cleanup resize listeners
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);

    const toggleLayout = () => {
        setLayout(prev => prev === 'horizontal' ? 'vertical' : 'horizontal');
        setConsoleSize(prev => prev === 'horizontal' ? 300 : 400);
    };

    return (
        <div className="h-screen flex flex-col bg-dark-900">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
            </div>

            {/* Toolbar */}
            <div className="relative z-10 flex items-center justify-between px-4 py-3 glass border-b border-dark-700">
                <div className="flex items-center gap-4">
                    {/* Language Selector */}
                    <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value)}
                        className="input py-2 w-36"
                    >
                        <option value="python">Python</option>
                        <option value="javascript">JavaScript</option>
                        <option value="c">C</option>
                        <option value="cpp">C++</option>
                        <option value="java">Java</option>
                    </select>

                    {/* Connection/Save Status */}
                    <div className="flex items-center gap-2 text-sm">
                        <div className="status-online" />
                        <span className="text-green-400">
                            {isSaving ? 'Saving...' : lastSaved ? 'Saved' : 'Online'}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Download Button */}
                    <button
                        onClick={downloadCode}
                        className="btn btn-secondary"
                        title="Download Code"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Save
                    </button>

                    {/* GitHub Button */}
                    {githubConnected ? (
                        <button
                            onClick={openPushModal}
                            className="btn bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
                            title={`Push to GitHub (@${githubUsername})`}
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Push to GitHub
                        </button>
                    ) : (
                        <button
                            onClick={connectGitHub}
                            className="btn bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
                            title="Connect GitHub account"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Connect GitHub
                        </button>
                    )}

                    {/* Notify Teacher Button */}
                    <button
                        onClick={async () => {
                            try {
                                await codingAPI.sendNotification('Student requested help', sessionCode);
                                alert('Teacher has been notified!');
                            } catch (e) {
                                console.error(e);
                                alert('Failed to notify teacher.');
                            }
                        }}
                        className="btn bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/50"
                        title="Notify Teacher"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        Ask Help
                    </button>

                    {/* Run Button - Works via REST API */}
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="btn btn-primary disabled:opacity-50"
                    >
                        {isRunning ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Running...
                            </>
                        ) : (
                            <>
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                </svg>
                                Run Code
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Main Content - Flex Container */}
            <div className={`relative flex-1 flex ${layout === 'horizontal' ? 'flex-row' : 'flex-col'}`}>
                {/* Editor */}
                <div className="flex-1 min-w-0 min-h-0">
                    <Editor
                        height="100%"
                        language={getMonacoLanguage(language)}
                        value={code}
                        onChange={handleCodeChange}
                        onMount={handleEditorDidMount}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: true },
                            scrollBeyondLastLine: true,
                            fontSize: 14,
                            fontFamily: "'Fira Code', 'Monaco', monospace",
                            lineNumbers: 'on',
                            folding: true,
                            wordWrap: 'on',
                            automaticLayout: true,
                            padding: { top: 16 },
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                            scrollbar: {
                                vertical: 'visible',
                                horizontal: 'visible',
                                verticalScrollbarSize: 12,
                                horizontalScrollbarSize: 12,
                            },
                        }}
                    />
                </div>

                {/* Resizer Handle */}
                <div
                    className={`${layout === 'horizontal'
                        ? 'w-1 cursor-col-resize hover:bg-blue-500/50'
                        : 'h-1 cursor-row-resize hover:bg-blue-500/50'
                        } bg-dark-700 transition-colors z-20`}
                    onMouseDown={handleMouseDown}
                />

                {/* Console */}
                <div
                    style={{
                        [layout === 'horizontal' ? 'width' : 'height']: consoleSize,
                        transition: isResizing ? 'none' : 'all 0.2s ease'
                    }}
                    className={`flex flex-col bg-dark-900 border-dark-700 ${layout === 'horizontal' ? 'border-l' : 'border-t'
                        }`}
                >
                    <Console
                        output={output}
                        onClear={clearConsole}
                        headerControls={
                            <button
                                onClick={toggleLayout}
                                className="p-1 hover:bg-dark-700 rounded text-gray-400 hover:text-white transition-colors"
                                title={layout === 'horizontal' ? "Dock to bottom" : "Dock to side"}
                            >
                                {layout === 'horizontal' ? (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                ) : (
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                )}
                            </button>
                        }
                    />
                </div>
            </div>

            {/* GitHub Push Modal */}
            {showGithubModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
                    onClick={() => setShowGithubModal(false)}
                >
                    <div
                        className="bg-dark-800 border border-dark-600 rounded-xl w-full max-w-md m-4 p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Push to GitHub
                        </h3>

                        <div className="space-y-4">
                            {/* Create New Repo Toggle */}
                            {!showCreateRepo ? (
                                <>
                                    {/* Repo Selector */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Repository</label>
                                        <select
                                            value={selectedRepo}
                                            onChange={(e) => setSelectedRepo(e.target.value)}
                                            className="input px-4 py-2 w-full"
                                        >
                                            <option value="">Select a repository...</option>
                                            {githubRepos.map(repo => (
                                                <option key={repo.id} value={repo.full_name}>
                                                    {repo.name} {repo.private ? '🔒' : ''}
                                                </option>
                                            ))}
                                        </select>
                                        <button
                                            onClick={() => setShowCreateRepo(true)}
                                            className="text-sm text-blue-400 hover:text-blue-300 mt-2"
                                        >
                                            + Create New Repository
                                        </button>
                                    </div>

                                    {/* Filename/Path Input */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">File Path</label>
                                        <input
                                            type="text"
                                            value={githubFilename}
                                            onChange={(e) => setGithubFilename(e.target.value)}
                                            placeholder="src/main.py or just main.py"
                                            className="input px-4 py-2 w-full"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Use folders like: src/code.py</p>
                                    </div>

                                    {/* Push Buttons */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={() => setShowGithubModal(false)}
                                            className="btn btn-secondary"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={pushToGitHub}
                                            disabled={!selectedRepo || !githubFilename || isPushing}
                                            className="btn btn-primary disabled:opacity-50"
                                        >
                                            {isPushing ? 'Pushing...' : 'Push Code'}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Create New Repo Form */}
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Repository Name</label>
                                        <input
                                            type="text"
                                            value={newRepoName}
                                            onChange={(e) => setNewRepoName(e.target.value)}
                                            placeholder="my-new-project"
                                            className="input px-4 py-2 w-full"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="privateRepo"
                                            checked={newRepoPrivate}
                                            onChange={(e) => setNewRepoPrivate(e.target.checked)}
                                            className="w-4 h-4"
                                        />
                                        <label htmlFor="privateRepo" className="text-sm text-gray-400">
                                            Make repository private 🔒
                                        </label>
                                    </div>

                                    {/* Create Buttons */}
                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={() => setShowCreateRepo(false)}
                                            className="btn btn-secondary"
                                        >
                                            Back
                                        </button>
                                        <button
                                            onClick={createNewRepo}
                                            disabled={!newRepoName.trim() || isCreatingRepo}
                                            className="btn btn-primary disabled:opacity-50"
                                        >
                                            {isCreatingRepo ? 'Creating...' : 'Create Repo'}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
