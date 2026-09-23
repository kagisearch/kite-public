import locales from '$lib/locales';
import type { RequestHandler } from './$types';
import { redirect } from '@sveltejs/kit';
import parser from 'accept-language-parser';

const IOS_STORE_URL = 'https://apps.apple.com/us/app/kagi-news/id6748314243';
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.kagi.news';

function t(key: string, locale: string): string {
	const loc = locales[locale as keyof typeof locales];
	if (loc) {
		const entry = loc[key as keyof typeof loc] as { text: string } | undefined;
		if (entry?.text) return entry.text;
	}
	const en = locales.en;
	if (en) {
		const entry = en[key as keyof typeof en] as { text: string } | undefined;
		if (entry?.text) return entry.text;
	}
	return key;
}

function detectLocale(request: Request): string {
	const parsed = parser.parse(request.headers.get('accept-language') || 'en');
	for (const { code } of parsed) {
		const mapped = code.startsWith('zh') ? 'zh' : code;
		if (locales[mapped as keyof typeof locales]) return mapped;
	}
	return 'en';
}

function escapeHtml(str: string): string {
	return str
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;');
}

export const GET: RequestHandler = ({ request, url }) => {
	const forcedPlatform = url.searchParams.get('platform');

	if (forcedPlatform === 'android') {
		throw redirect(302, ANDROID_STORE_URL);
	}

	if (forcedPlatform === 'ios') {
		throw redirect(302, IOS_STORE_URL);
	}

	const userAgent = request.headers.get('user-agent') || '';
	const isAndroid = /Android/i.test(userAgent);
	const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

	if (isAndroid) {
		throw redirect(302, ANDROID_STORE_URL);
	}

	if (isIOS) {
		throw redirect(302, IOS_STORE_URL);
	}

	const locale = detectLocale(request);
	const pageTitle = escapeHtml(t('downloadApp.pageTitle', locale));
	const heading = escapeHtml(t('downloadApp.title', locale));
	const subtitle = escapeHtml(t('downloadApp.subtitle', locale));
	const altGooglePlay = escapeHtml(t('nativeAppBanner.googlePlayLabel', locale));
	const altAppStore = escapeHtml(t('nativeAppBanner.appStoreLabel', locale));

	// Desktop/unknown UA: show a branded store choice page instead of redirecting to one platform.
	return new Response(
		`<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${pageTitle}</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      background: #f5f5f5;
      color: #18181a;
      min-height: 100dvh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #fff;
      border: 1px solid #e6e6e8;
      border-radius: 16px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.07);
      max-width: 420px;
      width: 100%;
      overflow: hidden;
    }
    .hero {
      background: rgba(255, 179, 25, 0.5);
      position: relative;
      height: 320px;
      overflow: hidden;
    }
    .hero .pattern {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      object-fit: cover;
    }
    .doggo-clip {
      position: absolute;
      left: 50%;
      top: 10px;
      transform: translateX(-50%);
      width: 130px;
      height: 110px;
      overflow: hidden;
      z-index: 1;
    }
    .doggo-clip img {
      display: block;
      width: 100%;
      height: auto;
      max-width: none;
      pointer-events: none;
    }
    .phone {
      position: absolute;
      left: 50%;
      top: 115px;
      transform: translateX(-50%);
      width: 220px;
      height: 440px;
      z-index: 2;
      overflow: hidden;
      box-shadow: 3px 24px 88px rgba(0,0,0,0.09);
    }
    .phone .shell {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
    }
    .phone .screen {
      position: absolute;
      inset: 1.47% 5.23% 1.47% 5.24%;
      overflow: hidden;
      border-radius: 22px;
    }
    .phone .screen-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
    }
    .phone .qr {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      top: 12px;
      width: 170px;
      height: 170px;
      max-width: none;
    }
    .sparkle {
      position: absolute;
      z-index: 3;
      pointer-events: none;
    }
    .content {
      padding: 28px 28px 32px;
      text-align: center;
    }
    .logo {
      display: flex;
      justify-content: center;
      margin-bottom: 20px;
    }
    .logo img { height: 27px; width: auto; }
    h1 {
      font-size: 22px;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 14px;
      color: #707077;
      line-height: 1.5;
      margin-bottom: 28px;
    }
    .badges {
      display: flex;
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .badge {
      display: block;
      transition: opacity 0.15s;
      border-radius: 8px;
    }
    .badge:hover { opacity: 0.8; }
    .badge img { height: 44px; display: block; border-radius: 8px; }
    /* App Store composite badge */
    .app-store-badge {
      position: relative;
      width: 141px;
      height: 44px;
      display: block;
      border-radius: 8px;
      transition: opacity 0.15s;
    }
    .app-store-badge:hover { opacity: 0.8; }
    .app-store-badge img { position: absolute; max-width: none; }
    .app-store-badge .asb-shell { inset: 0; width: 100%; height: 100%; }
    .app-store-badge .asb-logo { top: 8.8px; left: 11.7px; width: 20.9px; height: 24px; }
    .app-store-badge .asb-dl { top: 9.2px; left: 42px; width: 81.5px; height: 7px; }
    .app-store-badge .asb-text { top: 19.7px; left: 40.5px; width: 88.5px; height: 17.2px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="hero">
      <img class="pattern" src="/native-app-banner/pattern-bg.svg" alt="" />
      <div class="doggo-clip">
        <img src="/native-app-banner/doggo.svg" alt="" />
      </div>
      <div class="phone">
        <img class="shell" src="/native-app-banner/phone-shell.svg" alt="" />
        <div class="screen">
          <img class="screen-bg" src="/native-app-banner/phone-screen.svg" alt="" />
          <img class="qr" src="/native-app-banner/qr-code.svg" alt="QR code to download Kagi News" />
        </div>
      </div>
      <img class="sparkle" src="/native-app-banner/sparkle-right.svg" alt="" style="top: 30%; right: 9%; width: 16px; height: 16px;" />
      <img class="sparkle" src="/native-app-banner/sparkle-left.svg" alt="" style="top: 34%; left: 7%; width: 13px; height: 13px;" />
      <img class="sparkle" src="/native-app-banner/sparkle-small.svg" alt="" style="top: 41%; right: 3%; width: 11px; height: 11px;" />
    </div>
    <div class="content">
      <div class="logo">
        <img src="/native-app-banner/kagi-news-logo.svg" alt="Kagi News" />
      </div>
      <h1>${heading}</h1>
      <p class="subtitle">${subtitle}</p>
      <div class="badges">
        <a class="badge" href="${ANDROID_STORE_URL}" aria-label="${altGooglePlay}">
          <img src="/native-app-banner/google-play-badge.svg" alt="${altGooglePlay}" style="height: 44px; width: 148px;" />
        </a>
        <a class="app-store-badge" href="${IOS_STORE_URL}" aria-label="${altAppStore}">
          <img class="asb-shell" src="/native-app-banner/app-store-badge-shell.svg" alt="" />
          <img class="asb-logo" src="/native-app-banner/app-store-badge-logo.svg" alt="" />
          <img class="asb-dl" src="/native-app-banner/app-store-badge-download.svg" alt="" />
          <img class="asb-text" src="/native-app-banner/app-store-badge-text.svg" alt="" />
        </a>
      </div>
    </div>
  </div>
</body>
</html>`,
		{
			headers: {
				'content-type': 'text/html; charset=utf-8',
			},
		},
	);
};
