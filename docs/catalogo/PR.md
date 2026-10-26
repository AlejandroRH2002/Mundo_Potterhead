# Catálogo: modelos, talla/color, galerías e importación administrativa

La administración permite mantener un producto con varios diseños y SKU por talla/color, galerías específicas e importación CSV/XLSX con simulación, confirmación e inventario trazable. Se conservan identificadores, pedidos heredados y el flujo de cotización por WhatsApp.

- Migración aditiva: `20261026010000_catalog_management`; requiere también las dos migraciones anteriores de inventario/tallas presentes en la rama.
- Validación local: lint, typecheck, unitarias, integración PostgreSQL temporal, build y build:web. Adjuntar el resultado final registrado en esta tarea.
- Respaldo local restaurado y comparación de identificadores/saldos/historial sin cambios tras migrar.
- **Pendiente antes de merge/release:** ensayo de rama aislada Neon, revisión visual/R2, aprobación operativa y coordinación de auto-deploys. Producción no fue consultada ni modificada.
- Esta rama incluye commits anteriores de seguridad y preparación de inventario: revisar el conjunto.

Guía de uso: `docs/catalogo/ADMINISTRACION.md`. Secuencia de migración, despliegue y rollback: `docs/catalogo/DESPLIEGUE.md`.
