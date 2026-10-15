/**
 * Contested territories (Natural Earth breakaway/disputed areas).
 *
 * The globe's countries dataset follows de facto control, so Crimea sits in
 * Russia and the whole country lit up for a Simferopol story (KNEWS-451).
 * Locations here highlight the territory instead, so no country is implied.
 * Doesn't cover Taiwan, which is a full country in that dataset.
 */
import disputedAreasData from '$lib/data/disputedAreas.json';

/** One contested territory. Rings are [outer, ...holes] of [lng, lat] pairs. */
export interface DisputedArea {
	name: string;
	type: string;
	polygons: number[][][][];
}

export const disputedAreas = disputedAreasData.areas as DisputedArea[];

function pointInRing(lng: number, lat: number, ring: number[][]): boolean {
	let inside = false;
	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const [xi, yi] = ring[i];
		const [xj, yj] = ring[j];
		if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
			inside = !inside;
		}
	}
	return inside;
}

/** First match wins; overlapping claims (Kashmir) all resolve the same way. */
export function findDisputedArea(lat: number, lng: number): DisputedArea | null {
	for (const area of disputedAreas) {
		for (const polygon of area.polygons) {
			const [outer, ...holes] = polygon;
			if (pointInRing(lng, lat, outer) && !holes.some((hole) => pointInRing(lng, lat, hole))) {
				return area;
			}
		}
	}
	return null;
}
