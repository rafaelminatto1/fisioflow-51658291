import os
import re

def strip_comments_and_strings(content, keep_strings=False):
    """
    Removes comments and/or strings from the code to avoid false positives.
    If keep_strings is True, we only remove comments.
    """
    # Pattern to match strings (single, double, backtick) and comments (//, /* */)
    # 1. Single quotes: '...'
    # 2. Double quotes: "..."
    # 3. Template literals: `...`
    # 4. Block comments: /* ... */
    # 5. Line comments: // ...
    pattern = r"('(?:\\.|[^\\'])*'|\"(?:\\.|[^\\\"])*\"|`(?:\\.|[^\\`])*`)|(/\*[\s\S]*?\*/|//.*)"
    
    def replacer(match):
        if match.group(2):  # It's a comment
            return " "  # Replace with space
        else:  # It's a string
            if keep_strings:
                return match.group(1)
            return "\"\""  # Replace string content with empty string literal
            
    return re.sub(pattern, replacer, content)

def find_missing_useeffect(root_dir):
    missing_imports = []
    
    # 1. Regex to find valid import of useEffect
    # Matches: import { ..., useEffect, ... } from 'react'
    # Handles newlines, spaces, and other imports in the braces.
    # Also handles default imports like: import React, { useEffect } from 'react'
    import_pattern = re.compile(
        r"import\s+(?:[\w\s,*]+)?\{[^{}]*?\buseEffect\b[^{}]*?\}\s+from\s+['\"]react['\"]", 
        re.DOTALL
    )

    # 2. Regex to find usages of useEffect
    # We look for "useEffect" that is NOT preceded by a dot (.) or a word character.
    # This excludes: React.useEffect, myuseEffect, etc.
    # It ensures we are looking for the identifier "useEffect" as a standalone variable/function.
    usage_pattern = re.compile(r'(?<![\.\w])useEffect\b')

    print(f"Scanning directory: {root_dir}\n")

    for subdir, _, files in os.walk(root_dir):
        # Skip node_modules and other generated dirs if they happen to be in the tree
        if any(ignore in subdir for ignore in ['node_modules', '.git', 'dist', 'build', '.vite']):
            continue

        for file in files:
            if file.endswith(('.tsx', '.ts', '.jsx', '.js')):
                filepath = os.path.join(subdir, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        original_content = f.read()
                        
                    # Step 1: Check if useEffect is imported
                    # We accept imports even if they are in comments? No, imports in comments don't count.
                    # So we should strip comments but KEEP strings (because 'react' is a string).
                    content_without_comments = strip_comments_and_strings(original_content, keep_strings=True)
                    
                    is_imported = import_pattern.search(content_without_comments)
                    
                    if is_imported:
                        continue # File has proper import, skip it.

                    # Step 2: If NOT imported, check if it is USED.
                    # For usage check, we strip BOTH comments AND strings to avoid matching 'useEffect' inside a string literal.
                    content_clean = strip_comments_and_strings(original_content, keep_strings=False)
                    
                    matches = list(usage_pattern.finditer(content_clean))
                    
                    if matches:
                        # Found usage without import!
                        # Calculate line number for the first match
                        match_idx = matches[0].start()
                        line_num = original_content[:match_idx].count('\n') + 1
                        
                        rel_path = os.path.relpath(filepath, root_dir)
                        print(f"[MISSING IMPORT] {rel_path}:{line_num}")
                        print(f"    Found usage: ...{content_clean[max(0, match_idx-10):match_idx+20].replace(chr(10), ' ')}...")
                        missing_imports.append(filepath)

                except Exception as e:
                    print(f"Error reading {filepath}: {e}")

    return missing_imports

if __name__ == "__main__":
    src_dir = os.path.join(os.getcwd(), 'src')
    if not os.path.exists(src_dir):
        print("Directory 'src' not found in current working directory.")
    else:
        results = find_missing_useeffect(src_dir)
        
        if results:
            print(f"\nFound {len(results)} file(s) with missing useEffect import.")
        else:
            print("\nNo missing useEffect imports found (checked .ts, .tsx, .js, .jsx).")
