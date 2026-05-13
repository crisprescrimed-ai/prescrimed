import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import empresaService from '../services/empresa.service';
import toast from 'react-hot-toast';
import { successMessage, errorMessage, apiErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';

export default function EmpresaModal({ empresa, onClose, onSave }) {
  const [formData, setFormData] = useState({
    nome: '',
    tipoSistema: 'casa-repouso',
    cnpj: '',
    email: '',
    telefone: '',
    endereco: '',
    plano: 'basico',
    ativo: true
  });
  const [loading, setLoading] = useState(false);

  const normalizePlano = (value) => {
    if (!value) return 'basico';
    if (value === 'basic') return 'basico';
    if (value === 'pro') return 'profissional';
    if (value === 'enterprise') return 'empresa';
    return value;
  };

  useEffect(() => {
    if (empresa) {
      setFormData({
        nome: empresa.nome || '',
        tipoSistema: empresa.tipoSistema || 'casa-repouso',
        cnpj: empresa.cnpj || '',
        email: empresa.email || '',
        telefone: empresa.telefone || '',
        endereco: empresa.endereco || '',
        plano: normalizePlano(empresa.plano),
        ativo: typeof empresa.ativo === 'boolean' ? empresa.ativo : (empresa.status ? empresa.status === 'ativo' : true)
      });
    }
  }, [empresa]);

  const isEditMode = Boolean(empresa && empresa.id);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      if (isEditMode) {
        // O endpoint de edição no backend é /api/empresas/me
        const payload = {
          nome: formData.nome,
          cnpj: formData.cnpj,
          email: formData.email,
          telefone: formData.telefone,
          endereco: formData.endereco
        };
        response = await empresaService.updateMyCompany(payload);
        toast.success(successMessage('update', 'Empresa', { gender: 'f', suffix: '!' }));
      } else {
        const payload = {
          nome: formData.nome,
          tipoSistema: formData.tipoSistema,
          cnpj: formData.cnpj,
          email: formData.email,
          telefone: formData.telefone,
          endereco: formData.endereco,
          plano: normalizePlano(formData.plano),
          ativo: Boolean(formData.ativo)
        };
        response = await empresaService.create(payload);
        toast.success(successMessage('create', 'Empresa', { gender: 'f', suffix: '!' }));
      }
      onSave(response); // Passa a resposta para o componente pai
      onClose();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'empresa'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-2xl font-bold text-slate-800">
            {empresa ? 'Editar Empresa' : 'Nova Empresa'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nome da Empresa *
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
              />
            </div>

            {/* Tipo de Sistema */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Sistema *
              </label>
              <select
                className="input"
                value={formData.tipoSistema}
                onChange={(e) => setFormData({ ...formData, tipoSistema: e.target.value })}
                required
              >
                <option value="casa-repouso">Casa de Repouso</option>
                <option value="fisioterapia">Fisioterapia</option>
                <option value="petshop">Petshop</option>
              </select>
            </div>

            {/* CNPJ */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CNPJ *
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.cnpj}
                onChange={(e) => setFormData({...formData, cnpj: e.target.value})}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                E-mail *
              </label>
              <input
                type="email"
                required
                className="input"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>

            {/* Telefone */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Telefone
              </label>
              <input
                type="tel"
                className="input"
                value={formData.telefone}
                onChange={(e) => setFormData({...formData, telefone: e.target.value})}
              />
            </div>

            {/* Plano */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Plano
              </label>
              <select
                className="input"
                value={formData.plano}
                onChange={(e) => setFormData({...formData, plano: e.target.value})}
              >
                <option value="basico">Básico</option>
                <option value="profissional">Profissional</option>
                <option value="empresa">Empresa</option>
              </select>
            </div>

            {/* Endereço */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Endereço
              </label>
              <input
                type="text"
                className="input"
                value={formData.endereco}
                onChange={(e) => setFormData({...formData, endereco: e.target.value})}
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Status
              </label>
              <select
                className="input"
                value={formData.ativo ? 'ativo' : 'inativo'}
                onChange={(e) => setFormData({...formData, ativo: e.target.value === 'ativo'})}
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary w-full sm:flex-1"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary w-full sm:flex-1"
              disabled={loading}
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
