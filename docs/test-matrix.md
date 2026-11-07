# Matriz de verificación

La tesis define 3 casos unitarios, 3 de integración, 3 funcionales y 3 de validación con usuarios. La implementación mantiene esa cobertura como referencia y agrega verificaciones automáticas para las reglas críticas.

| Grupo | Cobertura automatizada |
| --- | --- |
| Unitarias | Hash de contraseñas, actualización de stock, cálculo de totales |
| Integración | Compra aumenta inventario, venta disminuye inventario, venta sin stock bloqueada |
| Idempotencia REST | Repetir una venta con la misma clave devuelve la respuesta original; reutilizarla con otro cuerpo responde 409 |
| Funcional API | Login, consulta del dashboard, creación de operación y respuesta de error |
| E2E Cypress | Login en navegador, carga del dashboard, creación de venta, replay idempotente y credenciales inválidas |
| Validación visual | Navegación y responsive preparados; la revisión manual del navegador queda para el entorno donde el navegador local esté disponible |
