#!/usr/bin/env python3
"""Sort and deduplicate core feeds."""

import json
import sys
from pathlib import Path
import importlib.util
import glob

CORE_FEEDS_FILE = 'core_feeds.py'
LOCALES_DIR = 'src/lib/locales'

def analyze_translations():
    """Analyze translation issues for core feeds categories."""
    issues = []

    # Load core feeds categories
    if not Path(CORE_FEEDS_FILE).exists():
        return issues

    spec = importlib.util.spec_from_file_location("core_feeds", CORE_FEEDS_FILE)
    core_feeds_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(core_feeds_module)

    if not hasattr(core_feeds_module, 'feeds'):
        return issues

    core_categories = set(core_feeds_module.feeds.keys())

    # Check each locale file for missing translations
    locale_files = glob.glob(f"{LOCALES_DIR}/*.json")

    for locale_file in locale_files:
        locale_name = Path(locale_file).stem

        with open(locale_file, 'r') as f:
            locale_data = json.load(f)

        # Check for missing translations for core categories
        for category in core_categories:
            if category not in locale_data.get('categories', {}):
                issues.append({
                    "type": "missing",
                    "file": f"src/lib/locales/{locale_name}.json",
                    "message": f"Missing translation for core category '{category}'",
                    "severity": "warning"
                })

    return issues

def main():
    # Check if file exists
    if not Path(CORE_FEEDS_FILE).exists():
        print(f"ℹ️  {CORE_FEEDS_FILE} does not exist, skipping")
        return 0

    print(f"📄 Reading {CORE_FEEDS_FILE}")

    # Import the module directly
    spec = importlib.util.spec_from_file_location("core_feeds", CORE_FEEDS_FILE)
    core_feeds_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(core_feeds_module)

    if not hasattr(core_feeds_module, 'feeds'):
        print("❌ Could not find 'feeds' dictionary in core_feeds.py")
        return 1

    feeds_dict = core_feeds_module.feeds

    # Sort categories and deduplicate feeds
    sorted_feeds = {}
    total_dupes = 0

    for category in sorted(feeds_dict.keys()):
        original_feeds = feeds_dict[category]
        unique_feeds = sorted(list(set(original_feeds)))

        # Find the actual duplicates
        seen = set()
        duplicates = []
        for feed in original_feeds:
            if feed in seen:
                duplicates.append(feed)
            else:
                seen.add(feed)

        dupes = len(duplicates)

        if dupes > 0:
            print(f"  🔹 {category}: removed {dupes} duplicate(s)")
            for dup in duplicates:
                print(f"      - {dup}")
            total_dupes += dupes

        sorted_feeds[category] = unique_feeds

    # Generate the Python file content
    output_lines = ['feeds = {']
    categories = sorted(sorted_feeds.keys())

    for i, category in enumerate(categories):
        output_lines.append(f'    "{category}": [')
        for feed in sorted_feeds[category]:
            output_lines.append(f'        "{feed}",')
        output_lines.append('    ]' + (',' if i < len(categories) - 1 else ''))

    output_lines.append('}')
    new_content = '\n'.join(output_lines) + '\n'

    # Read original content for comparison
    with open(CORE_FEEDS_FILE, 'r') as f:
        original_content = f.read()

    # Check if content changed
    if new_content != original_content:
        with open(CORE_FEEDS_FILE, 'w') as f:
            f.write(new_content)
        print(f"✅ {CORE_FEEDS_FILE} sorted. Categories: {len(sorted_feeds)}, Duplicates removed: {total_dupes}")
    else:
        print("ℹ️  No changes – core feeds already sorted")

    # If --output-issues flag is present, generate issues file
    if '--output-issues' in sys.argv:
        output_file = None
        if '--output-file' in sys.argv:
            idx = sys.argv.index('--output-file')
            if idx + 1 < len(sys.argv):
                output_file = sys.argv[idx + 1]

        # Analyze for translation issues
        issues = analyze_translations()

        # Count issues by type
        by_type = {}
        for issue in issues:
            issue_type = issue['type']
            by_type[issue_type] = by_type.get(issue_type, 0) + 1

        from datetime import datetime, timezone
        issues_output = {
            "type": "feeds",
            "issues": issues,
            "summary": {
                "totalIssues": len(issues),
                "byType": by_type
            },
            "timestamp": datetime.now(timezone.utc).isoformat()
        }

        if output_file:
            with open(output_file, 'w') as f:
                json.dump(issues_output, f, indent=2)
        else:
            print(json.dumps(issues_output, indent=2))

    return 0

if __name__ == '__main__':
    sys.exit(main())