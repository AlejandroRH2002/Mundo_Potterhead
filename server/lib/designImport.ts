import {createHash} from 'node:crypto';
import {planDesignImport as plan} from '../../shared/designImport.ts';
import type {ManagedProduct,ImportRecord} from '../../shared/catalogManagement.ts';
export function planDesignImport(parent:ManagedProduct,rows:ImportRecord[]){return plan(parent,rows,(model,size,color)=>model.slice(0,50)+'-'+size+'-'+createHash('sha256').update(JSON.stringify([model,size,color])).digest('hex').slice(0,20));}
