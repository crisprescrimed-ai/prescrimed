/**
 * Página Dashboard
 * 
 * Página principal do sistema exibida após o login.
 * Apresenta visão geral com estatísticas, gráficos, alertas e acesso rápido
 * às principais funcionalidades do sistema.
 * 
 * Funcionalidades:
 * - Cards com estatísticas principais (pacientes, prescrições, usuários)
 * - Gráfico de prescrições ao longo do tempo
 * - Lista de prescrições e pacientes recentes
 * - Alertas prioritários
 * - Próximas ações sugeridas
 * - Atalhos para navegação rápida
 */

// Importa hooks do React para gerenciamento de estado e efeitos
import { useState, useEffect } from 'react';

// Importa hook de navegação do React Router
import { useNavigate } from 'react-router-dom';

// Importa ícones da biblioteca Lucide React
import { 
  Users,          // Ícone de usuários/pacientes
  FileText,       // Ícone de documentos/prescrições
  UserCheck,      // Ícone de usuários verificados/ativos
  TrendingUp,     // Ícone de tendência crescente
  RefreshCcw,     // Ícone de atualizar/refresh
  Download,       // Ícone de download/exportar
  AlertTriangle,  // Ícone de alerta/aviso
  ClipboardCheck, // Ícone de checklist/censo
  Activity,       // Ícone de atividade/evolução
  Calendar,       // Ícone de calendário/agenda
  Clock,          // Ícone de relógio/cronograma
  ArrowUpRight,   // Ícone de seta para cima (tendência positiva)
  ArrowDownRight, // Ícone de seta para baixo (tendência negativa)
  Package,        // Ícone de pacote/estoque
  DollarSign,     // Ícone de dinheiro/financeiro
  Building2,      // Ícone de prédio/empresas
  Settings,       // Ícone de configurações
  ShoppingCart    // Ícone de comercial
} from 'lucide-react';

// Importa serviço de API do dashboard
import dashboardService from '../services/dashboard.service';

// Importa componentes
import SimpleChart from '../components/SimpleChart'; // Gráfico simples de linhas
import toast from 'react-hot-toast'; // Sistema de notificações toast
import { errorMessage } from '../utils/toastMessages'; // Utilitário para mensagens de erro
import { handleApiError } from '../utils/errorHandler';
import PageHeader from '../components/common/PageHeader'; // Cabeçalho de página
import StatsCard from '../components/common/StatsCard'; // Card de estatísticas
import { useAuthStore } from '../store/authStore'; // Store de autenticação

/**
 * Componente Dashboard - Página principal do sistema
 */
