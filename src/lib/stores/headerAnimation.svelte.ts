/**
 * Shared state for header animation to ensure it only runs once
 */

let mobileHeaderIndex = $state(0);
let animationHasRun = $state(false);

export const headerAnimation = {
	get index() {
		return mobileHeaderIndex;
	},
	set index(value: number) {
		mobileHeaderIndex = value;
	},
	get hasRun() {
		return animationHasRun;
	},
	markAsRun() {
		animationHasRun = true;
	},
};
