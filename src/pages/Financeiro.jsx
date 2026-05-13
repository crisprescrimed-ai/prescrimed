import { useState, useEffect } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  ArrowUpRight, 
  ArrowDownRight,
  Calendar,
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';
import financeiroService from '../services/financeiro.service';
import TransacaoModal from '../components/TransacaoModal';
import toast from 'react-hot-toast';
import { errorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import { formatCurrency } from '../utils/currency';
import { downloadCsv } from '../utils/exportCsv';
import { openPrintWindow, escapeHtml } from '../utils/printWindow';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import SearchFilterBar from '../components/common/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
import ActionIconButton from '../components/common/ActionIconButton';
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

export default function Financeiro() {
  const [transacoes, setTransacoes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState({
    receitas: 0,
    despesas: 0,
    saldo: 0,
    receitasPendentes: 0,
    despesasPendentes: 0
  });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTransacao, setSelectedTransacao] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [filter, setFilter] = useState({
    tipo: '',
    status: '',
    search: ''
  });

  useEffect(() => {
    loadData();
  }, [page]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [transacoesData, statsData] = await Promise.all([
        financeiroService.getAll({ page, pageSize }),
        financeiroService.getStats()
      ]);
      if (Array.isArray(transacoesData)) {
        setTransacoes(transacoesData);
        setTotal(transacoesData.length);
      } else {
        setTransacoes(Array.isArray(transacoesData.items) ? transacoesData.items : []);
        setTotal(Number(transacoesData.total) || 0);
        setPageSize(Number(transacoesData.pageSize) || 10);
      }
      
      // Garantir que todos os valores sejam numéricos válidos
      setStats({
        receitas: Number(statsData?.receitas) || 0,
        despesas: Number(statsData?.despesas) || 0,
        saldo: Number(statsData?.saldo) || 0,
        receitasPendentes: Number(statsData?.receitasPendentes) || 0,
        despesasPendentes: Number(statsData?.despesasPendentes) || 0
      });
    } catch (error) {
      handleApiError(error, errorMessage('load', 'dados financeiros'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (transacao) => {
    setSelectedTransacao(transacao);
    setModalOpen(true);
  };

  const handleDelete = async (id, descricao) => {
    const confirmMessage = `Tem certeza que deseja excluir a transação "${descricao}"?\n\nEsta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMessage)) return;
    try {
      setDeletingId(id);
      await financeiroService.delete(id);
      toast.success('Transação excluída com sucesso');
      loadData();
    } catch (error) {
      handleApiError(error, errorMessage('delete', 'transação'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedTransacao(null);
    loadData();
  };

  const exportToPDF = () => {
    try {
      const generatedAt = new Date();
      const styles = `
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
        .stat-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; flex: 1; min-width: 200px; }
        .stat-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .receita { color: #059669; }
        .despesa { color: #dc2626; }
        .pago { color: #059669; background: #d1fae5; padding: 4px 8px; border-radius: 4px; }
        .pendente { color: #d97706; background: #fef3c7; padding: 4px 8px; border-radius: 4px; }
        @media print { body { padding: 0; } }
      `;

      const rowsHtml = filteredTransacoes
        .map((t) => {
          const tipo = t.tipo === 'receita' ? 'receita' : 'despesa';
          const status = t.status === 'pago' ? 'pago' : 'pendente';
          return `
            <tr>
              <td>${escapeHtml(new Date(t.data).toLocaleDateString('pt-BR'))}</td>
              <td>${escapeHtml(t.descricao)}</td>
              <td>${escapeHtml(t.categoria)}</td>
              <td class="${tipo}">${tipo === 'receita' ? 'Receita' : 'Despesa'}</td>
              <td class="${tipo}">${tipo === 'despesa' ? '-' : '+'}${escapeHtml(formatCurrency(t.valor))}</td>
              <td><span class="${status}">${status === 'pago' ? 'Pago' : 'Pendente'}</span></td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <h1>Relatório Financeiro</h1>
        <p>Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</p>
        
        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Saldo Atual</div>
            <div class="stat-value">${escapeHtml(formatCurrency(stats.saldo))}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Receitas</div>
            <div class="stat-value" style="color: #059669">${escapeHtml(formatCurrency(stats.receitas))}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Despesas</div>
            <div class="stat-value" style="color: #dc2626">${escapeHtml(formatCurrency(stats.despesas))}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Descrição</th>
              <th>Categoria</th>
              <th>Tipo</th>
              <th>Valor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      openPrintWindow({
        title: 'Relatório Financeiro - Prescrimed',
        styles,
        bodyHtml
      });
      toast.success('Abrindo visualização para impressão/PDF');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    }
  };

  const exportToExcel = () => {
    try {
      const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor', 'Status'];

      const rows = filteredTransacoes.map((t) => [
        new Date(t.data).toLocaleDateString('pt-BR'),
        t.descricao,
        t.categoria,
        t.tipo === 'receita' ? 'Receita' : 'Despesa',
        `${t.tipo === 'despesa' ? '-' : ''}${t.valor}`,
        t.status === 'pago' ? 'Pago' : 'Pendente'
      ]);

      const lines = [
        ['RELATÓRIO FINANCEIRO'],
        ['Gerado em:', new Date().toLocaleString('pt-BR')],
        [],
        ['RESUMO'],
        ['Saldo Atual', stats.saldo],
        ['Receitas', stats.receitas],
        ['Despesas', stats.despesas],
        ['Receitas Pendentes', stats.receitasPendentes],
        ['Despesas Pendentes', stats.despesasPendentes],
        [],
        ['TRANSAÇÕES'],
        headers,
        ...rows
      ];

      downloadCsv({
        filename: `financeiro_${new Date().toISOString().split('T')[0]}.csv`,
        lines
      });
      
      toast.success('Arquivo Excel exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar para Excel');
    }
  };

  const filteredTransacoes = transacoes.filter(t => {
    const matchesSearch = t.descricao.toLowerCase().includes(filter.search.toLowerCase()) ||
                          t.categoria.toLowerCase().includes(filter.search.toLowerCase());
    const matchesTipo = filter.tipo ? t.tipo === filter.tipo : true;
    const matchesStatus = filter.status ? t.status === filter.status : true;
    return matchesSearch && matchesTipo && matchesStatus;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        label="Administrativo"
        title="Financeiro"
        subtitle="Gestão completa de receitas, despesas e fluxo de caixa."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Botões de Exportação */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToPDF}
              disabled={filteredTransacoes.length === 0}
              className="group relative px-4 py-2.5 bg-white border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Exportar para PDF"
              aria-label="Exportar relatório em PDF"
            >
              <FileDown size={18} />
              <span className="hidden sm:inline font-medium">PDF</span>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Exportar PDF
              </span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredTransacoes.length === 0}
              className="group relative px-4 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Exportar para Excel"
              aria-label="Exportar relatório em Excel"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline font-medium">Excel</span>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Exportar Excel
              </span>
            </button>
          </div>
          
          {/* Separador visual */}
          <div className="hidden md:block w-px h-8 bg-slate-200"></div>
          
          {/* Botão Nova Transação */}
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20"
          >
            <Plus size={20} /> <span className="hidden sm:inline">Nova Transação</span><span className="sm:hidden">Nova</span>
          </button>
        </div>
      </PageHeader>
      {/* Controles de paginação */}
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-slate-600">
          Página <span className="font-semibold">{page}</span>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Anterior</button>
          <button className="btn btn-secondary" disabled={(page * pageSize) >= total && total > 0} onClick={() => setPage((p) => p + 1)}>Próxima</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={DollarSign}
          label="Saldo Atual"
          value={formatCurrency(stats.saldo)}
          description="Balanço geral do mês"
          color={stats.saldo >= 0 ? 'primary' : 'red'}
        />
        <StatsCard
          icon={TrendingUp}
          label="Receitas"
          value={formatCurrency(stats.receitas)}
          description={
            <span className="flex items-center gap-1">
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                +{formatCurrency(stats.receitasPendentes)}
              </span>
              <span className="text-xs text-slate-400">a receber</span>
            </span>
          }
          color="emerald"
        />
        <StatsCard
          icon={TrendingDown}
          label="Despesas"
          value={formatCurrency(stats.despesas)}
          description={
            <span className="flex items-center gap-1">
              <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                +{formatCurrency(stats.despesasPendentes)}
              </span>
              <span className="text-xs text-slate-400">a pagar</span>
            </span>
          }
          color="red"
        />
        <StatsCard
          icon={Clock}
          label="Previsão"
          value={formatCurrency(stats.saldo + stats.receitasPendentes - stats.despesasPendentes)}
          description="Saldo projetado"
          color="purple"
        />
      </div>

      <SearchFilterBar
        searchTerm={filter.search}
        onSearchChange={(val) => setFilter({ ...filter, search: val })}
        placeholder="Buscar transações..."
      >
        <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          <select
            value={filter.tipo}
            onChange={(e) => setFilter({ ...filter, tipo: e.target.value })}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary-500"
          >
            <option value="">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-600 focus:outline-none focus:border-primary-500"
          >
            <option value="">Todos os status</option>
            <option value="pago">Pago</option>
            <option value="pendente">Pendente</option>
          </select>
        </div>
      </SearchFilterBar>

      <TableContainer
        title="Transações"
        actions={
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus size={18} /> Nova
          </button>
        }
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredTransacoes.length > 0 ? (
          <>
            {/* Mobile */}
            <MobileGrid>
              {filteredTransacoes.map((t) => (
                <MobileCard key={t._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${t.tipo === 'receita' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                        {t.tipo === 'receita' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-gray-100">{t.descricao}</p>
                        <p className="text-[10px] text-slate-400">Código: {t.id || t._id}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                            {t.categoria}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-600 dark:text-gray-300">
                            <Calendar size={12} /> {new Date(t.data).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className={`text-sm font-semibold ${t.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {t.tipo === 'despesa' ? '-' : '+'}{formatCurrency(t.valor)}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                      t.status === 'pago' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {t.status === 'pago' ? (
                        <><CheckCircle2 size={12} /> Pago</>
                      ) : (
                        <><Clock size={12} /> Pendente</>
                      )}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        aria-label="Editar transação"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(t._id, t.descricao)}
                        disabled={deletingId === t._id}
                        className="p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-red-500 to-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="Excluir transação"
                      >
                        {deletingId === t._id ? (
                          <div className="animate-spin rounded-full h-[18px] w-[18px] border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Trash2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </MobileCard>
              ))}
            </MobileGrid>

            {/* Desktop */}
            <TableWrapper>
              <TableHeader columns={["Descrição","Categoria","Data","Valor","Status","Ações"]} />
              <TBody>
                {filteredTransacoes.map((transacao) => (
                  <Tr key={transacao._id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${transacao.tipo === 'receita' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                          {transacao.tipo === 'receita' ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-gray-100">{transacao.descricao}</p>
                          <p className="text-[11px] text-slate-400">Código: {transacao.id || transacao._id}</p>
                          {transacao.pacienteId && (
                            <p className="text-xs text-slate-500 dark:text-gray-300">{transacao.pacienteId.nome}</p>
                          )}
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300">
                        {transacao.categoria}
                      </span>
                    </Td>
                    <Td className="text-sm text-slate-600 dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        {new Date(transacao.data).toLocaleDateString('pt-BR')}
                      </div>
                    </Td>
                    <Td className={`font-semibold ${transacao.tipo === 'receita' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {transacao.tipo === 'despesa' ? '-' : '+'}{formatCurrency(transacao.valor)}
                    </Td>
                    <Td>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        transacao.status === 'pago' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {transacao.status === 'pago' ? (
                          <><CheckCircle2 size={12} /> Pago</>
                        ) : (
                          <><Clock size={12} /> Pendente</>
                        )}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ActionIconButton
                          onClick={() => handleEdit(transacao)}
                          icon={Edit2}
                          tooltip="Editar"
                          ariaLabel="Editar transação"
                          variant="primary"
                        />
                        <ActionIconButton
                          onClick={() => handleDelete(transacao._id, transacao.descricao)}
                          icon={Trash2}
                          tooltip="Excluir"
                          ariaLabel="Excluir transação"
                          variant="danger"
                          disabled={deletingId === transacao._id}
                          loading={deletingId === transacao._id}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrapper>
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={DollarSign}
              title="Nenhuma transação encontrada"
              description="Comece adicionando uma nova receita ou despesa."
              action={
                <button onClick={() => setModalOpen(true)} className="btn btn-primary mt-4">
                  Nova Transação
                </button>
              }
            />
          </div>
        )}
      </TableContainer>

      {modalOpen && (
        <TransacaoModal 
          transacao={selectedTransacao} 
          onClose={handleModalClose} 
        />
      )}
    </div>
  );
}
