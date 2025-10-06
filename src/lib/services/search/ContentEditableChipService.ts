import type { FilterContext, FilterSuggestion, SearchFilter } from './types';

export class ContentEditableChipService {
	private element: HTMLDivElement | null = null;
	private appliedFilters: Map<string, SearchFilter> = new Map();

	setElement(element: HTMLDivElement | null) {
		this.element = element;
		if (element) {
			// Ensure element is set up properly
			element.contentEditable = 'true';
		}
	}

	/**
	 * Get plain text from contenteditable, treating chips as their filter text
	 */
	getText(): string {
		if (!this.element) return '';

		let text = '';
		for (const node of this.element.childNodes) {
			if (node.nodeType === Node.TEXT_NODE) {
				text += node.textContent || '';
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				const element = node as HTMLElement;
				if (element.classList.contains('filter-chip')) {
					// Get the filter text from data attribute
					text += element.getAttribute('data-filter') || '';
				} else {
					// Recursively get text from nested elements
					text += this.getTextFromNode(element);
				}
			}
		}
		return text;
	}

	private getTextFromNode(node: Node): string {
		let text = '';
		for (const child of node.childNodes) {
			if (child.nodeType === Node.TEXT_NODE) {
				text += child.textContent || '';
			} else if (
				child.nodeType === Node.ELEMENT_NODE &&
				!(child as HTMLElement).classList.contains('filter-chip')
			) {
				text += this.getTextFromNode(child);
			}
		}
		return text;
	}

	/**
	 * Clean up unwanted elements in contenteditable
	 */
	cleanup() {
		if (!this.element) return;

		// Convert all divs, paragraphs, and breaks to text
		const elementsToReplace = this.element.querySelectorAll('div:not(.filter-chip), p, br');
		elementsToReplace.forEach((el) => {
			if (el.parentNode === this.element) {
				const text = document.createTextNode(el.textContent || ' ');
				el.replaceWith(text);
			}
		});

		// Normalize text nodes
		this.element.normalize();
	}

	/**
	 * Apply a filter suggestion by creating a chip
	 */
	applyFilterSuggestion(suggestion: FilterSuggestion, context: FilterContext): boolean {
		if (!this.element) return false;

		// Handle filter type suggestions (e.g., "cat" -> "category:")
		if (suggestion.isFilterType) {
			return this.replacePartialText(context, suggestion.value);
		}

		// Build the completed filter
		const needsQuotes = suggestion.value.includes(' ');
		const filterValue = needsQuotes ? `"${suggestion.value}"` : suggestion.value;
		const completedFilter = `${context.type}:${filterValue}`;

		// Create the chip
		const chip = this.createChip(
			context.type,
			completedFilter,
			suggestion.display || suggestion.value,
		);

		// Replace the partial filter text with the chip
		return this.replacePartialTextWithChip(context, chip, suggestion);
	}

	/**
	 * Replace partial text with new text
	 */
	private replacePartialText(context: FilterContext, newText: string): boolean {
		if (!this.element) return false;

		const textContent = this.element.textContent || '';
		const beforeFilter = textContent.substring(0, context.startIndex);
		const afterFilter = textContent.substring(context.startIndex + context.fullMatch.length);

		// Clear and rebuild content
		this.element.innerHTML = '';

		// Add text before
		if (beforeFilter) {
			this.element.appendChild(document.createTextNode(beforeFilter));
		}

		// Add new text
		this.element.appendChild(document.createTextNode(newText));

		// Add text after
		if (afterFilter) {
			this.element.appendChild(document.createTextNode(afterFilter));
		}

		// Position cursor after new text
		this.setCursorPosition(beforeFilter.length + newText.length);

		return true;
	}

	/**
	 * Replace partial text with a chip element
	 */
	private replacePartialTextWithChip(
		context: FilterContext,
		chip: HTMLElement,
		suggestion: FilterSuggestion,
	): boolean {
		if (!this.element) return false;

		// Get the selection to find where we need to replace
		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return false;

		const _range = selection.getRangeAt(0);

		// Find the text node that contains our filter text
		// We need to replace just the filter part, not the entire content
		const walker = document.createTreeWalker(this.element, NodeFilter.SHOW_TEXT, null);

		let currentOffset = 0;
		let targetNode: Text | null = null;
		let nodeStartOffset = 0;

		// Find the text node containing our filter
		while (walker.nextNode()) {
			const node = walker.currentNode as Text;
			const nodeLength = node.textContent?.length || 0;

			if (currentOffset <= context.startIndex && currentOffset + nodeLength > context.startIndex) {
				targetNode = node;
				nodeStartOffset = context.startIndex - currentOffset;
				break;
			}
			currentOffset += nodeLength;
		}

		if (!targetNode) return false;

		// Split the text node at the filter boundaries
		const filterEndInNode = nodeStartOffset + context.fullMatch.length;

		// Split at the end of the filter first
		if (filterEndInNode < targetNode.textContent!.length) {
			targetNode.splitText(filterEndInNode);
		}

		// Split at the start of the filter
		if (nodeStartOffset > 0) {
			const filterNode = targetNode.splitText(nodeStartOffset);
			targetNode = filterNode;
		}

		// Replace the filter text node with the chip and a space
		const space = document.createTextNode(' ');
		targetNode.parentNode?.replaceChild(space, targetNode);
		space.parentNode?.insertBefore(chip, space);

		// Position cursor after the space
		const newRange = document.createRange();
		newRange.setStartAfter(space);
		newRange.collapse(true);
		selection.removeAllRanges();
		selection.addRange(newRange);

		// Track the filter (skip if it's a suggestion type)
		if (context.type !== 'suggestion') {
			const filterText = chip.getAttribute('data-filter') || '';
			const filterValue = suggestion.value;
			const filterDisplay = suggestion.display || filterValue;

			this.appliedFilters.set(filterText, {
				type: context.type as 'category' | 'date' | 'from' | 'to',
				value: filterValue,
				display: filterDisplay,
				isValid: true,
			});
		}

		return true;
	}

