import { GET as proxyGET, POST as proxyPOST, DELETE as proxyDELETE } from '$lib/server/proxy';

export const GET = proxyGET('/sync/read-history');
export const POST = proxyPOST('/sync/read-history');
export const DELETE = proxyDELETE('/sync/read-history');