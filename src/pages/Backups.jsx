import { useEffect, useMemo, useState } from 'react';
import { Building2, Database, RefreshCcw, Download, Mail, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import empresaService from '../services/empresa.service';
import backupService from '../services/backup.service';
import AccessDeniedCard from '../components/common/AccessDeniedCard';
import { handleApiError } from '../utils/errorHandler';

function formatBytes(bytes) {
  const n = Number(bytes || 0);
  if (!Number.isFinite(n) || n <= 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  const value = n / 1024 ** i;
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

export default function Backups() {
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'superadmin';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [items, setItems] = useState([]);
  const [creating, setCreating] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  const selectedEmpresa = useMemo(() => empresas.find((e) => String(e.id) === String(empresaId)) || null, [empresas, empresaId]);

  const loadEmpresas = async () => {
    const data = await empresaService.getAll();
    const empresasList = Array.isArray(data) ? data : (data.empresas || []);
    setEmpresas(empresasList);
    if (!empresaId && empresasList.length > 0) {
      setEmpresaId(empresasList[0].id);
    }
  };

  const loadBackups = async (id) => {
    if (!id) {
      setItems([]);
      return;
    }
    const data = await backupService.listByEmpresa(id);
    setItems(Array.isArray(data?.items) ? data.items : []);
  };

  const refreshAll = async () => {
    try {
      setLoading(true);
      await loadEmpresas();
    } catch (error) {
      handleApiError(error, 'Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadBackups(empresaId).catch((error) => handleApiError(error, 'Erro ao carregar backups'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, isSuperAdmin]);

  const handleCreateBackup = async () => {
    if (!empresaId) return;
    try {
      setCreating(true);
      const res = await backupService.createForEmpresa(empresaId, { sendEmail });
      toast.success('Backup gerado com sucesso!');
      if (res?.email?.status === 'skipped' && sendEmail) {
        toast('Backup criado, mas e-mail não foi enviado (SMTP não configurado).', { icon: 'ℹ️' });
      }
      await loadBackups(empresaId);
    } catch (error) {
      handleApiError(error, 'Erro ao gerar backup');
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (filename) => {
    try {
      await backupService.downloadForEmpresa(empresaId, filename);
    } catch (error) {
      handleApiError(error, 'Erro ao baixar backup');
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <AccessDeniedCard
          message="Apenas Super Administradores podem acessar esta página."
          messageClassName="text-gray-600"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
          Institucional
        </p>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
                <Database className="text-primary-600" size={22} />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Backups</h1>
                <p className="text-slate-500 text-sm mt-1">Super Administrador</p>
              </div>
            </div>
            <p className="text-slate-500 mt-3 max-w-2xl">
              Gere backups manuais e faça download. O envio por e-mail depende de configuração SMTP no backend.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigate('/empresas')}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold bg-white hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-2">
                <Building2 size={16} /> Empresas
              </span>
            </button>
            <button
              type="button"
              onClick={refreshAll}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold bg-white hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} /> Atualizar
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-end">
          <div className="flex-1">
            <label className="block text-sm font-semibold text-slate-700 mb-1">Empresa</label>
            <select
              value={empresaId}
              onChange={(e) => setEmpresaId(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition"
            >
              {empresas.map((e) => (
                <option key={e.id} value={e.id}>
                  {(e.codigo ? `${e.codigo} - ` : '') + (e.nome || 'Empresa')}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={sendEmail}
                onChange={(e) => setSendEmail(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="inline-flex items-center gap-2">
                <Mail size={16} /> Enviar por e-mail
              </span>
            </label>

            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={!empresaId || creating}
              className="px-4 py-3 rounded-xl border border-primary-200 text-primary-700 text-sm font-semibold bg-primary-50 hover:bg-primary-100 disabled:opacity-50"
            >
              <span className="inline-flex items-center gap-2">
                {creating ? (
                  <span className="w-4 h-4 border-2 border-primary-300 border-t-primary-700 rounded-full animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Gerar backup
              </span>
            </button>
          </div>
        </div>

        {selectedEmpresa && (
          <p className="text-xs text-slate-500 mt-3">
            Destinatário preferencial: {selectedEmpresa.email || 'email da empresa não definido (fallback: admin)'}
          </p>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-sm font-semibold text-slate-700">Backups disponíveis</h2>
          <p className="text-xs text-slate-500 mt-1">Armazenamento local em {"data/backups"}</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-slate-500">Nenhum backup encontrado para esta empresa.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-white border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Arquivo</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Tamanho</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Atualizado</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {items.map((b) => (
                  <tr key={b.filename} className="hover:bg-slate-50 transition">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900">{b.filename}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{formatBytes(b.size)}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{new Date(b.updatedAt).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleDownload(b.filename)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold bg-white hover:bg-slate-50"
                      >
                        <Download size={16} /> Baixar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
