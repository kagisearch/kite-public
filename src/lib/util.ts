export function filterDefined<T extends Record<string, unknown>>(object: T): Partial<T> {
	return Object.fromEntries(
		Object.entries(object).filter(([_, v]) => v !== undefined && v !== null),
	) as Partial<T>;
}
