/**
 * Utilitários de localização para pt-BR
 * Região: Brasil
 * Idioma: Português do Brasil
 * Moeda: Real (BRL)
 * Timezone: America/Sao_Paulo
 */

export const LOCALE_CONFIG = {
  locale: 'pt-BR',
  timezone: 'America/Sao_Paulo',
  currency: 'BRL',
  country: 'BR'
};

/**
 * Formata números no padrão brasileiro
 * @param {number} value - Número a ser formatado
 * @param {number} decimals - Casas decimais (padrão: 2)
 * @returns {string} Número formatado
 */
export const formatNumber = (value, decimals = 2) => {
  const numValue = Number(value);
  if (isNaN(numValue)) return '0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue);
};

/**
 * Formata porcentagem no padrão brasileiro
 * @param {number} value - Valor (0-100)
 * @param {number} decimals - Casas decimais (padrão: 1)
 * @returns {string} Porcentagem formatada
 */
export const formatPercent = (value, decimals = 1) => {
  const numValue = Number(value);
  if (isNaN(numValue)) return '0%';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(numValue / 100);
};

/**
 * Formata CPF (XXX.XXX.XXX-XX)
 * @param {string} cpf - CPF sem formatação
 * @returns {string} CPF formatado
 */
export const formatCPF = (cpf) => {
  if (!cpf) return '';
  const cleaned = String(cpf).replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formata CNPJ (XX.XXX.XXX/XXXX-XX)
 * @param {string} cnpj - CNPJ sem formatação
 * @returns {string} CNPJ formatado
 */
export const formatCNPJ = (cnpj) => {
  if (!cnpj) return '';
  const cleaned = String(cnpj).replace(/\D/g, '');
  if (cleaned.length !== 14) return cnpj;
  
  return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

/**
 * Formata telefone brasileiro
 * @param {string} phone - Telefone sem formatação
 * @returns {string} Telefone formatado
 */
export const formatPhone = (phone) => {
  if (!phone) return '';
  const cleaned = String(phone).replace(/\D/g, '');
  
  // Celular com DDD (11) 99999-9999
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  
  // Fixo com DDD (11) 9999-9999
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  // Celular sem DDD 99999-9999
  if (cleaned.length === 9) {
    return cleaned.replace(/(\d{5})(\d{4})/, '$1-$2');
  }
  
  // Fixo sem DDD 9999-9999
  if (cleaned.length === 8) {
    return cleaned.replace(/(\d{4})(\d{4})/, '$1-$2');
  }
  
  return phone;
};

/**
 * Formata CEP (XXXXX-XXX)
 * @param {string} cep - CEP sem formatação
 * @returns {string} CEP formatado
 */
export const formatCEP = (cep) => {
  if (!cep) return '';
  const cleaned = String(cep).replace(/\D/g, '');
  if (cleaned.length !== 8) return cep;
  
  return cleaned.replace(/(\d{5})(\d{3})/, '$1-$2');
};

/**
 * Valida CPF
 * @param {string} cpf - CPF a ser validado
 * @returns {boolean} True se CPF é válido
 */
export const isValidCPF = (cpf) => {
  if (!cpf) return false;
  
  const cleaned = String(cpf).replace(/\D/g, '');
  
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  digit = 11 - (sum % 11);
  if (digit >= 10) digit = 0;
  if (digit !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
};

/**
 * Valida CNPJ
 * @param {string} cnpj - CNPJ a ser validado
 * @returns {boolean} True se CNPJ é válido
 */
export const isValidCNPJ = (cnpj) => {
  if (!cnpj) return false;
  
  const cleaned = String(cnpj).replace(/\D/g, '');
  
  if (cleaned.length !== 14) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  // Validação dos dígitos verificadores
  let length = cleaned.length - 2;
  let numbers = cleaned.substring(0, length);
  const digits = cleaned.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(0))) return false;
  
  length++;
  numbers = cleaned.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += parseInt(numbers.charAt(length - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
};

/**
 * Estados do Brasil
 */
export const ESTADOS_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];
