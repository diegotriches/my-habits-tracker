import { capitalizeFirst } from '../text';
import { errorMessageFor, isNetworkError, OFFLINE_ACTION_MESSAGE } from '../networkErrors';

describe('capitalizeFirst', () => {
  it('maiúscula só na primeira letra', () => {
    expect(capitalizeFirst('quarta-feira, 11 de novembro')).toBe('Quarta-feira, 11 de novembro');
  });

  it('acentuadas e texto vazio', () => {
    expect(capitalizeFirst('éter')).toBe('Éter');
    expect(capitalizeFirst('')).toBe('');
  });
});

describe('isNetworkError / errorMessageFor', () => {
  it('reconhece falha de rede vinda do fetch ou do supabase-js', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
    expect(isNetworkError({ message: 'TypeError: Network request failed' })).toBe(true);
    expect(isNetworkError('Failed to fetch')).toBe(true);
  });

  it('não confunde erros do banco com falta de conexão', () => {
    expect(isNetworkError({ message: 'violates row-level security policy', code: '42501' })).toBe(false);
    expect(isNetworkError(null)).toBe(false);
  });

  it('troca a mensagem só quando o erro é de rede', () => {
    expect(errorMessageFor(new Error('Network request failed'), 'Falhou')).toBe(OFFLINE_ACTION_MESSAGE);
    expect(errorMessageFor(new Error('outro'), 'Falhou')).toBe('Falhou');
  });
});
