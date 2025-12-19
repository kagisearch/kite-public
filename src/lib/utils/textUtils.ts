/**
 * Text utility functions for language detection and text processing
 */

/**
 * Check if a string contains CJK (Chinese, Japanese, Korean) characters
 * CJK languages don't use spaces between words, making word-based flashcards impractical
 */
export function containsCJK(text: string): boolean {
	// Unicode ranges for CJK characters:
	// - Chinese: \u4E00-\u9FFF (CJK Unified Ideographs)
	// - Japanese Hiragana: \u3040-\u309F
	// - Japanese Katakana: \u30A0-\u30FF
	// - Korean Hangul: \uAC00-\uD7AF
	const cjkRegex = /[\u4E00-\u9FFF\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/;
	return cjkRegex.test(text);
}