	/**
	 * Create a filter chip element
	 */
	private createChip(type: string, filterText: string, displayValue: string): HTMLElement {
		const chip = document.createElement('span');
		chip.className =
			'filter-chip inline-flex items-center gap-1 px-2 py-0.5 mx-1 text-sm font-medium rounded-md select-none ' +
			(type === 'category'
				? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
				: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200');
		chip.contentEditable = 'false';
		chip.setAttribute('data-filter', filterText);
		chip.setAttribute('data-filter-type', type);
		chip.innerHTML = `<span class="text-xs opacity-70">${type}:</span><span>${displayValue}</span>`;

		return chip;
	}

	/**
	 * Handle chip deletion via backspace
	 */
	handleBackspaceChipDeletion(event: KeyboardEvent): {
		deleted: boolean;
		filterText?: string;
	} {
		if (!this.element) return { deleted: false };

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return { deleted: false };

		const range = selection.getRangeAt(0);

		// Check if we're at the start of a text node right after a chip
		if (range.collapsed && range.startOffset === 0) {
			const container = range.startContainer;

			// Find the previous sibling (should be a chip)
			const previousNode = container.previousSibling;

			// If we're in a text node, check its previous sibling
			if (container.nodeType === Node.TEXT_NODE && previousNode) {
				if (previousNode.nodeType === Node.ELEMENT_NODE) {
					const element = previousNode as HTMLElement;
					if (element.classList.contains('filter-chip')) {
						event.preventDefault();
						const filterText = element.getAttribute('data-filter') || '';

						// Remove from tracking
						this.appliedFilters.delete(filterText);

						// Remove the chip
						element.remove();

						// Normalize to merge text nodes
						this.element.normalize();

						return { deleted: true, filterText };
					}
				}
			}
		}

		return { deleted: false };
	}

	/**
	 * Set cursor position at specific offset
	 */
	private setCursorPosition(offset: number) {
		if (!this.element) return;

		const selection = window.getSelection();
		if (!selection) return;

		const range = document.createRange();
		let currentOffset = 0;
		let targetNode: Node | null = null;
		let targetOffset = 0;

		// Find the text node and offset
		for (const node of this.element.childNodes) {
			if (node.nodeType === Node.TEXT_NODE) {
				const nodeLength = node.textContent?.length || 0;
				if (currentOffset + nodeLength >= offset) {
					targetNode = node;
					targetOffset = offset - currentOffset;
					break;
				}
				currentOffset += nodeLength;
			}
		}

		if (targetNode) {
			range.setStart(targetNode, targetOffset);
			range.collapse(true);
			selection.removeAllRanges();
			selection.addRange(range);
		}
	}

	/**
	 * Get current cursor position
	 */
	getCursorPosition(): number {
		if (!this.element) return 0;

		const selection = window.getSelection();
		if (!selection || selection.rangeCount === 0) return 0;

		const range = selection.getRangeAt(0);
		let offset = 0;

		// Calculate offset by walking through nodes
		for (const node of this.element.childNodes) {
			if (node === range.startContainer) {
				return offset + range.startOffset;
			}
			if (node.contains(range.startContainer)) {
				// Handle nested nodes
				return offset + range.startOffset;
			}
			if (node.nodeType === Node.TEXT_NODE) {
				offset += node.textContent?.length || 0;
			} else if ((node as HTMLElement).classList?.contains('filter-chip')) {
				const filterText = (node as HTMLElement).getAttribute('data-filter') || '';
				offset += filterText.length;
			}
		}

		return offset;
	}

	/**
	 * Get applied filters
	 */
	getAppliedFilters(): SearchFilter[] {
		return Array.from(this.appliedFilters.values());
	}

	/**
	 * Clear all content
	 */
	clear() {
		if (!this.element) return;
		this.element.innerHTML = '';
		this.appliedFilters.clear();
		this.element.focus();
	}

	/**
	 * Set text content (used for initialization)
	 */
	setText(text: string) {
		if (!this.element) return;
		this.element.textContent = text;
	}
}
