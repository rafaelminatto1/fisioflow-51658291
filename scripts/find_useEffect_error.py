
import os
import re

def strip_comments(text):
    # Remove single line comments // ...
    text = re.sub(r'//.*', '', text)
    # Remove multi-line comments /* ... */
    text = re.sub(r'/\*[\s\S]*?\*/', '', text)
    return text

def check_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        original_content = f.read()

    # Strip comments to avoid false negatives (finding import in comments)
    content = strip_comments(original_content)

    # Find usages of useEffect not preceded by dot
    usages = [m.start() for m in re.finditer(r'(?<!\.)\buseEffect\b', content)]
    
    if not usages:
        return None

    # Check for valid import in NON-COMMENTED content
    import_regex = r'import\s[^;]*\buseEffect\b[^;]*from\s*[\'"]react[\'"]'
    has_import = re.search(import_regex, content, re.DOTALL)
    
    if has_import:
        return None
        
    # Check for local definition
    if re.search(r'\bconst\s+useEffect\s*=', content):
        return None
    
    if re.search(r'function\s+\w+\s*\([^)]*\buseEffect\b', content):
        return None

    return filepath

def main():
    root_dir = 'src'
    for dirpath, _, filenames in os.walk(root_dir):
        for filename in filenames:
            if filename.endswith(('.ts', '.tsx')):
                filepath = os.path.join(dirpath, filename)
                result = check_file(filepath)
                if result:
                    print(f"SUSPECT: {result}")

if __name__ == "__main__":
    main()
