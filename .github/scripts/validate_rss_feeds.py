#!/usr/bin/env python3
"""
RSS Feed Validator for Kite
Validates RSS/Atom feeds to ensure they are accessible and properly formatted.

Dependencies: feedparser==6.0.10 requests==2.31.0
"""

import feedparser
import requests
import sys
import argparse
from urllib.parse import urlparse
from typing import Tuple, List


def validate_feed(url: str) -> Tuple[bool, str]:
    """
    Validate a single RSS/Atom feed URL.
    
    Args:
        url: The RSS feed URL to validate
        
    Returns:
        Tuple of (is_valid, message)
    """
    try:
        # Try multiple strategies to access the feed
        strategies = [
            # Strategy 1: Simple RSS reader headers
            {
                'User-Agent': 'FeedReader/1.0 (+https://kite.kagi.com)',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*'
            },
            # Strategy 2: Generic browser 
            {
                'User-Agent': 'Mozilla/5.0 (compatible; RSS Bot)',
                'Accept': 'application/xml, text/xml, */*'
            },
            # Strategy 3: Minimal curl-like
            {
                'User-Agent': 'curl/7.68.0',
                'Accept': '*/*'
            }
        ]
        
        response = None
        last_error = None
        
        for i, headers in enumerate(strategies):
            try:
                response = requests.get(url, timeout=10, headers=headers, allow_redirects=True)
                if response.status_code == 200:
                    break
                elif response.status_code == 403 and i < len(strategies) - 1:
                    continue  # Try next strategy
                else:
                    response.raise_for_status()
            except requests.exceptions.RequestException as e:
                last_error = e
                if i == len(strategies) - 1:  # Last strategy failed
                    raise last_error
                continue
        
        if response is None:
            raise last_error or Exception("All request strategies failed")
        
        # Check content type (should be XML-ish)
        content_type = response.headers.get('content-type', '').lower()
        if not any(ct in content_type for ct in ['xml', 'rss', 'atom', 'text/plain']):
            return False, f"Unexpected content-type: {content_type}"
        
        # Parse with feedparser
        feed = feedparser.parse(response.content)
        
        # Check for parsing errors (be more forgiving of minor issues)
        if hasattr(feed, 'bozo') and feed.bozo and feed.bozo_exception:
            exception_type = type(feed.bozo_exception).__name__
            # Allow feeds with minor/recoverable parsing issues
            recoverable_exceptions = [
                'CharacterEncodingOverride', 
                'NonXMLContentType',
                'UndeclaredNamespace',
                'UnicodeDecodeError'
            ]
            
            if exception_type in recoverable_exceptions:
                print(f"⚠️  Warning: {exception_type} (feed still usable)")
            else:
                # For serious XML errors, check if we actually got HTML instead
                content_preview = response.text[:200].lower()
                if '<html' in content_preview or '<!doctype html' in content_preview:
                    return False, f"Server returned HTML instead of XML (possible bot detection)"
                else:
                    return False, f"XML parsing error: {feed.bozo_exception}"
        
        # Check if it's a valid feed (has basic RSS/Atom structure)
        if not hasattr(feed, 'feed') or not feed.feed:
            return False, "No feed metadata found"
        
        # Check for entries/items
        if not hasattr(feed, 'entries') or len(feed.entries) == 0:
            return False, "No feed entries found"
        
        # Check for required feed metadata
        if not (hasattr(feed.feed, 'title') or hasattr(feed.feed, 'description')):
            return False, "Missing required feed title or description"
        
        return True, f"Valid feed with {len(feed.entries)} entries"
        
    except requests.exceptions.RequestException as e:
        return False, f"HTTP error: {e}"
    except Exception as e:
        return False, f"Validation error: {e}"


def validate_feeds_from_file(filename: str) -> int:
    """
    Validate all feeds listed in a file.
    
    Args:
        filename: Path to file containing feed URLs (one per line)
        
    Returns:
        Exit code (0 for success, 1 for failures)
    """
    try:
        with open(filename, 'r') as f:
            feeds = [line.strip() for line in f if line.strip()]
    except FileNotFoundError:
        print(f"❌ File not found: {filename}")
        return 1
    
    if not feeds:
        print("✅ No RSS feeds to validate")
        return 0
    
    print(f"🔍 Validating {len(feeds)} RSS feeds...")
    
    failed_feeds = []
    
    for feed_url in feeds:
        print(f"Testing: {feed_url}")
        is_valid, message = validate_feed(feed_url)
        
        if is_valid:
            print(f"✅ Valid: {feed_url} - {message}")
        else:
            print(f"❌ Invalid: {feed_url} - {message}")
            failed_feeds.append(f"{feed_url} - {message}")
    
    if failed_feeds:
        print(f"\n❌ {len(failed_feeds)} RSS feed(s) failed validation:")
        for feed in failed_feeds:
            print(f"  {feed}")
        return 1
    else:
        print(f"\n✅ All {len(feeds)} RSS feeds are valid")
        return 0


def validate_feeds_from_list(feeds: List[str]) -> int:
    """
    Validate feeds from a list of URLs.
    
    Args:
        feeds: List of feed URLs
        
    Returns:
        Exit code (0 for success, 1 for failures)
    """
    if not feeds:
        print("✅ No RSS feeds to validate")
        return 0
    
    print(f"🔍 Validating {len(feeds)} RSS feeds...")
    
    failed_feeds = []
    
    for feed_url in feeds:
        print(f"Testing: {feed_url}")
        is_valid, message = validate_feed(feed_url)
        
        if is_valid:
            print(f"✅ Valid: {feed_url} - {message}")
        else:
            print(f"❌ Invalid: {feed_url} - {message}")
            failed_feeds.append(f"{feed_url} - {message}")
    
    if failed_feeds:
        print(f"\n❌ {len(failed_feeds)} RSS feed(s) failed validation:")
        for feed in failed_feeds:
            print(f"  {feed}")
        return 1
    else:
        print(f"\n✅ All {len(feeds)} RSS feeds are valid")
        return 0


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description='Validate RSS/Atom feeds')
    parser.add_argument('--file', '-f', help='File containing feed URLs (one per line)')
    parser.add_argument('--url', '-u', action='append', help='Single feed URL to validate (can be used multiple times)')
    
    args = parser.parse_args()
    
    if args.file:
        return validate_feeds_from_file(args.file)
    elif args.url:
        return validate_feeds_from_list(args.url)
    else:
        # Default: try to read from new_feeds.txt if it exists
        try:
            return validate_feeds_from_file('new_feeds.txt')
        except:
            print("❌ No feeds specified. Use --file or --url options.")
            parser.print_help()
            return 1


if __name__ == "__main__":
    sys.exit(main()) 