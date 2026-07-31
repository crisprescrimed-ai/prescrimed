import { useState, useEffect, useCallback } from 'react';
import { Save, Building, Lock, Bell, User } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import usuarioService from '../services/usuario.service';
import empresaService from '../services/empresa.service';
import toast from 'react-hot-toast';
import { successMessage, customErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import PageHeader from '../components/common/PageHeader';

export default function Configuracoes() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('perfil');
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [perfilSaving, setPerfilSaving] = useState(false);
  const [empresaSaving, setEmpresaSaving] = useState(false);
  const [senhaSaving, setSenhaSaving] = useState(false);
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
    { id: 'notificacoes', nome: 'Notificações', icon: Bell }
  ];

  const lastProfileUpdate = summary?.lastUpdate
    ? new Date(summary.lastUpdate).toLocaleDateString('pt-BR')
    : 'Hoje';

  const securityScore = summary?.securityScore
    ? Math.round(summary.securityScore * 100)
    : 0;

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

    </div>
  );
}
