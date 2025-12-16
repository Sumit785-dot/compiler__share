/**
 * Student Coding Interface - Full code editor with console
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { sessionsAPI, codingAPI } from '../../services/api';
import Console from './Console';

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

    const [session, setSession] = useState(null);
    const [code, setCode] = useState('# Write your code here\nprint("Hello, World!")\n');
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const debounceRef = useRef(null);
    const heartbeatRef = useRef(null);

    // If no session code, redirect to join
    useEffect(() => {
        if (!sessionCode) {
            navigate('/join');
        }
    }, [sessionCode, navigate]);

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
                    console.log('No saved code found, using default');
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

                // Check for code updates (teacher edits)
                const codeResponse = await codingAPI.getMyCode(sessionCode);
                const serverCode = codeResponse.data.code || '';

                // Only update if code changed on server AND is different from what we have
                // This prevents overwriting student's current edits
                if (serverCode && serverCode !== lastCodeFromServer) {
                    lastCodeFromServer = serverCode;
                    // Only apply if it's actually different from current code
                    // This happens when teacher edits
                    setCode(prevCode => {
                        if (prevCode !== serverCode) {
                            console.log('Teacher edit received!');
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


    // Auto-save code on change (debounced)
    const saveCode = useCallback(async (codeToSave) => {
        if (!sessionCode) return;
        setIsSaving(true);
        try {
            await codingAPI.saveCode(codeToSave, language, sessionCode);
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

            {/* Main Content */}
            <div className="relative flex-1 flex flex-col lg:flex-row">
                {/* Editor */}
                <div className="flex-1 min-h-[400px] lg:min-h-0">
                    <Editor
                        height="100%"
                        language={getMonacoLanguage(language)}
                        value={code}
                        onChange={handleCodeChange}
                        theme="vs-dark"
                        options={{
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            fontSize: 14,
                            fontFamily: "'Fira Code', 'Monaco', monospace",
                            lineNumbers: 'on',
                            folding: true,
                            wordWrap: 'on',
                            automaticLayout: true,
                            padding: { top: 16 },
                            cursorBlinking: 'smooth',
                            cursorSmoothCaretAnimation: 'on',
                        }}
                    />
                </div>

                {/* Console */}
                <div className="lg:w-96 h-64 lg:h-auto border-t lg:border-t-0 lg:border-l border-dark-700">
                    <Console
                        output={output}
                        onClear={clearConsole}
                    />
                </div>
            </div>
        </div>
    );
}
