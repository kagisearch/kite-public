/**
 * Service for real-time batch notifications via Server-Sent Events (SSE)
 * Connects to /api/sse/batches to receive notifications when new batches are available
 */

import { browser } from '$app/environment';

export type BatchNotification = {
	type: 'new_batch';
	batchId: string;
};

type NotificationCallback = (notification: BatchNotification) => void;

class BatchNotificationService {
	private eventSource: EventSource | null = null;
	private callbacks: Set<NotificationCallback> = new Set();
	private reconnectAttempts = 0;
	private maxReconnectAttempts = 5;
	private reconnectDelay = 5000; // 5 seconds
	private isConnecting = false;

	/**
	 * Connect to SSE endpoint and start listening for batch notifications
	 */
	connect(): void {
		if (!browser) return;

		// Don't reconnect if already connected or connecting
		if (this.eventSource?.readyState === EventSource.OPEN || this.isConnecting) {
			return;
		}

		this.isConnecting = true;

		try {
			this.eventSource = new EventSource('/api/sse/batches');

			this.eventSource.onopen = () => {
				console.log('[BatchNotification] SSE connection established');
				this.reconnectAttempts = 0;
				this.isConnecting = false;
			};

			this.eventSource.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data);

					// Handle different message types
					if (data.type === 'connected') {
						console.log('[BatchNotification] Connected to batch notification service');
					} else if (data.type === 'new_batch') {
						console.log('[BatchNotification] New batch available:', data.batchId);
						this.notifyCallbacks(data);
					}
				} catch (error) {
					console.error('[BatchNotification] Failed to parse SSE message:', error);
				}
			};

			this.eventSource.onerror = (error) => {
				console.error('[BatchNotification] SSE connection error:', error);
				this.isConnecting = false;

				// Close the connection
				this.eventSource?.close();
				this.eventSource = null;

				// Attempt to reconnect with exponential backoff
				if (this.reconnectAttempts < this.maxReconnectAttempts) {
					this.reconnectAttempts++;
					const delay = this.reconnectDelay * this.reconnectAttempts;
					console.log(
						`[BatchNotification] Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
					);

					setTimeout(() => {
						this.connect();
					}, delay);
				} else {
					console.warn('[BatchNotification] Max reconnection attempts reached, giving up');
				}
			};
		} catch (error) {
			console.error('[BatchNotification] Failed to create SSE connection:', error);
			this.isConnecting = false;
		}
	}

	/**
	 * Disconnect from SSE endpoint
	 */
	disconnect(): void {
		if (this.eventSource) {
			console.log('[BatchNotification] Disconnecting from SSE');
			this.eventSource.close();
			this.eventSource = null;
		}
		this.reconnectAttempts = 0;
		this.isConnecting = false;
	}

	/**
	 * Subscribe to batch notifications
	 * Returns an unsubscribe function
	 */
	subscribe(callback: NotificationCallback): () => void {
		this.callbacks.add(callback);

		// Auto-connect when first subscriber is added
		if (this.callbacks.size === 1) {
			this.connect();
		}

		// Return unsubscribe function
		return () => {
			this.callbacks.delete(callback);

			// Disconnect when last subscriber is removed
			if (this.callbacks.size === 0) {
				this.disconnect();
			}
		};
	}

	/**
	 * Notify all subscribers
	 */
	private notifyCallbacks(notification: BatchNotification): void {
		for (const callback of this.callbacks) {
			try {
				callback(notification);
			} catch (error) {
				console.error('[BatchNotification] Error in notification callback:', error);
			}
		}
	}

	/**
	 * Get connection status
	 */
	getStatus():
		| 'disconnected'
		| 'connecting'
		| 'connected'
		| 'reconnecting'
		| 'failed'
		| 'unknown' {
		if (!this.eventSource) {
			return this.isConnecting ? 'connecting' : 'disconnected';
		}

		switch (this.eventSource.readyState) {
			case EventSource.CONNECTING:
				return this.reconnectAttempts > 0 ? 'reconnecting' : 'connecting';
			case EventSource.OPEN:
				return 'connected';
			case EventSource.CLOSED:
				return this.reconnectAttempts >= this.maxReconnectAttempts ? 'failed' : 'disconnected';
			default:
				return 'unknown';
		}
	}
}

// Export singleton instance
export const batchNotificationService = new BatchNotificationService();