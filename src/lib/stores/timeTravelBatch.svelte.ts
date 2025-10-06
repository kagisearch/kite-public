/**
 * Store for tracking the current time travel batch ID
 */
class TimeTravelBatchStore {
	batchId = $state<string | null>(null);

	set(id: string | null) {
		this.batchId = id;
		console.log(`⏰ Time travel batch ${id ? 'set to' : 'cleared'}: ${id}`);
	}

	get() {
		return this.batchId;
	}

	isTimeTravelMode() {
		return this.batchId !== null;
	}
}

export const timeTravelBatch = new TimeTravelBatchStore();
