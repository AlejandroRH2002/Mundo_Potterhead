import { taxonomy, categoryLabels, universeLabels } from './catalogTaxonomy.ts';
import type { Product } from '../src/types/product.ts';
const normalized=(value:string)=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('es');
export function taxonomySearch(q:string){
 const term=normalized(q.trim());const match=(slug:string,label:string)=>!!term&&(normalized(label).includes(term)||normalized(slug).includes(term));
 return {category:Object.entries(categoryLabels).filter(([slug,label])=>match(slug,label)).map(([slug])=>slug),universe:Object.entries(universeLabels).filter(([slug,label])=>match(slug,label)).map(([slug])=>slug),subcategory:Object.values(taxonomy).flat().filter(i=>match(i.slug,i.label)).map(i=>i.slug)};
}
export function matchesSearch(product:Product,q:string){const facets=taxonomySearch(q);return (product.name+' '+product.description).toLocaleLowerCase('es').includes(q.toLocaleLowerCase('es'))||facets.category.includes(product.category)||facets.universe.includes(product.universe)||!!product.subcategory&&facets.subcategory.includes(product.subcategory);}
