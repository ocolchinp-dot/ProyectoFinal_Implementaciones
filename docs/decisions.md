# Decisiones técnicas

- Se usa PostgreSQL porque el dominio requiere transacciones, relaciones y trazabilidad de inventario.
- Se usa Prisma para centralizar el esquema y garantizar que compras y ventas actualicen existencias atómicamente.
- La sesión usa un JWT de corta duración en una cookie HttpOnly, con credenciales incluidas desde el frontend. Esto evita exponer el token a JavaScript del navegador.
- Se usa soft delete mediante `active` en usuarios, clientes, proveedores y productos para conservar historial.
- No se incorporan módulos ajenos al brief. Dashboard y reportes priorizan información operativa de la distribuidora.
- Las ventas y compras usan idempotencia persistente en PostgreSQL. La clave se combina con usuario y ruta, y el cuerpo se resume con SHA-256 para impedir que una misma clave represente solicitudes diferentes.
- Cypress verifica el recorrido crítico desde el navegador y complementa las pruebas unitarias y de integración de Vitest.
