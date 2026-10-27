import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createConnection } from 'node:net';

export interface LocalPublication { port:number; user:string; password:string; database:string }
const loopback = (host:string) => ['localhost','127.0.0.1','[::1]'].includes(host);
export function localPortOverride(env:NodeJS.ProcessEnv, publication:LocalPublication):string|undefined {
 if(env.NODE_ENV==='production')return;
 let url:URL;try{url=new URL(env.DATABASE_URL??'');}catch{return;}
 if(!loopback(url.hostname)||!Number.isInteger(publication.port)||publication.port<1||publication.port>65535)return;
 // Never redirect a connection to a different account/database or service.
 if(decodeURIComponent(url.username)!==publication.user||decodeURIComponent(url.password)!==publication.password||decodeURIComponent(url.pathname.slice(1))!==publication.database)return;
 if(Number(url.port||5432)===publication.port)return;
 url.hostname='127.0.0.1';url.port=String(publication.port);return url.href;
}
async function reachable(url:URL):Promise<boolean>{return new Promise(resolve=>{
 const socket=createConnection({host:url.hostname==='[::1]'?'::1':url.hostname,port:Number(url.port||5432)});
 const finish=(value:boolean)=>{socket.destroy();resolve(value);};socket.setTimeout(500);socket.once('connect',()=>finish(true));socket.once('error',()=>finish(false));socket.once('timeout',()=>finish(false));
});}
function composePublication():LocalPublication|undefined {
 try {
  const raw=execFileSync('docker',['compose','ps','--format','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:4000}).trim();
  const rows=raw.startsWith('[')?JSON.parse(raw):raw.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  const row=rows.find((entry:{Service?:string;State?:string})=>entry.Service==='postgres'&&entry.State==='running');
  const published=row?.Publishers?.find((entry:{URL:string;TargetPort:number;PublishedPort:number})=>entry.URL==='127.0.0.1'&&entry.TargetPort===5432&&entry.PublishedPort>0);
  if(!row||!published)return;
  const container=JSON.parse(execFileSync('docker',['inspect',row.ID],{encoding:'utf8',stdio:['ignore','pipe','ignore'],timeout:4000}))[0];
  if(!container.Mounts?.some((mount:{Type:string;Destination:string})=>mount.Type==='volume'&&mount.Destination==='/var/lib/postgresql/data'))return;
  const vars=Object.fromEntries((container.Config.Env as string[]).map(value=>{const at=value.indexOf('=');return [value.slice(0,at),value.slice(at+1)];}));
  return {port:published.PublishedPort,user:vars.POSTGRES_USER??'postgres',password:vars.POSTGRES_PASSWORD??'',database:vars.POSTGRES_DB??vars.POSTGRES_USER??'postgres'};
 }catch{return;}
}
export async function loadLocalDevelopment(env:NodeJS.ProcessEnv=process.env):Promise<boolean> {
 if(env.NODE_ENV==='production')return false;
 if(env===process.env&&existsSync('.env'))process.loadEnvFile('.env');
 if(env.NODE_ENV==='production')return false;
 let url:URL;try{url=new URL(env.DATABASE_URL??'');}catch{return false;}
 if(!loopback(url.hostname)||await reachable(url))return false;
 const publication=composePublication();if(!publication)return false;
 const corrected=localPortOverride(env,publication);if(!corrected)return false;
 env.DATABASE_URL=corrected;return true;
}
