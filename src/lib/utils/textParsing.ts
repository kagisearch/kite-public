import { splitAtNonTimeColon } from './colonSplitter';

/**
 * Parse structured text that may contain colons separating title and content
 */
export function parseStructuredText(text: string): {
	hasTitle: boolean;
	title?: string;
	content: string;
} {
	const splitResult = splitAtNonTimeColon(text);
	if (splitResult) {
		const [title, content] = splitResult;
		return {
			hasTitle: true,
			title,
			content,
		};
	}

	return {
		hasTitle: false,
		content: text,
	};
}

/**
 * Parse timeline event from various formats
 */
export function parseTimelineEvent(event: unknown): {
	date: string;
	content: string;
} {
	let date = '';
	let content = '';

	if (typeof event === 'object' && event !== null) {
		const obj = event as { date?: string; content?: string };
		date = obj.date || '';
		content = obj.content || '';
	} else if (typeof event === 'string') {
		// Handle string format with various separators
		if (event.includes('::')) {
			// Preferred separator
			const parts = event.split('::');
			date = parts[0] || '';
			content = parts.slice(1).join('::') || event;
		} else if (event.includes(':')) {
			// Fallback to single colon (be careful with time formats)
			const parts = event.split(':');
			// Assume first part is date if it looks like a date
			date = parts[0] || '';
			content = parts.slice(1).join(':') || event;
		} else {
			// No separator, treat as content only
			content = event;
		}
	} else {
		content = String(event);
	}

	return { date, content };
}

/**
 * Parse Q&A content with proper formatting
 */
export function parseQnAContent(qa: { question: string; answer: string }): {
	question: string;
	answer: string;
} {
	return {
		question: qa.question.trim(),
		answer: qa.answer.trim(),
	};
}
