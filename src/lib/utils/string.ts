/**
 * Convert a string to camelCase
 * @param str - The string to convert
 * @returns The camelCase version of the string
 */
export function toCamelCase(str: string): string {
	return str
		.split(' ')
		.map((word, index) => {
			if (index === 0) return word.toLowerCase();
			return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
		})
		.join('');
}
