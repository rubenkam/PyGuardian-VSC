"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const child_process_1 = require("child_process");
function activate(context) {
    console.log('PyGuardian extension activated!'); // Debugging activation
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('PyGuardian');
    vscode.workspace.onDidSaveTextDocument(document => {
        console.log('File saved:', document.uri.fsPath); // Debugging the saved file
        if (document.languageId === 'python') {
            runPyGuardian(document, diagnosticCollection);
        }
    });
}
exports.activate = activate;
function runPyGuardian(document, diagnostics) {
    const filePath = document.uri.fsPath;
    console.log('Running PyGuardian analysis for file:', filePath); // Debugging the function call
    (0, child_process_1.exec)(`PyGuardian-lt "${filePath}"`, (err, stdout, stderr) => {
        if (err) {
            console.error(`Error: ${stderr}`);
            return;
        }
        if (stderr) {
            console.error(`stderr: ${stderr}`);
        }
        if (stdout) {
            console.log('stdout:', stdout); // Logginh the output from PyGuardian
        }
        try {
            // Parse the output from the PyGuardian tool (no need for .vscode_output)
            const results = JSON.parse(stdout);
            console.log('PyGuardian Results:', results); // Debugging
            const diagnosticList = [];
            let hasCriticalOrError = false;
            let hasWarning = false;
            let hasInfo = 0;
            let hasHint = 0;
            let hasDebug = 0;
            // Loop over array of errors
            results.forEach((error) => {
                let range;
                const relevantKeywords = ["function", "class", "variable", "constant", "method", "attribute", "parameter", "module", "property", "argument"];
                // Check if the message contains one of these keywords (code property)
                const isCodePropertyError = relevantKeywords.some(keyword => error.message.toLowerCase().includes(keyword));
                // Try to extract the part of the message within in single quotes
                const match = error.message.match(/'([^']+)'/g); // Finds all single-quoted sections
                if (isCodePropertyError && match && match.length === 1 && error.position > 2) {
                    // Ensure there's exactly **one** match (two single quotes)
                    const extractedText = match[0].slice(1, -1); // Remove the surrounding single quotes
                    let length = extractedText.length;
                    const position = error.position - 2;
                    if (length === 1) {
                        length = length - 1;
                    }
                    // Vscode position is a little weird
                    range = new vscode.Range(new vscode.Position(error.line - 1, position), new vscode.Position(error.line - 1, position + length));
                }
                else {
                    let position = error.position - 1;
                    if (error.position == 1) {
                        position = 0;
                    }
                    // Default range: Highlight the whole line
                    range = new vscode.Range(new vscode.Position(error.line - 1, position), new vscode.Position(error.line - 1, Number.MAX_SAFE_INTEGER));
                }
                // Diagnostic object
                const diagnostic = createDiagnostic(range, error.message, error.severity);
                diagnostic.source = `category: ${error.category} position: ${error.position}`;
                // Add it to the list of diagnostics
                diagnosticList.push(diagnostic);
                // Check for critical or error
                if (error.severity === 'critical' || error.severity === 'error') {
                    hasCriticalOrError = true;
                }
                if (error.severity === 'warning') {
                    hasWarning = true;
                }
                if (error.severity === 'hint') {
                    hasInfo++;
                }
                if (error.severity === 'info') {
                    hasHint++;
                }
                if (error.severity === 'debug') {
                    hasDebug++;
                }
            });
            // Set the diagnostics for the current document
            diagnostics.set(document.uri, diagnosticList);
            if (hasCriticalOrError) {
                vscode.window.showErrorMessage('Check your code for (critcial) errors.');
            }
            if (hasWarning) {
                vscode.window.showWarningMessage('Check your code for warnings.');
            }
            let delay = 0;
            if (hasDebug > 0) {
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusBar.text = '🛠️ Check for debug highlights';
                statusBar.show();
                setTimeout(() => statusBar.hide(), 5000);
                delay += 5000; // Add delay for next message
            }
            if (hasHint > 0) {
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusBar.text = '💡 Check for hints';
                setTimeout(() => {
                    statusBar.show();
                    setTimeout(() => statusBar.hide(), 5000);
                }, delay);
                delay += 5000;
            }
            if (hasInfo > 0) {
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusBar.text = 'ℹ️  Check for info highlights';
                setTimeout(() => {
                    statusBar.show();
                    setTimeout(() => statusBar.hide(), 5000);
                }, delay);
            }
            // Shows success message
            if (diagnosticList.length === 0) {
                const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
                statusBar.text = '✅ PyGuardian: Policy Approved!';
                statusBar.show();
                setTimeout(() => statusBar.hide(), 8000); // Auto-hide after 8 seconds
            }
        }
        catch (e) {
            console.error('Error parsing the results from PyGuardian:', e);
        }
    });
}
function mapSeverity(severity) {
    switch (severity) {
        case 'critical':
            return vscode.DiagnosticSeverity.Error;
        case 'error':
            return vscode.DiagnosticSeverity.Error;
        case 'warning':
            return vscode.DiagnosticSeverity.Warning;
        case 'hint':
            return vscode.DiagnosticSeverity.Information;
        case 'info':
            return vscode.DiagnosticSeverity.Hint;
        case 'debug':
            return vscode.DiagnosticSeverity.Hint;
        default:
            return vscode.DiagnosticSeverity.Information;
    }
}
// Add custom labels with colors
function formatDiagnosticMessage(message, severity) {
    let label;
    switch (severity) {
        case 'critical':
            label = '🟥 [CRITICAL]';
            break;
        case 'error':
            label = '🟥 [ERROR]';
            break;
        case 'warning':
            label = '🟧 [WARNING]';
            break;
        case 'info':
            label = '🟩 [INFO]';
            break;
        case 'hint':
            label = '🟦 [HINT]';
            break;
        case 'debug':
            label = '⬜ [DEBUG]';
            break;
        default:
            label = 'ℹ️ [NOTICE]';
    }
    return `${label}\n\n${message}`;
}
// Apply the custom message format when creating diagnostics
function createDiagnostic(range, message, severity) {
    const diagnostic = new vscode.Diagnostic(range, formatDiagnosticMessage(message, severity), mapSeverity(severity));
    diagnostic.source = 'PyGuardian';
    return diagnostic;
}
//# sourceMappingURL=extension.js.map