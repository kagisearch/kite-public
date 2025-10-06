/**
 * Time travel store for managing historical news data navigation
 */

interface TimeTravelState {
	isOpen: boolean;
	selectedDate: Date | null;
	selectedBatchId: string | null;
}

class TimeTravelStore {
	private state = $state<TimeTravelState>({
		isOpen: false,
		selectedDate: null,
		selectedBatchId: null,
	});

	get isOpen() {
		return this.state.isOpen;
	}

	get selectedDate() {
		return this.state.selectedDate;
	}

	get selectedBatchId() {
		return this.state.selectedBatchId;
	}

	open() {
		this.state.isOpen = true;
	}

	close() {
		this.state.isOpen = false;
	}

	toggle() {
		this.state.isOpen = !this.state.isOpen;
	}

	selectDate(date: Date) {
		this.state.selectedDate = date;
	}

	selectBatch(batchId: string) {
		this.state.selectedBatchId = batchId;
	}

	reset() {
		this.state.selectedDate = null;
		this.state.selectedBatchId = null;
	}
}

export const timeTravel = new TimeTravelStore();
