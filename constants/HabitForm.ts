export const MIN_NAME_LENGTH = 3;
export const MAX_NAME_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 200;

export const TARGET_UNITS = {
  volume: ['litros', 'ml', 'copos'],
  distance: ['km', 'metros', 'passos'],
  time: ['horas', 'minutos'],
  count: ['páginas', 'exercícios', 'vezes', 'unidades'],
  weight: ['kg', 'gramas'],
};

export function getAllTargetUnits(): string[] {
  return Object.values(TARGET_UNITS).flat();
}