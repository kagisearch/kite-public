#!/usr/bin/env python3
"""
RSS Feed Validator for Kite
Validates RSS/Atom feeds to ensure they are accessible and properly formatted.
Dependencies: feedparser==6.0.10 requests==2.31.0
"""

import feedparser
import requests
import sys


def validate_feed(url: str):
    """
    Validate a single RSS/Atom feed URL.
    Returns: (is_valid, message, is_403_warning)
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36'
    }
    
    try:
        response = requests.get(url, timeout=10, headers=headers, allow_redirects=True)
        
        # Handle 403 as warning, not failure
        if response.status_code == 403:
            return True, "Feed blocked by bot protection (403 Forbidden)", True
        
        response.raise_for_status()
        
        # Parse with feedparser
        feed = feedparser.parse(response.content)
        
        # Check for serious parsing errors only
        if hasattr(feed, 'bozo') and feed.bozo and feed.bozo_exception:
            exception_type = type(feed.bozo_exception).__name__
            # Allow minor parsing issues
            if exception_type not in ['CharacterEncodingOverride', 'NonXMLContentType', 'UndeclaredNamespace']:
                return False, f"XML parsing error: {feed.bozo_exception}", False
        
        # Basic feed validation
        if not hasattr(feed, 'feed') or not feed.feed:
            return False, "No feed metadata found", False
        
        if not hasattr(feed, 'entries') or len(feed.entries) == 0:
            return False, "No feed entries found", False
        
        return True, f"Valid feed with {len(feed.entries)} entries", False
        
    except requests.exceptions.RequestException as e:
        return False, f"HTTP error: {e}", False
    except Exception as e:
        return False, f"Validation error: {e}", False


def main():
    """Main entry point - validates feeds from new_feeds.txt file."""
    try:
        with open('new_feeds.txt', 'r') as f:
            feeds = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print("✅ No new RSS feeds to validate")
        return 0
    
    if not feeds:
        print("✅ No RSS feeds to validate")
        return 0
    
    print(f"🔍 Validating {len(feeds)} RSS feeds...")
    
    failed_feeds = []
    warning_feeds = []
    
    for feed_url in feeds:
        print(f"Testing: {feed_url}")
        is_valid, message, is_403_warning = validate_feed(feed_url)
        
        if is_valid:
            if is_403_warning:
                print(f"⚠️  Warning: {feed_url} - {message}")
                warning_feeds.append(feed_url)
            else:
                print(f"✅ Valid: {feed_url} - {message}")
        else:
            print(f"❌ Invalid: {feed_url} - {message}")
            failed_feeds.append(f"{feed_url} - {message}")
    
    # Print summary
    if warning_feeds:
        print(f"\n⚠️  {len(warning_feeds)} feed(s) blocked by bot protection or unreachable (403 Forbidden):")
        for feed in warning_feeds:
            print(f"  {feed}")
        print("  These feeds may work in browsers but block automated requests.")
    
    if failed_feeds:
        print(f"\n❌ {len(failed_feeds)} RSS feed(s) failed validation:")
        for feed in failed_feeds:
            print(f"  {feed}")
        return 1
    else:
        print(f"\n✅ All RSS feeds are valid (with {len(warning_feeds)} warnings)")
        return 0


if __name__ == "__main__":
    sys.exit(main()) 