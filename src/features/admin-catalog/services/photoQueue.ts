export type PhotoTarget={productCode:string;modelCode?:string;variantCode?:string;append?:boolean};
export type PhotoJob={key:string;target:PhotoTarget;label:string;state:'pending'|'uploading'|'ready'|'error';error?:string;file?:File;image?:string};

// Serial uploads bound memory/network use; identity is captured before asynchronous work.
export class PhotoQueue {
 private jobs:PhotoJob[]=[];
 private listeners=new Set<()=>void>();
 private running=false;
 private disposed=false;
 private upload:(file:File)=>Promise<string>;
 private apply:(target:PhotoTarget,image:string)=>void;
 constructor(upload:(file:File)=>Promise<string>,apply:(target:PhotoTarget,image:string)=>void){this.upload=upload;this.apply=apply;}
 subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
 snapshot=()=>this.jobs;
 activate(){this.disposed=false;}
 private update(key:string,change:Partial<PhotoJob>){this.jobs=this.jobs.map(job=>job.key===key?{...job,...change}:job);this.listeners.forEach(listener=>listener());}
 enqueue(target:PhotoTarget,label:string,file:File){
  if(this.disposed)return;
  const key=JSON.stringify([target,file.name,file.size,file.lastModified]);
  const previous=this.jobs.find(job=>job.key===key);
  if(previous){if(previous.state==='ready'&&previous.image)this.apply(target,previous.image);return;}
  if(this.jobs.filter(job=>job.file).length>=32)throw Error('Hay demasiadas fotografías pendientes. Espera o reintenta las anteriores.');
  this.jobs=[...this.jobs,{key,target:{...target},label,file,state:'pending'}];this.listeners.forEach(listener=>listener());void this.drain();
 }
 retry(key:string){if(this.jobs.find(job=>job.key===key)?.state!=='error')return;this.update(key,{state:'pending',error:undefined});void this.drain();}
 private async drain(){
  if(this.running||this.disposed)return;this.running=true;
  try{let job:PhotoJob|undefined;while(!this.disposed&&(job=this.jobs.find(item=>item.state==='pending'))){
   this.update(job.key,{state:'uploading'});
   try{const image=job.image??await this.upload(job.file!);if(this.disposed)break;this.update(job.key,{image});this.apply(job.target,image);this.update(job.key,{state:'ready',file:undefined,image});}
   catch(error){if(!this.disposed)this.update(job.key,{state:'error',error:error instanceof Error?error.message:'No se pudo subir la fotografía.'});}
  }}finally{this.running=false;}
 }
 dispose(){this.disposed=true;this.jobs=[];this.listeners.clear();}
}
