import { apiErrorCode, apiErrorMessage, friendlyErrorFromCode } from './toastMessages';

/**
 * Exibe uma mensagem de erro amigável com base no código retornado pela API.
 * Também retorna a mensagem para uso opcional em logs.
 */
export function handleApiError(error, fallbackMessage = 'Ocorreu um erro.', opts) {
  try {
    const code = apiErrorCode(error);
    const friendly = friendlyErrorFromCode(code);
    const message = friendly || apiErrorMessage(error, fallbackMessage);
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('error', message, opts);
    }
    return message;
  } catch (_) {
    if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
      window.showToast('error', fallbackMessage, opts);
    }
    return fallbackMessage;
  }
}

/**
 * Exibe mensagem de sucesso padrão com opção de customização.
 */
export function showSuccess(message = 'Ação realizada com sucesso.', opts) {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast('success', message, opts);
  }
  return message;
}

/**
 * Helper simples para validar formulário e exibir mensagem genérica.
 */
export function handleFormInvalid(message = 'Por favor, corrija os erros no formulário') {
  if (typeof window !== 'undefined' && typeof window.showToast === 'function') {
    window.showToast('error', message);
  }
  return false;
}
