import * as vscode from 'vscode';
import { exec } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    console.log('PyGuardian extension activated!');  // Debugging activation
    
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('PyGuardian');

    vscode.workspace.onDidSaveTextDocument(document => {
        console.log('File saved:', document.uri.fsPath);  // Debugging the saved file
        if (document.languageId === 'python') {
            runPyGuardian(document, diagnosticCollection);
        }
    });
}

function runPyGuardian(document: vscode.TextDocument, diagnostics: vscode.DiagnosticCollection) {
    const filePath = document.uri.fsPath;
    console.log('Running PyGuardian analysis for file:', filePath); // Debugging the function call

    exec(`PyGuardian-lt "${filePath}"`, (err, stdout, stderr) => {
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
            console.log('PyGuardian Results:', results);  // Debugging

            const diagnosticList: vscode.Diagnostic[] = [];
            let hasCriticalOrError = false;
            let hasWarning = false;          
            let hasInfo = 0;
            let hasHint = 0;
            let hasDebug = 0;

            // Loop over array of errors
            results.forEach((error: any) => {
                let range: vscode.Range;

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
                        length = length -1;
                    }
                    // Vscode position is a little weird
                    range = new vscode.Range(
                        new vscode.Position(error.line - 1, position),  
                        new vscode.Position(error.line - 1, position + length) 
                    );
                } else {
                    let position = error.position -1 
                    
                    if (error.position == 1){
                        position = 0;
                    }
                    // Default range: Highlight the whole line
                    range = new vscode.Range(
                        new vscode.Position(error.line - 1, position), 
                        new vscode.Position(error.line - 1, Number.MAX_SAFE_INTEGER)
                    );
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
                delay += 5000;  // Add delay for next message
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
                setTimeout(() => statusBar.hide(), 8000);  // Auto-hide after 8 seconds
            }

        } catch (e) {
            console.error('Error parsing the results from PyGuardian:', e);
        }
    });
}
function mapSeverity(severity: string): vscode.DiagnosticSeverity {
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
function formatDiagnosticMessage(message: string, severity: string): string {
    let label: string;

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
function createDiagnostic(range: vscode.Range, message: string, severity: string): vscode.Diagnostic {
    const diagnostic = new vscode.Diagnostic(range, formatDiagnosticMessage(message, severity), mapSeverity(severity));
    diagnostic.source = 'PyGuardian';
    return diagnostic;
}