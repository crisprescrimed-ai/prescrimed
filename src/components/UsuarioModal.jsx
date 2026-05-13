import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import usuarioService from '../services/usuario.service';
import toast from 'react-hot-toast';
import { successMessage, errorMessage, customErrorMessage, apiErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';

export default function UsuarioModal({ usuario, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    senha: '',
    telefone: '',
    especialidade: '',
    crm: '',
    crmUf: '',
    role: 'atendente',
    permissoes: [],
    ativo: true
  });
  const [loading, setLoading] = useState(false);

  const modulosDisponiveis = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'agenda', label: 'Agenda' },
    { id: 'cronograma', label: 'Cronograma' },
    { id: 'prescricoes', label: 'Prescrições' },
    { id: 'pacientes', label: 'Pacientes/Residentes' },
    { id: 'estoque', label: 'Estoque' },
    { id: 'evolucao', label: 'Evolução' },
    { id: 'financeiro', label: 'Financeiro' },
    { id: 'usuarios', label: 'Usuários' },
    { id: 'empresas', label: 'Empresas' },
    { id: 'configuracoes', label: 'Configurações' },
    { id: 'relatorios', label: 'Relatórios' },
  ];

  useEffect(() => {
    if (usuario) {
      setFormData({
        nome: usuario.nome || '',
        email: usuario.email || '',
        senha: '', // Não preenchemos a senha no edit
        telefone: usuario.telefone || '',
        especialidade: usuario.especialidade || '',
        crm: usuario.crm || '',
        crmUf: usuario.crmUf || '',
        role: usuario.role || 'atendente',
        permissoes: usuario.permissoes || [],
        ativo: usuario.ativo !== undefined ? usuario.ativo : true
      });
    }
  }, [usuario]);

  const handlePermissaoChange = (moduloId) => {
    setFormData(prev => {
      const permissoes = prev.permissoes.includes(moduloId)
        ? prev.permissoes.filter(p => p !== moduloId)
        : [...prev.permissoes, moduloId];
      return { ...prev, permissoes };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (usuario?.id) {
        // Editar usuário existente
        const dataToUpdate = { ...formData };
        if (!dataToUpdate.senha) {
          delete dataToUpdate.senha; // Remove senha se vazia
        }
        await usuarioService.update(usuario.id, dataToUpdate);
        toast.success(successMessage('update', 'Usuário', { suffix: '!' }));
      } else {
        // Criar novo usuário
        if (!formData.senha || formData.senha.length < 6) {
          toast.error(customErrorMessage('minPassword'));
          setLoading(false);
          return;
        }
        await usuarioService.create(formData);
        toast.success(successMessage('create', 'Usuário', { suffix: '!' }));
      }
      onClose();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'usuário'));
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
            {usuario ? 'Editar Usuário' : 'Novo Usuário'}
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
                Nome Completo *
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.nome}
                onChange={(e) => setFormData({...formData, nome: e.target.value})}
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

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Senha {!usuario && '*'}
              </label>
              <input
                type="password"
                className="input"
                placeholder={usuario ? 'Deixe em branco para manter' : 'Mínimo 6 caracteres'}
                minLength="6"
                value={formData.senha}
                onChange={(e) => setFormData({...formData, senha: e.target.value})}
                required={!usuario}
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

            {/* Especialidade */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Especialidade
              </label>
              <select
                className="input"
                value={formData.especialidade}
                onChange={(e) => setFormData({...formData, especialidade: e.target.value})}
              >
                <option value="">Selecione uma especialidade</option>
                <option value="Médico">Médico</option>
                <option value="Enfermeiro">Enfermeiro</option>
                <option value="Técnico de Enfermagem">Técnico de Enfermagem</option>
                <option value="Fisioterapeuta">Fisioterapeuta</option>
                <option value="Nutricionista">Nutricionista</option>
                <option value="Assistente Social">Assistente Social</option>
                <option value="Administrador">Administrador</option>
                <option value="Auxiliar Administrativo">Auxiliar Administrativo</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            {/* CRM */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                CRM
              </label>
              <input
                type="text"
                className="input"
                value={formData.crm}
                onChange={(e) => setFormData({...formData, crm: e.target.value})}
              />
            </div>

            {/* CRM UF */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                UF do CRM
              </label>
              <input
                type="text"
                className="input"
                maxLength="2"
                placeholder="Ex: BA"
                value={formData.crmUf}
                onChange={(e) => setFormData({...formData, crmUf: e.target.value.toUpperCase()})}
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Função *
              </label>
              <select
                required
                className="input"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
              >
                <option value="enfermeiro">Enfermeiro</option>
                <option value="tecnico_enfermagem">Técnico de Enfermagem</option>
                <option value="fisioterapeuta">Fisioterapeuta</option>
                <option value="nutricionista">Nutricionista</option>
                <option value="assistente_social">Assistente Social</option>
                <option value="auxiliar_administrativo">Auxiliar Administrativo</option>
                <option value="atendente">Atendente</option>
                <option value="admin">Administrador</option>
                <option value="superadmin">Super Administrador</option>
              </select>
            </div>

            {/* Permissões */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Permissões de Acesso
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                {modulosDisponiveis.map((modulo) => (
                  <label key={modulo.id} className="flex items-center gap-2 cursor-pointer hover:bg-slate-100 p-2 rounded-lg transition-colors">
                    <input
                      type="checkbox"
                      className="rounded text-primary-600 focus:ring-primary-500"
                      checked={formData.permissoes.includes(modulo.id)}
                      onChange={() => handlePermissaoChange(modulo.id)}
                    />
                    <span className="text-sm text-slate-700">{modulo.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Selecione os módulos que este usuário poderá acessar.
              </p>
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded text-primary-600"
                  checked={formData.ativo}
                  onChange={(e) => setFormData({...formData, ativo: e.target.checked})}
                />
                <span className="text-sm font-medium text-slate-700">Usuário ativo</span>
              </label>
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
