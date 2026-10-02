export const categories = ['accessories', 'clothing', 'footwear', 'toys', 'bags'] as const;
export const universes = ['harry-potter', 'otros-universos'] as const;
export type Category = typeof categories[number];
export const categoryLabels: Record<Category, string> = { accessories: 'Accesorios', clothing: 'Ropa', footwear: 'Calzado', toys: 'Juguetes', bags: 'Bolsas' };
export const universeLabels = { 'harry-potter': 'Harry Potter', 'otros-universos': 'Otros universos' };
const entry = (slug: string, label: string, keywords: string[]) => ({ slug, label, keywords });
export const taxonomy: Record<Category, ReturnType<typeof entry>[]> = {
 clothing: [entry('sueteres','Suéteres',['sueter']),entry('sudaderas','Sudaderas',['sudadera','hoodie']),entry('playeras','Playeras',['playera','camiseta']),entry('chamarras-capas','Chamarras y capas',['chamarra','capa','tunica']),entry('pijamas','Pijamas',['pijama']),entry('disfraces-kimonos','Disfraces y kimonos',['kimono','haori','disfraz']),entry('otros','Otros',[])],
 accessories: [entry('varitas','Varitas',['varita']),entry('joyeria','Joyería',['collar','anillo','arete','pulsera']),entry('llaveros','Llaveros',['llavero']),entry('bufandas-gorros','Bufandas y gorros',['bufanda','gorro']),entry('tazas-termos','Tazas y termos',['taza','termo']),entry('papeleria','Papelería',['cuaderno','libreta','papeleria']),entry('replicas-decorativas','Réplicas decorativas',['katana','caliz','replica']),entry('pines-mascaras','Pines y máscaras',['pins','pin ','mascara']),entry('otros','Otros',[])],
 footwear: [entry('tenis','Tenis',['tenis']),entry('pantuflas','Pantuflas',['pantufla']),entry('otros','Otros',['zapato','bota'])],
 toys: [entry('peluches','Peluches',['peluche']),entry('figuras','Figuras',['figura','estatuilla']),entry('juegos-rompecabezas','Juegos y rompecabezas',['juego','rompecabezas']),entry('coleccionables','Coleccionables',['coleccionable']),entry('otros','Otros',[])],
 bags: [entry('mochilas','Mochilas',['mochila']),entry('bolsos-cangureras','Bolsos y cangureras',['bolso','bolsa','cangurera']),entry('otros','Otros',[])],
};
export function belongsToCategory(category: string, slug: string): boolean { return categories.includes(category as Category) && taxonomy[category as Category].some(item => item.slug === slug); }
export function inferSubcategory(category: string, name: string, description = ''): string | null {
 if (!categories.includes(category as Category)) return null;
 const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
 // Prefer names: descriptions often mention unrelated accessories.
 for (const text of [name, description]) { const normalized = normalize(text); const match = taxonomy[category as Category].find(item => item.keywords.some(word => normalized.includes(word))); if (match) return match.slug; }
 return null;
}
