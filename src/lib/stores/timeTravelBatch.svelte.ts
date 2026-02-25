/**
 * Store for tracking the current batch ID and metadata
 *
 * When viewing the LATEST batch:
 *   - batchId and batchCreatedAt MAY be set (for URL generation with batch codes)
 *   - isHistoricalBatch is FALSE
 *
 * When viewing a HISTORICAL batch (time travel):
 *   - batchId and batchCreatedAt are set
 *   - isHistoricalBatch is TRUE
 *
 * The isHistoricalBatch flag is the source of truth for time travel mode.
 * The entrySource flag tracks how time travel was initiated ('url' or 'modal').
 */
class TimeTravelBatchStore {
	batchId = $state<string | null>(null);
	batchCreatedAt = $state<string | null>(null);
	batchDateSlug = $state<string | null>(null);
	isHistoricalBatch = $state<boolean>(false);
	entrySource = $state<'url' | 'modal' | null>(null);

	/**
	 * Set batch information
	 * @param id - Batch UUID
	 * @param createdAt - Batch creation timestamp
	 * @param dateSlug - Batch date slug (YYYY-MM-DD.N)
	 * @param isHistorical - True if this is a historical batch (time travel), false for latest
	 * @param entrySource - How time travel was initiated ('url' or 'modal'). Only set when explicitly passed.
	 */
	set(
		id: string | null,
		createdAt?: string | null,
		dateSlug?: string | null,
		isHistorical: boolean = false,
		entrySource?: 'url' | 'modal' | null,
	) {
		this.batchId = id;
		this.batchCreatedAt = createdAt || null;
		this.batchDateSlug = dateSlug || null;
		this.isHistoricalBatch = isHistorical;
		if (entrySource !== undefined) {
			this.entrySource = entrySource;
		}
		console.log(
			`⏰ Batch ${id ? 'set to' : 'cleared'}: ${id}, createdAt: ${createdAt}, dateSlug: ${dateSlug}, isHistorical: ${isHistorical}, entrySource: ${this.entrySource}`,
		);
	}

	get() {
		return this.batchId;
	}

	getCreatedAt() {
		return this.batchCreatedAt;
	}

	getDateSlug() {
		return this.batchDateSlug;
	}

	getBatchData() {
		return {
			batchId: this.batchId,
			batchCreatedAt: this.batchCreatedAt,
			batchDateSlug: this.batchDateSlug,
		};
	}

	/**
	 * Returns true if currently viewing a historical batch (time travel mode).
	 * This is the source of truth - do not rely on batchId being set/unset.
	 */
	isTimeTravelMode() {
		return this.isHistoricalBatch;
	}

	/**
	 * Clear all batch information and exit time travel mode
	 */
	clear() {
		this.batchId = null;
		this.batchCreatedAt = null;
		this.batchDateSlug = null;
		this.isHistoricalBatch = false;
		this.entrySource = null;
		console.log('⏰ Batch cleared - exiting time travel mode');
	}
}

export const timeTravelBatch = new TimeTravelBatchStore();
