# Distribuidora Costa Sur

Sistema Administrativo para la automatización de procesos de Distribuidora Costa Sur, Retalhuleu.

## Estado del proyecto

Aplicación full-stack funcional para demostración académica. Incluye autenticación, roles, clientes, proveedores, productos, categorías, inventario, compras, ventas, reportes, auditoría y respaldo local de PostgreSQL.

El documento de tesis mencionado en el brief no estaba disponible en el repositorio al iniciar el desarrollo; por ello, la implementación toma como fuente el brief entregado y deja preparada la estructura para ajustar cualquier detalle cuando se comparta el documento.

## Arquitectura

- `frontend/`: React + TypeScript + Vite, con CSS responsive y consumo de API REST.
- `backend/`: Node.js + Express + TypeScript, validaciones Zod, JWT y reglas de negocio.
- `backend/prisma/`: esquema, migraciones y seed de PostgreSQL mediante Prisma.
- `docker-compose.yml`: PostgreSQL local.

Las compras y ventas se procesan dentro de transacciones Prisma. El inventario no acepta cantidades negativas y cada movimiento conserva existencias anterior y posterior.

## Version entregada

La version presentada corresponde al tag `v1.0.0-entrega`. El commit de entrega queda identificado en el historial de GitHub con el mensaje `Entrega final: aportes de API idempotente y pruebas E2E`.

## Aportes de Seminario

### 1. API REST idempotente y validada

Las operaciones `POST /api/sales` y `POST /api/purchases` requieren el encabezado `Idempotency-Key`. La API guarda la clave, el usuario, el alcance, un hash del cuerpo y la respuesta durante 24 horas. Si se repite la misma solicitud, devuelve la respuesta original sin crear otra operación ni modificar nuevamente el inventario. Si la misma clave se usa con datos diferentes, responde `409 Conflict`.

Las entradas de ventas y compras se validan con esquemas Zod estrictos: identificadores, cantidades, precios, fechas, estados de pago y límites de detalle.

Archivos principales del aporte:

- `backend/src/routes/operations.ts`: endpoints de compras y ventas.
- `backend/src/utils/idempotency.ts`: reserva, replay y conflicto de claves.
- `backend/src/schemas/operations.ts`: validaciones de entrada.
- `backend/src/middleware/errors.ts`: respuestas de error, incluido `409 Conflict`.
- `backend/prisma/schema.prisma`: modelo `IdempotencyKey`.
- `backend/prisma/migrations/20261031010640_add_idempotency/migration.sql`: migración persistente.
- `backend/tests/integration.test.ts`: pruebas de integración de idempotencia y stock.

### 2. Pruebas E2E con Cypress

La suite `cypress/e2e/critical-flow.cy.ts` verifica el sistema desde el navegador: inicio de sesión, carga del resumen, creación de una venta, repetición idempotente de la solicitud y rechazo de credenciales inválidas.

Con PostgreSQL, backend y frontend levantados en terminales separadas:

```bash
npm run dev

# En otra terminal
npm run e2e
```

Para abrir Cypress de forma interactiva:

```bash
npm run e2e:open
```

El flujo E2E usa los datos demo del seed. No debe ejecutarse contra una base de datos de producción.

Archivos principales del aporte:

- `cypress/e2e/critical-flow.cy.ts`: casos E2E de login, dashboard, venta, replay idempotente y credenciales inválidas.
- `cypress.config.ts`: URL base, URL de API y configuración de Cypress.
- `frontend/src/pages/TransactionsPage.tsx`: flujo de creación de ventas en la interfaz.
- `frontend/src/lib/api.ts`: cliente HTTP usado por el frontend.

## Verificación de los aportes

### Verificación automatizada de la API

Con PostgreSQL disponible y las variables de `.env` configuradas:

```bash
npm run db:generate --workspace backend
npm run db:migrate:deploy --workspace backend
npm run db:seed --workspace backend
npm test
```

