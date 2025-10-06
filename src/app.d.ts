/// <reference types="@sveltejs/kit" />
import type { Writable } from 'svelte/store';

// src/app.d.ts
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session: Session | null;
		}
		interface PageData {
			session: Session | null;
			locale?: string;
			strings?: Record<string, string>;
		}
		interface PageState {}
		interface Platform {}
	}

	// For TypeScript support in the Turnstile script
	interface Window {
		turnstile: {
			render: (
				container: string | HTMLElement,
				options: {
					sitekey: string;
					callback: (token: string) => void;
					'refresh-expired'?: string;
					theme?: string;
					size?: string;
				},
			) => void;
			reset: (widgetId: string) => void;
		};
		// Image cache debug helper
		imageCache?: {
			stats: () => { cachedCount: number; downloadingCount: number; cachedImages: string[] };
			clear: () => void;
			preload: (imageUrl: string) => Promise<string>;
			getSrc: (imageUrl: string | null | undefined) => string | null;
			getProxiedUrl: (imageUrl: string) => string;
			isCached: (imageUrl: string) => boolean;
			test: (imageUrl: string) => Promise<void>;
		};
	}

	interface globalThis {
		session?: Session;
	}

	type SessionContext = Writable<Session | null>;

	interface Session {
		token: string;
		id?: string;
		loggedIn?: boolean;
		subscription: boolean;
		expiresAt: Date;
		theme?: string;
		mobileTheme?: string;
		customCss?: string;
		customCssEnabled?: boolean;
		customCssAvailable?: boolean;
		language?: string;
		accountType: string;
	}

	// Kagi API response types
	interface KagiSubscriptionResponse {
		subscription?: {
			status: string;
			account_type: string;
			billing_type: string;
			period_end: string | null;
			billing_account_id: number;
		};
		orion_subscription?: unknown | null;
	}

	interface KagiUserResponse {
		user_id: string;
		user: {
			id: number;
			theme: string | null;
			mobile_theme: string | null;
			theme_light_variety: string;
			theme_dark_variety: string;
			custom_css: string | null;
			custom_css_enabled: boolean;
			language: string | null;
		};
	}
}

// CSS module types
declare module '*.css' {
	const content: string;
	export default content;
}
