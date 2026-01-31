
import os
import re

def update_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Regex to match imports from @/lib/errors/logger
    # It captures the import clause to be modified
    # Pattern: import { ... } from '@/lib/errors/logger';
    pattern = r"import\s+\{([^}]+)\}\s+from\s+['\"]@/lib/errors/logger['\"];?"
    
    def replace_import(match):
        imports_str = match.group(1)
        if 'fisioLogger' in imports_str:
            return match.group(0) # Already updated
            
        # Replace 'logger' with 'fisioLogger as logger'
        # precise matching to avoid replacing 'loggerType' etc if they existed (they don't seem to)
        # using word boundary \b
        
        new_imports = re.sub(r'\blogger\b', 'fisioLogger as logger', imports_str)
        
        return match.group(0).replace(imports_str, new_imports)

    new_content = re.sub(pattern, replace_import, content)
    
    if new_content != content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

def main():
    root_dir = 'src'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith('.ts') or file.endswith('.tsx'):
                update_file(os.path.join(root, file))

if __name__ == '__main__':
    main()
