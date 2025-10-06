import { GET as proxyGET, POST as proxyPOST, PUT as proxyPUT } from '$lib/server/proxy';

export const GET = proxyGET('/sync/read-history-changes');
export const POST = proxyPOST('/sync/read-history-changes');
export const PUT = proxyPUT('/sync/read-history-changes');