# Entrega academica

## Identificacion

- Repositorio: `ocolchinp-dot/ProyectoFinal_Implementaciones`
- Rama: `main`
- Version: `v1.0.0-entrega`
- Commit de entrega: `Entrega final: aportes de API idempotente y pruebas E2E`

## Aporte 1: API REST idempotente y validada

La implementacion esta en:

- `backend/src/routes/operations.ts`
- `backend/src/utils/idempotency.ts`
- `backend/src/schemas/operations.ts`
- `backend/src/middleware/errors.ts`
- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261031010640_add_idempotency/migration.sql`

Se verifica con `npm test`, especialmente en `backend/tests/integration.test.ts`.

## Aporte 2: pruebas E2E con Cypress

La implementacion y configuracion esta en:

- `cypress/e2e/critical-flow.cy.ts`
- `cypress.config.ts`
- `frontend/src/pages/TransactionsPage.tsx`
- `frontend/src/lib/api.ts`

Se verifica con el entorno levantado mediante `npm run dev` y luego `npm run e2e` en otra terminal.

## Configuracion reproducible

1. Copiar `.env.example` a `.env` y, si se desea, `backend/.env.example` a `backend/.env`.
2. Ejecutar `docker compose up -d postgres`.
3. Ejecutar `npm install`.
4. Ejecutar `npm run db:generate --workspace backend`, `npm run db:migrate --workspace backend` y `npm run db:seed --workspace backend`.
5. Ejecutar `npm run dev`.

Los archivos `.env`, respaldos y logs estan excluidos por `.gitignore`. Los valores de ejemplo no representan secretos de produccion.
