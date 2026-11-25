import { GET as proxyGET } from '$lib/server/proxy';

export const GET = proxyGET('/sse/translate/[clusterId]');