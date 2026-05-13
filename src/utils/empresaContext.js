import empresaService from '../services/empresa.service';

export const SUPERADMIN_EMPRESA_STORAGE_KEY = 'superadminEmpresaId';
export const EMPRESA_CONTEXT_CHANGED_EVENT = 'empresaContextChanged';

export function getSelectedEmpresaId() {
  const raw = localStorage.getItem(SUPERADMIN_EMPRESA_STORAGE_KEY);
  const value = raw != null ? String(raw).trim() : '';
  return value ? value : null;
}

export function isSuperadminAllEmpresasSelected(user) {
  return user?.role === 'superadmin' && !getSelectedEmpresaId();
}

export function buildEmpresaHeaderConfig(empresaId) {
  return { headers: { 'X-Empresa-Id': String(empresaId) } };
}

export function emitEmpresaContextChanged(empresaId) {
  try {
    window.dispatchEvent(
      new CustomEvent(EMPRESA_CONTEXT_CHANGED_EVENT, {
        detail: { empresaId: empresaId ? String(empresaId) : null }
      })
    );
  } catch {
    // ignore
  }
}

export function subscribeEmpresaContextChanged(handler) {
  const listener = (event) => handler?.(event?.detail || {});
  window.addEventListener(EMPRESA_CONTEXT_CHANGED_EVENT, listener);
  return () => window.removeEventListener(EMPRESA_CONTEXT_CHANGED_EVENT, listener);
}

export async function listEmpresasForSuperadmin() {
  const data = await empresaService.getAll();
  const list = Array.isArray(data) ? data : (data?.empresas || data?.data || []);
  return (Array.isArray(list) ? list : [])
    .map((e) => ({ id: e?.id, nome: e?.nome, codigo: e?.codigo }))
    .filter((e) => e.id);
}
