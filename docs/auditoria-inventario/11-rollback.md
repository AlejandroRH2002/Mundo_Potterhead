# 11. Rollback sin pérdida de inventario

No ejecutado. Requiere responsable y autorización del entorno.

1. Ante problemas de disponibilidad, volver INVENTORY_MODE=capture y reiniciar API. Conserva cantidades, SKU e historial; agotados pueden volver a aparecer con disponibilidad por confirmar, efecto comercial que debe comunicarse.
2. Mantener backend nuevo compatible si el problema está en UI; volver frontend anterior solo en capture. El cliente antiguo no hace la nueva validación de cantidades/modelos antes de WhatsApp.
3. Si se sospecha saldo incorrecto, detener movimientos y revisar ledger/última clave antes de repetir. No abrir otro navegador para reenviar una venta cuyo resultado se desconoce. Reconciliar conteo físico con responsables.
4. Si se revierte API al release previo, congelar temporalmente salidas o llevar registro manual y conciliarlas luego. Código viejo puede crear fichas sin modelos y borrar físicamente productos sin historial; las FKs rechazan borrar aquellos con modelos. No retirar FKs para permitirlo. Preferir conservar API nueva y desactivar enforcement.
5. Mantener tablas ProductModel/InventoryMovement y columna archived. No DOWN destructivo, DROP, reset ni eliminación de movimientos. Product.stock legado no es copia de respaldo ni saldo verdadero.
6. Corregir stock mediante movimiento nuevo, con motivo y versión. No editar ledger; trigger inmutable lo impide para writers normales.
7. Restore solo tras diagnóstico y ensayo aislado, conciliando ventas después del corte. No restaurar sobre producción a ciegas. R2 no se modifica: no borrar objetos para revertir inventario.
8. Antes de reactivar enforce, preparar fichas sin modelo, reconciliar cantidades, validar pendientes y repetir pruebas PostgreSQL/QA. Registrar SHA/configuración/operador y resultados sin conexiones ni secretos.
