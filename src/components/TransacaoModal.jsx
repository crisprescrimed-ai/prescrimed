import { useState, useEffect } from 'react';
import { X, Save, DollarSign } from 'lucide-react';
import financeiroService from '../services/financeiro.service';
import toast from 'react-hot-toast';
import { successMessage, errorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';

export default function TransacaoModal({ transacao, onClose }) {
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    tipo: 'receita',
    categoria: '',
    data: new Date().toISOString().split('T')[0],
    status: 'pendente',
    observacoes: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (transacao) {
      setFormData({
        ...transacao,
        data: new Date(transacao.data).toISOString().split('T')[0]
      });
    }
  }, [transacao]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (transacao) {
        await financeiroService.update(transacao._id, formData);
        toast.success(successMessage('update', 'Transação', { gender: 'f' }));
      } else {
        await financeiroService.create(formData);
        toast.success(successMessage('create', 'Transação', { gender: 'f' }));
      }
      onClose();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'transação'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="text-lg font-semibold text-slate-900">
            {transacao ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              required
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              placeholder="Ex: Consulta Particular"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <div className="relative">
                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.valor}
                  onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                required
                value={formData.data}
                onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              >
                <option value="receita">Receita</option>
                <option value="despesa">Despesa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <select
              value={formData.categoria}
              onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition"
            >
              <option value="">Selecione...</option>
              {formData.tipo === 'receita' ? (
                <>
                  <option value="Consulta">Consulta</option>
                  <option value="Procedimento">Procedimento</option>
                  <option value="Convênio">Convênio</option>
                  <option value="Outros">Outros</option>
                </>
              ) : (
                <>
                  <option value="Aluguel">Aluguel</option>
                  <option value="Salários">Salários</option>
                  <option value="Insumos">Insumos</option>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Impostos">Impostos</option>
                  <option value="Outros">Outros</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              rows="3"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition resize-none"
            ></textarea>
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-xl transition flex items-center gap-2 disabled:opacity-50 justify-center"
            >
              <Save size={18} />
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
