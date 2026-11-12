// Garante que o fuso fixo dos testes (jest.global-setup.js) está valendo:
// sem ele, os testes de "dia local" passariam ou falhariam conforme a máquina.
it('roda no fuso de São Paulo (UTC-3)', () => {
  expect(new Date('2026-11-11T12:00:00Z').getHours()).toBe(9);
});
