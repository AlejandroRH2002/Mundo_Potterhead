/** Each consumer can cancel independently; abort transport when none remain. */
export function deduplicatedRequests<T>() {
 const pending=new Map<string,{promise:Promise<T>;controller:AbortController;users:number}>();
 return (key:string,load:(signal:AbortSignal)=>Promise<T>,signal?:AbortSignal):Promise<T>=>{
  if(signal?.aborted)return Promise.reject(new DOMException('Cancelled','AbortError'));
  let entry=pending.get(key);
  if(!entry){const controller=new AbortController();entry={controller,users:0,promise:Promise.resolve().then(()=>load(controller.signal))};pending.set(key,entry);const item=entry;const finish=()=>{if(pending.get(key)===item)pending.delete(key);};entry.promise.then(finish,finish);}
  const item=entry;item.users++;
  return new Promise<T>((resolve,reject)=>{let done=false;const release=()=>{if(done)return false;done=true;signal?.removeEventListener('abort',cancel);if(--item.users===0){item.controller.abort();if(pending.get(key)===item)pending.delete(key);}return true;};const cancel=()=>{if(release())reject(new DOMException('Cancelled','AbortError'));};signal?.addEventListener('abort',cancel,{once:true});item.promise.then(value=>{if(release())resolve(value);},error=>{if(release())reject(error);});});
 };
}
