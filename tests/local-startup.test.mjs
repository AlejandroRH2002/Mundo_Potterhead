import test from 'node:test';
import assert from 'node:assert/strict';
import {localPortOverride} from '../server/localDevelopment.ts';
import {startupDiagnostic} from '../server/lib/startupDiagnostic.ts';
test('local port alignment preserves identity and never redirects production or remote DB',()=>{
 const env={DATABASE_URL:'postgresql://fixture:fixture@localhost:5432/fixture'};
 const publication={port:15432,user:'fixture',password:'fixture',database:'fixture'};
 assert.equal(new URL(localPortOverride(env,publication)).port,'15432');
 assert.equal(localPortOverride({...env,NODE_ENV:'production'},publication),undefined);
 assert.equal(localPortOverride({DATABASE_URL:env.DATABASE_URL.replace('localhost','remote.invalid')},publication),undefined);
 assert.equal(localPortOverride(env,{...publication,database:'different'}),undefined);
 assert.equal(localPortOverride(env,{...publication,password:'different'}),undefined);
 assert.equal(localPortOverride(env,{...publication,port:5432}),undefined);
});
test('startup diagnostics expose allowlisted codes, never private error messages',()=>{
 for(const code of ['P1000','P1001','P1002','P2024','P2021','P2022','P1010','EADDRINUSE','EACCES','unknown']){
  const output=startupDiagnostic({code,message:'PRIVATE_DATABASE_CONNECTION'});
  assert.equal(JSON.stringify(output).includes('PRIVATE_DATABASE_CONNECTION'),false);
  assert.ok(output.code); assert.ok(output.reason);
 }
});
