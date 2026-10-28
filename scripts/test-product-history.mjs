import {spawnSync} from 'node:child_process';
import {randomBytes,randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {loadLocalDevelopment} from '../server/localDevelopment.ts';

// No migrate/db push command: copy only the current LOCAL schema, never user data.
await loadLocalDevelopment();
let source;try{source=new URL(process.env.DATABASE_URL??'');}catch{throw Error('A valid local development connection is required; no connection values are logged.');}
if(!['postgres:','postgresql:'].includes(source.protocol)||process.env.NODE_ENV==='production'||!['localhost','127.0.0.1','[::1]'].includes(source.hostname))throw Error('Requires local development PostgreSQL; remote databases are refused.');
function run(args,options={}){
 const result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:120000,maxBuffer:20*1024*1024,...options});
 if(result.error||result.status!==0)throw Error('Disposable history test Docker step failed; no migration was executed.');
 return result.stdout.trim();
}
const listing=run(['compose','ps','--format','json']);
const rows=listing.startsWith('[')?JSON.parse(listing):listing.split(/\r?\n/).filter(Boolean).map(row=>JSON.parse(row));
const local=rows.find(row=>row.Service==='postgres'&&row.State==='running'&&row.Publishers?.some(port=>port.TargetPort===5432&&port.PublishedPort===Number(source.port||5432)&&port.URL==='127.0.0.1'));
if(!local||!/^postgres:(15|16)-alpine$/.test(local.Image))throw Error('Matching local PostgreSQL 15/16 container not found. No remote fallback.');
const schema=run(['exec','-e','PGOPTIONS=-c default_transaction_read_only=on',local.ID,'pg_dump','--schema-only','--no-owner','--no-privileges','--no-comments','-U',decodeURIComponent(source.username),'-d',decodeURIComponent(source.pathname.slice(1))]);
if(!schema.includes('ProductGrouping'))throw Error('Current local family schema required. No migration will be applied.');
const name='mp-history-'+randomUUID(),password=randomBytes(32).toString('hex');let created=false;
try{
 run(['run','--detach','--rm','--name',name,'--tmpfs','/var/lib/postgresql/data:rw,nosuid','-e','POSTGRES_PASSWORD','-e','POSTGRES_USER=mp_test','-e','POSTGRES_DB=mp_test','-p','127.0.0.1::5432',local.Image],{env:{...process.env,POSTGRES_PASSWORD:password}});created=true;
 let ready=false;for(let attempt=0;attempt<60;attempt++){const probe=spawnSync('docker',['exec',name,'pg_isready','-U','mp_test','-d','mp_test'],{windowsHide:true,stdio:'ignore'});if(probe.status===0){ready=true;break;}await pause(500);}if(!ready)throw Error('Disposable PostgreSQL did not start.');
 run(['exec','-i',name,'psql','-X','-v','ON_ERROR_STOP=1','-U','mp_test','-d','mp_test'],{input:schema.replace(/^CREATE SCHEMA public;$/m,'CREATE SCHEMA IF NOT EXISTS public;')});
 const port=run(['inspect','--format','{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}',name]);
 const clean=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('AWS_')&&!key.startsWith('S3_')&&!key.startsWith('ADMIN_BOOTSTRAP_')));
 const url=`postgresql://mp_test:${password}@127.0.0.1:${port}/mp_test`;
 const result=spawnSync(process.execPath,['--test','tests/product-history.integration.mjs'],{env:{...clean,NODE_ENV:'development',DATABASE_URL:url,DIRECT_DATABASE_URL:url,SESSION_SECRET:randomBytes(48).toString('hex'),MP_HISTORY_ISOLATED:'true',MEDIA_STORAGE:'inline',DB_TLS_MODE:'disable'},windowsHide:true,stdio:'inherit',timeout:120000});
 if(result.error||result.status!==0)throw Error('Product history integration failed.');
 console.log('History integration passed on a disposable schema copy; no migrations or source data writes.');
}finally{if(created)run(['rm','--force',name]);}
