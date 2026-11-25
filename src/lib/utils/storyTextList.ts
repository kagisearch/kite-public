/**
 * Story bullet-list normalization.
 *
 * Several story fields are rendered as lists of plain strings but are declared in
 * the backend as lists of objects — `travel_advisory` is `list[TravelAdvisory]`,
 * `technical_details` is `list[TechnicalDetail]`, and so on. The backend's
 * `story_builder._parse_json_*` helpers flatten each object into a canonical
 * string, but that only happens on the JSON-parsing path: object-shaped items
 * still reach the client from other paths and from rows already persisted in the
 * database, which time travel keeps serving indefinitely.
 *
 * An object item breaks rendering two ways: interpolated directly it prints
 * `[object Object]`, and passed to citation processing it throws when string
 * methods are called on it, which takes the page down mid-render (KNEWS-434).
 *
 * These helpers coerce any item into the same string the backend would have
 * produced, so the list sections render identically wherever the data came from.
 */

/**
 * Leading key of a `"{head}: {body}"` pair, in the order the backend models
 * declare them. `category` first so travel advisories keep their shape.
 */
const HEAD_KEYS = [
	'category',
	'heading',
	'aspect',
	'area',
	'task',
	'entity',
	'country',
	'name',
	'title',
	'label',
	'term',
];

/**
 * The backend's `_parse_json_*` helpers upper-case the leading label for these
 * keys, but deliberately leave travel advisory `category` and reaction `entity`
 * as the model wrote them. Matching that keeps client-flattened text identical
 * to server-flattened text.
 */
const CAPITALIZED_HEAD_KEYS = new Set([
	'heading',
	'aspect',
	'area',
	'task',
	'name',
	'title',
	'label',
	'term',
]);

/** Trailing key of the pair. */
const BODY_KEYS = [
	'information',
	'description',
	'response',
	'value',
	'howto',
	'reaction',
	'detail',
	'text',
	'content',
];

/** Appended as its own sentence. Only travel advisories carry one today. */
const TAIL_KEYS = ['action'];

function asTrimmedString(value: unknown): string {
	if (typeof value === 'string') return value.trim();
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return '';
}

/** First key holding readable text, with its value. */
function firstPresent(source: Record<string, unknown>, keys: string[]): [string, string] {
	for (const key of keys) {
		const value = asTrimmedString(source[key]);
		if (value) return [key, value];
	}
	return ['', ''];
}

/**
 * Coerce a single list item into its canonical string.
 *
 * Mirrors the backend flattening so the text matches regardless of path:
 * `{name}: {description}`, `{aspect}: {description}`, `{name}: {value}`,
 * `{area}: {description}`, `{task}: {howto}`, and for travel advisories
 * `{category}: {information}. {action}`.
 *
 * Unrecognised objects fall back to joining their string values, so an
 * unexpected shape still renders as readable text rather than `[object Object]`.
 */
export function normalizeStoryTextItem(item: unknown): string {
	if (typeof item === 'string') return item;
	if (item === null || item === undefined) return '';
	if (typeof item === 'number' || typeof item === 'boolean') return String(item);
	if (Array.isArray(item)) {
		return item.map(normalizeStoryTextItem).filter(Boolean).join(' ');
	}
	if (typeof item !== 'object') return '';

	const source = item as Record<string, unknown>;
	const [headKey, rawHead] = firstPresent(source, HEAD_KEYS);
	const [, body] = firstPresent(source, BODY_KEYS);
	const [, tail] = firstPresent(source, TAIL_KEYS);

	const head =
		rawHead && CAPITALIZED_HEAD_KEYS.has(headKey)
			? rawHead.charAt(0).toUpperCase() + rawHead.slice(1)
			: rawHead;

	let text = head && body ? `${head}: ${body}` : head || body;

	if (!text) {
		// Unknown shape: keep whatever readable content it has.
		text = Object.values(source).map(asTrimmedString).filter(Boolean).join(': ');
	}

	if (tail && tail !== text) {
		text = text ? `${text.replace(/\.\s*$/, '')}. ${tail}` : tail;
	}

	return text;
}

/**
 * Coerce a list of items into clean strings, dropping anything that normalizes
 * to nothing so empty bullets are never rendered.
 */
export function normalizeStoryTextList(items: unknown): string[] {
	if (!Array.isArray(items)) return [];
	return items.map(normalizeStoryTextItem).filter((item) => item.length > 0);
}

/**
 * Story fields that are served as lists of strings but whose backend models
 * declare lists of objects, so the served payload can carry either shape.
 */
export const STORY_TEXT_LIST_FIELDS = [
	'talking_points',
	'key_players',
	'technical_details',
	'business_angle_points',
	'user_action_items',
	'scientific_significance',
	'travel_advisory',
	'performance_statistics',
	'gameplay_mechanics',
	'industry_impact',
	'technical_specifications',
	'user_experience_impact',
] as const;

/**
 * Normalize every list-of-strings field on a story in place-safe fashion.
 *
 * Applied where stories are read out of storage so that *every* consumer — the
 * web client and the native apps, on live and on time-travelled batches — gets
 * strings, rather than each of them having to defend itself. Object items only
 * exist because the summarization models declare these fields as lists of
 * objects; rows already written that way cannot be fixed at generation time.
 *
 * `international_reactions` keeps its own normalizer, which knows to rebuild the
 * `"{flag} {entity}: {response}"` form.
 */
export function normalizeStoryTextListFields<T extends object>(story: T): T {
	const record = story as Record<string, unknown>;
	for (const field of STORY_TEXT_LIST_FIELDS) {
		const value = record[field];
		if (Array.isArray(value) && value.some((item) => typeof item !== 'string')) {
			record[field] = normalizeStoryTextList(value);
		}
	}
	return story;
}
