# Validación de la experiencia administrativa del catálogo

Validado el 26 de octubre de 2026 en `fix/security-node-oct-2026`.

- Pantalla independiente `/admin/catalogo`, con Modelos, Variantes, Imágenes e Importación masiva.
- Listado y editor separados; avisos de cambios pendientes y acciones visibles.
- Retirada de variantes pendiente hasta guardar: eliminación de SKU sin dependencias o desactivación con referencias, saldo o historial. No se modifica el historial.
- Reactivación conserva identidad; los códigos históricos permanecen reservados. Un código eliminado sin dependencias puede reutilizarse tras guardar su retirada.
- Inventario mediante el registro de movimientos existente; precio compartido por producto.
- Sin migraciones adicionales para estos cambios; sin acceso a Neon ni despliegue.

## Comprobaciones ejecutadas

`pnpm lint`, `pnpm typecheck`, `pnpm test` (114 pruebas), `pnpm test:integration` (14 pruebas en PostgreSQL desechable), `pnpm build` y `pnpm build:web`: correctos.
Chunk principal: 362,23 kB; 115,91 kB gzip. La administración permanece en carga diferida.

## Revisión manual pendiente

En móvil y escritorio: navegación por pestañas con teclado, listado y búsqueda, crear/editar/duplicar modelos, quitar variante nueva, confirmar retirada existente, cancelar cambios, reactivar variantes, conteo de inventario, galería y simulación CSV/XLSX + ZIP. Verificar los permisos con una cuenta cliente.
No se ha realizado una inspección visual en navegador; no se afirma ausencia de desbordamientos a todas las resoluciones.