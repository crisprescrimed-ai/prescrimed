import { useState, useEffect } from 'react';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCcw,
  FileDown,
  Pill
} from 'lucide-react';
import pacienteService from '../services/paciente.service';
import prescricaoService from '../services/prescricao.service';
import toast from 'react-hot-toast';
import { errorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import SearchFilterBar from '../components/common/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
import { openPrintWindow, escapeHtml } from '../utils/printWindow';
import { useAuthStore } from '../store/authStore';
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

export default function CensoMP() {
  const { user } = useAuthStore();
  const [censoData, setCensoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('todos'); // todos, com_prescricao, sem_prescricao
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, user?.role]);

  useEffect(() => {
    return subscribeEmpresaContextChanged(() => {
      setPage(1);
      loadData();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  const loadData = async () => {
    try {
      setLoading(true);
      const shouldAggregateAll = isSuperadminAllEmpresasSelected(user);

      let pacientes = [];
      let prescricoes = [];

      if (shouldAggregateAll) {
        toast.loading('Carregando dados de todas as empresas...', { id: 'censo-mp-load-all' });

        const empresasList = await listEmpresasForSuperadmin();
        const empresaIds = (Array.isArray(empresasList) ? empresasList : []).map((e) => e.id).filter(Boolean);

        if (empresaIds.length === 0) {
          setTotal(0);
          setCensoData([]);
          toast.dismiss('censo-mp-load-all');
          return;
        }

        const results = await Promise.all(
          empresaIds.map(async (empresaId) => {
            const config = buildEmpresaHeaderConfig(empresaId);
            const [pacientesData, prescricoesData] = await Promise.all([
              pacienteService.getAll('', config),
              prescricaoService.getAll({}, config)
            ]);

            const pacientesLocal = Array.isArray(pacientesData)
              ? pacientesData
              : (pacientesData?.pacientes || pacientesData?.items || []);
            const prescricoesLocal = Array.isArray(prescricoesData)
              ? prescricoesData
              : (prescricoesData?.prescricoes || prescricoesData?.items || []);

            return {
              empresaId,
              pacientes: Array.isArray(pacientesLocal) ? pacientesLocal : [],
              prescricoes: Array.isArray(prescricoesLocal) ? prescricoesLocal : []
            };
          })
        );

        pacientes = results.flatMap((r) =>
          (r.pacientes || []).map((p) => ({ ...p, __empresaId: r.empresaId }))
        );
        prescricoes = results.flatMap((r) =>
          (r.prescricoes || []).map((p) => ({ ...p, __empresaId: r.empresaId }))
        );

        toast.dismiss('censo-mp-load-all');
      } else {
        const [pacientesData, prescricoesData] = await Promise.all([
          pacienteService.getAll(),
          prescricaoService.getAll()
        ]);

        pacientes = Array.isArray(pacientesData) ? pacientesData : (pacientesData?.pacientes || pacientesData?.items || []);
        prescricoes = Array.isArray(prescricoesData) ? prescricoesData : (prescricoesData?.prescricoes || prescricoesData?.items || []);
        pacientes = Array.isArray(pacientes) ? pacientes : [];
        prescricoes = Array.isArray(prescricoes) ? prescricoes : [];
      }

      // Map patients and check for active prescriptions
      const mappedData = pacientes.map(paciente => {
        const pacienteId = paciente.id || paciente._id;
        const activePrescriptions = prescricoes.filter(p => 
          (p.pacienteId === pacienteId || p.pacienteId?._id === pacienteId) && 
          p.status === 'ativa'
        );

        return {
          ...paciente,
          id: pacienteId,
          hasPrescription: activePrescriptions.length > 0,
          prescriptionCount: activePrescriptions.length,
          prescriptions: activePrescriptions
        };
      });

      // Ordenar por atualização mais recente
      const ordered = mappedData.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
      setTotal(ordered.length);
      const start = (page - 1) * pageSize;
      setCensoData(ordered.slice(start, start + pageSize));
    } catch (error) {
      toast.dismiss('censo-mp-load-all');
      handleApiError(error, errorMessage('load', 'dados do censo'));
    } finally {
      setLoading(false);
    }
  };

  const filteredData = censoData.filter(item => {
    const matchesSearch = item.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (item.cpf && item.cpf.includes(searchTerm));
    
    if (filterStatus === 'todos') return matchesSearch;
    if (filterStatus === 'com_prescricao') return matchesSearch && item.hasPrescription;
    if (filterStatus === 'sem_prescricao') return matchesSearch && !item.hasPrescription;
    
    return matchesSearch;
  });

  const stats = {
    total: censoData.length,
    comPrescricao: censoData.filter(i => i.hasPrescription).length,
    semPrescricao: censoData.filter(i => !i.hasPrescription).length
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
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .coberto { background: #d1fae5; color: #065f46; }
        .pendente { background: #fee2e2; color: #991b1b; }
        @media print { body { padding: 0; } }
      `;

      const rowsHtml = filteredData
        .map((p) => {
          const statusClass = p.hasPrescription ? 'coberto' : 'pendente';
          const statusLabel = p.hasPrescription ? 'Coberto' : 'Pendente';
          const medsPreview = (p.prescriptions || [])
            .slice(0, 3)
            .map((pr) => pr.medicamentos?.[0]?.nome)
            .filter(Boolean)
            .join(', ');
          return `
            <tr>
              <td>${escapeHtml(p.nome || '-')}</td>
              <td>${escapeHtml(p.cpf || '-')}</td>
              <td><span class="badge ${statusClass}">${escapeHtml(statusLabel)}</span></td>
              <td>${escapeHtml(p.prescriptionCount || 0)}</td>
              <td>${escapeHtml(medsPreview || (p.hasPrescription ? 'Prescrição ativa' : '-'))}</td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <h1>Relatório - Censo M.P.</h1>
        <div class="meta">Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</div>
        <div class="meta">Registros: ${escapeHtml(filteredData.length)}</div>
        <table>
          <thead>
            <tr>
              <th>Residente</th>
              <th>CPF</th>
              <th>Status</th>
              <th>Prescrições ativas</th>
              <th>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      openPrintWindow({
        title: 'Relatório - Censo MP',
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
        label="Controle"
        title="Censo M.P."
        subtitle="Mapa de Prescrições: Acompanhe quais residentes possuem prescrições ativas."
      >
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <button
            type="button"
            onClick={exportToPDF}
            disabled={filteredData.length === 0}
            className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar para PDF"
          >
            <FileDown size={18} /> Exportar PDF
          </button>
          <button
            type="button"
            onClick={loadData}
            className="btn btn-secondary flex items-center justify-center gap-2"
          >
            <RefreshCcw size={18} /> Atualizar
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          icon={Users}
          label="Total"
          value={stats.total}
          description="Residentes cadastrados"
          color="primary"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Cobertos"
          value={stats.comPrescricao}
          description="Com prescrição ativa"
          color="emerald"
        />
        <StatsCard
          icon={AlertCircle}
          label="Pendentes"
          value={stats.semPrescricao}
          description="Sem prescrição ativa"
          color="red"
        />
      </div>

      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Buscar residente..."
        filters={[
          { label: 'Todos', value: 'todos' },
          { label: 'Com Prescrição', value: 'com_prescricao' },
          { label: 'Sem Prescrição', value: 'sem_prescricao' }
        ]}
        activeFilter={filterStatus}
        onFilterChange={setFilterStatus}
      />

      <TableContainer title="Residentes">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredData.length > 0 ? (
          <>
            {/* Mobile */}
            <MobileGrid>
              {filteredData.map((item) => (
                <MobileCard key={item.id || item._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                        {item.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-gray-100">{item.nome}</p>
                        <p className="text-[10px] text-slate-400">Código: {item.id || item._id}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">CPF: {item.cpf || 'N/A'}</p>
                      </div>
                    </div>
                    {item.hasPrescription ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                        <CheckCircle2 size={12} /> Coberto
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                        <AlertCircle size={12} /> Pendente
                      </span>
                    )}
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Pill size={16} className="text-slate-400" />
                      <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                        {item.prescriptionCount} prescrições
                      </span>
                    </div>
                    {item.hasPrescription ? (
                      <div className="flex flex-wrap gap-1">
                        {item.prescriptions.map(p => (
                          <span key={p.id} className="text-xs text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded">
                            {p.medicamentos?.[0]?.nome}
                            {p.medicamentos?.length > 1 && ` +${p.medicamentos.length - 1}`}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-gray-500 italic">Nenhuma prescrição ativa</span>
                    )}
                  </div>
                </MobileCard>
              ))}
            </MobileGrid>

            {/* Desktop */}
            <TableWrapper>
              <TableHeader columns={["Residente","Status","Prescrições Ativas","Detalhes"]} />
              <TBody>
                {filteredData.map((item) => (
                  <Tr key={item.id || item._id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                          {item.nome.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-gray-100">{item.nome}</p>
                          <p className="text-[11px] text-slate-400">Código: {item.id || item._id}</p>
                          <p className="text-xs text-slate-500 dark:text-gray-400">CPF: {item.cpf || 'N/A'}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      {item.hasPrescription ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                          <CheckCircle2 size={14} /> Coberto
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-100">
                          <AlertCircle size={14} /> Pendente
                        </span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <Pill size={16} className="text-slate-400" />
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                          {item.prescriptionCount} prescrições
                        </span>
                      </div>
                    </Td>
                    <Td>
                      {item.hasPrescription ? (
                        <div className="flex flex-col gap-1">
                          {item.prescriptions.map(p => (
                            <span key={p.id} className="text-xs text-slate-500 dark:text-gray-300 bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded inline-block w-fit">
                              {p.medicamentos?.[0]?.nome}
                              {p.medicamentos?.length > 1 && ` +${p.medicamentos.length - 1}`}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 dark:text-gray-500 italic">Nenhuma prescrição ativa</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrapper>
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={Users}
              title="Nenhum residente encontrado"
              description="Tente ajustar os filtros de busca."
            />
          </div>
        )}
      </TableContainer>
      {/* Controles de paginação */}
      <div className="flex items-center justify-between gap-3 mt-4">
        <div className="text-sm text-slate-600">
          Página <span className="font-semibold">{page}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <button className="btn btn-secondary" disabled={(page * pageSize) >= total && total > 0} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      </div>
    </div>
  );
}
