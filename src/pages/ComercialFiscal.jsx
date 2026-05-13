import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeDollarSign,
  Copy,
  ExternalLink,
  Package,
  Plus,
  QrCode,
  Receipt,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
} from 'lucide-react';
import comercialService from '../services/comercial.service';
import { useAuthStore } from '../store/authStore';
import { getSelectedEmpresaId } from '../utils/empresaContext';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import { formatCurrency } from '../utils/currency';
import { handleApiError } from '../utils/errorHandler';
import { errorMessage } from '../utils/toastMessages';
import toast from 'react-hot-toast';

const initialItemForm = {
  tipo: 'produto',
  nome: '',
  categoria: '',
  preco: '',
  estoqueAtual: '',
  estoqueMinimo: '',
  unidade: 'un',
  descricao: '',
};

const initialPedidoForm = {
  clienteNome: '',
  origem: 'balcao',
  catalogoItemId: '',
  quantidade: 1,
  metodo: 'pix',
  pagamentoStatus: 'aprovado',
  iniciarCheckout: false,
  observacoes: '',
};

function statusBadgeClasses(status) {
  switch (status) {
    case 'pago':
    case 'aprovado':
    case 'emitida':
      return 'bg-emerald-100 text-emerald-700';
    case 'simulada':
      return 'bg-blue-100 text-blue-700';
    case 'pendente':
    case 'processando':
      return 'bg-amber-100 text-amber-700';
    case 'cancelado':
    case 'rejeitada':
    case 'recusado':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

export default function ComercialFiscal() {
  const { user } = useAuthStore();
  const isSuperadmin = user?.role === 'superadmin';
  const empresaContextoSelecionado = isSuperadmin ? getSelectedEmpresaId() : true;
  const [overview, setOverview] = useState({ metrics: {}, readiness: {} });
  const [catalogo, setCatalogo] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [notas, setNotas] = useState([]);
  const [itemForm, setItemForm] = useState(initialItemForm);
  const [pedidoForm, setPedidoForm] = useState(initialPedidoForm);
  const [loading, setLoading] = useState(true);
  const [savingItem, setSavingItem] = useState(false);
  const [savingPedido, setSavingPedido] = useState(false);
  const [checkoutFeedback, setCheckoutFeedback] = useState(null);

  const selectedCatalogItem = useMemo(
    () => catalogo.find((item) => item.id === pedidoForm.catalogoItemId) || null,
    [catalogo, pedidoForm.catalogoItemId]
  );

  const projectedOrderTotal = useMemo(() => {
    const quantidade = Number(pedidoForm.quantidade) || 0;
    const preco = Number(selectedCatalogItem?.preco) || 0;
    return quantidade * preco;
  }, [pedidoForm.quantidade, selectedCatalogItem]);

  const loadData = async ({ silent } = { silent: false }) => {
    if (!silent) setLoading(true);
    try {
      const [overviewData, catalogoData, pedidosData, notasData] = await Promise.all([
        comercialService.getOverview(),
        comercialService.getCatalogo({ ativo: true }),
        comercialService.getPedidos(),
        comercialService.getNotas(),
      ]);
      setOverview(overviewData || { metrics: {}, readiness: {} });
      setCatalogo(Array.isArray(catalogoData) ? catalogoData : []);
      setPedidos(Array.isArray(pedidosData) ? pedidosData : []);
      setNotas(Array.isArray(notasData) ? notasData : []);
    } catch (error) {
      handleApiError(error, errorMessage('load', 'módulo comercial/fiscal'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateItem = async (event) => {
    event.preventDefault();
    setSavingItem(true);
    try {
      await comercialService.createItem({
        ...itemForm,
        preco: Number(itemForm.preco) || 0,
        estoqueAtual: itemForm.tipo === 'servico' ? 0 : Number(itemForm.estoqueAtual) || 0,
        estoqueMinimo: itemForm.tipo === 'servico' ? 0 : Number(itemForm.estoqueMinimo) || 0,
      });
      toast.success('Item comercial cadastrado.');
      setItemForm(initialItemForm);
      await loadData({ silent: true });
    } catch (error) {
      handleApiError(error, errorMessage('create', 'item comercial'));
    } finally {
      setSavingItem(false);
    }
  };

  const handleCreatePedido = async (event) => {
    event.preventDefault();
    if (!selectedCatalogItem) {
      toast.error('Selecione um item do catálogo para montar o pedido.');
      return;
    }

    setSavingPedido(true);
    try {
      const shouldStartCheckout = pedidoForm.iniciarCheckout || pedidoForm.origem === 'online';
      const createdPedido = await comercialService.createPedido({
        clienteNome: pedidoForm.clienteNome || null,
        origem: pedidoForm.origem,
        observacoes: pedidoForm.observacoes,
        items: [
          {
            catalogoItemId: selectedCatalogItem.id,
            quantidade: Number(pedidoForm.quantidade) || 1,
          }
        ],
        pagamento: shouldStartCheckout
          ? undefined
          : {
              metodo: pedidoForm.metodo,
              status: pedidoForm.pagamentoStatus,
              valor: projectedOrderTotal,
              gateway: 'manual',
            }
      });

      let checkoutResult = null;
      if (shouldStartCheckout) {
        checkoutResult = await comercialService.addPagamento(createdPedido.id, {
          metodo: pedidoForm.metodo,
          valor: projectedOrderTotal,
          gateway: 'externo',
          iniciarCheckout: true,
          clienteNome: pedidoForm.clienteNome || null,
        });

        setCheckoutFeedback({
          pedidoId: createdPedido.id,
          clienteNome: createdPedido.clienteNome || pedidoForm.clienteNome || 'Cliente não informado',
          total: createdPedido.total || projectedOrderTotal,
          checkout: checkoutResult.checkout || null,
          notaFiscal: checkoutResult.notaFiscal || null,
        });
        toast.success('Pedido criado e checkout preparado.');
      } else {
        setCheckoutFeedback(null);
        toast.success('Pedido criado com sucesso.');
      }

      setPedidoForm(initialPedidoForm);
      await loadData({ silent: true });
    } catch (error) {
      handleApiError(error, errorMessage('create', 'pedido comercial'));
    } finally {
      setSavingPedido(false);
    }
  };

  const handleEmitirNota = async (pedido) => {
    try {
      await comercialService.emitirNota(pedido.id, {});
      toast.success('Nota fiscal registrada.');
      await loadData({ silent: true });
    } catch (error) {
      handleApiError(error, errorMessage('create', 'nota fiscal'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const readiness = overview.readiness || {};
  const metrics = overview.metrics || {};
  const checkoutData = checkoutFeedback?.checkout || null;
  const qrCodeValue = checkoutData?.qrCode || null;
  const canRenderQrImage = typeof qrCodeValue === 'string' && (qrCodeValue.startsWith('data:image') || qrCodeValue.startsWith('http'));

  const handleCopyValue = async (value, successLabel) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      toast.success(successLabel);
    } catch (error) {
      toast.error('Não foi possível copiar o conteúdo.');
    }
  };

  return (
    <div className="space-y-8">
      {isSuperadmin && !empresaContextoSelecionado && (
        <div className="flex items-center gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle size={18} className="shrink-0 text-amber-500" />
          <span>
            Você está como <strong>Super Admin</strong> sem uma empresa selecionada. Selecione uma empresa no menu superior para criar pedidos e itens de catálogo.
          </span>
        </div>
      )}
      <PageHeader
        label="Expansão ERP"
        title="Comercial & Fiscal"
        subtitle="Base operacional para catálogo, pedidos, pagamentos e notas fiscais, pronta para integração futura com gateway e provedor SEFAZ via API REST."
      >
        <button
          onClick={() => loadData()}
          className="btn btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} /> Atualizar
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatsCard icon={Package} label="Catálogo ativo" value={metrics.catalogoTotal || 0} description={`${metrics.produtosAtivos || 0} produtos e ${metrics.servicosAtivos || 0} serviços`} color="primary" />
        <StatsCard icon={ShoppingCart} label="Pedidos abertos" value={metrics.pedidosAbertos || 0} description="Aguardando baixa financeira/fiscal" color="orange" />
        <StatsCard icon={BadgeDollarSign} label="Receita do mês" value={formatCurrency(metrics.receitaMes || 0)} description={`Ticket médio ${formatCurrency(metrics.ticketMedio || 0)}`} color="emerald" />
        <StatsCard icon={Receipt} label="Notas emitidas" value={metrics.notasEmitidas || 0} description={`${metrics.notasPendentes || 0} pendentes/rejeitadas`} color="blue" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="card xl:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 text-white overflow-hidden relative">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_35%)] pointer-events-none"></div>
          <div className="relative space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Prontidão de Integração</p>
                <h2 className="text-2xl font-semibold mt-2">Operação híbrida clínica + comercial</h2>
                <p className="text-sm text-slate-200 mt-2 max-w-2xl">
                  O módulo já suporta pedidos, baixa financeira automática e notas simuladas. Falta apenas plugar credenciais externas para emissão real de NF-e/NFS-e e checkout online.
                </p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/10 text-sm font-semibold">
                <ShieldCheck size={18} /> Base pronta para integração
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Fiscal</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${readiness.fiscal?.configured ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                    {readiness.fiscal?.configured ? 'Configurado' : 'Modo simulado'}
                  </span>
                  <span className="text-sm text-slate-200">{readiness.fiscal?.provider || 'Sem provedor'}</span>
                </div>
                <p className="text-xs text-slate-300 mt-3">
                  Certificado: {readiness.fiscal?.certificateConfigured ? 'presente' : 'pendente'} • Município NFSe: {readiness.fiscal?.cityCode || 'não informado'}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">Pagamentos</p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${readiness.payment?.configured ? 'bg-emerald-400/20 text-emerald-100' : 'bg-amber-400/20 text-amber-100'}`}>
                    {readiness.payment?.configured ? 'Gateway ativo' : 'Manual/simulado'}
                  </span>
                  <span className="text-sm text-slate-200">{readiness.payment?.provider || 'Sem gateway'}</span>
                </div>
                <p className="text-xs text-slate-300 mt-3">
                  Webhook: {readiness.payment?.webhookConfigured ? 'ok' : 'pendente'} • Assinatura: {readiness.payment?.signatureConfigured ? 'ok' : 'pendente'}
                </p>
                <p className="text-xs text-slate-300 mt-2">{readiness.nextStep}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="text-amber-600" size={22} />
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-600">Pontos críticos</p>
              <h2 className="text-xl font-semibold text-slate-900">Checklist técnico</h2>
            </div>
          </div>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="p-3 rounded-2xl bg-white/70 border border-amber-100">LGPD e segregação de dados de pacientes precisam continuar separados do fluxo fiscal.</div>
            <div className="p-3 rounded-2xl bg-white/70 border border-amber-100">Para vendas online reais, o próximo passo é integrar webhook de pagamento com baixa automática.</div>
            <div className="p-3 rounded-2xl bg-white/70 border border-amber-100">Para NFS-e, a prefeitura e o código municipal devem ser parametrizados por empresa.</div>
            <div className="p-3 rounded-2xl bg-white/70 border border-amber-100">Estoque crítico atual: <strong>{metrics.estoqueCritico || 0}</strong> itens comerciais abaixo do mínimo.</div>
          </div>
        </div>
      </div>

      {checkoutFeedback && (
        <div className="card bg-gradient-to-br from-emerald-50 via-white to-cyan-50 border-emerald-100">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-emerald-600">Checkout recente</p>
              <h2 className="text-xl font-semibold text-slate-900 mt-2">Pagamento externo preparado</h2>
              <p className="text-sm text-slate-600 mt-2 max-w-2xl">
                Pedido {checkoutFeedback.pedidoId.slice(0, 8)} para {checkoutFeedback.clienteNome}. Assim que o provedor aprovar o pagamento, o webhook baixa o financeiro e dispara a emissão fiscal.
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Valor</p>
              <p className="text-2xl font-semibold text-slate-900 mt-2">{formatCurrency(checkoutFeedback.total || 0)}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-emerald-100 bg-white/90">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Canal de cobrança</p>
                    <p className="text-xs text-slate-500 mt-1">{checkoutData?.provider || 'simulacao-interna'} • status {checkoutData?.status || 'pendente'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses(checkoutData?.status || 'pendente')}`}>
                    {checkoutData?.simulated ? 'simulado' : (checkoutData?.status || 'pendente')}
                  </span>
                </div>

                {checkoutData?.checkoutUrl && (
                  <div className="mt-4 flex gap-3 flex-wrap">
                    <a
                      href={checkoutData.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-primary inline-flex items-center gap-2"
                    >
                      <ExternalLink size={18} /> Abrir checkout
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary inline-flex items-center gap-2"
                      onClick={() => handleCopyValue(checkoutData.checkoutUrl, 'Link do checkout copiado.')}
                    >
                      <Copy size={18} /> Copiar link
                    </button>
                  </div>
                )}

                {checkoutData?.pixCopiaECola && (
                  <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2 text-slate-900 font-semibold">
                        <QrCode size={18} /> PIX copia e cola
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary px-3 py-2 text-sm inline-flex items-center gap-2"
                        onClick={() => handleCopyValue(checkoutData.pixCopiaECola, 'Código PIX copiado.')}
                      >
                        <Copy size={16} /> Copiar
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 mt-3 break-all leading-6">{checkoutData.pixCopiaECola}</p>
                  </div>
                )}
              </div>

              {checkoutFeedback.notaFiscal && (
                <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/80">
                  <p className="text-sm font-semibold text-slate-900">Nota fiscal associada</p>
                  <p className="text-xs text-slate-600 mt-1">
                    {checkoutFeedback.notaFiscal.tipoDocumento?.toUpperCase() || 'NF'} #{checkoutFeedback.notaFiscal.numero || 's/num'} • {checkoutFeedback.notaFiscal.status}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-white/90 flex flex-col items-center justify-center text-center">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">QRCode</p>
              <div className="mt-4 w-full max-w-[220px] aspect-square rounded-3xl border border-dashed border-slate-200 bg-slate-50 flex items-center justify-center p-4 overflow-hidden">
                {canRenderQrImage ? (
                  <img src={qrCodeValue} alt="QRCode do pagamento" className="max-w-full h-auto object-contain" />
                ) : (
                  <div className="space-y-3 text-slate-500">
                    <QrCode size={40} className="mx-auto" />
                    <p className="text-sm">
                      {checkoutData?.simulated
                        ? 'Gateway em modo simulado. Configure credenciais para receber QRCode real.'
                        : 'O provedor não retornou uma imagem de QRCode.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <form className="card space-y-4" onSubmit={handleCreateItem}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Catálogo</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-2">Novo produto ou serviço</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Tipo
              <select className="input" value={itemForm.tipo} onChange={(event) => setItemForm((prev) => ({ ...prev, tipo: event.target.value }))}>
                <option value="produto">Produto</option>
                <option value="servico">Serviço</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Categoria
              <input className="input" value={itemForm.categoria} onChange={(event) => setItemForm((prev) => ({ ...prev, categoria: event.target.value }))} placeholder="Petshop, fisioterapia, assinatura..." />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Nome
              <input className="input" value={itemForm.nome} onChange={(event) => setItemForm((prev) => ({ ...prev, nome: event.target.value }))} placeholder="Banho terapêutico, sessão domiciliar, suplemento..." required />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Preço
              <input className="input" type="number" min="0" step="0.01" value={itemForm.preco} onChange={(event) => setItemForm((prev) => ({ ...prev, preco: event.target.value }))} required />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Unidade
              <input className="input" value={itemForm.unidade} onChange={(event) => setItemForm((prev) => ({ ...prev, unidade: event.target.value }))} />
            </label>
            {itemForm.tipo === 'produto' && (
              <>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Estoque atual
                  <input className="input" type="number" min="0" step="0.01" value={itemForm.estoqueAtual} onChange={(event) => setItemForm((prev) => ({ ...prev, estoqueAtual: event.target.value }))} />
                </label>
                <label className="space-y-2 text-sm font-medium text-slate-700">
                  Estoque mínimo
                  <input className="input" type="number" min="0" step="0.01" value={itemForm.estoqueMinimo} onChange={(event) => setItemForm((prev) => ({ ...prev, estoqueMinimo: event.target.value }))} />
                </label>
              </>
            )}
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Descrição
              <textarea className="input min-h-[110px]" value={itemForm.descricao} onChange={(event) => setItemForm((prev) => ({ ...prev, descricao: event.target.value }))} placeholder="Use para tributação, observações e composição." />
            </label>
          </div>
          <button className="btn btn-primary flex items-center justify-center gap-2" disabled={savingItem}>
            <Plus size={18} /> {savingItem ? 'Salvando...' : 'Adicionar ao catálogo'}
          </button>
        </form>

        <form className="card space-y-4" onSubmit={handleCreatePedido}>
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Pedidos</p>
            <h2 className="text-xl font-semibold text-slate-900 mt-2">Gerar pedido de venda/serviço</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Cliente
              <input className="input" value={pedidoForm.clienteNome} onChange={(event) => setPedidoForm((prev) => ({ ...prev, clienteNome: event.target.value }))} placeholder="Nome do paciente/cliente ou venda balcão" />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Item do catálogo
              <select className="input" value={pedidoForm.catalogoItemId} onChange={(event) => setPedidoForm((prev) => ({ ...prev, catalogoItemId: event.target.value }))} required>
                <option value="">Selecione...</option>
                {catalogo.map((item) => (
                  <option key={item.id} value={item.id}>{item.nome} • {formatCurrency(item.preco)}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Origem
              <select className="input" value={pedidoForm.origem} onChange={(event) => setPedidoForm((prev) => ({ ...prev, origem: event.target.value }))}>
                <option value="balcao">Balcão</option>
                <option value="online">Online</option>
                <option value="interno">Interno</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Quantidade
              <input className="input" type="number" min="1" step="1" value={pedidoForm.quantidade} onChange={(event) => setPedidoForm((prev) => ({ ...prev, quantidade: event.target.value }))} />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Método de pagamento
              <select className="input" value={pedidoForm.metodo} onChange={(event) => setPedidoForm((prev) => ({ ...prev, metodo: event.target.value }))}>
                <option value="pix">PIX</option>
                <option value="cartao">Cartão</option>
                <option value="dinheiro">Dinheiro</option>
                <option value="boleto">Boleto</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              Status do pagamento
              <select className="input" value={pedidoForm.pagamentoStatus} onChange={(event) => setPedidoForm((prev) => ({ ...prev, pagamentoStatus: event.target.value }))}>
                <option value="aprovado">Aprovado</option>
                <option value="pendente">Pendente</option>
              </select>
            </label>
            <label className="sm:col-span-2 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary-600"
                checked={pedidoForm.iniciarCheckout}
                onChange={(event) => setPedidoForm((prev) => ({
                  ...prev,
                  iniciarCheckout: event.target.checked,
                  pagamentoStatus: event.target.checked ? 'pendente' : prev.pagamentoStatus,
                  origem: event.target.checked ? 'online' : prev.origem,
                }))}
              />
              <div>
                <p className="text-sm font-semibold text-slate-900">Gerar checkout externo</p>
                <p className="text-xs text-slate-500 mt-1">Usa o endpoint de pagamento para retornar link, QRCode e webhook de aprovação.</p>
              </div>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 sm:col-span-2">
              Observações
              <textarea className="input min-h-[110px]" value={pedidoForm.observacoes} onChange={(event) => setPedidoForm((prev) => ({ ...prev, observacoes: event.target.value }))} placeholder="Webhook, origem do atendimento, parcelamento, etc." />
            </label>
          </div>
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Projeção do pedido</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">{formatCurrency(projectedOrderTotal)}</p>
            </div>
            {selectedCatalogItem && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary-50 text-primary-700">
                {selectedCatalogItem.tipo} • estoque {selectedCatalogItem.estoqueAtual}
              </span>
            )}
          </div>
          <button className="btn btn-primary flex items-center justify-center gap-2" disabled={savingPedido}>
            <ShoppingCart size={18} /> {savingPedido ? 'Criando...' : 'Criar pedido'}
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Catálogo vivo</p>
              <h2 className="text-xl font-semibold text-slate-900">Produtos e serviços recentes</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{catalogo.length} itens</span>
          </div>
          <div className="space-y-3">
            {catalogo.slice(0, 6).map((item) => (
              <div key={item.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50 flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{item.nome}</p>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${item.tipo === 'produto' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{item.tipo}</span>
                    {item.tipo === 'produto' && Number(item.estoqueAtual) <= Number(item.estoqueMinimo) && (
                      <span className="px-2 py-1 rounded-full text-[11px] font-semibold bg-red-100 text-red-700">Estoque crítico</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{item.categoria || 'Sem categoria'} • {item.unidade}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">{formatCurrency(item.preco)}</p>
                  <p className="text-xs text-slate-500 mt-1">Estoque: {item.estoqueAtual}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Operação</p>
              <h2 className="text-xl font-semibold text-slate-900">Pedidos recentes</h2>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{pedidos.length} pedidos</span>
          </div>
          <div className="space-y-3">
            {pedidos.slice(0, 6).map((pedido) => (
              <div key={pedido.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-semibold text-slate-900">{pedido.clienteNome || pedido.paciente?.nome || 'Cliente não informado'}</p>
                    <p className="text-xs text-slate-500 mt-1">{new Date(pedido.createdAt).toLocaleString('pt-BR')} • {pedido.origem}</p>
                    <p className="text-sm text-slate-600 mt-2">{pedido.itens?.map((item) => `${item.descricao} x${item.quantidade}`).join(' • ') || 'Sem itens'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">{formatCurrency(pedido.total)}</p>
                    <div className="flex gap-2 mt-2 justify-end flex-wrap">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses(pedido.status)}`}>{pedido.status}</span>
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClasses(pedido.pagamentoStatus)}`}>{pedido.pagamentoStatus}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
                  <p className="text-xs text-slate-500">Notas geradas: {pedido.notasFiscais?.length || 0}</p>
                  {pedido.pagamentos?.[0]?.metadados?.checkout?.checkoutUrl && (
                    <a
                      href={pedido.pagamentos[0].metadados.checkout.checkoutUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm font-medium text-primary-700 inline-flex items-center gap-2"
                    >
                      <ExternalLink size={16} /> Abrir checkout
                    </a>
                  )}
                  {(!pedido.notasFiscais || pedido.notasFiscais.length === 0) && (
                    <button className="btn btn-secondary px-4 py-2 text-sm" onClick={() => handleEmitirNota(pedido)}>
                      Emitir nota
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Fiscal</p>
            <h2 className="text-xl font-semibold text-slate-900">Notas fiscais registradas</h2>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">{notas.length} notas</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {notas.slice(0, 6).map((nota) => (
            <div key={nota.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900">{nota.tipoDocumento.toUpperCase()} #{nota.numero || 's/num'}</p>
                    <span className={`px-2 py-1 rounded-full text-[11px] font-semibold ${statusBadgeClasses(nota.status)}`}>{nota.status}</span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">Pedido {nota.pedido?.id?.slice(0, 8)} • {nota.provedor}</p>
                </div>
                <div className="text-right text-sm text-slate-500">
                  <p>{nota.ambiente}</p>
                  <p>{nota.emitidaEm ? new Date(nota.emitidaEm).toLocaleString('pt-BR') : 'aguardando envio'}</p>
                </div>
              </div>
              {nota.logs?.[0]?.mensagem && (
                <div className="mt-3 p-3 rounded-xl bg-white border border-slate-100 text-sm text-slate-600">
                  {nota.logs[0].mensagem}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}