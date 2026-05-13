import { useState, useEffect } from 'react';
import { 
  Plus,
  FileDown,
  FileText, 
  Users, 
  ShieldAlert, 
  AlertTriangle, 
  AlertCircle,
  RefreshCcw,
  Edit,
  Trash2,
  X,
  Activity,
  Heart,
  Wind,
  Thermometer,
  Droplet,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';
import enfermagemService from '../services/enfermagem.service';
import pacienteService from '../services/paciente.service';
import estoqueService from '../services/estoque.service';
import { successMessage, errorMessage, apiErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import SearchFilterBar from '../components/common/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
import ActionIconButton from '../components/common/ActionIconButton';
import { openPrintWindow, escapeHtml } from '../utils/printWindow';
import { buildEmpresaHeaderConfig, isSuperadminAllEmpresasSelected, listEmpresasForSuperadmin, subscribeEmpresaContextChanged } from '../utils/empresaContext';
import { 
  TableContainer, 
  MobileGrid, 
  MobileCard, 
  TableWrapper, 
  TableHeader, 
  TBody, 
  Tr, 
  Td 
} from '../components/common/Table';

export default function Evolucao() {
  // Auth store
  const { user } = useAuthStore();
  
  // Estados principais
  const [registros, setRegistros] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [itensEstoque, setItensEstoque] = useState([]);
  const [itensUtilizados, setItensUtilizados] = useState([]); // [{id, nome, quantidade}]
  
  // Estatísticas
  const [stats, setStats] = useState({
    registrosHoje: 0,
    pacientesComRegistro: 0,
    riscoQueda: 0,
    alertasCriticos: 0
  });

  // Estado do formulário
  const [formData, setFormData] = useState({
    pacienteId: '',
    tipo: 'evolucao',
    titulo: '',
    descricao: '',
    estadoGeral: 'bom',
    riscoQueda: '',
    riscoLesao: '',
    alerta: false,
    prioridade: 'baixa',
    observacoes: '',
    pa: '',
    fc: '',
    fr: '',
    temp: '',
    sato2: '',
    glicemia: ''
  });

  // Erros de validação
  const [errors, setErrors] = useState({});

  // Carregar dados ao montar o componente
  useEffect(() => {
    loadData();
    loadPacientes();
    loadStats();
    loadItensEstoque();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user?.role]);

  useEffect(() => {
    return subscribeEmpresaContextChanged(() => {
      setPage(1);
      loadData();
      loadPacientes();
      loadStats();
      loadItensEstoque();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Função para carregar registros de enfermagem
  const loadData = async () => {
    try {
      setLoading(true);
      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);

      if (shouldAggregateAll) {
        toast.loading('Carregando evolução de todas as empresas...', { id: 'evolucao-load-all' });
        const empresas = await listEmpresasForSuperadmin();
        const perCompanyLimit = Math.max(page * pageSize, pageSize);

        const results = await Promise.all(
          (empresas || []).map(async (empresa) => {
            const config = buildEmpresaHeaderConfig(empresa.id);
            const data = await enfermagemService.getAll({ page: 1, pageSize: perCompanyLimit }, config);
            const items = Array.isArray(data)
              ? data
              : (Array.isArray(data?.items) ? data.items : []);
            const total = Array.isArray(data) ? data.length : (Number(data?.total) || items.length);
            return { empresa, items, total };
          })
        );

        const merged = results
          .flatMap(({ empresa, items }) => {
            const empresaLabel = empresa
              ? `${empresa.codigo ? `${empresa.codigo} - ` : ''}${empresa.nome || 'Empresa'}`
              : null;
            return (items || []).map((r) => ({
              ...r,
              __empresaId: empresa?.id,
              empresaLabel
            }));
          })
          .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

        const totalGlobal = results.reduce((acc, r) => acc + (Number(r.total) || 0), 0);
        const start = (page - 1) * pageSize;
        const slice = merged.slice(start, start + pageSize);

        setRegistros(slice);
        setTotal(totalGlobal);
        toast.dismiss('evolucao-load-all');
        return;
      }

      const data = await enfermagemService.getAll({ page, pageSize });
      if (Array.isArray(data)) {
        setRegistros(data);
        setTotal(data.length);
      } else {
        setRegistros(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setPageSize(Number(data.pageSize) || 10);
      }
    } catch (error) {
      toast.dismiss('evolucao-load-all');
      handleApiError(error, errorMessage('load', 'registros'));
    } finally {
      setLoading(false);
    }
  };

  // Função para carregar pacientes
  const loadPacientes = async () => {
    try {
      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);

      if (shouldAggregateAll) {
        const empresas = await listEmpresasForSuperadmin();
        const results = await Promise.all(
          (empresas || []).map(async (empresa) => {
            const config = buildEmpresaHeaderConfig(empresa.id);
            const data = await pacienteService.getAll('', config);
            const lista = Array.isArray(data) ? data : (data?.pacientes || data?.items || []);
            return { empresa, pacientes: Array.isArray(lista) ? lista : [] };
          })
        );

        const merged = results.flatMap(({ empresa, pacientes }) => {
          const empresaLabel = empresa
            ? `${empresa.codigo ? `${empresa.codigo} - ` : ''}${empresa.nome || 'Empresa'}`
            : null;
          return (pacientes || []).map((p) => ({
            ...p,
            __empresaId: empresa?.id,
            empresaLabel
          }));
        });

        setPacientes(merged);
        return;
      }

      const data = await pacienteService.getAll();
      const lista = Array.isArray(data) ? data : (data.pacientes || []);
      setPacientes(lista);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
    }
  };

  // Função para carregar estatísticas
  const loadStats = async () => {
    try {
      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);

      if (shouldAggregateAll) {
        const empresas = await listEmpresasForSuperadmin();
        const results = await Promise.all(
          (empresas || []).map(async (empresa) => {
            const config = buildEmpresaHeaderConfig(empresa.id);
            const data = await enfermagemService.getStats(config);
            return data || {};
          })
        );

        const merged = results.reduce(
          (acc, cur) => ({
            registrosHoje: (acc.registrosHoje || 0) + (Number(cur.registrosHoje) || 0),
            pacientesComRegistro: (acc.pacientesComRegistro || 0) + (Number(cur.pacientesComRegistro) || 0),
            riscoQueda: (acc.riscoQueda || 0) + (Number(cur.riscoQueda) || 0),
            alertasCriticos: (acc.alertasCriticos || 0) + (Number(cur.alertasCriticos) || 0)
          }),
          { registrosHoje: 0, pacientesComRegistro: 0, riscoQueda: 0, alertasCriticos: 0 }
        );

        setStats(merged);
        return;
      }

      const data = await enfermagemService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  // Função para carregar itens do estoque
  const loadItensEstoque = async () => {
    try {
      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);

      if (shouldAggregateAll) {
        const empresas = await listEmpresasForSuperadmin();
        const results = await Promise.all(
          (empresas || []).map(async (empresa) => {
            const config = buildEmpresaHeaderConfig(empresa.id);
            const [medicamentos, alimentos] = await Promise.all([
              estoqueService.getMedicamentos({}, config),
              estoqueService.getAlimentos({}, config)
            ]);
            return {
              empresa,
              medicamentos: Array.isArray(medicamentos) ? medicamentos : (medicamentos?.items || []),
              alimentos: Array.isArray(alimentos) ? alimentos : (alimentos?.items || [])
            };
          })
        );

        const merged = results.flatMap(({ empresa, medicamentos, alimentos }) => {
          const empresaLabel = empresa
            ? `${empresa.codigo ? `${empresa.codigo} - ` : ''}${empresa.nome || 'Empresa'}`
            : null;
          const norm = (list) => (Array.isArray(list) ? list : []).map((it) => ({
            ...it,
            __empresaId: empresa?.id,
            empresaLabel
          }));
          return [...norm(medicamentos), ...norm(alimentos)];
        });

        setItensEstoque(merged);
        return;
      }

      const medicamentosRes = await estoqueService.getMedicamentos();
      const alimentosRes = await estoqueService.getAlimentos();
      const medicamentos = Array.isArray(medicamentosRes) ? medicamentosRes : (medicamentosRes?.items || []);
      const alimentos = Array.isArray(alimentosRes) ? alimentosRes : (alimentosRes?.items || []);
      setItensEstoque([...medicamentos, ...alimentos]);
    } catch (error) {
      console.error('Erro ao carregar itens do estoque:', error);
    }
  };

  // Função para validar formulário
  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.pacienteId) newErrors.pacienteId = 'Selecione um residente';
    if (!formData.titulo.trim()) newErrors.titulo = 'Título é obrigatório';
    if (!formData.descricao.trim()) newErrors.descricao = 'Descrição é obrigatória';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Função para salvar registro (criar ou atualizar)
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      let sinaisVitais = null;
      if (
        formData.pa ||
        formData.fc ||
        formData.fr ||
        formData.temp ||
        formData.sato2 ||
        formData.glicemia
      ) {
        sinaisVitais = {
          pa: formData.pa || null,
          fc: formData.fc || null,
          fr: formData.fr || null,
          temp: formData.temp || null,
          sato2: formData.sato2 || null,
          glicemia: formData.glicemia || null,
        };
      }

      const payload = {
        pacienteId: formData.pacienteId,
        tipo: formData.tipo,
        titulo: formData.titulo.trim(),
        descricao: formData.descricao.trim(),
        estadoGeral: formData.estadoGeral,
        riscoQueda: formData.riscoQueda || null,
        riscoLesao: formData.riscoLesao || null,
        alerta: formData.alerta,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes.trim() || null,
        sinaisVitais,
      };

      if (editingId) {
          // Edição de histórico não é permitida
          handleApiError({ response: { data: { code: 'history_immutable' } } }, 'Edição de histórico de evolução não é permitida');
          setEditingId(null);
          setModalOpen(false);
          return;
      } else {
        const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);
        if (shouldAggregateAll) {
          const paciente = pacientes.find((p) => String(p.id || p._id) === String(payload.pacienteId));
          const empresaId = paciente?.__empresaId || paciente?.empresaId;
          if (!empresaId) {
            toast.error('Selecione um residente com empresa válida (ou escolha uma empresa no topo)');
            return;
          }
          await enfermagemService.create(payload, buildEmpresaHeaderConfig(empresaId));
        } else {
          await enfermagemService.create(payload);
        }
        toast.success(successMessage('create', 'Registro'));
      }

      setModalOpen(false);
      resetForm();
      loadData();
      loadStats();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'registro'));
    }
  };

  // Função para editar registro
  const handleEdit = async () => {
    handleApiError({ response: { data: { code: 'history_immutable' } } }, 'Edição de histórico de evolução não é permitida');
  };

  // Função para deletar registro
  const handleDelete = async (id, titulo) => {
    if (!confirm(`Deseja realmente excluir o registro "${titulo}"?`)) return;
    
    try {
      setDeletingId(id);
      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);
      if (shouldAggregateAll) {
        const registro = registros.find((r) => String(r.id || r._id) === String(id));
        const empresaId = registro?.__empresaId || registro?.empresaId;
        if (empresaId) {
          await enfermagemService.delete(id, buildEmpresaHeaderConfig(empresaId));
        } else {
          await enfermagemService.delete(id);
        }
      } else {
        await enfermagemService.delete(id);
      }
      toast.success(successMessage('delete', 'Registro'));
      loadData();
      loadStats();
    } catch (error) {
      handleApiError(error, errorMessage('delete', 'registro'));
    } finally {
      setDeletingId(null);
    }
  };

  // Função para resetar formulário
  const resetForm = () => {
    setFormData({
      pacienteId: '',
      tipo: 'evolucao',
      titulo: '',
      descricao: '',
      estadoGeral: 'bom',
      riscoQueda: '',
      riscoLesao: '',
      alerta: false,
      prioridade: 'baixa',
      observacoes: '',
      pa: '',
      fc: '',
      fr: '',
      temp: '',
      sato2: '',
      glicemia: ''
    });
    setErrors({});
    setEditingId(null);
    setItensUtilizados([]);
  };

  // Função para formatar data
  const formatDate = (date) => {
    if (!date) return 'N/A';
    const d = new Date(date);
    return d.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Função para obter label do tipo
  const getTipoLabel = (tipo) => {
    const tipos = {
      evolucao: 'Evolução',
      sinais_vitais: 'Sinais Vitais',
      administracao_medicamento: 'Medicamento',
      curativo: 'Curativo',
      intercorrencia: 'Intercorrência',
      admissao: 'Admissão',
      alta: 'Alta',
      transferencia: 'Transferência',
      outro: 'Outro'
    };
    return tipos[tipo] || tipo;
  };

  // Função para obter cor do estado geral
  const getEstadoGeralColor = (estado) => {
    const cores = {
      bom: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      regular: 'bg-yellow-50 text-yellow-700 border-yellow-100',
      grave: 'bg-orange-50 text-orange-700 border-orange-100',
      critico: 'bg-red-50 text-red-700 border-red-100'
    };
    return cores[estado] || cores.bom;
  };

  // Função para obter cor da prioridade
  const getPrioridadeColor = (prioridade) => {
    const cores = {
      baixa: 'bg-slate-100 text-slate-700',
      media: 'bg-blue-50 text-blue-700',
      alta: 'bg-orange-50 text-orange-700',
      urgente: 'bg-red-50 text-red-700'
    };
    return cores[prioridade] || cores.baixa;
  };

  // Filtrar registros por busca
  const filteredRegistros = registros.filter(r => {
    const searchLower = searchTerm.toLowerCase();
    return (
      r.titulo?.toLowerCase().includes(searchLower) ||
      r.paciente?.nome?.toLowerCase().includes(searchLower) ||
      r.descricao?.toLowerCase().includes(searchLower)
    );
  });

  const exportToPDF = () => {
    try {
      const generatedAt = new Date();
      const styles = `
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .meta { color: #6b7280; font-size: 12px; margin-top: 6px; }
        .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px 14px; margin-top: 12px; }
        .row { display: flex; gap: 12px; flex-wrap: wrap; color: #374151; font-size: 12px; margin-bottom: 6px; }
        .label { color: #6b7280; }
        .text { white-space: pre-wrap; color: #111827; margin-top: 6px; }
        @media print { body { padding: 0; } }
      `;

      const bodyHtml = `
        <h1>Relatório - Registros de Enfermagem</h1>
        <div class="meta">Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</div>
        <div class="meta">Registros: ${escapeHtml(filteredRegistros.length)}</div>
        ${filteredRegistros
          .map((r) => {
            const data = r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : '-';
            const hora = r.createdAt ? new Date(r.createdAt).toLocaleTimeString('pt-BR') : '';
            const paciente = r.paciente?.nome || 'Paciente não identificado';
            const tipo = r.tipo || '-';
            const titulo = r.titulo || '-';
            const descricao = r.descricao || '-';
            const prioridade = r.prioridade || '-';
            const estadoGeral = r.estadoGeral || '-';
            const alerta = r.alerta ? 'Sim' : 'Não';
            return `
              <div class="card">
                <div class="row">
                  <div><span class="label">Data:</span> ${escapeHtml(data)} ${hora ? `(${escapeHtml(hora)})` : ''}</div>
                  <div><span class="label">Paciente:</span> ${escapeHtml(paciente)}</div>
                </div>
                <div class="row">
                  <div><span class="label">Tipo:</span> ${escapeHtml(tipo)}</div>
                  <div><span class="label">Prioridade:</span> ${escapeHtml(prioridade)}</div>
                  <div><span class="label">Estado geral:</span> ${escapeHtml(estadoGeral)}</div>
                  <div><span class="label">Alerta:</span> ${escapeHtml(alerta)}</div>
                </div>
                <div class="text"><strong>${escapeHtml(titulo)}</strong>\n\n${escapeHtml(descricao)}</div>
              </div>
            `;
          })
          .join('')}
      `;

      openPrintWindow({
        title: 'Relatório - Registros de Enfermagem',
        bodyHtml,
        styles
      });
      toast.success('Abrindo visualização para impressão/PDF');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF');
    }
  };

  return (
    <div className="flex flex-col gap-8 min-h-screen">
      {/* Cabeçalho fixo e ações */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md pb-2 pt-4">
        <PageHeader
          label="ANÁLISE"
          title="Evolução de Prescrições"
          subtitle="Anotações diárias, evolução clínica e acompanhamento de cuidados."
        >
          <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
            <button
              type="button"
              onClick={loadData}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <RefreshCcw size={18} /> Atualizar
            </button>
            <button
              type="button"
              onClick={exportToPDF}
              disabled={filteredRegistros.length === 0}
              className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Exportar para PDF"
            >
              <FileDown size={18} /> Exportar PDF
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="btn btn-primary flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
            >
              <Plus size={18} /> Novo Registro
            </button>
          </div>
        </PageHeader>
        {/* Controles de paginação */}
        <div className="flex items-center justify-between gap-3 px-2">
          <div className="text-sm text-slate-600">
            Página <span className="font-semibold">{page}</span>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
            <button className="btn btn-secondary" disabled={(page * pageSize) >= total && total > 0} onClick={() => setPage((p) => p + 1)}>Próxima</button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-4">
          <StatsCard
            icon={FileText}
            label="Hoje"
            value={stats.registrosHoje}
            description="Registros realizados"
            color="primary"
          />
          <StatsCard
            icon={Users}
            label="Cobertura"
            value={stats.pacientesComRegistro}
            description="Pacientes evoluídos"
            color="emerald"
          />
          <StatsCard
            icon={ShieldAlert}
            label="Risco"
            value={stats.riscoQueda}
            description="Alto risco de queda"
            color="orange"
          />
          <StatsCard
            icon={AlertTriangle}
            label="Crítico"
            value={stats.alertasCriticos}
            description="Alertas pendentes"
            color="red"
          />
        </div>
        <div className="mt-4">
          <SearchFilterBar
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            placeholder="Buscar por título, residente ou descrição..."
          />
        </div>
      </div>

      <TableContainer title="Evolução Clínica">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-200 border-t-primary-600"></div>
            <p className="text-sm text-slate-600 dark:text-gray-400">Carregando registros...</p>
          </div>
        ) : filteredRegistros.length > 0 ? (
          <>
            {/* Mobile */}
            <MobileGrid>
              {filteredRegistros.map((registro) => (
                <MobileCard key={registro.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${getPrioridadeColor(registro.prioridade)}`}>
                          {getTipoLabel(registro.tipo)}
                        </span>
                        {registro.alerta && (
                          <AlertTriangle size={14} className="text-red-500" />
                        )}
                      </div>
                      <p className="font-semibold text-slate-900 dark:text-gray-100">{registro.titulo}</p>
                      <p className="text-[10px] text-slate-400">Código: {registro.id || registro._id}</p>
                      <p className="text-sm text-slate-600 dark:text-gray-300 mt-1">
                        <User size={14} className="inline mr-1" />
                        {registro.paciente?.nome || 'Paciente não identificado'}
                      </p>
                      {registro.empresaLabel && (
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5 truncate" title={registro.empresaLabel}>
                          Empresa: {registro.empresaLabel}
                        </p>
                      )}
                      <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                        {formatDate(registro.createdAt)}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getEstadoGeralColor(registro.estadoGeral)}`}>
                      {registro.estadoGeral}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-600 dark:text-gray-300 mt-3 line-clamp-2">
                    {registro.descricao}
                  </p>

                  <div className="flex items-center justify-end gap-2 mt-3">
                    {/* Edição bloqueada por regra de negócio */}
                    <ActionIconButton
                      onClick={() => handleDelete(registro.id, registro.titulo)}
                      icon={Trash2}
                      variant="danger"
                      tooltip="Excluir (somente Super Admin)"
                      title="Excluir registro"
                      ariaLabel="Excluir registro"
                      disabled={deletingId === registro.id || (user?.role !== 'superadmin')}
                      loading={deletingId === registro.id}
                    />
                  </div>
                </MobileCard>
              ))}
            </MobileGrid>

            {/* Desktop: Grid em duas colunas */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-4 p-2 md:p-4">
              {filteredRegistros.map((registro) => (
                <div
                  key={registro.id}
                  className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getPrioridadeColor(registro.prioridade)}`}>
                        {getTipoLabel(registro.tipo)}
                      </span>
                      {registro.alerta && (
                        <AlertTriangle size={16} className="text-red-500" title="Alerta ativo" />
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        {formatDate(registro.createdAt)}
                      </span>
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${getEstadoGeralColor(registro.estadoGeral)}`}>
                        {registro.estadoGeral}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3">
                    <p className="font-semibold text-slate-900 dark:text-gray-100">{registro.titulo}</p>
                    <p className="text-[11px] text-slate-400">Código: {registro.id || registro._id}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                        {registro.paciente?.nome?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm text-slate-700 dark:text-gray-300">
                        {registro.paciente?.nome || 'Paciente não identificado'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-gray-300 mt-2 line-clamp-3">
                      {registro.descricao}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    {/* Edição bloqueada por regra de negócio */}
                    <ActionIconButton
                      onClick={() => handleDelete(registro.id, registro.titulo)}
                      icon={Trash2}
                      variant="danger"
                      tooltip="Excluir (somente Super Admin)"
                      title="Excluir registro"
                      ariaLabel="Excluir registro"
                      disabled={deletingId === registro.id || (user?.role !== 'superadmin')}
                      loading={deletingId === registro.id}
                    />
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="p-12 flex flex-col items-center gap-6">
            <EmptyState
              icon={FileText}
              title="Nenhum registro encontrado"
              description="Comece criando um novo registro de enfermagem."
            />
            <button
              className="btn btn-primary flex items-center gap-2 shadow-lg shadow-primary-600/20"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
            >
              <Plus size={18} /> Novo Registro
            </button>
          </div>
        )}
      </TableContainer>

      {/* Modal de Novo/Editar Registro */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-full md:max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-start bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-gray-700 dark:to-gray-700/50 shrink-0">
              <div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-gray-100">
                  {editingId ? 'Editar Registro' : 'Novo Registro de Enfermagem'}
                </h3>
                <p className="text-sm text-slate-600 dark:text-gray-300 mt-1">Preencha os dados do registro clínico.</p>
              </div>
              <button 
                onClick={() => setModalOpen(false)} 
                className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>
            
            {/* Body */}
            <div className="overflow-y-auto p-6 custom-scrollbar">
              <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* Seção: Informações Básicas */}
                <div className="bg-slate-50 dark:bg-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-primary-600" size={20} />
                    <h4 className="font-bold text-slate-800 dark:text-gray-100">Informações Básicas</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1.5">
                        Residente *
                      </label>
                      {pacientes.length === 0 ? (
                        <div className="flex flex-col gap-2">
                          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-lg p-3 text-sm flex items-center gap-2">
                            <AlertCircle size={16} className="text-yellow-500" />
                            Nenhum residente cadastrado. Cadastre um residente para registrar uma evolução.
                          </div>
                          <button
                            type="button"
                            className="btn btn-primary w-fit"
                            onClick={() => window.location.hash = '#/pacientes'}
                          >
                            Cadastrar Residente
                          </button>
                        </div>
                      ) : (
                        <>
                          <select
                            className={`input w-full ${errors.pacienteId ? 'border-red-300' : ''}`}
                            value={formData.pacienteId}
                            onChange={e => setFormData({...formData, pacienteId: e.target.value})}
                          >
                            <option value="">Selecione um residente</option>
                            {pacientes.map(p => (
                              <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                          </select>
                          {errors.pacienteId && (
                            <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                              <AlertCircle size={12} /> {errors.pacienteId}
                            </p>
                          )}
                        </>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1.5">
                        Tipo de Registro
                      </label>
                      <select
                        className="input w-full"
                        value={formData.tipo}
                        onChange={e => setFormData({...formData, tipo: e.target.value})}
                      >
                        <option value="evolucao">Evolução</option>
                        <option value="sinais_vitais">Sinais Vitais</option>
                        <option value="administracao_medicamento">Administração de Medicamento</option>
                        <option value="curativo">Curativo</option>
                        <option value="intercorrencia">Intercorrência</option>
                        <option value="admissao">Admissão</option>
                        <option value="alta">Alta</option>
                        <option value="transferencia">Transferência</option>
                        <option value="outro">Outro</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1.5">
                      Título *
                    </label>
                    <input
                      type="text"
                      className={`input w-full ${errors.titulo ? 'border-red-300' : ''}`}
                      placeholder="Ex: Evolução diária, Verificação de PA..."
                      value={formData.titulo}
                      onChange={e => setFormData({...formData, titulo: e.target.value})}
                    />
                    {errors.titulo && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.titulo}
                      </p>
                    )}
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1.5">
                      Descrição *
                    </label>
                    <textarea
                      className={`input w-full min-h-[100px] ${errors.descricao ? 'border-red-300' : ''}`}
                      placeholder="Descreva a evolução clínica, sinais e sintomas, procedimentos realizados..."
                      value={formData.descricao}
                      onChange={e => setFormData({...formData, descricao: e.target.value})}
                    />
                    {errors.descricao && (
                      <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.descricao}
                      </p>
                    )}
                  </div>
                </div>

                {/* Seção: Sinais Vitais */}
                <div className="bg-blue-50 dark:bg-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="text-blue-600" size={20} />
                    <h4 className="font-bold text-slate-800 dark:text-gray-100">Sinais Vitais</h4>
                    <span className="text-xs text-slate-500 dark:text-gray-400">(Opcional)</span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        <Heart size={14} /> PA (mmHg)
                      </label>
                      <input
                        type="text"
                        className="input w-full"
                        placeholder="120/80"
                        value={formData.pa}
                        onChange={e => setFormData({...formData, pa: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        <Activity size={14} /> FC (bpm)
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        placeholder="72"
                        value={formData.fc}
                        onChange={e => setFormData({...formData, fc: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        <Wind size={14} /> FR (irpm)
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        placeholder="16"
                        value={formData.fr}
                        onChange={e => setFormData({...formData, fr: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        <Thermometer size={14} /> Temp (°C)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        className="input w-full"
                        placeholder="36.5"
                        value={formData.temp}
                        onChange={e => setFormData({...formData, temp: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        <Activity size={14} /> SatO2 (%)
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        placeholder="98"
                        value={formData.sato2}
                        onChange={e => setFormData({...formData, sato2: e.target.value})}
                      />
                    </div>

                    <div>
                      <label className="flex items-center gap-1 text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        <Droplet size={14} /> Glicemia (mg/dL)
                      </label>
                      <input
                        type="number"
                        className="input w-full"
                        placeholder="90"
                        value={formData.glicemia}
                        onChange={e => setFormData({...formData, glicemia: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                {/* Seção: Avaliação e Riscos */}
                <div className="bg-orange-50 dark:bg-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldAlert className="text-orange-600" size={20} />
                    <h4 className="font-bold text-slate-800 dark:text-gray-100">Avaliação e Riscos</h4>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        Estado Geral
                      </label>
                      <select
                        className="input w-full"
                        value={formData.estadoGeral}
                        onChange={e => setFormData({...formData, estadoGeral: e.target.value})}
                      >
                        <option value="bom">Bom</option>
                        <option value="regular">Regular</option>
                        <option value="grave">Grave</option>
                        <option value="critico">Crítico</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        Prioridade
                      </label>
                      <select
                        className="input w-full"
                        value={formData.prioridade}
                        onChange={e => setFormData({...formData, prioridade: e.target.value})}
                      >
                        <option value="baixa">Baixa</option>
                        <option value="media">Média</option>
                        <option value="alta">Alta</option>
                        <option value="urgente">Urgente</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        Risco de Queda
                      </label>
                      <select
                        className="input w-full"
                        value={formData.riscoQueda}
                        onChange={e => setFormData({...formData, riscoQueda: e.target.value})}
                      >
                        <option value="">Não avaliado</option>
                        <option value="baixo">Baixo</option>
                        <option value="medio">Médio</option>
                        <option value="alto">Alto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-gray-200 mb-1.5">
                        Risco de Lesão
                      </label>
                      <select
                        className="input w-full"
                        value={formData.riscoLesao}
                        onChange={e => setFormData({...formData, riscoLesao: e.target.value})}
                      >
                        <option value="">Não avaliado</option>
                        <option value="baixo">Baixo</option>
                        <option value="medio">Médio</option>
                        <option value="alto">Alto</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          className="w-5 h-5 text-primary-600 rounded focus:ring-2 focus:ring-primary-500"
                          checked={formData.alerta}
                          onChange={e => setFormData({...formData, alerta: e.target.checked})}
                        />
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-200 flex items-center gap-2">
                          <AlertTriangle size={16} className="text-red-500" />
                          Marcar como alerta (requer atenção especial)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Itens do Estoque Utilizados */}
                <div className="bg-green-50 dark:bg-gray-700/50 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="text-green-600" size={20} />
                    <h4 className="font-bold text-slate-800 dark:text-gray-100">Itens do Estoque Utilizados</h4>
                    <span className="text-xs text-slate-500 dark:text-gray-400">(Opcional)</span>
                  </div>
                  
                  <div className="space-y-4">
                    <select
                      className="input w-full"
                      onChange={e => {
                        const itemId = e.target.value;
                        const item = itensEstoque.find(i => i.id === itemId);
                        if (item && !itensUtilizados.some(iu => iu.id === itemId)) {
                          setItensUtilizados([...itensUtilizados, { id: item.id, nome: item.nome, quantidade: 1 }]);
                        }
                        e.target.value = '';
                      }}
                      value=""
                    >
                      <option value="">Adicionar item do estoque...</option>
                      {itensEstoque.map(item => (
                        <option key={item.id} value={item.id}>{item.nome}</option>
                      ))}
                    </select>
                    
                    <div className="flex flex-col gap-2">
                      {itensUtilizados.length === 0 ? (
                        <span className="text-xs text-slate-400">Nenhum item selecionado</span>
                      ) : (
                        itensUtilizados.map((iu, idx) => (
                          <div key={iu.id} className="flex items-center gap-2 bg-white dark:bg-gray-800 p-3 rounded-lg">
                            <span className="font-medium flex-1">{iu.nome}</span>
                            <input
                              type="number"
                              min={1}
                              className="input w-20"
                              value={iu.quantidade}
                              onChange={e => {
                                const val = parseInt(e.target.value) || 1;
                                setItensUtilizados(itensUtilizados.map((item, i) => i === idx ? { ...item, quantidade: val } : item));
                              }}
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => setItensUtilizados(itensUtilizados.filter((item, i) => i !== idx))}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Observações Adicionais */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-gray-200 mb-1.5">
                    Observações Adicionais
                  </label>
                  <textarea
                    className="input w-full min-h-[80px]"
                    placeholder="Informações complementares, condutas tomadas..."
                    value={formData.observacoes}
                    onChange={e => setFormData({...formData, observacoes: e.target.value})}
                  />
                </div>

                {/* Footer Actions */}
                <div className="pt-4 flex gap-3 border-t border-slate-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn btn-secondary flex-1 py-2.5"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary flex-1 py-2.5 shadow-lg shadow-primary-500/20"
                    disabled={pacientes.length === 0}
                  >
                    {editingId ? 'Salvar Alterações' : 'Criar Registro'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}