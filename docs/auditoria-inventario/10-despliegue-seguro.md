# 10. Despliegue controlado — NO EJECUTADO

No merge/push/deploy realizado. Historial del proyecto vincula main con despliegues Pages/Render; sin acceso a paneles no puede comprobarse lo contrario. No se cumple la condición para merge automático autorizado por el propietario. Necesaria autorización específica para publicación y coordinación; validar CI y PostgreSQL antes.

## Requisitos

- Revisar SQL 20261021000000_model_inventory en staging aislado y ensayar restore; backup reciente con restauración comprobada. Confirmar destino Neon de manera privada.
- Pasar integración real PostgreSQL y QA móvil; consultar09 para resultados/pedientes. Sin reset, db push ni seed remoto.
- Verificar configuración efectiva de Pages/Render y rama productiva. Desactivar temporalmente autodeploy en AMBAS plataformas o usar ramas/servicios staging; ninguna de estas acciones está ejecutada aquí.
- INVENTORY_MODE es configuración de Render/API, capture predeterminado. No es VITE_. APP_ORIGIN sigue siendo origen público Pages; API_ORIGIN y R2 permanecen sin cambio.

## Secuencia

1. Aprobación de ventana, responsables y plan de rollback. Con autodeploy pausado, merge revisado o artefactos de rama aprobada; no dejar que un merge despliegue API antes del esquema.
2. Compilar frontend/backend y verificar CI. Aplicar migración versionada mediante pnpm db:migrate con DIRECT_DATABASE_URL del objetivo y TLS, desde entorno aprobado. No se aplica en esta ejecución. Es aditiva y crea General/NULL para existentes, no interpreta stock antiguo.
3. Desplegar API con INVENTORY_MODE=capture; /health/ready ahora comprueba acceso a ProductModel. No habilitar enforce. Verificar catálogo, admin, imágenes y sesión. No reiniciar bootstrap para esta función.
4. Ejecutar inventory:prepare en dry-run con variables de entorno suministradas por el servicio. Si encuentra fichas sin modelos creadas por backend antiguo, revisar y ejecutar --apply bajo aprobación; cantidades quedan NULL. No ejecutar con enforce activo.
5. Publicar frontend compatible en Pages y verificar SHA. Mantener capture hasta renovar versiones cliente y completar pruebas. R2/imágenes no requieren migración.
6. Gestor separa modelos reales y captura cantidades. Inactivos no vendibles se desactivan explícitamente; no usar una unidad ficticia. Revisar Pendientes y productos no archivados sin modelo.
7. Confirmar mapeos/conteos, compatibilidad y pruebas; cambiar Render a INVENTORY_MODE=enforce y reiniciar durante ventana aprobada. El arranque rechaza pendientes activos en productos no archivados. Nuevos modelos enforce inactivos requieren conteo y activación explícita.
8. Smoke: agotado oculto público y editable admin; producto parcialmente disponible ofrece solo modelos positivos; reposición reaparece; filtros/facetas, enlace directo y carrito antiguo se revisan. Cotización no modifica saldo; venta manual sí y genera exactamente un movimiento.
9. Reanudar autodeploy solo cuando el flujo ya respete orden de migraciones futuras. Mantener alertas y monitoreo del catálogo real, no solo SELECT1.

Activación no es un cambio de datos ni un control del cliente: solo configuración backend. Si falta migración, no desplegar API nueva. Si falla integración o restore, detener rollout. No considerar pasar unitarias como evidencia de carreras PostgreSQL probadas.
