describe("Gerenciador da Choperia", () => {
  it("redireciona visitantes não autenticados para o login", () => {
    cy.visit("/");
    // Sem sessão, o AuthGuard leva para a tela de login.
    cy.location("pathname", { timeout: 10000 }).should("eq", "/login");
    cy.contains("Choperia");
  });

  it("exibe o formulário de login", () => {
    cy.visit("/login");
    cy.get('input[type="email"]').should("exist");
    cy.get('input[type="password"]').should("exist");
    cy.contains("button", /entrar/i);
  });
});
