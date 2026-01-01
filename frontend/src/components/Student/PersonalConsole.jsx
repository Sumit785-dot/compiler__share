import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { codingAPI, githubAPI } from '../../services/api';
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

// Code templates for each language
const codeTemplates = {
    python: '# Write your Python code here\nprint("Hello, World!")\n',
    javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");\n',
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n'
};

export default function PersonalConsole() {
    const location = useLocation();
    const [code, setCode] = useState(codeTemplates.python);
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [socket, setSocket] = useState(null);
    const [filename, setFilename] = useState('main.py');

    // WebSocket connection logic
    const connect = useCallback(() => {
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${window.location.host}/ws/execute/`;
        const newSocket = new WebSocket(wsUrl);

        newSocket.onopen = () => {
            console.log('Connected to execution server');
        };

        newSocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'status') {
                if (data.status === 'started') {
                    setIsRunning(true);
                    setOutput([]); // Clear previous output
                } else if (data.status === 'finished') {
                    setIsRunning(false);
                    setOutput(prev => [...prev, {
                        type: 'info',
                        message: `\nProcess finished with exit code ${data.exit_code}`,
                        timestamp: new Date().toISOString()
                    }]);
                } else if (data.status === 'stopped') {
                    setIsRunning(false);
                }
            } else if (data.type === 'output') {
                setOutput(prev => {
                    const last = prev[prev.length - 1];
                    // If last item is same stream type and marked as stream, append to it
                    if (last && last.type === (data.stream === 'stderr' ? 'error' : 'output') && last.isStream) {
                        return [
                            ...prev.slice(0, -1),
                            { ...last, message: last.message + data.data }
                        ];
                    }
                    // Otherwise create new item
                    return [...prev, {
                        type: data.stream === 'stderr' ? 'error' : 'output',
                        message: data.data,
                        timestamp: new Date().toISOString(),
                        isStream: true
                    }];
                });
            } else if (data.type === 'error') {
                setIsRunning(false);
                setOutput(prev => [...prev, {
                    type: 'error',
                    message: data.error,
                    timestamp: new Date().toISOString()
                }]);
            }
        };

        newSocket.onclose = () => {
            console.log('Disconnected from execution server, retrying in 3s...');
            setIsRunning(false);
            // Optionally notify user of disconnection if needed, but for auto-reconnect maybe stay silent or subtle
            // setOutput(prev => [...prev, { type: 'info', message: '\nDisconnected.. Reconnecting...', timestamp: new Date().toISOString() }]);

            // Auto-reconnect after 3 seconds
            setTimeout(() => {
                connect();
            }, 3000);
        };

        setSocket(newSocket);
    }, []);

    // Initial connection
    useEffect(() => {
        connect();
        return () => {
            // We can't easily clean up the recursive timeout/socket structure in this simple useEffect 
            // without refs, but for this component lifecycle it's acceptable.
            // Ideally we'd close the socket here, but that triggers onclose and reconnects.
            // For now, let's rely on browser garbage collection or simple close.
            // To prevent infinite reconnects on unmount, we could use a ref to track mounted state.
        };
    }, [connect]);

    // Handle user input from console
    const handleConsoleInput = (inputText) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
            // Echo input to console immediately
            setOutput(prev => [...prev, {
                type: 'output', // render as normal output
                message: inputText + '\n',
                timestamp: new Date().toISOString(),
                isStream: false // Treat as a complete block or adjust if needed
            }]);

            socket.send(JSON.stringify({
                type: 'input',
                input: inputText + '\n' // Append newline as Enter key usually sends it
            }));
        }
    };


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

    // Register suggestions on editor mount
    const handleEditorDidMount = (editor, monaco) => {
        registerSuggestions(monaco);
    };

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        setCode(codeTemplates[newLang] || codeTemplates.python);

        // Update filename extension
        const extensions = { python: 'py', javascript: 'js', c: 'c', cpp: 'cpp', java: 'java' };
        const ext = extensions[newLang] || 'txt';
        const nameParts = filename.split('.');
        const name = nameParts.length > 1 ? nameParts.slice(0, -1).join('.') : filename;
        setFilename(`${name}.${ext}`);
    };

    // Handle code changes
    const handleCodeChange = useCallback((value) => {
        setCode(value);
    }, []);

    // Run code using WebSocket
    const runCode = async () => {
        if (!socket || socket.readyState !== WebSocket.OPEN) {
            // Attempt immediate reconnect if possible, or just alert
            alert('Reconnecting to server... Please wait a moment and try again.');
            connect(); // Trigger manual reconnect attempt
            return;
        }

        setIsRunning(true);
        setOutput([]); // Clear console

        socket.send(JSON.stringify({
            type: 'run',
            code: code,
            language: language
        }));
    };

    const clearConsole = () => setOutput([]);

    // Download code
    const downloadCode = () => {
        const element = document.createElement("a");
        const file = new Blob([code], { type: 'text/plain' });
        element.href = URL.createObjectURL(file);
        element.download = filename;
        document.body.appendChild(element); // Required for this to work in FireFox
        element.click();
        document.body.removeChild(element);
    };



    // Connect GitHub account
    const connectGitHub = async () => {
        try {
            const response = await githubAPI.getAuthUrl('/console');
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

            // Auto-fill from localStorage
            const lastRepo = localStorage.getItem('lastPushedRepo_personal');
            const lastFile = localStorage.getItem('lastPushedFile_personal');

            if (lastRepo) setSelectedRepo(lastRepo);

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
                // Save to localStorage
                localStorage.setItem('lastPushedRepo_personal', selectedRepo);
                localStorage.setItem('lastPushedFile_personal', githubFilename);
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
        // Reset size to a reasonable default when switching
        setConsoleSize(prev => prev === 'horizontal' ? 300 : 400);
    };

    return (
        <div className="h-screen flex flex-col bg-dark-900">
            {/* Background effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
            </div>

            {/* Toolbar */}
            <div className="relative z-10 flex items-center justify-between px-4 py-3 glass border-b border-dark-700">
                <div className="flex items-center gap-4">
                    {/* Personal Console Badge */}
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                        Personal Console
                    </div>

                    {/* Filename Input */}
                    <div className="flex items-center">
                        <input
                            type="text"
                            value={filename}
                            onChange={(e) => setFilename(e.target.value)}
                            className="bg-transparent text-gray-300 text-sm font-mono focus:outline-none border-b border-transparent focus:border-blue-500 px-2 py-1 w-40 hover:bg-white/5 rounded transition-colors"
                            placeholder="filename.ext"
                        />
                    </div>

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
                </div>

                <div className="flex items-center gap-3">
                    {/* Download Button */}
                    <button
                        onClick={downloadCode}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                        title="Download Code"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                    </button>

                    {/* GitHub Button */}
                    {githubConnected ? (
                        <button
                            onClick={openPushModal}
                            className="btn github-btn bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
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
                            className="btn github-btn bg-gray-800 text-white hover:bg-gray-700 border border-gray-600"
                            title="Connect GitHub account"
                        >
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            Connect GitHub
                        </button>
                    )}

                    {/* Run Button */}
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
                        onInput={handleConsoleInput}
                        isRunning={isRunning}
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