La prueba `backend/tests/integration.test.ts` comprueba que una solicitud repetida con la misma `Idempotency-Key` devuelve la respuesta original, que una clave reutilizada con otro cuerpo responde `409`, y que las operaciones respetan el stock.

### Verificación E2E

Levanta el backend y el frontend con `npm run dev` y, en otra terminal, ejecuta:

```bash
npm run e2e
```

La suite valida el recorrido completo desde el navegador. Para inspección interactiva usa `npm run e2e:open`.

El workflow `.github/workflows/ci.yml` ejecuta instalación, migraciones, seed, pruebas del backend y build en cada push a `main` y en cada pull request.

## Requisitos

- Node.js 20.19+ o 22.12+
- npm 10+
- Docker Desktop (recomendado para PostgreSQL)

## Instalación

```bash
copy .env.example backend\.env
docker compose up -d postgres
npm install
npm run db:generate --workspace backend
npm run db:migrate --workspace backend
npm run db:seed --workspace backend
npm run dev
```

Frontend: http://localhost:5173
API: http://localhost:4000/api/health

## Credenciales demo

Todas usan `Demo1234!`:

| Rol | Usuario |
| --- | --- |
| Administrador | `admin` |
| Ventas | `ventas` |
| Bodega | `bodega` |
| Consulta/Gerencia | `gerencia` |

Son datos ficticios para demostración. Deben cambiarse en un entorno real.

## Scripts principales

```bash
npm run dev
npm run build
npm test
npm run lint
npm run db:studio --workspace backend
npm run e2e
npm run e2e:open
```

## Respaldos

Con PostgreSQL local activo:

```bash
mkdir backups
docker exec costa-sur-postgres pg_dump -U costa_sur -d costa_sur > backups/costa-sur-$(Get-Date -Format yyyyMMdd-HHmm).sql
Get-Content backups/archivo.sql | docker exec -i costa-sur-postgres psql -U costa_sur -d costa_sur
```

Para generar un respaldo con el script del proyecto:

```powershell
npm run db:backup
```

Para restaurarlo, confirma explícitamente la operación:

```powershell
npm run db:restore -- backups/costa-sur-archivo.sql
```

## Producción

Antes de desplegar:

- Usa `NODE_ENV=production` y un `JWT_SECRET` aleatorio de al menos 32 caracteres.
- Configura `COOKIE_SECURE=true` y sirve frontend/API únicamente por HTTPS.
- No ejecutes el seed demo en producción.
- Usa credenciales de PostgreSQL fuera del repositorio y evita exponer el puerto 5432 a internet.
- Ejecuta `npm run db:migrate:deploy --workspace backend` como paso controlado del despliegue.
- Programa respaldos externos, cifrados y verifica periódicamente su restauración.
- Configura logs, monitoreo, alertas y un proxy TLS delante de la API.

## Estructura

```text
frontend/src/{components,pages,lib}
backend/src/{middleware,routes,services,utils}
backend/prisma/schema.prisma
docs/decisions.md
docs/test-matrix.md
.github/workflows/ci.yml
```

## Seguridad y contenido del repositorio

- `.env` y `backend/.env` son archivos locales ignorados por Git.
- `.env.example` y `backend/.env.example` contienen únicamente valores de desarrollo de ejemplo; reemplaza `JWT_SECRET` antes de cualquier despliegue.
- Las migraciones, pruebas y datos del seed son parte del código fuente reproducible y no contienen credenciales reales ni información confidencial.
- No se deben subir respaldos, logs, tokens, llaves privadas ni configuraciones de producción.

## Solución de problemas

- Si falla la conexión a PostgreSQL, verifica `docker compose ps` y que `DATABASE_URL` coincida con `.env`.
- Si el frontend muestra error de API, confirma que el backend esté en el puerto 4000.
- Para reiniciar datos demo, ejecuta `npm run db:seed --workspace backend`.
- Las capturas del informe académico quedan pendientes de agregar después de levantar el entorno.
