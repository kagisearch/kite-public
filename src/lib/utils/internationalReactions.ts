/**
 * International reactions normalization.
 *
 * The canonical data shape for `story.international_reactions` is a list of
 * strings formatted as `"{flag} {entity}: {response}"` (see the backend
 * `_parse_json_international_reactions`). However, some persisted/served data
 * carries object-shaped items instead (e.g. `{ country_flag, text }` — a shape
 * no current backend code produces, leaked from an LLM/legacy path). The
 * downstream rendering assumes strings and calls string methods like
 * `.endsWith()`, so an object item throws `endsWith is not a function` mid
 * render and freezes the UI.
 *
 * These helpers coerce either shape into the canonical string so rendering and
 * citation extraction stay robust regardless of where the data came from.
 */

export type InternationalReactionInput =
	| string
	| {
			country_flag?: string | null;
			flag?: string | null;
			entity?: string | null;
			country?: string | null;
			name?: string | null;
			text?: string | null;
			response?: string | null;
			reaction?: string | null;
			content?: string | null;
	  }
	| null
	| undefined;

function asTrimmedString(value: unknown): string {
	return typeof value === 'string' ? value.trim() : '';
}

/**
 * Coerce a single reaction (string or object) into the canonical
 * `"{flag} {entity}: {response}"` string. Returns '' for unusable input.
 */
export function normalizeInternationalReaction(reaction: InternationalReactionInput): string {
	if (typeof reaction === 'string') return reaction;
	if (reaction && typeof reaction === 'object') {
		const flag = asTrimmedString(reaction.country_flag) || asTrimmedString(reaction.flag);
		const entity =
			asTrimmedString(reaction.entity) ||
			asTrimmedString(reaction.country) ||
			asTrimmedString(reaction.name);
		const text =
			asTrimmedString(reaction.text) ||
			asTrimmedString(reaction.response) ||
			asTrimmedString(reaction.reaction) ||
			asTrimmedString(reaction.content);

		const head = [flag, entity].filter(Boolean).join(' ').trim();
		if (head && text) return `${head}: ${text}`;
		return head || text;
	}
	return '';
}

/**
 * Coerce a reactions array (possibly containing object items) into a clean
 * string array, dropping empty entries.
 */
export function normalizeInternationalReactions(
	reactions: InternationalReactionInput[] | null | undefined,
): string[] {
	if (!Array.isArray(reactions)) return [];
	return reactions.map(normalizeInternationalReaction).filter((reaction) => reaction.length > 0);
}
