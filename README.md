# PyGuardian-VSC
Visual Studio Code extension for the PyGuardian-Lite package

This is a custom made static analysis plugin, that runs on my custom made static analysis package.

Features:

    * Runs when saving file

    * Categorization (which is customizable within the package)

    * Shows approved message in status bar when policy template is fullfilled (policy = static analysis rules selected in package)

    * Alerts on Errors and Critical errors.

    * Underlines variables or class names, if needed and possible (depends on the error message)

    * Different underline colors for the severity

Errors can be based on these categorizations:

    "critical": "Very severe issue requiring immediate action",
    "error": "Critical issue preventing execution or functionality",
    "warning": "Potential issue that should be addressed",
    "info": "Informational message, typically non-disruptive",
    "hint": "Suggestion or tip that can be helpful but isn't crucial",
    "debug": "Detailed, often low-priority information useful for debugging"
