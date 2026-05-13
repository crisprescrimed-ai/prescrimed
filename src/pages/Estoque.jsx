import { useState, useEffect } from 'react';
import { 
  Pill, 
  Utensils, 
  Plus, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  AlertTriangle,
  Package,
  X,
  Calendar,
  Layers,
  CheckCircle2,
  FileDown,
  FileSpreadsheet
} from 'lucide-react';
import estoqueService from '../services/estoque.service';
import toast from 'react-hot-toast';
import { errorMessage, apiErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import { downloadCsv } from '../utils/exportCsv';
import { openPrintWindow, escapeHtml } from '../utils/printWindow';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import SearchFilterBar from '../components/common/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
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

export default function Estoque() {
  const [activeTab, setActiveTab] = useState('medicamentos'); // medicamentos, alimentos
  const [modalOpen, setModalOpen] = useState(null); // null, 'cadastrar', 'entrada', 'saida'
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [stats, setStats] = useState(null);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [showHistorico, setShowHistorico] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Form States
  const [formData, setFormData] = useState({});
  const [movimentacaoData, setMovimentacaoData] = useState({ quantidade: '', motivo: '', observacao: '' });

  useEffect(() => {
    loadItems();
    loadStats();
  }, [activeTab, page]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = { page, pageSize };
      const data = activeTab === 'medicamentos' 
        ? await estoqueService.getMedicamentos(params) 
        : await estoqueService.getAlimentos(params);

      if (Array.isArray(data)) {
        setItems(data);
        setTotal(data.length);
      } else {
        const itemsList = Array.isArray(data.items) ? data.items : (data.medicamentos || data.alimentos || []);
        setItems(itemsList);
        setTotal(Number(data.total) || 0);
        setPageSize(Number(data.pageSize) || 10);
      }
    } catch (error) {
      handleApiError(error, errorMessage('load', 'itens'));
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const data = await estoqueService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const loadMovimentacoes = async () => {
    try {
      const data = await estoqueService.getMovimentacoes();
      setMovimentacoes(data.movimentacoes || []);
      setShowHistorico(true);
    } catch (error) {
      handleApiError(error, errorMessage('load', 'histórico'));
    }
  };

  const handleCadastrar = async (e) => {
    e.preventDefault();
    try {
      if (activeTab === 'medicamentos') {
        await estoqueService.createMedicamento(formData);
      } else {
        await estoqueService.createAlimento(formData);
      }
      toast.success('Cadastrado com sucesso!');
      closeModal();
      loadItems();
    } catch (error) {
      handleApiError(error, errorMessage('create', 'item'));
    }
  };

  const handleMovimentacao = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...movimentacaoData,
        tipo: modalOpen, // entrada ou saida
        [activeTab === 'medicamentos' ? 'medicamentoId' : 'alimentoId']: movimentacaoData.itemId
      };

      if (activeTab === 'medicamentos') {
        await estoqueService.movimentarMedicamento(payload);
      } else {
        await estoqueService.movimentarAlimento(payload);
      }
      toast.success('Movimentação registrada!');
      closeModal();
      loadItems();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'movimentação'));
    }
  };

  const closeModal = () => {
    setModalOpen(null);
    setFormData({});
    setMovimentacaoData({ quantidade: '', motivo: '', observacao: '' });
  };

  const exportToPDF = () => {
    try {
      const tabName = activeTab === 'medicamentos' ? 'Medicamentos' : 'Alimentos';
      const generatedAt = new Date();
      const styles = `
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        .stats { display: flex; gap: 20px; margin: 20px 0; flex-wrap: wrap; }
        .stat-card { border: 1px solid #e5e7eb; padding: 15px; border-radius: 8px; flex: 1; min-width: 180px; }
        .stat-label { color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .stat-value { font-size: 24px; font-weight: bold; margin: 8px 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; color: #374151; }
        .baixo-estoque { color: #dc2626; font-weight: 600; }
        .ok { color: #059669; }
        @media print { body { padding: 0; } }
      `;

      const rowsHtml = filteredItems
        .map((item) => {
          const isBaixo = item.quantidade <= (item.quantidadeMinima || 0);
          const validade = item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '-';
          return `
            <tr>
              <td>${escapeHtml(item.nome)}</td>
              <td>${escapeHtml(item.categoria || 'Geral')}</td>
              <td class="${isBaixo ? 'baixo-estoque' : 'ok'}">${escapeHtml(item.quantidade)} ${escapeHtml(item.unidade || '')}</td>
              <td>${escapeHtml(item.quantidadeMinima || '-')}</td>
              <td>${escapeHtml(validade)}</td>
              <td>${isBaixo ? '<span class="baixo-estoque">⚠️ Baixo</span>' : '<span class="ok">✓ OK</span>'}</td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <h1>Relatório de Estoque - ${escapeHtml(tabName)}</h1>
        <p>Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</p>

        <div class="stats">
          <div class="stat-card">
            <div class="stat-label">Total de Itens</div>
            <div class="stat-value">${escapeHtml(itemStats.total)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Baixo Estoque</div>
            <div class="stat-value" style="color: #dc2626">${escapeHtml(itemStats.baixoEstoque)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Vencendo (30 dias)</div>
            <div class="stat-value" style="color: #d97706">${escapeHtml(itemStats.vencendo)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Categorias</div>
            <div class="stat-value">${escapeHtml(itemStats.categorias)}</div>
          </div>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Categoria</th>
              <th>Quantidade</th>
              <th>Qtd. Mínima</th>
              <th>Validade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      openPrintWindow({
        title: `Relatório de Estoque - ${tabName} - Prescrimed`,
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
      const tabName = activeTab === 'medicamentos' ? 'Medicamentos' : 'Alimentos';
      const headers = ['Nome', 'Categoria', 'Quantidade', 'Unidade', 'Qtd. Mínima', 'Validade', 'Lote', 'Fabricante'];
      const rows = filteredItems.map(item => [
        item.nome,
        item.categoria || 'Geral',
        item.quantidade,
        item.unidade || '',
        item.quantidadeMinima || '',
        item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '',
        item.lote || '',
        item.fabricante || ''
      ]);
      
      const lines = [
        [`RELATÓRIO DE ESTOQUE - ${tabName.toUpperCase()}`],
        ['Gerado em:', new Date().toLocaleString('pt-BR')],
        [],
        ['RESUMO'],
        ['Total de Itens', itemStats.total],
        ['Baixo Estoque', itemStats.baixoEstoque],
        ['Vencendo (30 dias)', itemStats.vencendo],
        ['Categorias Diferentes', itemStats.categorias],
        [],
        ['ITENS DO ESTOQUE'],
        headers,
        ...rows
      ];
      
      downloadCsv({
        filename: `estoque_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`,
        lines
      });
      
      toast.success('Arquivo Excel exportado com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar para Excel');
    }
  };

  const filteredItems = items.filter(item => 
    item.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const itemStats = {
    total: items.length,
    baixoEstoque: items.filter(i => i.quantidade <= (i.quantidadeMinima || 0)).length,
    vencendo: items.filter(i => {
      if (!i.validade) return false;
      const validade = new Date(i.validade);
      const now = new Date();
      const diffTime = validade - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays > 0 && diffDays <= 30;
    }).length,
    categorias: new Set(items.map(i => i.categoria || 'Geral')).size
  };

  // --- MODALS ---

  const renderModal = () => {
    if (!modalOpen) return null;

    const isMed = activeTab === 'medicamentos';
    const isMovimentacao = modalOpen === 'entrada' || modalOpen === 'saida';

    return (
      <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-[51]">
            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              {modalOpen === 'cadastrar' && <Plus className="text-primary-600" />}
              {modalOpen === 'entrada' && <ArrowDownCircle className="text-emerald-600" />}
              {modalOpen === 'saida' && <ArrowUpCircle className="text-red-600" />}
              
              {modalOpen === 'cadastrar' ? `Novo ${isMed ? 'Medicamento' : 'Alimento'}` :
               modalOpen === 'entrada' ? 'Registrar Entrada' : 'Registrar Saída'}
            </h3>
            <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
          
          <div className="p-6">
            {isMovimentacao ? (
              <form onSubmit={handleMovimentacao} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Selecione o Item</label>
                  <select 
                    required
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                    onChange={e => setMovimentacaoData({...movimentacaoData, itemId: e.target.value})}
                    value={movimentacaoData.itemId || ''}
                  >
                    <option value="">Selecione...</option>
                    {items.map(item => (
                      <option key={item._id} value={item._id}>
                        {item.nome} (Atual: {item.quantidade} {item.unidade})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Quantidade</label>
                    <input 
                      required
                      type="number" 
                      min="1"
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      value={movimentacaoData.quantidade}
                      onChange={e => setMovimentacaoData({...movimentacaoData, quantidade: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Motivo</label>
                    <select 
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setMovimentacaoData({...movimentacaoData, motivo: e.target.value})}
                      value={movimentacaoData.motivo || ''}
                    >
                      <option value="">Selecione...</option>
                      {modalOpen === 'entrada' ? (
                        <>
                          <option value="Compra">Compra</option>
                          <option value="Doação">Doação</option>
                          <option value="Ajuste">Ajuste de Estoque</option>
                        </>
                      ) : (
                        <>
                          <option value="Uso">Uso/Consumo</option>
                          <option value="Vencimento">Vencimento/Descarte</option>
                          <option value="Ajuste">Ajuste de Estoque</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Observação (Opcional)</label>
                  <textarea 
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    rows="3"
                    value={movimentacaoData.observacao}
                    onChange={e => setMovimentacaoData({...movimentacaoData, observacao: e.target.value})}
                  ></textarea>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                  <button 
                    type="submit" 
                    className={`px-6 py-2 rounded-lg font-bold text-white shadow-lg transition-all transform hover:-translate-y-0.5 ${
                      modalOpen === 'entrada' 
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' 
                        : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                    }`}
                  >
                    Confirmar {modalOpen === 'entrada' ? 'Entrada' : 'Saída'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleCadastrar} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nome do Item</label>
                  <input 
                    required 
                    type="text" 
                    className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidade</label>
                    <select 
                      required
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setFormData({...formData, unidade: e.target.value})}
                      defaultValue=""
                    >
                      <option value="" disabled>Selecione</option>
                      {isMed ? (
                        <>
                          <option value="comprimido">Comprimido</option>
                          <option value="caixa">Caixa</option>
                          <option value="frasco">Frasco</option>
                          <option value="ml">ml</option>
                          <option value="ampola">Ampola</option>
                        </>
                      ) : (
                        <>
                          <option value="kg">Kg</option>
                          <option value="litro">Litro</option>
                          <option value="unidade">Unidade</option>
                          <option value="pacote">Pacote</option>
                          <option value="lata">Lata</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Inicial</label>
                    <input 
                      type="number" 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setFormData({...formData, quantidade: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Qtd. Mínima (Alerta)</label>
                    <input 
                      type="number" 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setFormData({...formData, quantidadeMinima: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Validade</label>
                    <input 
                      type="date" 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setFormData({...formData, validade: e.target.value})}
                    />
                  </div>
                </div>

                {isMed ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Lote</label>
                    <input 
                      type="text" 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setFormData({...formData, lote: e.target.value})}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
                    <select 
                      className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      onChange={e => setFormData({...formData, categoria: e.target.value})}
                    >
                      <option value="Geral">Geral</option>
                      <option value="Perecível">Perecível</option>
                      <option value="Não Perecível">Não Perecível</option>
                      <option value="Bebida">Bebida</option>
                    </select>
                  </div>
                )}

                <div className="pt-4 flex justify-end gap-3">
                  <button type="button" onClick={closeModal} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium">Cancelar</button>
                  <button type="submit" className="px-6 py-2 bg-primary-600 text-white rounded-lg font-bold hover:bg-primary-700 shadow-lg shadow-primary-600/20 transition-all transform hover:-translate-y-0.5">
                    Salvar Cadastro
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader
        label="Logística"
        title="Controle de Estoque"
        subtitle="Gerencie o inventário de medicamentos e alimentos, registre entradas e saídas."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Botões de Exportação */}
          <div className="flex items-center gap-2">
            <button
              onClick={exportToPDF}
              disabled={filteredItems.length === 0}
              className="group relative px-3 py-2.5 bg-white border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Exportar para PDF"
              aria-label="Exportar relatório em PDF"
            >
              <FileDown size={18} />
              <span className="hidden lg:inline font-medium text-sm">PDF</span>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Exportar PDF
              </span>
            </button>
            <button
              onClick={exportToExcel}
              disabled={filteredItems.length === 0}
              className="group relative px-3 py-2.5 bg-white border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-500 hover:text-white rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Exportar para Excel"
              aria-label="Exportar relatório em Excel"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden lg:inline font-medium text-sm">Excel</span>
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 text-xs font-medium text-white bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                Exportar Excel
              </span>
            </button>
          </div>
          
          {/* Separador */}
          <div className="hidden md:block w-px h-8 bg-slate-200"></div>
          
          {/* Botões de Ação */}
          <button 
            onClick={loadMovimentacoes}
            className="btn bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200 flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            <Layers size={18} /> <span className="hidden sm:inline">Histórico</span>
          </button>
          <button 
            onClick={() => setModalOpen('entrada')}
            className="btn bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            <ArrowDownCircle size={18} /> <span className="hidden sm:inline">Entrada</span>
          </button>
          <button 
            onClick={() => setModalOpen('saida')}
            className="btn bg-red-50 text-red-700 hover:bg-red-100 border-red-200 flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            <ArrowUpCircle size={18} /> <span className="hidden sm:inline">Saída</span>
          </button>
          <button 
            onClick={() => setModalOpen('cadastrar')}
            className="btn bg-primary-600 text-white hover:bg-primary-700 shadow-lg shadow-primary-600/20 flex items-center gap-2 px-3 py-2.5 rounded-lg font-semibold transition-all text-sm"
          >
            <Plus size={18} /> <span className="hidden sm:inline">Novo</span>
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

      {/* Estatísticas Gerais */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={Package}
            label="Total de Itens"
            value={stats.totalItens || 0}
            description={`${stats.totalMedicamentos ?? 0} med. + ${stats.totalAlimentos ?? 0} alim.`}
            color="primary"
          />
          <StatsCard
            icon={AlertTriangle}
            label="Baixo Estoque"
            value={stats.baixoEstoque || 0}
            description="Itens precisando reposição"
            color="red"
          />
          <StatsCard
            icon={Calendar}
            label="Vencendo"
            value={stats.vencendo || 0}
            description="Nos próximos 30 dias"
            color="amber"
          />
          <StatsCard
            icon={Layers}
            label="Movimentações"
            value={stats.movimentacoesRecentes || 0}
            description="Últimos 30 dias"
            color="emerald"
          />
        </div>
      )}

      {/* Estatísticas por Categoria */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          icon={Package}
          label="Total"
          value={itemStats.total}
          description="Itens cadastrados"
          color="primary"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Baixo Estoque"
          value={itemStats.baixoEstoque}
          description="Itens precisando reposição"
          color="red"
        />
        <StatsCard
          icon={Calendar}
          label="Vencendo"
          value={itemStats.vencendo}
          description="Nos próximos 30 dias"
          color="orange"
        />
        <StatsCard
          icon={Layers}
          label="Categorias"
          value={itemStats.categorias}
          description="Tipos de itens"
          color="purple"
        />
      </div>

      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder={`Buscar ${activeTab}...`}
      >
        <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
          <button
            onClick={() => setActiveTab('medicamentos')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'medicamentos' 
                ? 'bg-white text-primary-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Pill size={16} /> Medicamentos
          </button>
          <button
            onClick={() => setActiveTab('alimentos')}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
              activeTab === 'alimentos' 
                ? 'bg-white text-green-600 shadow-sm' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Utensils size={16} /> Alimentos
          </button>
        </div>
      </SearchFilterBar>

      {/* Main Content Table */}
      <TableContainer title={`Estoque de ${activeTab === 'medicamentos' ? 'Medicamentos' : 'Alimentos'}`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredItems.length > 0 ? (
          <>
            {/* Mobile */}
            <MobileGrid>
              {filteredItems.map((item) => {
                const isLow = item.quantidade <= item.quantidadeMinima;
                return (
                  <MobileCard key={item._id}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${activeTab === 'medicamentos' ? 'bg-primary-50 text-primary-600' : 'bg-green-50 text-green-600'}`}>
                          {activeTab === 'medicamentos' ? <Pill size={18} /> : <Utensils size={18} />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-gray-100">{item.nome}</p>
                          <p className="text-[10px] text-slate-400">Código: {item.id || item._id}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-gray-400">
                            {item.lote && <span>Lote: {item.lote}</span>}
                            {item.categoria && <span>Cat: {item.categoria}</span>}
                          </div>
                        </div>
                      </div>
                      {isLow ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                          <AlertTriangle size={12} /> Baixo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                          <CheckCircle2 size={12} /> OK
                        </span>
                      )}
                    </div>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="text-slate-500 dark:text-gray-400 text-xs block">Qtd.</span>
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-700 dark:text-gray-200'}`}>
                          {item.quantidade}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-gray-400 text-xs block">Unidade</span>
                        <span className="text-slate-600 dark:text-gray-300 font-medium">{item.unidade}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-gray-400 text-xs block">Validade</span>
                        <span className="text-slate-600 dark:text-gray-300 font-medium">
                          {item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </div>
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button className="text-slate-400 hover:text-primary-600 font-medium text-sm transition">
                        Detalhes
                      </button>
                    </div>
                  </MobileCard>
                );
              })}
            </MobileGrid>

            {/* Desktop */}
            <TableWrapper>
              <TableHeader columns={["Item","Quantidade","Unidade","Validade","Status","Ações"]} />
              <TBody>
                {filteredItems.map((item) => {
                  const isLow = item.quantidade <= item.quantidadeMinima;
                  return (
                    <Tr key={item._id}>
                      <Td>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${activeTab === 'medicamentos' ? 'bg-primary-50 text-primary-600' : 'bg-green-50 text-green-600'}`}>
                            {activeTab === 'medicamentos' ? <Pill size={18} /> : <Utensils size={18} />}
                          </div>
                          <div>
                            <span className="font-bold text-slate-800 dark:text-gray-100 block">{item.nome}</span>
                            <span className="text-[11px] text-slate-400 block">Código: {item.id || item._id}</span>
                            {item.lote && <span className="text-xs text-slate-500 dark:text-gray-400">Lote: {item.lote}</span>}
                            {item.categoria && <span className="text-xs text-slate-500 dark:text-gray-400">Cat: {item.categoria}</span>}
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <span className={`font-bold text-lg ${isLow ? 'text-red-600' : 'text-slate-700 dark:text-gray-200'}`}>
                          {item.quantidade}
                        </span>
                      </Td>
                      <Td>
                        <span className="text-sm text-slate-500 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded-md font-medium">
                          {item.unidade}
                        </span>
                      </Td>
                      <Td className="text-sm text-slate-600 dark:text-gray-300">
                        {item.validade ? new Date(item.validade).toLocaleDateString('pt-BR') : '-'}
                      </Td>
                      <Td>
                        {isLow ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-100">
                            <AlertTriangle size={12} /> Baixo Estoque
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            <CheckCircle2 size={12} /> Normal
                          </span>
                        )}
                      </Td>
                      <Td className="text-right">
                        <button className="text-slate-400 hover:text-primary-600 font-medium text-sm transition">
                          Detalhes
                        </button>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </TableWrapper>
          </>
        ) : (
          <div className="p-8">
            <EmptyState
              icon={Package}
              title="Nenhum item encontrado"
              description="Nenhum item encontrado no estoque."
            />
          </div>
        )}
      </TableContainer>

      {renderModal()}

      {/* Modal Histórico de Movimentações */}
      {showHistorico && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full md:max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Layers className="text-primary-600" />
                  Histórico de Movimentações
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Últimas 50 movimentações registradas
                </p>
              </div>
              <button
                onClick={() => setShowHistorico(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {movimentacoes.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Item</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Qtd</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Motivo</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Usuário</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {movimentacoes.map((mov) => (
                        <tr key={mov._id} className="hover:bg-slate-50/50 transition">
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {new Date(mov.data).toLocaleString('pt-BR')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                                mov.tipo === 'entrada'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : 'bg-red-50 text-red-700'
                              }`}
                            >
                              {mov.tipo === 'entrada' ? (
                                <><ArrowDownCircle size={12} /> Entrada</>
                              ) : (
                                <><ArrowUpCircle size={12} /> Saída</>
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">
                            {mov.itemNome}
                            <span className="ml-2 text-xs text-slate-500">
                              ({mov.itemTipo})
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm font-bold text-slate-700">
                            {mov.tipo === 'entrada' ? '+' : '-'}{mov.quantidade}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {mov.motivo}
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {mov.usuarioNome}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Layers size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Nenhuma movimentação encontrada</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
