import { proxyApi, type ProxyEnv } from '../../shared/pagesProxy.ts';
export function onRequest(context:{request:Request;env:ProxyEnv}){return proxyApi(context.request,context.env);}
