import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {createServer as createViteServer} from 'vite';
import {detailFixture,relatedFixtures} from '../tests/fixtures/productDetail.mjs';

// Uses an already installed browser. No downloads, database, R2 or production API.
const browserIndex=process.argv.indexOf('--browser');
const executable=browserIndex>=0?process.argv[browserIndex+1]:process.env.MP_BROWSER_PATH;
if(!executable)throw Error('Provide an installed Chrome/Edge executable: pnpm test:product-ui -- --browser <path>');
const toolsRoot=resolve('.tools'),profile=resolve(toolsRoot,'product-detail-qa-'+randomUUID());
if(!profile.startsWith(toolsRoot+sep))throw Error('Invalid temporary browser profile');
await mkdir(profile,{recursive:true});
process.env.VITE_API_URL='/api';
process.env.VITE_SITE_URL='https://store.test.invalid';
process.env.VITE_WHATSAPP_NUMBER='15555550123'; // Reserved fictional number; no WhatsApp navigation.
const fixture=detailFixture();let relatedCount=0,relatedRequests=0;
const transport=createServer();
const vite=await createViteServer({configFile:resolve('vite.config.ts'),server:{hmr:false,middlewareMode:true},appType:'custom',plugins:[{name:'browser-qa-no-hmr-port',configResolved(config){config.server.hmr={server:transport};},configureServer(server){server.config.server.hmr=false;}}]});
const html=await readFile('index.html','utf8');
const server=transport;
server.on('request',async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  if(url.pathname==='/api/auth/session'){json({user:null});return;}
  if(url.pathname==='/api/products/detail-fixture'){json(fixture);return;}
  if(url.pathname==='/api/products'){
   relatedRequests++;const count=Number(url.searchParams.get('pageSize')??24);
   json({items:relatedFixtures(relatedCount),total:relatedCount,page:1,pageSize:count,facets:{universe:{},category:{},subcategory:{}}});return;
  }
  if(url.pathname.startsWith('/api/')){res.statusCode=404;json({message:'Test endpoint unavailable'});return;}
  if(url.pathname.startsWith('/test-media/')){
   const size=url.pathname.endsWith('tiny.svg')?24:400;
   res.setHeader('Content-Type','image/svg+xml');
   res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="100%" height="100%" fill="${url.pathname.includes('/b.')?'#d4ac42':'#681621'}"/><circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#fff4df"/></svg>`);return;
  }
  if(url.pathname.startsWith('/product/')||url.pathname==='/cart'||url.pathname==='/'){
   res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml(req.url,html));return;
  }
  vite.middlewares(req,res,()=>{res.statusCode=404;res.end();});
 }catch{res.statusCode=500;res.end('Fixture server failure');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const browser=spawn(executable,['--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{windowsHide:true,stdio:['ignore','ignore','pipe']});
let socket,sequence=0,session;const browserErrors=[];const pending=new Map();
const call=(method,params={},target=session)=>new Promise((resolve,reject)=>{
 const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timed out: '+method));},15000);
 pending.set(id,{resolve:value=>{clearTimeout(timer);resolve(value);},reject});
 socket.send(JSON.stringify({id,method,params,...(target?{sessionId:target}:{})}));
});
try{
 const debuggerUrl=await new Promise((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Browser did not open its debugger')),15000);let output='';
  browser.once('error',reject);browser.stderr.on('data',chunk=>{output+=chunk;const match=output.match(/DevTools listening on (ws:\/\/[^\s]+)/);if(match){clearTimeout(timer);resolve(match[1]);}});
 });
 socket=new WebSocket(debuggerUrl);await new Promise((resolve,reject)=>{socket.addEventListener('open',resolve,{once:true});socket.addEventListener('error',reject,{once:true});});
 socket.addEventListener('message',event=>{
  const value=JSON.parse(event.data);
  if(value.method==='Runtime.exceptionThrown'){
   const details=value.params.exceptionDetails,description=details.exception?.description??'';
   // HMR is disabled; forced page reloads may cancel Vite's own development socket.
   // Ignore only this exact transport error from /@vite/client, never application errors.
   const viteCancellation=description.startsWith('Error: WebSocket closed without opened.')&&(description.includes('/@vite/client')||details.stackTrace?.callFrames?.some(frame=>frame.url.includes('/@vite/client')));
   if(!viteCancellation)browserErrors.push(details.text+': '+description.split('\n')[0]);
  }
  if(value.id){const task=pending.get(value.id);pending.delete(value.id);if(value.error)task?.reject(Error(value.error.message));else task?.resolve(value.result);}
  if(value.method==='Fetch.requestPaused'){
   const allowed=value.params.request.url.startsWith(origin+'/');
   void call(allowed?'Fetch.continueRequest':'Fetch.failRequest',{requestId:value.params.requestId,...(!allowed?{errorReason:'BlockedByClient'}:{})},value.sessionId).catch(()=>{});
  }
 });
 const {targetId}=await call('Target.createTarget',{url:'about:blank'},null);
 session=(await call('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
 await call('Page.enable');await call('Page.bringToFront');await call('Runtime.enable');await call('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+result.result.description);return result.result.value;};
 const wait=async(expression,message)=>{for(let attempt=0;attempt<120;attempt++){if(await evaluate(expression))return;await pause(150);}throw Error(message);};
 const navigate=async(count,width=1440)=>{
  relatedCount=count;await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  await call('Page.navigate',{url:origin+'/product/detail-fixture?qa='+randomUUID()});
  await wait("document.querySelectorAll('.design-choice').length===3",'Product did not render');
  await wait(count?`document.querySelectorAll('.related-product-grid>.product-card').length===${count}`:"!document.body.textContent.includes('Buscando piezas relacionadas')",'Related products did not finish');
  await evaluate('document.fonts.ready.then(()=>true)');
 };
 for(const count of [0,1,2,4]){
  await navigate(count);
  assert.equal(await evaluate("document.querySelectorAll('.related-products').length"),count?1:0);
  assert.ok(await evaluate("[...document.querySelectorAll('.related-product-grid>.product-card')].every(card=>card.getBoundingClientRect().width<=281)"));
  if(count){await wait("[...document.querySelectorAll('.related-product-grid img')].every(img=>img.complete)",'Related images did not load');assert.ok(await evaluate("[...document.querySelectorAll('.related-product-grid img')].every(img=>getComputedStyle(img).objectFit==='scale-down'&&img.naturalWidth===24)"));}
 }
 for(const width of [320,360,390,768,1024,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  const layout=await evaluate(`(()=>{const cards=[...document.querySelectorAll('.design-choice')].map(e=>e.getBoundingClientRect());return {overflow:document.documentElement.scrollWidth>innerWidth+1,widths:cards.map(r=>r.width),heights:cards.map(r=>r.height),related:[...document.querySelectorAll('.related-product-grid>.product-card')].map(e=>e.getBoundingClientRect().width)};})()`);
  assert.equal(layout.overflow,false,'Horizontal page overflow at '+width);assert.ok(Math.max(...layout.widths)-Math.min(...layout.widths)<1,'Uneven design widths at '+width);assert.ok(Math.max(...layout.heights)-Math.min(...layout.heights)<1,'Uneven design heights at '+width);assert.ok(layout.related.every(size=>size<=281),'Stretched related card at '+width);
 }
 const before=relatedRequests;const canonical=await evaluate("document.querySelector('link[rel=canonical]')?.getAttribute('href')");
 await evaluate("document.querySelector('.design-choice').focus()");
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
 await wait("document.querySelector('h1').textContent.includes('Gryffindor')",'Keyboard design selection failed');
 assert.ok(await evaluate("document.activeElement.matches('.design-choice')&&document.activeElement.matches(':focus-visible')"));
 await evaluate("document.querySelector('.product-detail-info select').value='sku-a-l';document.querySelector('.product-detail-info select').dispatchEvent(new Event('change',{bubbles:true}))");
 await evaluate("document.querySelectorAll('.gallery-thumbnails button')[1].click()");
 assert.ok(await evaluate("document.querySelector('.product-gallery>img').getAttribute('src').includes('a-back.svg')"));
 await evaluate("document.querySelectorAll('.design-choice')[1].click()");
 await wait("document.querySelector('.product-gallery>img').getAttribute('src').includes('/b.svg')",'Gallery did not follow the chosen design');
 assert.ok(await evaluate("document.title.includes('Reliquias')"));assert.equal(await evaluate("document.querySelector('link[rel=canonical]')?.getAttribute('href')"),canonical);assert.ok(await evaluate("document.querySelector('meta[property=\"og:image\"]')?.content.endsWith('/test-media/b.svg')"));assert.equal(relatedRequests,before,'Design changes repeated the related-products request');
 await evaluate("document.querySelector('.product-detail-actions button').click()");
 const order=await evaluate(`(async()=>{const m=await import('/src/features/cart/services/cartService.ts');const product=await (await fetch('/api/products/detail-fixture')).json();const result=m.resolveCart(m.cartService.getSnapshot(),[product]);return {sku:result.lines[0]?.skuId,image:result.lines[0]?.selectedImage,missing:result.missing.length,message:new URL(m.whatsappOrder(result.lines,'15555550123',location.origin)).searchParams.get('text')};})()`);
 assert.equal(order.sku,'sku-b-one');assert.equal(order.image,'/test-media/b.svg');assert.equal(order.missing,0);assert.ok(order.message.includes('Reliquias')&&order.message.includes('Única')&&order.message.includes('/test-media/b.svg'));
 await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});assert.ok(await evaluate("document.activeElement!==document.body"));
 await evaluate('window.__detailQaReloadMarker=true');await call('Page.reload');
 await wait("typeof window.__detailQaReloadMarker==='undefined'&&document.querySelectorAll('.design-choice').length===3",'Product did not reload');
 const restored=await evaluate("import('/src/features/cart/services/cartService.ts').then(module=>module.cartService.getSnapshot())");assert.equal(restored[0].skuId,'sku-b-one');assert.equal(restored[0].selectedImage,'/test-media/b.svg');
 assert.deepEqual(browserErrors,[],'Unexpected browser runtime errors');
 console.log('Browser PASS: related 0/1/2/4; widths 320/360/390/768/1024/1440; uniform choices; no overflow; natural-size media; keyboard; design/title/gallery/SKU; cart/WhatsApp and reload persistence; no redundant related requests.');
}catch(error){console.error(JSON.stringify({browserErrors}));try{console.error(JSON.stringify((await call('Runtime.evaluate',{expression:"({heading:document.querySelector('h1')?.textContent,focused:document.activeElement?.className,selected:[...document.querySelectorAll('.design-choice')].map(button=>button.getAttribute('aria-pressed'))})",returnByValue:true})).result.value));}catch{}throw error;}finally{
 try{await call('Browser.close',{},null);}catch{}socket?.close();
 if(browser.exitCode===null){await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),pause(3000)]);if(browser.exitCode===null)browser.kill();}
 await new Promise(resolve=>server.close(resolve));await vite.close();
 // Remove only this generated, verified profile under the workspace .tools directory.
 if(profile.startsWith(toolsRoot+sep))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:500}).catch(()=>console.warn('Temporary QA profile remains under .tools; no user profile was touched.'));
}
