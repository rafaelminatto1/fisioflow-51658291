#!/usr/bin/env python3
"""
SEO Checker - Search Engine Optimization Audit
Checks HTML/JSX/TSX pages for SEO best practices.

PURPOSE:
    - Verify meta tags, titles, descriptions
    - Check Open Graph tags for social sharing
    - Validate heading hierarchy
    - Check image accessibility (alt attributes)

WHAT IT CHECKS:
    - HTML files (actual web pages)
    - JSX/TSX files (React page components)
    - Only files that are likely PUBLIC pages

Usage:
    python seo_checker.py <project_path>
"""
import os
import re
import sys
import json
from pathlib import Path
from datetime import datetime

# Fix Windows console encoding
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace') # type: ignore
    except:
        pass


# Directories to skip
SKIP_DIRS = {
    'node_modules', '.next', 'dist', 'build', '.git', '.github',
    '__pycache__', '.vscode', '.idea', 'coverage', 'test', 'tests',
    '__tests__', 'spec', 'docs', 'documentation', 'examples',
    'diagnostics', 'playwright-report', 'stich', 'minatto',
    '.playwright', 'playwright', 'playwright-screenshots', 'playwright-video',
    'test-results', 'screenshots', '.gemini', '.claude', '.cursor', '.trae',
    '.jules', '.kiro', 'docs2026', 'docker', 'e2e', 'e2e-tests', 'claude-skills',
    'fisioflow-screenshots', 'public', 'temp', 'tmp', 'out'
}

# Files to skip (not pages)
SKIP_PATTERNS = [
    'config', 'setup', 'util', 'helper', 'hook', 'context', 'store',
    'service', 'api', 'lib', 'constant', 'type', 'interface', 'mock',
    '.test.', '.spec.', '_test.', '_spec.'
]


def is_page_file(file_path: Path) -> bool:
    """Check if this file is likely a public-facing page."""
    name = file_path.name.lower()
    stem = file_path.stem.lower()
    
    # Skip utility/config files
    if any(skip in name for skip in SKIP_PATTERNS):
        return False
    
    # Check path - pages in specific directories are likely pages
    parts = [p.lower() for p in file_path.parts]
    page_dirs = ['pages', 'app', 'routes', 'views', 'screens']
    
    if any(d in parts for d in page_dirs):
        return True
    
    # Filename indicators for pages
    page_names = ['page', 'index', 'home', 'about', 'contact', 'blog', 
                  'post', 'article', 'product', 'landing', 'layout']
    
    if any(p in stem for p in page_names):
        return True
    
    # HTML files are usually pages
    if file_path.suffix.lower() in ['.html', '.htm']:
        return True
    
    return False


def find_pages(project_path: Path) -> list:
    """Find page files to check."""
    
    files = []
    
    for root, dirs, filenames in os.walk(project_path):
        # Prune directories to skip
        filtered_dirs = [d for d in dirs if d not in SKIP_DIRS and not d.startswith('.')]
        dirs.clear()
        dirs.extend(filtered_dirs)
        
        # Extra safety check for current path (if a parent dir was skipped, os.walk might still enter)
        if any(part in SKIP_DIRS for part in Path(root).parts):
            continue

        for f_name in filenames:
            file_path = Path(root) / f_name
            
            # Check file extensions
            if file_path.suffix.lower() in {'.html', '.htm', '.jsx', '.tsx'}:
                # Check if it's likely a page using the existing logic
                if is_page_file(file_path):
                    files.append(file_path)
    
    return files[:50] # type: ignore


def check_page(file_path: Path) -> dict:
    """Check a single page for SEO issues."""
    issues = []
    
    try:
        content = file_path.read_text(encoding='utf-8', errors='ignore')
    except Exception as e:
        return {"file": str(file_path.name), "issues": [f"Error: {e}"]}
    
    # Detect if this is a layout/template file (has Head component)
    is_layout = bool(re.search(r'Head>|<head', content, re.I))
    
    has_title = bool(re.search(r'<title|title=|Head>', content, re.I))
    if not has_title and is_layout:
        issues.append("Missing title indicator")
    
    has_description = bool(re.search(r'name=["\']description["\']', content, re.I))
    if not has_description and is_layout:
        issues.append("Missing meta description")
    
    has_og = bool(re.search(r'og:|property=["\']og:', content, re.I))
    if not has_og and is_layout:
        issues.append("Missing Open Graph tags")
    
    # 4. Heading hierarchy - multiple H1s
    h1_matches = re.findall(r'<h1[^>]*>', content, re.I)
    if len(h1_matches) > 1:
        issues.append(f"Multiple H1 tags ({len(h1_matches)})")
    
    # 5. Images without alt
    img_pattern = r'<img[^>]+>'
    imgs = re.findall(img_pattern, content, re.I)
    for img in imgs:
        if 'alt=' not in img.lower():
            issues.append("Image missing alt attribute")
            break
        if 'alt=""' in img or "alt=''" in img:
            issues.append("Image has empty alt attribute")
            break
    
    # 6. Check for canonical link (nice to have)
    # has_canonical = 'rel="canonical"' in content.lower()
    
    return {
        "file": str(file_path.name),
        "issues": issues
    }


def main():
    project_path = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    
    print(f"\n{'='*60}")
    print(f"  SEO CHECKER - Search Engine Optimization Audit")
    print(f"{'='*60}")
    print(f"Project: {project_path}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("-"*60)
    
    # Find pages
    pages = find_pages(project_path)
    
    if not pages:
        print("\n[!] No page files found.")
        print("    Looking for: HTML, JSX, TSX in pages/app/routes directories")
        output = {"script": "seo_checker", "files_checked": 0, "passed": True}
        print("\n" + json.dumps(output, indent=2))
        sys.exit(0)
    
    print(f"Found {len(pages)} page files to analyze\n")
    
    # Check each page
    all_issues = []
    for f in pages:
        result = check_page(f)
        if result["issues"]:
            all_issues.append(result)
    
    # Summary
    print("=" * 60)
    print("SEO ANALYSIS RESULTS")
    print("=" * 60)
    
    if all_issues:
        # Group by issue type
        issue_counts = {}
        for item in all_issues:
            for issue in item["issues"]:
                issue_counts[issue] = issue_counts.get(issue, 0) + 1
        
        print("\nIssue Summary:")
        for issue, count in sorted(issue_counts.items(), key=lambda x: -x[1]):
            print(f"  [{count}] {issue}")
        
        print(f"\nAffected files ({len(all_issues)}):")
        # Fix: Using a loop with range/counter to avoid slice typing issues in strict environments
        for i in range(min(5, len(all_issues))):
            item = all_issues[i]
            print(f"  - {item['file']}")
        if len(all_issues) > 5:
            print(f"  ... and {len(all_issues) - 5} more")
    else:
        print("\n[OK] No SEO issues found!")
    
    total_issues = sum(len(item["issues"]) for item in all_issues)
    passed = total_issues == 0
    
    output = {
        "script": "seo_checker",
        "project": str(project_path),
        "files_checked": len(pages),
        "files_with_issues": len(all_issues),
        "issues_found": total_issues,
        "passed": passed
    }
    
    print("\n" + json.dumps(output, indent=2))
    
    sys.exit(0 if passed else 1)


if __name__ == "__main__":
    main()
