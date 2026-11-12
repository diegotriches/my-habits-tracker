// jest.global-setup.js
// O app agrupa conclusões pelo dia LOCAL (UTC-3). Fixar o fuso garante que
// os testes deem o mesmo resultado em qualquer máquina e no CI. Roda antes
// dos workers do Jest, que herdam a variável.
module.exports = async () => {
  process.env.TZ = 'America/Sao_Paulo';
};
