export const toCents=(value:number)=>Math.round(value*100);
export function quoteSubtotal(lines:readonly {quantity:number;product:{price:number}}[]):number{
 let cents=0;
 for(const line of lines){if(!Number.isInteger(line.quantity)||line.quantity<1||line.quantity>99||!Number.isFinite(line.product.price)||line.product.price<=0)throw Error('Cantidad o precio inválido en la cotización.');cents+=toCents(line.product.price)*line.quantity;}
 if(!Number.isSafeInteger(cents))throw Error('El importe de la cotización supera el límite.');
 return cents/100;
}
