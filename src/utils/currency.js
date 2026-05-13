/**
 * Formata um valor numérico para o padrão de moeda brasileira (Real - R$)
 * @param {number|string} value - Valor a ser formatado
 * @returns {string} Valor formatado como moeda brasileira
 */
export const formatCurrency = (value) => {
  const numValue = Number(value);
  const safeValue = isNaN(numValue) ? 0 : numValue;
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(safeValue);
};

/**
 * Remove a formatação de moeda e retorna um número
 * @param {string} formattedValue - Valor formatado como moeda
 * @returns {number} Valor numérico
 */
export const parseCurrency = (formattedValue) => {
  if (typeof formattedValue === 'number') return formattedValue;
  
  const cleaned = String(formattedValue)
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Valida se um valor é um número válido para moeda
 * @param {any} value - Valor a ser validado
 * @returns {boolean} True se o valor é válido
 */
export const isValidCurrency = (value) => {
  const numValue = Number(value);
  return !isNaN(numValue) && isFinite(numValue);
};