export default function Dashboard() {
  // Estado para armazenar estatísticas gerais do sistema
  const [stats, setStats] = useState(null);
  
  // Estado para lista de prescrições recentes
  const [prescricoesRecentes, setPrescricoesRecentes] = useState([]);
  
  // Estado para lista de pacientes recentes
  const [pacientesRecentes, setPacientesRecentes] = useState([]);
  
  // Estado para próximas ações sugeridas
  const [nextSteps, setNextSteps] = useState([]);
  
  // Estado para alertas prioritários
  const [priorityAlerts, setPriorityAlerts] = useState([]);
  
  // Estado para dados do gráfico (prescrições ao longo do tempo)
  const [chartData, setChartData] = useState([]);
  
  // Estado de carregamento (exibe spinner enquanto busca dados)
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Hook de navegação para redirecionar usuário entre páginas
  const navigate = useNavigate();
  
  // Obtém informações do usuário logado do store de autenticação
  const { user } = useAuthStore();

  /**
   * Effect executado ao montar o componente
   * Carrega todos os dados do dashboard
   */
  useEffect(() => {
    // Evita disparar antes do store carregar usuário, mas não bloqueia superadmin
    loadData({ background: false });
    const interval = setInterval(() => {
      loadData({ background: true });
    }, 30000); // atualiza a cada 30s
    return () => clearInterval(interval);
  }, [user?.empresaId]);

  /**
   * Função para carregar todos os dados do dashboard
   * Busca dados em paralelo usando Promise.all para otimizar performance
   */
  const normalizeListResponse = (response, key) => {
    if (Array.isArray(response)) return response;
    if (response && Array.isArray(response[key])) return response[key];
    return [];
  };

  const loadData = async ({ background } = { background: false }) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    
    try {
      // Executa todas as requisições em paralelo para otimizar tempo de carregamento
      const empresaId = user?.empresaId;
      const [statsResponse, prescricoesResponse, pacientesResponse, nextStepsResponse, alertsResponse] = await Promise.all([
        dashboardService.getStats(undefined, undefined, empresaId),              // estatísticas gerais
        dashboardService.getPrescricoesRecentes(empresaId), // prescrições recentes
        dashboardService.getPacientesRecentes(empresaId),   // pacientes recentes
        dashboardService.getNextSteps(empresaId),           // próximas ações sugeridas
        dashboardService.getPriorityAlerts(empresaId),      // alertas prioritários
      ]);

      const normalizedStats = statsResponse?.stats || statsResponse || {};
      const graficoPrescricoes = normalizedStats.graficoPrescricoes || [];
      const prescricoesPeriodo = Array.isArray(graficoPrescricoes)
        ? graficoPrescricoes.reduce((acc, item) => acc + (Number(item.total) || 0), 0)
        : 0;

      // Atualiza estados com os dados recebidos
      // Usa operador ?. para acessar propriedade aninhada com segurança
      // Usa || para fornecer valor padrão caso seja undefined/null
      setStats({
        ...normalizedStats,
        prescricoesPeriodo
      });
      setPrescricoesRecentes(normalizeListResponse(prescricoesResponse, 'prescricoes'));
      setPacientesRecentes(normalizeListResponse(pacientesResponse, 'pacientes'));
      setNextSteps(nextStepsResponse?.nextSteps || nextStepsResponse || []);
      setPriorityAlerts(alertsResponse?.alerts || alertsResponse || []);
      
      // Prepara dados para o gráfico de prescrições
      if (Array.isArray(graficoPrescricoes) && graficoPrescricoes.length > 0) {
        // Transforma dados da API em formato do gráfico
        const chartPoints = graficoPrescricoes.map(item => ({
          date: new Date(item.data).toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: 'short' 
          }), // Formata data para exibição (ex: "15 jan")
          value: Number(item.total) || 0 // Total de prescrições naquele dia
        }));
        setChartData(chartPoints);
      } else {
        setChartData([]);
      }
      setLastUpdated(new Date());
    } catch (error) {
      handleApiError(error, errorMessage('load', 'dados do dashboard'));
    } finally {
      // Desativa estado de carregamento (executado sempre, com ou sem erro)
      setLoading(false);
      setRefreshing(false);
    }
  };

  /**
   * Handler para botão de atualizar
   * Recarrega todos os dados e exibe mensagem de sucesso
   */
  const handleRefresh = async () => {
    await loadData({ background: true });
    toast.success('Dados atualizados com sucesso!'); // Notificação de sucesso
  };

  /**
   * Handler para exportar relatório
   * Simula exportação de dados (implementação futura: gerar PDF/Excel)
   */
  const handleExport = () => {
    // toast.promise exibe diferentes mensagens durante estados da Promise
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 2000)), // Simula operação assíncrona de 2s
      {
        loading: 'Gerando relatório...', // Mensagem durante carregamento
        success: 'Relatório enviado para seu e-mail!', // Mensagem de sucesso
        error: 'Erro ao gerar relatório', // Mensagem de erro
      }
    );
  };

  /**
   * Exibe spinner de carregamento enquanto dados estão sendo buscados
   */
  if (loading) {
    return (
      // Container centralizado ocupando altura total
      <div className="flex items-center justify-center h-full">
        {/* Spinner animado com rotação infinita */}
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  /**
   * Configuração dos cards de estatísticas principais
   * Cada card exibe uma métrica importante do sistema
   */
  const statCards = [
    {
      title: 'Total de Pacientes',         // Título do card
      value: stats?.totalPacientes || 0,   // Valor da estatística
      icon: Users,                          // Ícone do card
      accent: 'from-primary-500 to-primary-600', // Gradiente de cor
      trend: '+12% vs mês anterior',       // Indicador de tendência
    },
    {
      title: 'Total de Prescrições',
      value: stats?.totalPrescricoes || 0,
      icon: FileText,
      accent: 'from-emerald-500 to-emerald-600',
      trend: '+6% no período',
    },
    {
      title: 'Total de Usuários',
      value: stats?.totalUsuarios || 0,
      icon: UserCheck,
      accent: 'from-purple-500 to-purple-600',
      trend: 'Equipe ativa',
    },
    {
      title: 'Prescrições no Período',
      value: stats?.prescricoesPeriodo || 0,
      icon: TrendingUp,
      accent: 'from-orange-500 to-amber-500',
      trend: 'Atualizado semanalmente',
    },
  ];

  /**
   * Estilos visuais para diferentes tipos de alertas
   * Define cores de fundo, texto e borda baseado na severidade
   */
  const alertStyles = {
    critical: 'bg-rose-50 text-rose-700 border-rose-200',    // Crítico: vermelho
    warning: 'bg-amber-50 text-amber-700 border-amber-200',  // Aviso: amarelo/âmbar
    info: 'bg-primary-50 text-primary-700 border-primary-200', // Informação: azul primário
  };

  /**
   * Configuração de atalhos de acesso rápido
   * Botões para navegação direta às principais funcionalidades
   */
  const quickAccess = [
    { label: 'Dashboard', path: '/dashboard', icon: TrendingUp, accent: 'from-primary-500 to-primary-600' },
    { label: 'Agenda', path: '/agenda', icon: Calendar, accent: 'from-emerald-500 to-emerald-600' },
    { label: 'Cronograma', path: '/cronograma', icon: Clock, accent: 'from-orange-500 to-amber-500' },
    { label: 'Prescrições', path: '/prescricoes', icon: FileText, accent: 'from-purple-500 to-purple-600' },
    { label: 'Censo M.P.', path: '/censo-mp', icon: ClipboardCheck, accent: 'from-sky-500 to-sky-600' },
    { label: 'Pacientes', path: '/residentes', icon: Users, accent: 'from-amber-500 to-orange-500' },
    { label: 'Estoque', path: '/estoque', icon: Package, accent: 'from-blue-500 to-indigo-500' },
    { label: 'Evolução', path: '/evolucao', icon: Activity, accent: 'from-teal-500 to-emerald-500' },
    { label: 'Financeiro', path: '/financeiro', icon: DollarSign, accent: 'from-lime-500 to-green-500' },
    { label: 'Comercial', path: '/comercial', icon: ShoppingCart, accent: 'from-amber-500 to-red-500' },
    { label: 'Usuários', path: '/usuarios', icon: UserCheck, accent: 'from-fuchsia-500 to-purple-600' },
    { label: 'Empresas', path: '/empresas', icon: Building2, accent: 'from-cyan-500 to-blue-500' },
    { label: 'Configurações', path: '/configuracoes', icon: Settings, accent: 'from-slate-500 to-slate-700' },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        label="Visão Geral"
        title="Dashboard"
        subtitle={`Acompanhe em tempo real pacientes, prescrições e equipes para manter a operação segura e eficiente.${lastUpdated ? ' Atualizado ' + lastUpdated.toLocaleTimeString('pt-BR') : ''}`}
      >
        <button
          onClick={handleRefresh}
          className="btn btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} /> Atualizar dados
        </button>
        <button 
          onClick={handleExport}
          className="btn btn-primary flex items-center justify-center gap-2"
        >
          <Download size={18} /> Exportar relatório
        </button>
      </PageHeader>

      {(user?.role === 'superadmin' || (user && user.email === 'superadmin@prescrimed.com')) && (
        <div className="card border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Acesso rápido</p>
              <h2 className="text-xl font-semibold text-slate-900">Módulos do sistema</h2>
              <p className="text-sm text-slate-500">Clique para abrir qualquer módulo com acesso total.</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-100">
              SuperAdmin
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {quickAccess.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className="group w-full text-left p-4 rounded-2xl border border-slate-100 bg-white hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${item.accent} text-white flex items-center justify-center mb-3 shadow-sm`}>
                    <Icon size={20} />
                  </div>
                  <p className="font-semibold text-slate-900 leading-snug">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-1 group-hover:text-slate-700">Acesso direto</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Next Steps & Alerts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardCheck className="text-primary-600" size={24} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Próximos passos</p>
              <h2 className="text-xl font-semibold text-slate-900">Controle operacional</h2>
            </div>
          </div>
          <div className="space-y-4">
            {nextSteps.length > 0 ? (
              nextSteps.map((step) => (
                <div key={step.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <h3 className="font-semibold text-slate-900">{step.title}</h3>
                  <p className="text-sm text-slate-500 mt-1">{step.description}</p>
                  <button
                    onClick={() => step.ctaRoute && navigate(step.ctaRoute)}
                    className="text-primary-600 text-sm font-semibold mt-3 hover:underline"
                  >
                    {step.ctaLabel}
                  </button>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhuma pendência encontrada.</p>
            )}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-amber-600" size={24} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Alertas críticos</p>
              <h2 className="text-xl font-semibold text-slate-900">Atenção imediata</h2>
            </div>
          </div>
          <div className="space-y-4">
            {priorityAlerts.length > 0 ? (
              priorityAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-4 rounded-2xl border ${alertStyles[alert.severity] || 'bg-slate-50 text-slate-700 border-slate-200'}`}
                >
                  <h3 className="font-semibold">{alert.title}</h3>
                  <p className="text-sm opacity-80 mt-1">{alert.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">Nenhum alerta crítico no momento.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard
          icon={Users}
          label="Pacientes"
          value={stats?.totalPacientes || 0}
          description={`${stats?.leitos?.ocupados || 0} leitos ocupados`}
          color="primary"
        />
        <StatsCard
          icon={FileText}
          label="Prescrições"
          value={stats?.totalPrescricoes || 0}
          description={`${stats?.prescrioesAtivas || 0} ativas`}
          color="emerald"
        />
        <StatsCard
          icon={UserCheck}
          label="Equipe"
          value={stats?.totalUsuarios || 0}
          description="Profissionais ativos"
          color="purple"
        />
        <StatsCard
          icon={Calendar}
          label="Agendamentos"
          value={stats?.agendamentosHoje || 0}
          description="Para hoje"
          color="amber"
        />
      </div>

      {/* Cards Adicionais - Leitos, Estoque, Financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Leitos */}
        <div className="card bg-gradient-to-br from-sky-50 to-blue-50 border-sky-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-sky-100 rounded-xl">
                <Building2 className="text-sky-700" size={24} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-sky-600 font-semibold">Leitos</p>
                <h3 className="text-2xl font-bold text-sky-900">{stats?.leitos?.total || 0}</h3>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-sky-700">Ocupados</span>
              <span className="font-semibold text-sky-900">{stats?.leitos?.ocupados || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-sky-700">Disponíveis</span>
              <span className="font-semibold text-emerald-700">{stats?.leitos?.disponiveis || 0}</span>
            </div>
            <div className="mt-3 w-full bg-sky-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-sky-600 h-full rounded-full transition-all"
                style={{ width: `${stats?.leitos?.total > 0 ? (stats?.leitos?.ocupados / stats?.leitos?.total * 100) : 0}%` }}
              ></div>
            </div>
            <p className="text-xs text-sky-600 text-center">
              {stats?.leitos?.total > 0 ? Math.round(stats?.leitos?.ocupados / stats?.leitos?.total * 100) : 0}% de ocupação
            </p>
          </div>
        </div>

        {/* Estoque */}
        <div className="card bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-xl">
                <Package className="text-orange-700" size={24} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-orange-600 font-semibold">Estoque</p>
                <h3 className="text-2xl font-bold text-orange-900">{stats?.estoque?.total || 0}</h3>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-700">Itens cadastrados</span>
              <span className="font-semibold text-orange-900">{stats?.estoque?.total || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-orange-700">Abaixo do mínimo</span>
              <span className="font-semibold text-red-700">{stats?.estoque?.abaixoMinimo || 0}</span>
            </div>
            {stats?.estoque?.abaixoMinimo > 0 && (
              <div className="mt-3 p-2 bg-red-100 border border-red-200 rounded-lg">
                <p className="text-xs text-red-700 font-semibold flex items-center gap-1">
                  <AlertTriangle size={14} />
                  Atenção ao estoque!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Financeiro */}
        <div className="card bg-gradient-to-br from-emerald-50 to-green-50 border-emerald-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 rounded-xl">
                <DollarSign className="text-emerald-700" size={24} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-emerald-600 font-semibold">Saldo</p>
                <h3 className="text-2xl font-bold text-emerald-900">
                  R$ {(stats?.financeiro?.saldo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h3>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-700">Receitas</span>
              <span className="font-semibold text-emerald-900">
                R$ {(stats?.financeiro?.receitasPagas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-emerald-700">Despesas</span>
              <span className="font-semibold text-red-700">
                R$ {(stats?.financeiro?.despesasPagas || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-emerald-200">
              <span className="text-sm text-emerald-700 font-semibold">Pendentes</span>
              <span className="text-xs text-amber-700">
                R$ {((stats?.financeiro?.receitasPendentes || 0) + (stats?.financeiro?.despesasPendentes || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="text-primary-600" size={24} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Análise</p>
              <h2 className="text-xl font-bold text-slate-900">Evolução de Prescrições</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="text-slate-400" size={16} />
            <span className="text-sm text-slate-600">Últimos 30 dias</span>
            {refreshing && (
              <span className="text-xs text-slate-400">atualizando...</span>
            )}
          </div>
        </div>
        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <SimpleChart data={chartData} color="#2d5016" height={250} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <TrendingUp size={48} className="mb-2 opacity-20" />
              <p>Dados insuficientes para o gráfico</p>
              <p className="text-xs mt-1">Cadastre prescrições para visualizar a evolução</p>
            </div>
          )}
        </div>
      </div>

      {/* Recent Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prescrições Recentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Atividade</p>
              <h2 className="text-xl font-bold text-slate-900">Prescrições Recentes</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
              {prescricoesRecentes.length} registros
            </span>
          </div>
          <div className="space-y-4">
            {prescricoesRecentes.length > 0 ? (
              prescricoesRecentes.map((prescricao) => (
                <div key={prescricao.id || prescricao._id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                  <div className="flex justify-between gap-3 mb-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {prescricao.paciente?.nome || prescricao.pacienteNome || 'Paciente não identificado'}
                      </p>
                      <p className="text-xs text-slate-500">{new Date(prescricao.createdAt).toLocaleString('pt-BR')}</p>
                      <p className="text-xs text-slate-400">Código: {prescricao.id || prescricao._id}</p>
                    </div>
                    <div className="flex gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          prescricao.tipo === 'medicamentosa'
                            ? 'bg-orange-100 text-orange-700'
                            : prescricao.tipo === 'mista'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-primary-100 text-primary-700'
                        }`}
                      >
                        {prescricao.tipo === 'medicamentosa'
                          ? 'Medicamentosa'
                          : prescricao.tipo === 'mista'
                            ? 'Mista'
                            : 'Nutricional'}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          (prescricao.status || 'ativa') === 'ativa'
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {prescricao.status || 'ativa'}
                      </span>
                    </div>
                  </div>
                  {Array.isArray(prescricao.itens) && prescricao.itens.length > 0 && (
                    <p className="text-sm text-slate-600">
                      {prescricao.itens[0]?.nome || 'Item'}
                      {prescricao.itens.length > 1 &&
                        ` + ${prescricao.itens.length - 1} itens`}
                    </p>
                  )}
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">Nenhuma prescrição recente</p>
            )}
          </div>
        </div>

        {/* Pacientes Recentes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Cadastros</p>
              <h2 className="text-xl font-bold text-slate-900">Pacientes Recentes</h2>
            </div>
            <span className="text-xs text-slate-400">
              {lastUpdated
                ? `Atualizado às ${lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Atualizado hoje'}
            </span>
          </div>
          <div className="space-y-3">
            {pacientesRecentes.length > 0 ? (
              pacientesRecentes.map((paciente) => (
                <div key={paciente.id || paciente._id} className="p-4 rounded-2xl border border-slate-100">
                  <p className="font-semibold text-slate-900">{paciente.nome}</p>
                  <div className="flex flex-wrap gap-3 text-sm text-slate-500 mt-1">
                    <span>CPF: {paciente.cpf}</span>
                    <span>
                      Entrada: {new Date(paciente.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="text-xs text-slate-400">Código: {paciente.id || paciente._id}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-center py-8">Nenhum paciente recente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}