import { GET as proxyGET, POST as proxyPOST } from '$lib/server/proxy';

export const GET = proxyGET('/sync');
export const POST = proxyPOST('/sync');