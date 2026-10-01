import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readConfig, configurationWarnings } from '../server/config.ts';
import { databaseUrl } from '../server/database.ts';
const env={ NODE_ENV:'production', DATABASE_URL:'postgresql://db.test.invalid/test', SESSION_SECRET:'test-secret-with-at-least-32-characters', APP_ORIGIN:'https://shop.test.invalid' };
test('configuration errors name required fields without printing private values', () => {
  for (const field of ['DATABASE_URL','SESSION_SECRET','APP_ORIGIN']) assert.throws(()=>readConfig({...env,[field]:undefined}),new RegExp(field));
  assert.throws(()=>readConfig({...env,SESSION_SECRET:'short'}),/SESSION_SECRET/);
  assert.throws(()=>readConfig({...env,APP_ORIGIN:'http://localhost:5173'}),/APP_ORIGIN.*HTTPS/);
  assert.throws(()=>readConfig({...env,DATABASE_URL:'secret-invalid-value'}),error=>error.message.includes('DATABASE_URL') && !error.message.includes('secret-invalid-value'));
  assert.throws(()=>databaseUrl(env,true),/DIRECT_DATABASE_URL/);
  assert.throws(()=>readConfig({...env,NODE_ENV:'development',APP_ORIGIN:'http://localhost:5173',COOKIE_SAME_SITE:'None'}),/COOKIE_SAME_SITE.*Secure/);
});
test('proxy trust and public registration generate explicit startup warnings', () => {
  assert.deepEqual(configurationWarnings({trustProxy:false,registrationEnabled:false}),[]);
  const warnings=configurationWarnings({trustProxy:true,registrationEnabled:true}); assert.equal(warnings.length,2);
  assert.match(warnings[0],/TRUST_PROXY/); assert.match(warnings[1],/REGISTRATION_ENABLED/);
});
