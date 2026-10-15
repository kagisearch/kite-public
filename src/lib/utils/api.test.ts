import { clampQueryInt, removeNullFields } from './api';
import { describe, expect, it } from 'vitest';

describe('clampQueryInt', () => {
	it('returns the default when input is null', () => {
		expect(clampQueryInt(null, 12, 1, 100)).toBe(12);
	});

	it('returns the default when input is empty string', () => {
		expect(clampQueryInt('', 12, 1, 100)).toBe(12);
	});

	it('returns the default when input is non-numeric (NaN guard)', () => {
		expect(clampQueryInt('abc', 12, 1, 100)).toBe(12);
		expect(clampQueryInt('   ', 12, 1, 100)).toBe(12);
	});

	it('clamps to the lower bound', () => {
		expect(clampQueryInt('-5', 12, 1, 100)).toBe(1);
		expect(clampQueryInt('0', 12, 1, 100)).toBe(1);
	});

	it('clamps to the upper bound', () => {
		expect(clampQueryInt('500', 12, 1, 100)).toBe(100);
	});

	it('returns the parsed value when in range', () => {
		expect(clampQueryInt('25', 12, 1, 100)).toBe(25);
	});

	it('allows zero when min is zero (offset use case)', () => {
		expect(clampQueryInt('0', 0, 0, Number.MAX_SAFE_INTEGER)).toBe(0);
	});

	it('handles leading numeric junk via parseInt', () => {
		expect(clampQueryInt('12abc', 50, 1, 100)).toBe(12);
	});
});

describe('removeNullFields', () => {
	it('drops null and undefined keys', () => {
		expect(removeNullFields({ a: 1, b: null, c: undefined })).toEqual({ a: 1 });
	});

	it('recurses into nested objects', () => {
		expect(removeNullFields({ a: { b: null, c: 2 } })).toEqual({ a: { c: 2 } });
	});

	it('filters null entries out of arrays', () => {
		expect(removeNullFields({ items: [1, null, 2] })).toEqual({ items: [1, 2] });
	});

	it('drops empty objects that result from recursive cleaning', () => {
		expect(removeNullFields({ items: [{ a: null }, { b: 1 }] })).toEqual({ items: [{ b: 1 }] });
	});

	it('returns primitives unchanged', () => {
		expect(removeNullFields('hello')).toBe('hello');
		expect(removeNullFields(42)).toBe(42);
	});
});
