import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deploymentOrigin, loginCookieAttributes, runSmoke } from '../scripts/smoke-lib.mjs';
test('smoke performs only anonymous GETs and leaves SPA/login evidence pending', async () => {
  const calls=[];
  const request=async (url,options)=> { calls.push({url,options}); const path=new URL(url).pathname;
    if(path==='/health/ready') return Response.json({status:'ok'});
    if(path==='/api/admin/users') return Response.json({message:'unauthorized'},{status:401});
    return new Response('<html></html>',{headers:{'Content-Type':'text/html'}});
  };
  const result=await runSmoke({url:'https://shop.test.invalid',apiUrl:'https://api.test.invalid'},request);
  assert.equal(result.exitCode,2); assert.equal(result.checks.filter(check=>check.status==='pass').length,3);
  assert.ok(calls.every(call=>call.options.method==='GET' && call.options.credentials==='omit' && !call.options.body));
  assert.equal(calls.length,4);
});
test('smoke fails for exposed admin API and rejects SPA fallback as health', async () => {
  const result=await runSmoke({url:'https://shop.test.invalid'},async()=>new Response('<html></html>',{headers:{'Content-Type':'text/html'}}));
  assert.equal(result.exitCode,1); assert.equal(result.checks[0].status,'fail'); assert.equal(result.checks[2].status,'fail');
  for(const value of ['http://shop.test.invalid','https://user:pass@shop.test.invalid','https://shop.test.invalid/?secret=x']) assert.throws(()=>deploymentOrigin(value));
});
test('cookie verifier rejects missing attributes, Domain and a missing Host prefix', () => {
  const valid='__Host-mp_session=test; Path=/; Secure; HttpOnly; SameSite=Strict';
  assert.equal(loginCookieAttributes(valid),true);
  for(const value of [valid.replace('; Secure',''),valid.replace('; HttpOnly',''),valid.replace('__Host-',''),valid+'; Domain=shop.test.invalid']) assert.equal(loginCookieAttributes(value),false);
});

test('Pages smoke checks proxied health by default and always checks proxied admin',async()=>{
 for(const apiUrl of [undefined,'https://api.test.invalid']){const calls=[];const result=await runSmoke({url:'https://shop.pages.dev',apiUrl},async url=>{calls.push(url);if(url.includes('/health/ready'))return Response.json({status:'ok'});if(url.endsWith('/api/admin/users'))return Response.json({message:'unauthorized'},{status:401});return new Response('<html/>',{headers:{'Content-Type':'text/html'}});});assert.equal(result.exitCode,2);assert.equal(calls[0],apiUrl?apiUrl+'/health/ready':'https://shop.pages.dev/api/health/ready');assert.ok(calls.includes('https://shop.pages.dev/api/admin/users'));}
});
