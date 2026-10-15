<script lang="ts">
import { s } from '$lib/client/localization.svelte';
import { onMount } from 'svelte';
import { fly } from 'svelte/transition';

const DISMISS_KEY = 'kite-native-app-banner-dismissed';
const IOS_STORE_URL = 'https://apps.apple.com/us/app/kagi-news/id6748314243';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kagi.news';

let isVisible = $state(false);

function shouldShowBanner(ua: string): boolean {
	// Mobile devices use native smart app banners (apple-itunes-app meta / manifest related_applications)
	if (/Android/i.test(ua)) return false;
	if (/iPhone|iPad|iPod/i.test(ua)) return false;
	if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return false;
	// Desktop only
	return true;
}

function dismiss() {
	isVisible = false;
	try {
		localStorage.setItem(DISMISS_KEY, 'true');
	} catch {
		// localStorage unavailable
	}
}

onMount(() => {
	try {
		if (localStorage.getItem(DISMISS_KEY) === 'true') return;
	} catch {
		return;
	}
	if (!shouldShowBanner(navigator.userAgent || '')) return;
	requestAnimationFrame(() => {
		setTimeout(() => {
			isVisible = true;
		}, 40);
	});
});

const B = '/native-app-banner'; // base path for assets
</script>

{#if isVisible}
	<!-- Desktop only: bottom-right, slides from right. Mobile uses native smart app banners. -->
	<aside
		class="fixed bottom-0 right-4 z-50 mb-4"
		transition:fly={{ x: 400, y: 0, duration: 350, opacity: 1 }}
	>
		<div
			class="relative rounded-[12px] border border-[#e6e6e8] bg-white px-[8px] pt-[8px] pb-0 shadow-[1px_8px_30px_rgba(0,0,0,0.09)]"
		>
			<!-- Close button -->
			<button
				type="button"
				onclick={dismiss}
				aria-label={s('nativeAppBanner.dismissLabel')}
				class="absolute top-[8px] right-[8px] z-10 flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center focus-visible:ring-2 focus-visible:ring-[#93c5fd] focus-visible:outline-none"
			>
				<svg class="h-[19px] w-[19px]" viewBox="0 0 19 19" fill="none" aria-hidden="true">
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M4.33016 4.33016C4.56203 4.09828 4.93797 4.09828 5.16984 4.33016L9.5 8.66031L13.8302 4.33016C14.062 4.09828 14.438 4.09828 14.6698 4.33016C14.9017 4.56203 14.9017 4.93797 14.6698 5.16984L10.3397 9.5L14.6698 13.8302C14.9017 14.062 14.9017 14.438 14.6698 14.6698C14.438 14.9017 14.062 14.9017 13.8302 14.6698L9.5 10.3397L5.16984 14.6698C4.93797 14.9017 4.56203 14.9017 4.33016 14.6698C4.09828 14.438 4.09828 14.062 4.33016 13.8302L8.66031 9.5L4.33016 5.16984C4.09828 4.93797 4.09828 4.56203 4.33016 4.33016Z"
						fill="#454549"
					/>
				</svg>
			</button>

			<!-- Content -->
			<div class="mx-auto w-[252px] px-[8px] pt-[8px]">
				<div class="flex flex-col gap-[16px]">
					<!-- Logotype -->
					<img
						src="{B}/kagi-news-logo.svg"
						alt="Kagi News"
						style="height: 27px; width: auto; max-width: none; display: block; align-self: flex-start;"
					/>

					<!-- Text + store badges -->
					<div class="flex flex-col gap-[16px]">
						<div>
							<p
								class="m-0 text-[16px] leading-[1.3] font-bold text-[#18181a]"
								style="font-family: Arial, sans-serif;"
							>
								{s('nativeAppBanner.title')}
							</p>
							<p
								class="m-0 text-[12px] leading-[1.6] text-[#454549]"
								style="font-family: Arial, sans-serif;"
							>
								{s('nativeAppBanner.subtitle')}
							</p>
						</div>

						<!-- Store badges -->
						<div class="flex items-center justify-between" style="width: 208px;">
							<a href={ANDROID_STORE_URL} aria-label={s('nativeAppBanner.googlePlayLabel')}>
								<img
									src="{B}/google-play-badge.svg"
									alt={s('nativeAppBanner.googlePlayLabel')}
									style="height: 29.935px; width: 100.58px; display: block; max-width: none;"
								/>
							</a>
							<a
								href={IOS_STORE_URL}
								aria-label={s('nativeAppBanner.appStoreLabel')}
								class="relative block overflow-hidden rounded-[5px]"
								style="height: 29.974px; width: 96.044px;"
							>
								<img
									src="{B}/app-store-badge-shell.svg"
									alt=""
									class="absolute inset-0 h-full w-full"
									style="max-width: none;"
								/>
								<img
									src="{B}/app-store-badge-logo.svg"
									alt=""
									class="absolute"
									style="top: 6px; left: 8px; height: 16.314px; width: 14.223px; max-width: none;"
								/>
								<img
									src="{B}/app-store-badge-download.svg"
									alt=""
									class="absolute"
									style="top: 6.3px; left: 28.6px; height: 4.763px; width: 55.51px; max-width: none;"
								/>
								<img
									src="{B}/app-store-badge-text.svg"
									alt=""
									class="absolute"
									style="top: 13.4px; left: 27.6px; height: 11.702px; width: 60.259px; max-width: none;"
								/>
							</a>
						</div>
					</div>

					<!-- Golden illustration panel: 236x260px -->
					<div
						class="relative overflow-hidden rounded-tl-[16px] rounded-tr-[16px]"
						style="width: 236px; height: 260px; background: rgba(255, 179, 25, 0.5);"
					>
						<!-- Decorative background pattern -->
						<img
							src="{B}/pattern-bg.svg"
							alt=""
							class="absolute inset-0 h-full w-full"
							style="max-width: none;"
						/>

						<!-- Doggo illustration (behind phone, clipped) -->
						<div
							class="absolute overflow-clip"
							style="left: 50%; top: 7px; transform: translateX(-50%); width: 111px; height: 95px;"
						>
							<img
								src="{B}/doggo.svg"
								alt=""
								style="display:block; width:100%; height:auto; max-width:none; pointer-events:none;"
							/>
						</div>

						<!-- Phone mockup: dark shell first, white screen on top, QR on top of screen -->
						<div
							class="absolute overflow-hidden shadow-[2.949px_23.589px_88.46px_0px_rgba(0,0,0,0.09)]"
							style="left: 21.19px; top: 101.4px; width: 185.62px; height: 371.241px;"
						>
							<!-- 1) Dark phone shell (entire phone shape) -->
							<img
								src="{B}/phone-shell.svg"
								alt=""
								style="position:absolute; inset:0 -0.01% 0 0.01%; display:block; width:100%; height:100%; max-width:none;"
							/>
							<!-- 2) Screen viewport with rounded clipping -->
							<div
								style="position:absolute; inset:1.47% 5.23% 1.47% 5.24%; overflow:hidden; border-radius:18px;"
							>
								<img
									src="{B}/phone-screen.svg"
									alt=""
									style="position:absolute; inset:0; display:block; width:100%; height:100%; max-width:none;"
								/>
								<!-- 3) QR code centered within the screen -->
								<img
									src="{B}/qr-code.svg"
									alt={s('nativeAppBanner.qrCodeAlt')}
									style="position:absolute; left:50%; transform:translateX(-50%); top:9.88px; width:139.726px; height:139.726px; max-width:none; display:block;"
								/>
							</div>
						</div>

						<!-- Sparkle decorators (same positions as translate layout) -->
						<div class="absolute" style="inset: 30.78% 9.3% 63.12% 83.99%;">
							<img
								src="{B}/sparkle-right.svg"
								alt=""
								style="display:block; width:100%; height:100%; max-width:none;"
							/>
						</div>
						<div class="absolute" style="inset: 33.87% 87.49% 61.16% 7.03%;">
							<img
								src="{B}/sparkle-left.svg"
								alt=""
								style="display:block; width:100%; height:100%; max-width:none;"
							/>
						</div>
						<div class="absolute" style="inset: 40.8% 2.43% 54.99% 92.94%;">
							<img
								src="{B}/sparkle-small.svg"
								alt=""
								style="display:block; width:100%; height:100%; max-width:none;"
							/>
						</div>
					</div>
				</div>
			</div>
		</div>
	</aside>
{/if}
