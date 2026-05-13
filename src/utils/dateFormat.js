/**
 * Utilitários para formatação de datas em pt-BR
 * Locale: pt-BR (Português do Brasil)
 * Timezone: America/Sao_Paulo (Horário de Brasília)
 */

/**
 * Formata data e hora no padrão brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada (ex: "23/01/2026 15:30")
 */
export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata apenas a data no padrão brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data formatada (ex: "23/01/2026")
 */
export const formatDate = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Formata apenas a hora no padrão brasileiro
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Hora formatada (ex: "15:30")
 */
export const formatTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleTimeString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formata data por extenso
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data por extenso (ex: "23 de janeiro de 2026")
 */
export const formatDateLong = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  return d.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Formata data de forma relativa (ex: "há 2 horas")
 * @param {Date|string} date - Data a ser formatada
 * @returns {string} Data relativa
 */
export const formatRelativeTime = (date) => {
  if (!date) return '-';
  
  const d = new Date(date);
  const now = new Date();
  const diffMs = now - d;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'agora';
  if (diffMin < 60) return `há ${diffMin} minuto${diffMin !== 1 ? 's' : ''}`;
  if (diffHour < 24) return `há ${diffHour} hora${diffHour !== 1 ? 's' : ''}`;
  if (diffDay < 7) return `há ${diffDay} dia${diffDay !== 1 ? 's' : ''}`;
  
  return formatDate(date);
};

/**
 * Converte string de data brasileira para ISO (YYYY-MM-DD)
 * @param {string} brDate - Data no formato brasileiro (DD/MM/YYYY)
 * @returns {string} Data no formato ISO
 */
export const brDateToISO = (brDate) => {
  if (!brDate) return '';
  const [day, month, year] = brDate.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
};

/**
 * Converte data ISO para formato brasileiro (DD/MM/YYYY)
 * @param {string} isoDate - Data no formato ISO (YYYY-MM-DD)
 * @returns {string} Data no formato brasileiro
 */
export const isoDateToBR = (isoDate) => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
};

/**
 * Calcula idade a partir da data de nascimento
 * @param {Date|string} birthDate - Data de nascimento
 * @returns {number} Idade em anos
 */
export const calculateAge = (birthDate) => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDiff = now.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Verifica se uma data é hoje
 * @param {Date|string} date - Data a verificar
 * @returns {boolean}
 */
export const isToday = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

/**
 * Verifica se uma data está no passado
 * @param {Date|string} date - Data a verificar
 * @returns {boolean}
 */
export const isPast = (date) => {
  if (!date) return false;
  return new Date(date) < new Date();
};

/**
 * Verifica se uma data está no futuro
 * @param {Date|string} date - Data a verificar
 * @returns {boolean}
 */
export const isFuture = (date) => {
  if (!date) return false;
  return new Date(date) > new Date();
};
