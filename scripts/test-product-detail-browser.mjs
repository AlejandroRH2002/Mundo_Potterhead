import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile,mkdir,rm} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {randomUUID} from 'node:crypto';
import {setTimeout as pause} from 'node:timers/promises';
import {createServer as createViteServer,transformWithEsbuild} from 'vite';
import {detailFixture,relatedFixtures} from '../tests/fixtures/productDetail.mjs';

// Uses an already installed browser. No downloads, database, R2 or production API.
const browserIndex=process.argv.indexOf('--browser');
const executable=browserIndex>=0?process.argv[browserIndex+1]:process.env.MP_BROWSER_PATH;
if(!executable)throw Error('Provide an installed Chrome/Edge executable: pnpm test:product-ui -- --browser <path>');
const toolsRoot=resolve('.tools'),profile=resolve(toolsRoot,'product-detail-qa-'+randomUUID());
if(!profile.startsWith(toolsRoot+sep))throw Error('Invalid temporary browser profile');
await mkdir(profile,{recursive:true});
process.env.VITE_API_URL='/api';
process.env.VITE_IMAGE_ORIGINS='https://images.test.invalid';
process.env.VITE_SITE_URL='https://store.test.invalid';
process.env.VITE_WHATSAPP_NUMBER='15555550123'; // Reserved fictional number; no WhatsApp navigation.
const fixture=detailFixture();let relatedCount=0,relatedRequests=0,designCount=3;
let failPhoto=false,failSave=false,mediaRequests=0;
let editorFixture={code:'P-QA',status:'draft',product:{name:'Frazada individual',description:'Producto de prueba para edición',price:500,category:'accessories',subcategory:null,universe:'harry-potter',images:[]},models:['Hogwarts','Reliquias','Pendiente'].map((name,index)=>({code:'M-'+index,name,active:false,images:[],variants:[{code:'S-'+index,size:'one',color:'',images:[],active:true}]}))};
const transport=createServer();
const vite=await createViteServer({configFile:resolve('vite.config.ts'),server:{hmr:false,middlewareMode:true},appType:'custom',plugins:[{name:'browser-qa-no-hmr-port',resolveId(id){if(id==='/qa-editor-entry.tsx')return '\0qa-editor-entry.tsx';},async load(id){if(id==='\0qa-editor-entry.tsx')return (await transformWithEsbuild(await readFile('tests/fixtures/catalogEditorBrowser.tsx','utf8'),'qa-editor-entry.tsx',{loader:'tsx',jsx:'automatic'})).code;},configResolved(config){config.server.hmr={server:transport};config.optimizeDeps.noDiscovery=true;config.optimizeDeps.entries=[];config.optimizeDeps.include=['react','react-dom','react-dom/client','react/jsx-runtime','react/jsx-dev-runtime','react-router-dom','framer-motion','lucide-react','zod'];},configureServer(server){server.config.server.hmr=false;}}]});
const html=await readFile('index.html','utf8');
const server=transport;
server.on('request',async(req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  const json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  if(url.pathname==='/qa-editor'){res.setHeader('Content-Type','text/html');res.end(await vite.transformIndexHtml(req.url,'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"></head><body><div id="root"></div><script type="module" src="/qa-editor-entry.tsx"></script></body></html>'));return;}
  if(url.pathname==='/api/admin/catalog/qa-parent'){json(editorFixture);return;}
  if(url.pathname==='/api/admin/inventory'){json({items:[],total:0,page:1,pageSize:100});return;}
  if(url.pathname==='/api/qa-editor'){if(req.method==='PUT'){if(failSave){failSave=false;res.statusCode=503;json({message:'Guardado de prueba rechazado'});return;}let body='';for await(const chunk of req)body+=chunk;const incoming=JSON.parse(body);editorFixture={...incoming,id:'qa-parent',revision:(editorFixture.revision??0)+1,models:incoming.models.map(model=>({...model,id:model.id??model.code,variants:model.variants.map(option=>({...option,id:option.id??option.code}))}))};}json(editorFixture);return;}
  if(url.pathname==='/api/media/config'){mediaRequests++;await pause(400);json({enabled:true,maxBytes:2097152});return;}
  if(url.pathname==='/api/media/upload'){if(failPhoto){failPhoto=false;res.statusCode=503;json({message:'Almacenamiento de prueba sin respuesta'});return;}let body='';for await(const chunk of req)body+=chunk;const {sha256}=JSON.parse(body);json({publicUrl:'https://images.test.invalid/qa-'+sha256+'.webp'});return;}
  if(url.pathname==='/api/auth/session'){json({user:null});return;}
  if(url.pathname==='/api/products/old-product'){json({...fixture,resolvedFrom:{id:'old-product',modelId:'model-b'}});return;}
  if(url.pathname==='/api/products/archived-product'){res.statusCode=404;json({message:'Producto no disponible.',code:'PRODUCT_UNAVAILABLE'});return;}
  if(url.pathname==='/api/products/private-alias'){res.statusCode=404;json({message:'Producto no disponible.',code:'PRODUCT_UNAVAILABLE'});return;}
  if(url.pathname==='/api/products/server-failure'){res.statusCode=503;json({message:'Servicio no disponible.'});return;}
  if(url.pathname==='/api/products/detail-fixture'){json(designCount===3?fixture:{...fixture,models:Array.from({length:designCount},(_,index)=>({...fixture.models[index%3],id:'design-'+index,skus:fixture.models[index%3].skus.map(option=>({...option,id:option.id+'-'+index,code:option.code+'-'+index}))}))});return;}
  if(url.pathname==='/api/products'){
   relatedRequests++;const count=Number(url.searchParams.get('pageSize')??24);
   json({items:relatedFixtures(relatedCount).map((item,index)=>({...item,image:'/test-media/related-'+index+'.svg',thumbnail:'/test-media/related-'+index+'.svg'})),total:relatedCount,page:1,pageSize:count,facets:{universe:{},category:{},subcategory:{}}});return;
  }
  if(url.pathname.startsWith('/api/')){res.statusCode=404;json({message:'Test endpoint unavailable'});return;}
  if(url.pathname.startsWith('/test-media/')){
   const size=url.pathname.endsWith('tiny.svg')?24:400;const mediaWidth=url.pathname.includes('related-0')?240:url.pathname.includes('related-1')?600:size,mediaHeight=url.pathname.includes('related-0')?600:url.pathname.includes('related-1')?240:size;
   res.setHeader('Content-Type','image/svg+xml');
   res.end(`<svg xmlns="http://www.w3.org/2000/svg" width="${mediaWidth}" height="${mediaHeight}" viewBox="0 0 ${mediaWidth} ${mediaHeight}"><rect width="100%" height="100%" fill="${url.pathname.includes('/b.')?'#d4ac42':'#681621'}"/><circle cx="${size/2}" cy="${size/2}" r="${size/4}" fill="#fff4df"/></svg>`);return;
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
let socket,sequence=0,session;let stage='setup';const requests=[];const browserErrors=[];const pending=new Map();
const call=(method,params={},target=session)=>new Promise((resolve,reject)=>{
 const id=++sequence;const timer=setTimeout(()=>{pending.delete(id);reject(Error('Browser command timed out: '+method));},45000);
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
   if(value.params.request.url.startsWith('https://images.test.invalid/qa-')){void call('Fetch.fulfillRequest',{requestId:value.params.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'image/svg+xml'}],body:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100" height="100" fill="#681621"/></svg>').toString('base64')},value.sessionId).catch(()=>{});return;}
   const allowed=value.params.request.url.startsWith(origin+'/');requests.push(value.params.request.url.replace(origin,''));
   void call(allowed?'Fetch.continueRequest':'Fetch.failRequest',{requestId:value.params.requestId,...(!allowed?{errorReason:'BlockedByClient'}:{})},value.sessionId).catch(()=>{});
  }
 });
 const {targetId}=await call('Target.createTarget',{url:'about:blank'},null);
 session=(await call('Target.attachToTarget',{targetId,flatten:true},null)).sessionId;
 await call('Page.enable');await call('Page.bringToFront');await call('Runtime.enable');await call('Fetch.enable',{patterns:[{urlPattern:'*',requestStage:'Request'}]});
 await call('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 const evaluate=async expression=>{const result=await call('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw Error(result.exceptionDetails.text+': '+result.result.description);return result.result.value;};
 const wait=async(expression,message)=>{for(let attempt=0;attempt<120;attempt++){if(await evaluate('Boolean('+expression+')'))return;await pause(150);}throw Error(message);};
 const navigate=async(count,width=1440)=>{stage='related '+count;
  relatedCount=count;await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  await call('Page.navigate',{url:origin+'/product/detail-fixture?qa='+randomUUID()});await pause(500);
  await wait("document.querySelectorAll('.design-choice').length===3",'Product did not render');
  await wait(count?`document.querySelectorAll('.related-product-grid>.product-card').length===${count}`:"!document.body.textContent.includes('Buscando piezas relacionadas')",'Related products did not finish');
  await evaluate('document.fonts.ready.then(()=>true)');
 };
 for(const count of [0,1,2,4]){
  await navigate(count);
  assert.equal(await evaluate("document.querySelectorAll('.related-products').length"),count?1:0);
  assert.ok(await evaluate("[...document.querySelectorAll('.related-product-grid>.product-card')].every(card=>card.getBoundingClientRect().width<=281)"));
  if(count){await wait("[...document.querySelectorAll('.related-product-grid img')].every(img=>img.complete)",'Related images did not load');assert.ok(await evaluate("[...document.querySelectorAll('.related-product-grid img')].every(img=>getComputedStyle(img).objectFit==='contain'&&img.naturalWidth>0)"));}
 }
 const media=await evaluate("[...document.querySelectorAll('.related-product-grid .product-image-link')].map(element=>({width:element.getBoundingClientRect().width,height:element.getBoundingClientRect().height}))");assert.ok(media.every(item=>Math.abs(item.width-item.height)<1),'Recommendation media proportions differ');
 const originals=await evaluate("[...document.querySelectorAll('.related-product-grid img')].map(image=>({width:image.naturalWidth,height:image.naturalHeight}))");assert.ok(originals[0].height>originals[0].width&&originals[1].width>originals[1].height&&originals[2].width===originals[2].height,'Orientation fixtures not exercised');
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
 for(const width of [390,1440]){
  await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  for(const [id,title] of [['missing-product','Producto no encontrado'],['archived-product','Producto no disponible'],['private-alias','Producto no disponible'],['server-failure','No pudimos cargar el producto']]){
   await call('Page.navigate',{url:origin+'/product/'+id});await wait("document.querySelector('h1')?.textContent==='"+title+"'",'Error state remained loading: '+id);assert.equal(await evaluate("document.body.textContent.includes('Cargando producto')"),false);assert.ok(await evaluate("[...document.querySelectorAll('a')].some(link=>link.textContent==='Volver al catálogo')"));
  }
  await call('Page.navigate',{url:origin+'/product/old-product'});await wait("location.pathname==='/product/detail-fixture'&&document.querySelector('.design-choice[aria-pressed=true]')?.getAttribute('aria-label')?.includes('Reliquias')",'Historical resolution failed');assert.equal(await evaluate("new URLSearchParams(location.search).get('design')"),'model-b');await wait("document.querySelector('.product-gallery>img')?.getAttribute('src')?.includes('/b.svg')",'Historical gallery did not settle');await evaluate("document.querySelector('.product-detail-actions button').click()");await wait("document.body.textContent.includes('Producto agregado al carrito.')",'Historical selection could not be added to the cart');assert.equal(await evaluate("import('/src/features/cart/services/cartService.ts').then(module=>module.cartService.getSnapshot().some(entry=>entry.productId==='old-product'))"),false);
 }

 for(const width of [390,1440])for(const count of [1,5,20,50]){
  stage='strip '+count+' at '+width;designCount=count;await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
  await call('Page.navigate',{url:origin+'/product/detail-fixture?strip='+count});await wait("document.querySelectorAll('.design-choice').length==="+count,'Design strip did not render');await evaluate('document.fonts.ready.then(()=>true)');
  const dimensions=await evaluate("(()=>{const strip=document.querySelector('.design-picker'),r=strip.getBoundingClientRect();return {height:r.height,overflow:document.documentElement.scrollWidth>innerWidth+1,scroll:strip.scrollWidth>strip.clientWidth};})()");
  assert.equal(dimensions.overflow,false);assert.ok(dimensions.height<240,'Design strip grew vertically');if(count>=20)assert.ok(dimensions.scroll);
  await evaluate("document.querySelector('.design-choice').focus()");await call('Input.dispatchKeyEvent',{type:'keyDown',key:'End',code:'End'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'End',code:'End'});
  assert.equal(await evaluate("document.activeElement===document.querySelectorAll('.design-choice')["+(count-1)+"]"),true);
  await call('Input.dispatchKeyEvent',{type:'keyDown',key:'Home',code:'Home'});await call('Input.dispatchKeyEvent',{type:'keyUp',key:'Home',code:'Home'});
  if(width===390&&count>=20){await evaluate("document.querySelector('.design-picker').scrollIntoView({block:'center'});document.querySelector('.design-picker').scrollLeft=0");const point=await evaluate("(()=>{const r=document.querySelector('.design-picker').getBoundingClientRect();return {x:r.right-20,y:r.top+40};})()");await call('Emulation.setTouchEmulationEnabled',{enabled:true});await call('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point]});for(let step=1;step<=6;step++)await call('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:point.x-step*25,y:point.y}]});await call('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await wait("document.querySelector('.design-picker').scrollLeft>0",'Touch strip did not scroll');}
 }

 stage='editor photo queue';await call('Emulation.setDeviceMetricsOverride',{width:390,height:1000,deviceScaleFactor:1,mobile:true});await call('Page.navigate',{url:origin+'/qa-editor'});await wait("document.querySelector('.catalog-photo-board')",'Editor fixture not loaded');
 const uploadFixture=async(index,name,color='red')=>evaluate("(async()=>{const canvas=document.createElement('canvas');canvas.width=32;canvas.height=32;const context=canvas.getContext('2d');context.fillStyle="+JSON.stringify(color)+";context.fillRect(0,0,32,32);const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));const input=document.querySelectorAll('.catalog-photo-grid input[type=file]')["+index+"];const transfer=new DataTransfer();transfer.items.add(new File([blob],"+JSON.stringify(name)+",{type:'image/png',lastModified:1}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");
 await uploadFixture(0,'a.png');await uploadFixture(0,'a.png');await wait("document.querySelector('.photo-upload-status')?.textContent.includes('Subiendo')",'Upload status missing');
 assert.equal(await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Guardar cambios').disabled"),true);await evaluate("document.querySelector('form').requestSubmit()");assert.equal(editorFixture.models[0].images.length,0,'Pending photo was saved early');
 await evaluate("document.querySelector('.catalog-model-toolbar select').value='1';document.querySelector('.catalog-model-toolbar select').dispatchEvent(new Event('change',{bubbles:true}))");await wait("document.querySelector('.design-readiness h3').textContent==='Reliquias'",'Design navigation blocked during upload');
 await uploadFixture(1,'b.png','blue');await wait("document.querySelectorAll('.catalog-photo-grid img[src*=qa-]').length===2",'Uploads not associated with both designs');
 await wait("!document.querySelector('.photo-upload-status').textContent.includes('Subiendo…')",'Queue remained busy');assert.equal(mediaRequests,2);
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Guardar cambios').click()");await wait("document.querySelector('.catalog-editor-heading').textContent.includes('Cambios guardados')",'Photos not saved');
 assert.equal(editorFixture.models[0].active,false);assert.equal(editorFixture.models[1].active,false);assert.notEqual(editorFixture.models[0].images[0],editorFixture.models[1].images[0]);
 const preserved=structuredClone(editorFixture);await evaluate('window.__editorQaReload=true');await call('Page.reload',{ignoreCache:true});await wait("typeof window.__editorQaReload==='undefined'&&document.querySelectorAll('.catalog-photo-grid img[src*=qa-]').length===2",'Saved photos did not survive reload');
 failPhoto=true;await uploadFixture(0,'retry.png','green');await wait("document.querySelector('.photo-upload-status')?.textContent.includes('Error')",'Storage failure missing');assert.deepEqual(editorFixture,preserved);
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Reintentar fotografía').click()");await wait("document.querySelector('.photo-upload-status')?.textContent.includes('Fotografía subida')",'Retry did not complete');

 await evaluate("(()=>{const input=document.querySelector('.catalog-photo-grid input[type=file]'),transfer=new DataTransfer();transfer.items.add(new File(['invalid'],'bad.svg',{type:'image/svg+xml'}));input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()");await wait("document.querySelector('.photo-upload-status').textContent.includes('Selecciona una fotografía PNG, JPEG o WebP')",'Invalid image was not rejected');assert.equal(mediaRequests,4);
 await evaluate("window.confirm=()=>false;[...document.querySelectorAll('button')].find(button=>button.textContent==='Guardar y publicar diseños listos').click()");assert.equal(editorFixture.status,'draft');
 failSave=true;await evaluate("window.confirm=()=>true;[...document.querySelectorAll('button')].find(button=>button.textContent==='Guardar y publicar diseños listos').click()");await wait("document.querySelector('.publication-actions [role=alert]')?.textContent.includes('Guardado de prueba rechazado')",'Failed publication was not visible');assert.equal(editorFixture.status,'draft');assert.equal(editorFixture.models.filter(model=>model.active).length,0);await wait("[...document.querySelectorAll('button')].some(button=>button.textContent==='Guardar y publicar diseños listos'&&!button.disabled)",'Publication retry stayed disabled');
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent==='Guardar y publicar diseños listos').click()");await wait("document.querySelector('.publication-actions [role=status]')?.textContent.includes('Confirmado por el servidor')",'Publication not confirmed');assert.equal(editorFixture.status,'active');assert.equal(editorFixture.models.filter(model=>model.active).length,2);assert.equal(editorFixture.models[2].active,false);
 await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.startsWith('Volver a borrador:')).click()");await wait("!document.querySelector('.design-readiness')?.textContent.includes('Publicado (confirmado)')",'Withdrawal not confirmed');assert.equal(editorFixture.models[0].active,false);assert.equal(editorFixture.models[1].active,true);
 assert.equal(await evaluate("document.documentElement.scrollWidth>innerWidth+1"),false,'Editor overflow on mobile');

 stage='unified wizard';
 for(const count of [1,2]){
  editorFixture={code:'WIZ-'+randomUUID(),status:'draft',product:{name:'Chamarra Hogwarts',description:'Características de prueba',price:780,category:'clothing',subcategory:null,universe:'harry-potter',images:[]},models:[]};
  await call('Page.navigate',{url:origin+'/qa-editor?wizard='+count});await wait("document.querySelector('.product-wizard h2')?.textContent==='Información general'",'Wizard entry missing');
  const click=async text=>evaluate("[...document.querySelectorAll("+JSON.stringify(['Continuar','Revisar'].includes(text)?'.product-wizard-footer button':'button')+")].find(button=>button.textContent==="+JSON.stringify(text)+").click()");
  await click('Continuar');await wait("document.querySelector('.product-wizard h2')?.textContent==='Diseños y opciones'",'Design question missing');
  if(count===1)await click('Un solo diseño');else{await click('Agregar diseño');await wait("document.querySelector('.catalog-model-toolbar select')?.options.length===1",'First design missing');await click('Agregar diseño');}
  await wait("document.querySelector('.catalog-model-toolbar select')?.options.length==="+count,'Unexpected design count');await click('Continuar');await wait("document.querySelector('.catalog-photo-board')!==null",'Photo step missing');
  if(count===2){await uploadFixture(0,'wizard-a.png','purple');await uploadFixture(1,'wizard-b.png','yellow');await wait("document.querySelectorAll('.catalog-photo-grid img[src*=qa-]').length===2",'Wizard photographs missing');}
  await wait("![...document.querySelectorAll('.product-wizard-footer button')].find(button=>button.textContent==='Revisar').disabled",'Wizard photo queue did not finish');await click('Revisar');await wait("document.querySelector('.product-wizard h2')?.textContent==='Revisar y guardar'",'Review step missing');
  if(count===1){await click('Guardar borrador');await wait("document.querySelector('[data-qa-product-id=qa-parent]')!==null",'Draft save pending');assert.equal(editorFixture.status,'draft');assert.equal(editorFixture.models.length,1);assert.equal(editorFixture.models[0].variants.length,1);await evaluate('window.__wizardReload=true');await call('Page.reload',{ignoreCache:true});await wait("typeof window.__wizardReload==='undefined'&&document.querySelector('.product-wizard h2')?.textContent==='Información general'",'Saved draft did not resume');assert.equal(editorFixture.models.length,1);}
  else{await evaluate("window.confirm=()=>true;[...document.querySelectorAll('button')].find(button=>button.textContent==='Guardar y publicar diseños listos').click()");await wait("document.querySelector('.publication-actions [role=status]')?.textContent.includes('Confirmado por el servidor')",'Wizard publication not confirmed');assert.equal(editorFixture.models.length,2);assert.equal(editorFixture.models.filter(model=>model.active).length,2);assert.equal(new Set(editorFixture.models.flatMap(model=>model.variants.map(option=>option.code))).size,2);}
 }
 assert.deepEqual(browserErrors,[],'Unexpected browser runtime errors');
 console.log('Browser PASS: unified single/multiple design wizard, explicit publication and withdrawal, uniform portrait/landscape/square recommendations; editor queue/upload/switch/save/reload/error/retry with mocks; horizontal 1/5/20/50 designs, keyboard and touch; related 0/1/2/4; widths 320/360/390/768/1024/1440; uniform choices; no overflow; natural-size media; keyboard; design/title/gallery/SKU; cart/WhatsApp and reload persistence; 404/503/archive states without infinite loading; historical family/design redirect; no redundant related requests.');
}catch(error){console.error(JSON.stringify({stage,browserErrors,requests:requests.slice(-12),error:error.message}));try{console.error(JSON.stringify((await call('Runtime.evaluate',{expression:"({url:location.href,ready:document.readyState,body:document.body?.textContent?.slice(0,180),heading:document.querySelector('h1')?.textContent,focused:document.activeElement?.className,selected:[...document.querySelectorAll('.design-choice')].map(button=>button.getAttribute('aria-pressed'))})",returnByValue:true})).result.value));}catch{}throw error;}finally{
 try{await call('Browser.close',{},null);}catch{}socket?.close();
 if(browser.exitCode===null){await Promise.race([new Promise(resolve=>browser.once('exit',resolve)),pause(3000)]);if(browser.exitCode===null)browser.kill();}
 await new Promise(resolve=>server.close(resolve));await vite.close();
 // Remove only this generated, verified profile under the workspace .tools directory.
 if(profile.startsWith(toolsRoot+sep))await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:500}).catch(()=>console.warn('Temporary QA profile remains under .tools; no user profile was touched.'));
}
