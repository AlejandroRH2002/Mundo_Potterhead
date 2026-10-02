/** Check before loading mocks or opening a connection. No URLs in errors. */
export function assertLocalSeed(env:NodeJS.ProcessEnv){
 if(env.NODE_ENV==='production')throw new Error('Development seed disabled in production.');
 let url:URL;try{url=new URL(env.DATABASE_URL??'');}catch{throw new Error('Seed requires a local DATABASE_URL.');}
 if(!['postgres:','postgresql:'].includes(url.protocol)||!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw new Error('Seed requires a loopback DATABASE_URL; remote databases are rejected.');
}
