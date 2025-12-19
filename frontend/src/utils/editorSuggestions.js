/**
 * Custom suggestions/IntelliSense for Monaco Editor
 * Provides keywords and snippets for languages that have limited browser support
 */

export const registerSuggestions = (monaco) => {
    // Python Suggestions
    monaco.languages.registerCompletionItemProvider('python', {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions = [
                // Keywords
                ...['def', 'class', 'import', 'from', 'if', 'else', 'elif', 'while', 'for', 'in', 'return',
                    'try', 'except', 'finally', 'with', 'as', 'pass', 'break', 'continue', 'global',
                    'lambda', 'yield', 'True', 'False', 'None', 'and', 'or', 'not', 'is', 'raise', 'print', 'len', 'range'
                ].map(k => ({
                    label: k,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: k,
                    range
                })),

                // Snippets
                {
                    label: 'def',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'def ${1:function_name}(${2:args}):\n\t${3:pass}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Function definition',
                    range
                },
                {
                    label: 'if',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'if ${1:condition}:\n\t${2:pass}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'If statement',
                    range
                },
                {
                    label: 'for',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'for ${1:item} in ${2:iterable}:\n\t${3:pass}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'For loop',
                    range
                },
                {
                    label: 'print',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'print(${1:object})',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Print statement',
                    range
                },
                {
                    label: 'main',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'if __name__ == "__main__":\n\t${1:main()}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Main block',
                    range
                }
            ];

            return { suggestions };
        }
    });

    // C/C++ Suggestions
    const cCppProvider = {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions = [
                // Keywords & Types
                ...['int', 'float', 'double', 'char', 'void', 'bool', 'auto', 'const', 'struct', 'class',
                    'if', 'else', 'for', 'while', 'do', 'switch', 'case', 'break', 'return', 'include',
                    'define', 'using', 'namespace', 'cout', 'cin', 'endl', 'printf', 'scanf', 'std', 'vector', 'string'
                ].map(k => ({
                    label: k,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: k,
                    range
                })),

                // Snippets
                {
                    label: 'include',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: '#include <${1:stdio.h}>',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Include header',
                    range
                },
                {
                    label: 'main',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'int main() {\n\t${1}\n\treturn 0;\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Main function',
                    range
                },
                {
                    label: 'for',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'for (int ${1:i} = 0; ${1:i} < ${2:count}; ${1:i}++) {\n\t${3}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'For loop',
                    range
                },
                {
                    label: 'cout',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'cout << ${1:message} << endl;',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'cout print',
                    range
                },
                {
                    label: 'printf',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'printf("${1:%s}\\n", ${2:args});',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'printf',
                    range
                }
            ];

            return { suggestions };
        }
    };

    monaco.languages.registerCompletionItemProvider('c', cCppProvider);
    monaco.languages.registerCompletionItemProvider('cpp', cCppProvider);

    // Java Suggestions
    monaco.languages.registerCompletionItemProvider('java', {
        provideCompletionItems: (model, position) => {
            const word = model.getWordUntilPosition(position);
            const range = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn,
                endColumn: word.endColumn,
            };

            const suggestions = [
                // Keywords
                ...['public', 'private', 'protected', 'class', 'interface', 'extends', 'implements',
                    'static', 'final', 'void', 'int', 'double', 'boolean', 'String', 'new', 'return',
                    'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'import', 'package',
                    'System', 'out', 'println', 'main'
                ].map(k => ({
                    label: k,
                    kind: monaco.languages.CompletionItemKind.Keyword,
                    insertText: k,
                    range
                })),

                // Snippets
                {
                    label: 'main',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'public static void main(String[] args) {\n\t${1}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Main method',
                    range
                },
                {
                    label: 'sout',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'System.out.println(${1});',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'System.out.println',
                    range
                },
                {
                    label: 'class',
                    kind: monaco.languages.CompletionItemKind.Snippet,
                    insertText: 'public class ${1:ClassName} {\n\t${2}\n}',
                    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    detail: 'Class definition',
                    range
                }
            ];

            return { suggestions };
        }
    });
};
