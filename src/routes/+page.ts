import { redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { building } from '$app/environment';

export const prerender = true;

export function load() {
  // Only redirect when we are prerendering the static preview build
  if (building) {
    throw redirect(307, `${base}/latest`);
  }
  return {};
}


