import { useEffect, useMemo, useState } from 'react';
import { 
  Search, 
  Calendar as CalendarIcon, 
  Pill, 
  Stethoscope, 
  FileText, 
  FileDown,
  Clock,
  User,
  MapPin,
  Info
} from 'lucide-react';
import agendamentoService from '../services/agendamento.service';
import prescricaoService from '../services/prescricao.service';
import toast from 'react-hot-toast';
import { errorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import { openPrintWindow, escapeHtml } from '../utils/printWindow';
import { useAuthStore } from '../store/authStore';
import { buildEmpresaHeaderConfig, isSuperadminAllEmpresasSelected, listEmpresasForSuperadmin, subscribeEmpresaContextChanged } from '../utils/empresaContext';

export default function Cronograma() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [showLegends, setShowLegends] = useState(false);
  const [allItems, setAllItems] = useState([]);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  useEffect(() => {
    return subscribeEmpresaContextChanged(() => {
      setPage(1);
      loadData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Sempre volta para a primeira página ao mudar filtros
  useEffect(() => {
    setPage(1);
  }, [activeTab, searchTerm, pageSize]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const today = new Date();
      const future = new Date();
      future.setDate(today.getDate() + 30);

      const paramsAg = {
        dataInicio: today.toISOString(),
        dataFim: future.toISOString()
      };

      const formatAgendamentos = (agendamentosList, empresa) => {
        const empresaLabel = empresa
          ? `${empresa.codigo ? `${empresa.codigo} - ` : ''}${empresa.nome || 'Empresa'}`
          : null;

        return (Array.isArray(agendamentosList) ? agendamentosList : []).map((ag) => {
          const rawDate = ag.dataHora || ag.dataHoraInicio || ag.dataHoraFim || ag.createdAt;
          const dataHora = rawDate ? new Date(rawDate) : new Date();
          const isValidDate = !isNaN(dataHora.getTime());

          return {
            id: ag.id || ag._id,
            type: ag.tipo === 'Consulta' ? 'consultas' : ag.tipo === 'Exame' ? 'exames' : 'outros',
            originalType: ag.tipo,
            title: ag.titulo,
            subtitle: ag.participante || 'Sem participante',
            date: isValidDate ? dataHora : new Date(),
            status: ag.status,
            details: ag.local,
            source: 'agendamento',
            empresaLabel
          };
        });
      };

      const formatPrescricoes = (listaPrescricoes, empresa) => {
        const empresaLabel = empresa
          ? `${empresa.codigo ? `${empresa.codigo} - ` : ''}${empresa.nome || 'Empresa'}`
          : null;

        return (Array.isArray(listaPrescricoes) ? listaPrescricoes : []).map((pres) => {
          const dataRef = pres.dataEmissao || pres.createdAt || new Date().toISOString();
          const dataPrescricao = new Date(dataRef);
          const isValidDate = !isNaN(dataPrescricao.getTime());

          return {
            id: pres.id || pres._id,
            type: 'medicacoes',
            originalType: 'Medicação',
            title: `Prescrição: ${pres.medicamentos?.[0]?.nome || 'Medicamentos diversos'}`,
            subtitle: pres.pacienteNome || pres.pacienteId?.nome || 'Paciente não identificado',
            date: isValidDate ? dataPrescricao : new Date(),
            status: pres.status,
            details: `${pres.medicamentos?.length || 0} ${pres.medicamentos?.length === 1 ? 'medicamento' : 'medicamentos'}`,
            source: 'prescricao',
            empresaLabel
          };
        });
      };

      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);
      if (shouldAggregateAll) {
        toast.loading('Carregando cronograma de todas as empresas...', { id: 'cronograma-load-all' });
        const empresas = await listEmpresasForSuperadmin();

        const results = await Promise.all(
          empresas.map(async (empresa) => {
            const config = buildEmpresaHeaderConfig(empresa.id);
            const [agendamentosData, prescricoesData] = await Promise.all([
              agendamentoService.getAll(paramsAg, config),
              prescricaoService.getAll({ status: 'ativa' }, config)
            ]);

            const agendamentosList = Array.isArray(agendamentosData)
              ? agendamentosData
              : (Array.isArray(agendamentosData?.items) ? agendamentosData.items : []);

            const prescricoesResponse = prescricoesData || {};
            const listaPrescricoes = Array.isArray(prescricoesResponse)
              ? prescricoesResponse
              : (Array.isArray(prescricoesResponse?.items)
                ? prescricoesResponse.items
                : (Array.isArray(prescricoesResponse?.prescricoes) ? prescricoesResponse.prescricoes : []));

            return {
              empresa,
              agendamentosList,
              listaPrescricoes
            };
          })
        );

        const formatted = results.flatMap((r) => [
          ...formatAgendamentos(r.agendamentosList, r.empresa),
          ...formatPrescricoes(r.listaPrescricoes, r.empresa)
        ]);

        const merged = formatted.sort((a, b) => (new Date(b.date)) - (new Date(a.date)));
        setAllItems(merged);
        toast.dismiss('cronograma-load-all');
        return;
      }
      
      const [agendamentosData, prescricoesData] = await Promise.all([
        agendamentoService.getAll(paramsAg),
        prescricaoService.getAll({ status: 'ativa' })
      ]);

      const agendamentosList = Array.isArray(agendamentosData)
        ? agendamentosData
        : (Array.isArray(agendamentosData?.items) ? agendamentosData.items : []);

      const formattedAgendamentos = formatAgendamentos(agendamentosList, null);

      const prescricoesResponse = prescricoesData || {};
      const listaPrescricoes = Array.isArray(prescricoesResponse)
        ? prescricoesResponse
        : (Array.isArray(prescricoesResponse?.items)
          ? prescricoesResponse.items
          : (Array.isArray(prescricoesResponse?.prescricoes) ? prescricoesResponse.prescricoes : []));
        
      const formattedPrescricoes = formatPrescricoes(listaPrescricoes, null);

      const allItems = [...formattedAgendamentos, ...formattedPrescricoes]
        .sort((a, b) => (new Date(b.date)) - (new Date(a.date)));

      setAllItems(allItems);

    } catch (error) {
      toast.dismiss('cronograma-load-all');
      handleApiError(error, errorMessage('load', 'cronograma'));
    } finally {
      setLoading(false);
    }
  };

  const filteredAllItems = useMemo(() => {
    const q = String(searchTerm || '').trim().toLowerCase();
    return allItems.filter((item) => {
      const matchesTab = activeTab === 'todos' || item.type === activeTab || (activeTab === 'consultas' && item.type === 'outros');
      if (!matchesTab) return false;
      if (!q) return true;
      const title = String(item.title || '').toLowerCase();
      const subtitle = String(item.subtitle || '').toLowerCase();
      return title.includes(q) || subtitle.includes(q);
    });
  }, [allItems, activeTab, searchTerm]);

  const totalFiltered = filteredAllItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredAllItems.slice(start, start + pageSize);
  }, [filteredAllItems, page, pageSize]);

  const getStatusInfo = (date, status, type) => {
    if (status === 'concluido' || status === 'realizado') {
      return { label: 'Realizado', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
    }

    if (type === 'medicacoes') {
       return { label: 'Em Uso', color: 'bg-primary-100 text-primary-700 border-primary-200', dot: 'bg-primary-500' };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const itemDate = new Date(date);
    itemDate.setHours(0, 0, 0, 0);
    
    const diffTime = itemDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: 'Atrasado', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
    if (diffDays === 0) return { label: 'Hoje', color: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' };
    if (diffDays === 1) return { label: 'Amanhã', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500' };
    if (diffDays <= 3) return { label: 'Próximo', color: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' };
    
    return { label: 'Agendado', color: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };
  };

  const tabs = [
    { id: 'todos', label: 'Todos', icon: CalendarIcon },
    { id: 'medicacoes', label: 'Medicações', icon: Pill },
    { id: 'consultas', label: 'Consultas', icon: Stethoscope },
    { id: 'exames', label: 'Exames', icon: FileText },
  ];

  const stats = {
    total: allItems.length,
    consultas: allItems.filter(i => i.type === 'consultas').length,
    exames: allItems.filter(i => i.type === 'exames').length,
    medicacoes: allItems.filter(i => i.type === 'medicacoes').length
  };

  const exportToPDF = () => {
    try {
      const generatedAt = new Date();
      const styles = `
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .meta { color: #6b7280; font-size: 12px; margin-top: 6px; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 600; }
        .medicacoes { background: #ede9fe; color: #5b21b6; }
        .consultas { background: #dbeafe; color: #1d4ed8; }
        .exames { background: #fef3c7; color: #92400e; }
        .outros { background: #f1f5f9; color: #334155; }
        @media print { body { padding: 0; } }
      `;

      const rowsHtml = filteredAllItems
        .map((it) => {
          const tipoClass = it.type || 'outros';
          const dateObj = it.date ? new Date(it.date) : null;
          const dateStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleDateString('pt-BR') : '-';
          const timeStr = dateObj && !isNaN(dateObj.getTime()) ? dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';
          return `
            <tr>
              <td>${escapeHtml(dateStr)} ${escapeHtml(timeStr)}</td>
              <td><span class="badge ${escapeHtml(tipoClass)}">${escapeHtml(it.originalType || it.type || '-')}</span></td>
              <td>${escapeHtml(it.title || '-')}</td>
              <td>${escapeHtml(it.subtitle || '-')}</td>
              <td>${escapeHtml(it.details || '-')}</td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <h1>Relatório - Cronograma</h1>
        <div class="meta">Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</div>
        <div class="meta">Registros: ${escapeHtml(filteredAllItems.length)}</div>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Tipo</th>
              <th>Título</th>
              <th>Participante</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      openPrintWindow({
        title: 'Relatório - Cronograma',
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
    <div className="space-y-8">
      <PageHeader
        label="Rotina"
        title="Cronograma"
        subtitle="Acompanhe a linha do tempo de medicações, consultas e exames dos residentes."
      >
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <button
            type="button"
            onClick={() => setShowLegends(!showLegends)}
            className={`btn btn-secondary flex items-center justify-center gap-2 ${showLegends ? 'bg-slate-100' : ''}`}
          >
            <Info size={18} />
            <span className="hidden sm:inline">Legendas</span>
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            disabled={filteredAllItems.length === 0}
            className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar para PDF"
          >
            <FileDown size={18} /> Exportar PDF
          </button>
        </div>
      </PageHeader>
      {/* Controles de paginação */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Página <span className="font-semibold">{page}</span> de <span className="font-semibold">{totalPages}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Próxima</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={CalendarIcon}
          label="Total"
          value={stats.total}
          description="Eventos agendados"
          color="primary"
        />
        <StatsCard
          icon={Stethoscope}
          label="Consultas"
          value={stats.consultas}
          description="Consultas médicas"
          color="blue"
        />
        <StatsCard
          icon={Pill}
          label="Medicações"
          value={stats.medicacoes}
          description="Prescrições ativas"
          color="purple"
        />
        <StatsCard
          icon={FileText}
          label="Exames"
          value={stats.exames}
          description="Exames marcados"
          color="orange"
        />
      </div>

      {/* Toolbar: Search & Tabs */}
      <div className="card p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Tabs - Segmented Control Style */}
        <div className="flex p-1 bg-slate-100 rounded-xl w-full md:w-auto overflow-x-auto">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                  ${isActive 
                    ? 'bg-white text-primary-600 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'}
                `}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por título ou participante..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Collapsible Legends */}
      {showLegends && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
            <span className="text-xs text-slate-600">Agendado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span className="text-xs text-slate-600">Próximo (3 dias)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span className="text-xs text-slate-600">Amanhã</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-xs text-slate-600">Hoje/Atrasado</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span className="text-xs text-slate-600">Realizado</span>
          </div>
        </div>
      )}

      {/* Content List */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredAllItems.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CalendarIcon size={32} className="text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">Nenhum item encontrado</h3>
            <p className="text-slate-500 max-w-xs mx-auto mt-1">
              Não há agendamentos ou prescrições para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {pagedItems.map((item) => {
              const statusInfo = getStatusInfo(item.date, item.status, item.type);
              const isValidDate = item.date && !isNaN(item.date.getTime());
              
              return (
                <div 
                  key={`${item.source}-${item.id}`} 
                  className="group bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col"
                >
                  {/* Date Section */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-xl font-bold text-slate-800 leading-none">
                        {isValidDate ? item.date.getDate() : 'NaN'}
                      </span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {isValidDate ? item.date.toLocaleDateString('pt-BR', { month: 'short' }) : ''}
                      </span>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusInfo.color}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`}></div>
                      {statusInfo.label}
                    </span>
                  </div>

                  {/* Type Badge */}
                  <div className="mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'medicacoes' ? 'bg-purple-50 text-purple-700' :
                      item.type === 'consultas' ? 'bg-blue-50 text-blue-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {item.type === 'medicacoes' ? <Pill size={10} /> : 
                       item.type === 'consultas' ? <Stethoscope size={10} /> : <FileText size={10} />}
                      {item.originalType}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-bold text-slate-900 mb-3 line-clamp-2 group-hover:text-primary-700 transition-colors min-h-[3rem]">
                    {item.title}
                  </h4>

                  {/* Details */}
                  <div className="space-y-2 mt-auto">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <User size={14} className="text-slate-400 shrink-0" />
                      <span className="truncate">{item.subtitle}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>
                        {isValidDate ? item.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Invalid Date'}
                      </span>
                    </div>

                    {item.details && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <span className="truncate">{item.details}</span>
                      </div>
                    )}
                    {item.empresaLabel && (
                      <div className="text-[11px] text-slate-400 truncate" title={item.empresaLabel}>
                        Empresa: {item.empresaLabel}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-400">Código: {item.id}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
