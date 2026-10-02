/** A bounded connection consumer: each queued task holds at most one connection. */
export function serialQueue(){let tail:Promise<unknown>=Promise.resolve();return <T>(run:()=>Promise<T>):Promise<T>=>{const result=tail.then(run);tail=result.catch(()=>{});return result;};}
