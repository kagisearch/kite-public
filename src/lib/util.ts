export function filterDefined(object: any) {
	return Object.fromEntries(
		Object.entries(object).filter(([_, v]) => v !== undefined && v !== null)
	);
}
