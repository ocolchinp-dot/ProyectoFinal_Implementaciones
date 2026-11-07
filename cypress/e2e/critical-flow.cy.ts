describe('flujo crítico de ventas', () => {
  const apiUrl = () => Cypress.env('apiUrl') as string;

  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });

  it('permite iniciar sesión y cargar el resumen operativo', () => {
    cy.get('input[autocomplete="username"]').clear().type('admin');
    cy.get('input[autocomplete="current-password"]').clear().type('Demo1234!');
    cy.contains('button', 'Iniciar sesión').click();
    cy.contains('h1', 'Resumen operativo').should('be.visible');
    cy.contains('button', 'Ventas').should('be.visible');
  });

  it('evita duplicar una venta cuando se repite el mismo Idempotency-Key', () => {
    cy.get('input[autocomplete="username"]').clear().type('admin');
    cy.get('input[autocomplete="current-password"]').clear().type('Demo1234!');
    cy.contains('button', 'Iniciar sesión').click();
    cy.contains('h1', 'Resumen operativo').should('be.visible');
    cy.contains('button', 'Ventas').click();
    cy.contains('h1', 'Ventas').should('be.visible');
    cy.contains('button', '+ Nueva venta').click();

    cy.get('select[name="contactId"] option').eq(1).invoke('val').then((clientId) => {
      cy.get('select[name="contactId"]').select(String(clientId));
    });
    cy.contains('button', '+ Agregar producto').click();
    cy.get('.line-row select option').eq(0).invoke('val').then((productId) => {
      cy.get('.line-row select').select(String(productId));
    });

    cy.intercept('POST', '**/api/sales').as('createSale');
    cy.contains('button', 'Confirmar venta').click();
    cy.wait('@createSale').then(({ request, response }) => {
      expect(response?.statusCode).to.eq(201);
      const key = request.headers['idempotency-key'];
      expect(key).to.be.a('string');

      cy.request({
        method: 'POST',
        url: `${apiUrl()}/sales`,
        headers: { 'Idempotency-Key': key },
        body: request.body,
      }).then((replay) => {
        expect(replay.status).to.eq(201);
        expect(replay.body.id).to.eq(response?.body.id);
      });

      cy.request({
        method: 'POST',
        url: `${apiUrl()}/sales`,
        failOnStatusCode: false,
        headers: { 'Idempotency-Key': key },
        body: { ...request.body, paidAmount: 1 },
      }).then((changed) => {
        expect(changed.status).to.eq(409);
      });
    });
  });

  it('muestra un error con credenciales inválidas', () => {
    cy.get('input[autocomplete="username"]').clear().type('admin');
    cy.get('input[autocomplete="current-password"]').clear().type('incorrecta');
    cy.contains('button', 'Iniciar sesión').click();
    cy.contains('Usuario o contraseña incorrectos.').should('be.visible');
  });
});
