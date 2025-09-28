import { redirect } from '@sveltejs/kit';
import { resolve } from '$app/paths';
import type { RouteParams } from '$app/types';
import { building } from '$app/environment';

export const prerender = true;

export function load() {
  // Only redirect when we are prerendering the static preview build
  if (building) {
    throw redirect(307, resolve('/latest', {} as RouteParams<'/latest'>));
  }
  return {};
}


