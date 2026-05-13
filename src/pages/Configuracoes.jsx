import { useState, useEffect, useCallback } from 'react';
import { Save, Building, Lock, Bell, User, Database, Link2, Copy, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import usuarioService from '../services/usuario.service';
import empresaService from '../services/empresa.service';
import toast from 'react-hot-toast';
import { successMessage, customErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import PageHeader from '../components/common/PageHeader';
import {
  clearSupabaseRuntimeConfig,
  getSupabaseAnonKey,
  getSupabaseConfigSource,
  getSupabaseConfigStatus,
  getSupabaseProjectRef,
  getSupabaseRuntimeConfig,
  getSupabaseUrl,
  saveSupabaseRuntimeConfig,
  validateSupabaseConnection,
} from '../lib/supabase';

export default function Configuracoes() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('perfil');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [perfilSaving, setPerfilSaving] = useState(false);
  const [empresaSaving, setEmpresaSaving] = useState(false);
  const [senhaSaving, setSenhaSaving] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState(() => getSupabaseConfigStatus());
  const [supabaseUrl, setSupabaseUrl] = useState(() => getSupabaseUrl());
  const [supabaseProjectRef, setSupabaseProjectRef] = useState(() => getSupabaseProjectRef());
  const [supabaseConfigSource, setSupabaseConfigSource] = useState(() => getSupabaseConfigSource());
  const [supabaseRuntimeConfig, setSupabaseRuntimeConfig] = useState(() => getSupabaseRuntimeConfig());
  const [supabaseForm, setSupabaseForm] = useState(() => ({
    url: getSupabaseRuntimeConfig().url || getSupabaseUrl(),
    anonKey: getSupabaseRuntimeConfig().anonKey || getSupabaseAnonKey(),
  }));
  const [supabaseSaving, setSupabaseSaving] = useState(false);
  const [supabaseTesting, setSupabaseTesting] = useState(false);
  const [supabaseConnectionResult, setSupabaseConnectionResult] = useState(null);
  const [formData, setFormData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: user?.telefone || '',
    especialidade: user?.especialidade || '',
    crm: user?.crm || '',
    crmUf: user?.crmUf || ''
  });

  const [empresa, setEmpresa] = useState({
    nome: '',
    cnpj: '',
    endereco: '',
    telefone: ''
  });
  const [empresaLoading, setEmpresaLoading] = useState(user?.role === 'admin');

  useEffect(() => {
    setFormData({
      nome: user?.nome || '',
      email: user?.email || '',
      telefone: user?.telefone || '',
      especialidade: user?.especialidade || '',
      crm: user?.crm || '',
      crmUf: user?.crmUf || '',
    });
  }, [user]);

  const syncSupabaseState = useCallback(() => {
    const runtimeConfig = getSupabaseRuntimeConfig();
    setSupabaseRuntimeConfig(runtimeConfig);
    setSupabaseStatus(getSupabaseConfigStatus());
    setSupabaseUrl(getSupabaseUrl());
    setSupabaseProjectRef(getSupabaseProjectRef());
    setSupabaseConfigSource(getSupabaseConfigSource());
    setSupabaseForm({
      url: runtimeConfig.url || getSupabaseUrl(),
      anonKey: runtimeConfig.anonKey || getSupabaseAnonKey(),
    });
  }, []);

  useEffect(() => {
    syncSupabaseState();
  }, [syncSupabaseState]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await usuarioService.getProfileSummary();
      setSummary(data);
    } catch (error) {
      handleApiError(error, 'Não foi possível carregar o resumo do perfil');
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const loadEmpresa = useCallback(async () => {
    if (user?.role !== 'admin') return;
    setEmpresaLoading(true);
    try {
      const data = await empresaService.getMyCompany();
      setEmpresa({
        nome: data?.nome || '',
        cnpj: data?.cnpj || '',
        endereco: data?.endereco || '',
        telefone: data?.telefone || '',
      });
    } catch (error) {
      handleApiError(error, 'Não foi possível carregar os dados da empresa');
    } finally {
      setEmpresaLoading(false);
    }
  }, [user?.role]);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadEmpresa();
    }
  }, [user?.role, loadEmpresa]);

  const persistUser = useCallback((updates) => {
    useAuthStore.setState((state) => {
      const nextUser = { ...(state.user || {}), ...updates };
      localStorage.setItem('user', JSON.stringify(nextUser));
      return { user: nextUser };
    });
  }, []);

  const handleSavePerfil = async (e) => {
    e.preventDefault();
    setPerfilSaving(true);
    const payload = {
      nome: formData.nome,
      email: formData.email,
      telefone: formData.telefone,
      especialidade: formData.especialidade,
      crm: formData.crm,
    };

    try {
      const data = await usuarioService.updateMe(payload);
      const updatedUser = data?.usuario || payload;
      persistUser(updatedUser);
      toast.success(successMessage('update', 'Perfil', { suffix: '!' }));
      loadSummary();
    } catch (error) {
      handleApiError(error, 'Erro ao atualizar perfil');
    } finally {
      setPerfilSaving(false);
    }
  };

  const handleSaveEmpresa = async (e) => {
    e.preventDefault();
    if (user?.role !== 'admin') return;
    setEmpresaSaving(true);
    try {
      await empresaService.updateMyCompany(empresa);
      toast.success('Dados da empresa atualizados!');
      loadEmpresa();
    } catch (error) {
      handleApiError(error, 'Erro ao atualizar empresa');
    } finally {
      setEmpresaSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!user?.id) {
      toast.error('Usuário não identificado');
      return;
    }

    const form = e.currentTarget;
    const senhaAtual = form.senhaAtual.value;
    const novaSenha = form.novaSenha.value;
    const confirmaSenha = form.confirmaSenha.value;

    if (novaSenha !== confirmaSenha) {
      toast.error(customErrorMessage('passwordMismatch'));
      return;
    }

    try {
      setSenhaSaving(true);
      await usuarioService.updatePassword(user.id, senhaAtual, novaSenha);
      toast.success('Senha alterada com sucesso!');
      form.reset();
    } catch (error) {
      handleApiError(error, 'Erro ao alterar senha');
    } finally {
      setSenhaSaving(false);
    }
  };

  const tabs = [
    { id: 'perfil', nome: 'Perfil', icon: User },
    { id: 'empresa', nome: 'Empresa', icon: Building },
    { id: 'seguranca', nome: 'Segurança', icon: Lock },
    { id: 'notificacoes', nome: 'Notificações', icon: Bell },
    { id: 'integracoes', nome: 'Integrações', icon: Database }
  ];

  const lastProfileUpdate = summary?.lastUpdate
    ? new Date(summary.lastUpdate).toLocaleDateString('pt-BR')
    : 'Hoje';

  const securityScore = summary?.securityScore
    ? Math.round(summary.securityScore * 100)
    : 0;

  const supabaseStatusMeta = {
    ready: {
      label: 'Pronto para uso no frontend',
      badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      description: 'URL e anon key foram carregadas no build atual. O cliente já pode consumir tabelas, auth ou storage conforme as políticas do projeto.',
    },
    partial: {
      label: 'Configuração parcial',
      badge: 'bg-amber-100 text-amber-700 border-amber-200',
      description: 'A URL do projeto está preenchida, mas a anon key ainda precisa ser definida para habilitar chamadas reais pelo SDK no navegador.',
    },
    missing: {
      label: 'Não configurado',
      badge: 'bg-slate-100 text-slate-700 border-slate-200',
      description: 'O frontend ainda não recebeu as variáveis necessárias do Supabase.',
    },
  };

  const currentSupabaseMeta = supabaseStatusMeta[supabaseStatus] || supabaseStatusMeta.missing;

  const supabaseSourceLabel = {
    runtime: 'Configuração local do navegador',
    build: 'Variáveis do build atual',
    none: 'Nenhuma origem ativa',
  };

  const handleCopySupabaseEnv = async () => {
    const block = [
      `VITE_SUPABASE_URL=${supabaseUrl || 'https://bytfmgzozogdacsajllh.supabase.co'}`,
      'VITE_SUPABASE_ANON_KEY=<cole-aqui-a-anon-key-publica>',
    ].join('\n');

    try {
      await navigator.clipboard.writeText(block);
      toast.success('Bloco de variáveis do Supabase copiado.');
    } catch {
      toast.error('Não foi possível copiar automaticamente.');
    }
  };

  const handleSaveSupabaseRuntimeConfig = async (event) => {
    event.preventDefault();
    setSupabaseSaving(true);

    try {
      saveSupabaseRuntimeConfig(supabaseForm);
      syncSupabaseState();
      setSupabaseConnectionResult(null);
      toast.success('Configuração local do Supabase salva neste navegador.');
    } catch {
      toast.error('Não foi possível salvar a configuração local.');
    } finally {
      setSupabaseSaving(false);
    }
  };

  const handleClearSupabaseRuntimeConfig = () => {
    clearSupabaseRuntimeConfig();
    syncSupabaseState();
    setSupabaseConnectionResult(null);
    toast.success('Configuração local removida.');
  };

  const handleTestSupabaseConnection = async () => {
    setSupabaseTesting(true);

    const result = await validateSupabaseConnection(supabaseForm);

    setSupabaseConnectionResult(result);

    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    setSupabaseTesting(false);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        label="Central"
        title="Configurações"
        subtitle="Personalize o perfil, mantenha os dados da empresa atualizados e revise as preferências de segurança e comunicação em um só lugar."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card bg-gradient-to-br from-primary-50 to-white">
          <p className="text-xs uppercase tracking-[0.3em] text-primary-600">Perfil</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">{user?.nome || 'Usuário'}</p>
          <p className="text-xs text-slate-500 mt-1">Última atualização: {lastProfileUpdate}</p>
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Segurança</p>
          <p className="text-3xl font-semibold text-slate-900 mt-2">
            {summaryLoading ? '---' : `${securityScore}%`}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summaryLoading
              ? 'Carregando resumo de segurança...'
              : summary?.pendingSecurityTasks?.length
                ? 'Complete as ações recomendadas para atingir 100%.'
                : 'Nenhuma pendência crítica identificada.'}
          </p>
          {summary?.pendingSecurityTasks?.length > 0 && (
            <ul className="text-xs text-slate-500 mt-3 space-y-1 list-disc list-inside">
              {summary.pendingSecurityTasks.slice(0, 2).map((task) => (
                <li key={task}>{task}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="card">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Plano</p>
          <p className="text-xl font-semibold text-slate-900 mt-2">
            {summary?.planLabel || 'Profissional'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {summary?.planDescription || 'Suporte prioritário e integrações liberadas.'}
          </p>
        </div>
        <div className="card md:col-span-3 lg:col-span-1">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Supabase</p>
          <p className="text-xl font-semibold text-slate-900 mt-2">{currentSupabaseMeta.label}</p>
          <p className="text-xs text-slate-500 mt-1">{supabaseProjectRef || 'project-ref pendente'} • frontend</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white/70 border border-slate-100 rounded-2xl p-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-primary-50 to-primary-100 text-primary-700 shadow-inner'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Icon size={18} />
              <span className="hidden sm:inline">{tab.nome}</span>
            </button>
          );
        })}
      </div>

      {/* Perfil Tab */}
      {activeTab === 'perfil' && (
        <div className="card">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Perfil</p>
            <h2 className="text-xl font-semibold text-slate-900">Dados Pessoais</h2>
          </div>
          <form onSubmit={handleSavePerfil} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  className="input"
                  value={formData.nome}
                  onChange={(e) => setFormData({...formData, nome: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">E-mail</label>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Telefone</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.telefone}
                  onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Especialidade</label>
                <input
                  type="text"
                  className="input"
                  value={formData.especialidade}
                  onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">CRM</label>
                <input
                  type="text"
                  className="input"
                  value={formData.crm}
                  onChange={(e) => setFormData({...formData, crm: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">UF do CRM</label>
                <input
                  type="text"
                  className="input"
                  maxLength="2"
                  value={formData.crmUf}
                  onChange={(e) => setFormData({...formData, crmUf: e.target.value.toUpperCase()})}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
              disabled={perfilSaving}
            >
              <Save size={18} />
              {perfilSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}

      {/* Empresa Tab */}
      {activeTab === 'empresa' && user?.role === 'admin' && (
        <div className="card">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Organização</p>
            <h2 className="text-xl font-semibold text-slate-900">Dados da Empresa</h2>
          </div>
          {empresaLoading && (
            <p className="text-sm text-slate-400 mb-4">Carregando dados cadastrados...</p>
          )}
          <form onSubmit={handleSaveEmpresa} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  Nome da Empresa
                </label>
                <input
                  type="text"
                  className="input"
                  value={empresa.nome}
                  onChange={(e) => setEmpresa({...empresa, nome: e.target.value})}
                  disabled={empresaLoading}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">CNPJ</label>
                <input
                  type="text"
                  className="input"
                  value={empresa.cnpj}
                  onChange={(e) => setEmpresa({...empresa, cnpj: e.target.value})}
                  disabled={empresaLoading}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-600 mb-2">Endereço</label>
                <input
                  type="text"
                  className="input"
                  value={empresa.endereco}
                  onChange={(e) => setEmpresa({...empresa, endereco: e.target.value})}
                  disabled={empresaLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Telefone</label>
                <input
                  type="tel"
                  className="input"
                  value={empresa.telefone}
                  onChange={(e) => setEmpresa({...empresa, telefone: e.target.value})}
                  disabled={empresaLoading}
                />
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
              disabled={empresaSaving || empresaLoading}
            >
              <Save size={18} />
              {empresaSaving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </form>
        </div>
      )}

      {/* Segurança Tab */}
      {activeTab === 'seguranca' && (
        <div className="card">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Segurança</p>
            <h2 className="text-xl font-semibold text-slate-900">Alterar Senha</h2>
          </div>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Senha Atual</label>
              <input
                type="password"
                name="senhaAtual"
                required
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Nova Senha</label>
              <input
                type="password"
                name="novaSenha"
                required
                minLength="6"
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-2">Confirmar Nova Senha</label>
              <input
                type="password"
                name="confirmaSenha"
                required
                minLength="6"
                className="input"
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
              disabled={senhaSaving}
            >
              <Lock size={18} />
              {senhaSaving ? 'Atualizando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      )}

      {/* Notificações Tab */}
      {activeTab === 'notificacoes' && (
        <div className="card">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Alertas</p>
            <h2 className="text-xl font-semibold text-slate-900">Preferências de Notificações</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-primary-600" />
              <span className="text-gray-700">Receber e-mails sobre novas prescrições</span>
            </label>
            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input type="checkbox" defaultChecked className="rounded text-primary-600" />
              <span className="text-gray-700">Notificar sobre novos pacientes</span>
            </label>
            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input type="checkbox" className="rounded text-primary-600" />
              <span className="text-gray-700">Lembretes de consultas</span>
            </label>
            <label className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg cursor-pointer">
              <input type="checkbox" className="rounded text-primary-600" />
              <span className="text-gray-700">Atualizações do sistema</span>
            </label>
            <button className="btn btn-primary flex items-center gap-2 mt-6">
              <Save size={18} />
              Salvar Preferências
            </button>
          </div>
        </div>
      )}

      {activeTab === 'integracoes' && (
        <div className="card space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Integrações</p>
            <h2 className="text-xl font-semibold text-slate-900">Supabase no Frontend</h2>
            <p className="text-sm text-slate-500 mt-2">
              O backend continua operando com PostgreSQL via Sequelize. Esta área prepara o React para usar o SDK do Supabase quando você definir a anon key pública do projeto.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Status</p>
                  <p className="text-lg font-semibold text-slate-900 mt-2">{currentSupabaseMeta.label}</p>
                </div>
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${currentSupabaseMeta.badge}`}>
                  {supabaseStatus}
                </span>
              </div>
              <p className="text-sm text-slate-600 mt-3">{currentSupabaseMeta.description}</p>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Projeto</p>
                  <p className="font-medium text-slate-900 break-all">{supabaseProjectRef || 'Não identificado'}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">URL</p>
                  <p className="font-medium text-slate-900 break-all">{supabaseUrl || 'Não definida'}</p>
                </div>
                <div className="rounded-xl bg-white border border-slate-200 p-3 md:col-span-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Origem ativa</p>
                  <p className="font-medium text-slate-900">{supabaseSourceLabel[supabaseConfigSource] || supabaseSourceLabel.none}</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Próxima ação</p>
              <p className="text-sm text-slate-600 mt-3">
                Você pode usar o build atual ou salvar uma configuração local neste navegador para testar o SDK sem novo deploy.
              </p>
              <button
                type="button"
                onClick={handleCopySupabaseEnv}
                className="btn btn-primary flex items-center gap-2 mt-4"
              >
                <Copy size={16} />
                Copiar bloco .env
              </button>
            </div>
          </div>

          <form onSubmit={handleSaveSupabaseRuntimeConfig} className="grid grid-cols-1 xl:grid-cols-[1.2fr,1fr] gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Configuração Runtime</p>
                <h3 className="text-lg font-semibold text-slate-900">Ativar neste navegador</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Salve a URL e a anon key pública localmente para usar o Supabase agora, sem alterar o backend nem depender de novo commit.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">URL do projeto</label>
                <input
                  type="url"
                  className="input"
                  value={supabaseForm.url}
                  onChange={(event) => setSupabaseForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://seu-projeto.supabase.co"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">Anon key pública</label>
                <textarea
                  className="input min-h-[132px] resize-y"
                  value={supabaseForm.anonKey}
                  onChange={(event) => setSupabaseForm((current) => ({ ...current, anonKey: event.target.value }))}
                  placeholder="Cole aqui a chave pública do frontend"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="btn btn-primary flex items-center gap-2 disabled:opacity-60"
                  disabled={supabaseSaving}
                >
                  <Save size={16} />
                  {supabaseSaving ? 'Salvando...' : 'Salvar neste navegador'}
                </button>

                <button
                  type="button"
                  onClick={handleTestSupabaseConnection}
                  className="btn btn-secondary flex items-center gap-2 disabled:opacity-60"
                  disabled={supabaseTesting}
                >
                  <RefreshCw size={16} className={supabaseTesting ? 'animate-spin' : ''} />
                  {supabaseTesting ? 'Validando...' : 'Testar conexão'}
                </button>

                <button
                  type="button"
                  onClick={handleClearSupabaseRuntimeConfig}
                  className="btn btn-secondary flex items-center gap-2"
                >
                  <Trash2 size={16} />
                  Limpar configuração local
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-1">Diagnóstico</p>
                <h3 className="text-lg font-semibold text-slate-900">Estado atual da integração</h3>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Override local</p>
                <p className="text-sm font-medium text-slate-900">
                  {supabaseRuntimeConfig.url || supabaseRuntimeConfig.anonKey ? 'Ativo neste navegador' : 'Não configurado'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-400 mb-2">Teste de conexão</p>
                <p className="text-sm text-slate-700">
                  {supabaseConnectionResult
                    ? supabaseConnectionResult.message
                    : 'Execute o teste para validar URL e anon key antes de usar tabelas, auth ou storage.'}
                </p>
                {supabaseConnectionResult?.status ? (
                  <p className="text-xs text-slate-500 mt-2">Status HTTP: {supabaseConnectionResult.status}</p>
                ) : null}
              </div>

              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-600">
                A chave salva aqui fica apenas no navegador atual. Para produção permanente, continue usando as variáveis de ambiente do frontend.
              </div>
            </div>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-slate-950 text-slate-100 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Link2 size={16} />
              Variáveis esperadas no frontend
            </div>
            <pre className="mt-4 overflow-x-auto text-xs leading-6 whitespace-pre-wrap">
{`VITE_SUPABASE_URL=${supabaseUrl || 'https://bytfmgzozogdacsajllh.supabase.co'}
VITE_SUPABASE_ANON_KEY=<cole-aqui-a-anon-key-publica>`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
