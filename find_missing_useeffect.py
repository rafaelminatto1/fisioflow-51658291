import os
import re

def find_missing_useeffect(root_dir):
    missing_imports = []
    
    # Regex to find usages of useEffect that are NOT React.useEffect
    # We look for "useEffect(" or "useEffect " or ", useEffect" or " useEffect"
    # But simpler: find "useEffect" and verify it's not preceded by "React."
    usage_pattern = re.compile(r'(?<!React\.)\buseEffect\b')
    
    # Regex to find valid import of useEffect
    # import { useEffect } from 'react'
    # import { ..., useEffect, ... } from 'react'
    # import React, { useEffect } from 'react'
    import_pattern = re.compile(r'import\s+.*\{[^}]*\buseEffect\b[^}]*\}.*from\s+[\'"]react[\'"]', re.DOTALL)

    for subdir, _, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(subdir, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        content = f.read()
                        
                    # Find all usages of useEffect (not React.useEffect)
                    usages = [m for m in usage_pattern.finditer(content)]
                    
                    if usages:
                        # It is used directly, so it MUST be imported
                        is_imported = import_pattern.search(content)
                        
                        if not is_imported:
                            # Verify if it's not a false positive (e.g. in comments or strings)
                            # This is a simple check, manual verification is needed for results
                             print(f"POTENTIAL MATCH: {filepath}")
                             missing_imports.append(filepath)

                except Exception as e:
                    print(f"Could not read {filepath}: {e}")

    return missing_imports

if __name__ == "__main__":
    src_dir = os.path.join(os.getcwd(), 'src')
    print(f"Scanning {src_dir}...")
    results = find_missing_useeffect(src_dir)
    
    if results:
        print("\nFiles with potential missing useEffect import:")
        for res in results:
            print(res)
    else:
        print("\nNo missing imports found.")
