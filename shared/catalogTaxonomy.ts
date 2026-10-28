export const categories = ['clothing', 'footwear', 'bags', 'jewelry', 'home', 'accessories', 'toys', 'gifts', 'stationery', 'kitchen', 'other'] as const;
export const universes = ['harry-potter', 'otros-universos'] as const;
export type Category = typeof categories[number];
export const categoryLabels: Record<Category, string> = { clothing:'Ropa', footwear:'Calzado', bags:'Mochilas y bolsos', jewelry:'Joyería', home:'Hogar', accessories:'Accesorios', toys:'Coleccionables y juguetes', gifts:'Regalos y novedades', stationery:'Papelería', kitchen:'Cocina y bebidas', other:'Otros productos' };
export const universeLabels = { 'harry-potter': 'Harry Potter', 'otros-universos': 'Otros universos' };
const entry = (slug: string, label: string, keywords: string[]) => ({ slug, label, keywords });
export const taxonomy: Record<Category, ReturnType<typeof entry>[]> = {
 clothing: [entry('sueteres','Suéteres',['sueter']),entry('sudaderas','Sudaderas',['sudadera','hoodie']),entry('playeras','Playeras',['playera','camiseta']),entry('chamarras-capas','Chamarras y capas',['chamarra','capa','tunica']),entry('tunicas','Túnicas',['túnica','tunica']),entry('calcetas','Calcetas',['calceta','calcetin']),entry('pijamas','Pijamas',['pijama']),entry('disfraces-kimonos','Disfraces y kimonos',['kimono','haori','disfraz']),entry('otros','Otros',[])],
 accessories: [entry('gorras','Gorras',['gorra']),entry('relojes','Relojes',['reloj']),entry('varitas','Varitas (clasificación anterior)',['varita']),entry('joyeria','Joyería (clasificación anterior)',['collar','anillo','arete','pulsera']),entry('llaveros','Llaveros',['llavero']),entry('bufandas-gorros','Bufandas y gorros',['bufanda','gorro']),entry('tazas-termos','Tazas y termos (clasificación anterior)',['taza','termo']),entry('papeleria','Papelería (clasificación anterior)',['cuaderno','libreta','papeleria']),entry('replicas-decorativas','Réplicas decorativas',['katana','caliz','replica']),entry('pines-mascaras','Pines y máscaras',['pins','pin ','mascara']),entry('otros','Otros',[])],
 footwear: [entry('tenis','Tenis',['tenis']),entry('zapatos','Zapatos',['zapato','bota']),entry('sandalias','Sandalias',['sandalia']),entry('pantuflas','Pantuflas',['pantufla']),entry('otros','Otros',['zapato','bota'])],
 toys: [entry('peluches','Peluches',['peluche']),entry('figuras','Figuras',['figura','estatuilla']),entry('juegos-rompecabezas','Juegos y rompecabezas',['juego','rompecabezas']),entry('varitas','Varitas',['varita']),entry('replicas','Réplicas',['replica']),entry('coleccionables','Coleccionables',['coleccionable']),entry('otros','Otros',[])],
 bags: [entry('carteras','Carteras',['cartera']),entry('monederos','Monederos',['monedero']),entry('mochilas','Mochilas',['mochila']),entry('bolsos-cangureras','Bolsos y cangureras',['bolso','bolsa','cangurera']),entry('otros','Otros',[])],
 jewelry: [entry('collares','Collares',['collar']),entry('pulseras','Pulseras',['pulsera']),entry('anillos','Anillos',['anillo']),entry('aretes','Aretes',['arete']),entry('dijes','Dijes',['dije']),entry('otros','Otros',[])],
 home: [entry('frazadas','Frazadas',['frazada']),entry('toallas','Toallas',['toalla']),entry('cojines','Cojines',['cojin']),entry('sabanas','Sábanas',['sabana']),entry('decoracion','Decoración',['decoracion']),entry('otros','Otros',[])],
 gifts: [entry('cajitas-musicales','Cajitas musicales',['musical']),entry('lamparas','Lámparas',['lampara']),entry('cajas-regalo','Cajas de regalo',['regalo']),entry('otros','Otros',[])],
 stationery: [entry('libretas','Libretas',['libreta']),entry('plumas','Plumas',['pluma']),entry('stickers','Stickers',['sticker']),entry('estuches','Estuches',['estuche']),entry('otros','Otros',[])],
 kitchen: [entry('tazas','Tazas',['taza']),entry('termos','Termos',['termo']),entry('vasos','Vasos',['vaso']),entry('platos','Platos',['plato']),entry('otros','Otros',[])],
 other: [entry('otros','Otros',[])],
};
export function belongsToCategory(category: string, slug: string): boolean { return categories.includes(category as Category) && taxonomy[category as Category].some(item => item.slug === slug); }
export function inferSubcategory(category: string, name: string, description = ''): string | null {
 if (!categories.includes(category as Category)) return null;
 const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 // Prefer names: descriptions often mention unrelated accessories.
 for (const text of [name, description]) { const normalized = normalize(text); const match = taxonomy[category as Category].find(item => item.keywords.some(word => normalized.includes(word))); if (match) return match.slug; }
 return null;
}
