/**
 * Personal Console - Student's personal coding environment (no session required)
 */
import { useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import { codingAPI } from '../../services/api';
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

// Code templates for each language
const codeTemplates = {
    python: '# Write your Python code here\nprint("Hello, World!")\n',
    javascript: '// Write your JavaScript code here\nconsole.log("Hello, World!");\n',
    c: '#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}\n',
    cpp: '#include <iostream>\nusing namespace std;\n\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}\n',
    java: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}\n'
};

export default function PersonalConsole() {
    const [code, setCode] = useState(codeTemplates.python);
    const [language, setLanguage] = useState('python');
    const [output, setOutput] = useState([]);
    const [isRunning, setIsRunning] = useState(false);

    // Handle language change
    const handleLanguageChange = (newLang) => {
        setLanguage(newLang);
        setCode(codeTemplates[newLang] || codeTemplates.python);
    };

    // Handle code changes
    const handleCodeChange = useCallback((value) => {
        setCode(value);
    }, []);

    // Run code using REST API (no session)
    const runCode = async () => {
        setIsRunning(true);
        setOutput(prev => [...prev, {
            type: 'info',
            message: `Running ${language}...`,
            timestamp: new Date().toISOString()
        }]);

        try {
            const response = await codingAPI.execute(code, language, '');

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
