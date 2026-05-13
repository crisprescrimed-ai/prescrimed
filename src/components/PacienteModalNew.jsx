import { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, AlertCircle } from 'lucide-react';
import pacienteService from '../services/paciente.service';
import toast from 'react-hot-toast';
import { successMessage, errorMessage, apiErrorMessage } from '../utils/toastMessages';
import { formatCPF, isValidCPF } from '../utils/locale';
import { handleApiError } from '../utils/errorHandler';

export default function PacienteModal({ paciente, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    sexo: '',
    telefone: '',
    email: '',
    cep: '',
    rua: '',
    numero: '',
    bairro: '',
    cidade: '',
    estado: '',
    contatoNome: '',
    contatoTelefone: '',
    contatoRelacao: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (paciente) {
      // Parse endereço e contato de emergência se vieram como texto JSON
      let enderecoParsed = {};
      let contatoParsed = {};
      
      try {
        if (typeof paciente.endereco === 'string') {
          enderecoParsed = JSON.parse(paciente.endereco || '{}');
        } else if (paciente.endereco) {
          enderecoParsed = paciente.endereco;
        }
      } catch (e) {
        console.log('Erro ao parse endereço:', e);
      }
      
      try {
        if (typeof paciente.contatoEmergencia === 'string') {
          contatoParsed = JSON.parse(paciente.contatoEmergencia || '{}');
        } else if (paciente.contatoEmergencia) {
          contatoParsed = paciente.contatoEmergencia;
        }
      } catch (e) {
        console.log('Erro ao parse contato:', e);
      }

      setFormData({
        nome: paciente.nome || '',
        cpf: paciente.cpf || '',
        dataNascimento: paciente.dataNascimento ? paciente.dataNascimento.split('T')[0] : '',
        sexo: paciente.sexo || '',
        telefone: paciente.telefone || '',
        email: paciente.email || '',
        cep: enderecoParsed.cep || '',
        rua: enderecoParsed.rua || '',
        numero: enderecoParsed.numero || '',
        bairro: enderecoParsed.bairro || '',
        cidade: enderecoParsed.cidade || '',
        estado: enderecoParsed.estado || '',
        contatoNome: contatoParsed.nome || '',
        contatoTelefone: contatoParsed.telefone || '',
        contatoRelacao: contatoParsed.relacao || '',
      });
    }
  }, [paciente]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.nome.trim()) newErrors.nome = 'Nome é obrigatório';
    if (!formData.cpf.trim()) newErrors.cpf = 'CPF é obrigatório';
    if (!formData.dataNascimento) newErrors.dataNascimento = 'Data de nascimento é obrigatória';
    if (!formData.sexo) newErrors.sexo = 'Sexo é obrigatório';
    if (!formData.telefone.trim()) newErrors.telefone = 'Telefone é obrigatório';
    
    // Validação de CPF (dígitos verificadores)
    if (formData.cpf) {
      const cpfClean = formData.cpf.replace(/\D/g, '');
      if (cpfClean.length !== 11) {
        newErrors.cpf = 'CPF deve ter 11 dígitos';
      } else if (!isValidCPF(cpfClean)) {
        newErrors.cpf = 'CPF inválido';
      }
    }
    
    // Validação de email (apenas se preenchido)
    if (formData.email && formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'E-mail inválido';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Por favor, corrija os erros no formulário');
      return;
    }
    
    setLoading(true);
    try {
      // Preparar endereço como JSON string
      const endereco = JSON.stringify({
        cep: formData.cep || '',
        rua: formData.rua || '',
        numero: formData.numero || '',
        bairro: formData.bairro || '',
        cidade: formData.cidade || '',
        estado: formData.estado || ''
      });
      
      // Preparar contato de emergência como JSON string
      const contatoEmergencia = JSON.stringify({
        nome: formData.contatoNome || '',
        telefone: formData.contatoTelefone || '',
        relacao: formData.contatoRelacao || ''
      });
      
      const dataToSend = {
        nome: formData.nome.trim(),
        cpf: formData.cpf.replace(/\D/g, ''),
        dataNascimento: formData.dataNascimento,
        sexo: formData.sexo,
        telefone: formData.telefone.replace(/\D/g, ''),
        email: formData.email.trim() || null, // Enviar null se vazio
        endereco,
        contatoEmergencia,
      };
      
      if (paciente) {
        await pacienteService.update(paciente.id || paciente._id, dataToSend);
        toast.success(successMessage('update', 'Residente'));
      } else {
        await pacienteService.create(dataToSend);
        toast.success(successMessage('create', 'Residente'));
      }
      onClose();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'residente'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (errors[name]) {
      setErrors({ ...errors, [name]: null });
    }
    
    if (name === 'cpf') {
      const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
      const masked = digits.length === 11 ? formatCPF(digits) : (() => {
        if (digits.length <= 3) return digits;
        if (digits.length <= 6) return digits.replace(/(\d{3})(\d{0,3})/, '$1.$2');
        if (digits.length <= 9) return digits.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
        return digits;
      })();
      setFormData({ ...formData, cpf: masked });
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-full md:max-w-4xl my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-gray-700 flex justify-between items-center bg-gradient-to-r from-primary-50 to-primary-100/50 dark:from-gray-800 dark:to-gray-700 sticky top-0 z-10 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-gray-100">
              {paciente ? 'Editar Paciente' : 'Novo Paciente'}
            </h2>
            <p className="text-sm text-slate-600 dark:text-gray-400 mt-1">
              Preencha os dados do residente para cadastro
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/50 dark:hover:bg-gray-700 rounded-lg transition"
          >
            <X size={24} className="text-slate-600 dark:text-gray-300" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-120px)] overflow-y-auto custom-scrollbar">
          {/* Dados Pessoais */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-primary-100 dark:bg-primary-900 rounded-lg">
                <User size={20} className="text-primary-600 dark:text-primary-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">Dados Pessoais</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className={`input w-full ${errors.nome ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="Nome completo do residente"
                  required
                />
                {errors.nome && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.nome}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  CPF *
                </label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  className={`input w-full ${errors.cpf ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                {errors.cpf && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.cpf}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Data de Nascimento *
                </label>
                <input
                  type="date"
                  name="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  className={`input w-full ${errors.dataNascimento ? 'border-red-500 focus:ring-red-500' : ''}`}
                  required
                />
                {errors.dataNascimento && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.dataNascimento}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Sexo *
                </label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleChange}
                  className={`input w-full ${errors.sexo ? 'border-red-500 focus:ring-red-500' : ''}`}
                  required
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
                {errors.sexo && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.sexo}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Telefone *
                </label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className={`input w-full ${errors.telefone ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                  required
                />
                {errors.telefone && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.telefone}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`input w-full ${errors.email ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="email@exemplo.com"
                />
                {errors.email && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.email}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                <MapPin size={20} className="text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">Endereço</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  CEP
                </label>
                <input
                  type="text"
                  name="cep"
                  value={formData.cep}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="00000-000"
                  maxLength={9}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Rua
                </label>
                <input
                  type="text"
                  name="rua"
                  value={formData.rua}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Nome da rua"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Número
                </label>
                <input
                  type="text"
                  name="numero"
                  value={formData.numero}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Nº"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Bairro
                </label>
                <input
                  type="text"
                  name="bairro"
                  value={formData.bairro}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Bairro"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Cidade
                </label>
                <input
                  type="text"
                  name="cidade"
                  value={formData.cidade}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Cidade"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Estado
                </label>
                <select
                  name="estado"
                  value={formData.estado}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="">Selecione</option>
                  <option value="AC">Acre</option>
                  <option value="AL">Alagoas</option>
                  <option value="AP">Amapá</option>
                  <option value="AM">Amazonas</option>
                  <option value="BA">Bahia</option>
                  <option value="CE">Ceará</option>
                  <option value="DF">Distrito Federal</option>
                  <option value="ES">Espírito Santo</option>
                  <option value="GO">Goiás</option>
                  <option value="MA">Maranhão</option>
                  <option value="MT">Mato Grosso</option>
                  <option value="MS">Mato Grosso do Sul</option>
                  <option value="MG">Minas Gerais</option>
                  <option value="PA">Pará</option>
                  <option value="PB">Paraíba</option>
                  <option value="PR">Paraná</option>
                  <option value="PE">Pernambuco</option>
                  <option value="PI">Piauí</option>
                  <option value="RJ">Rio de Janeiro</option>
                  <option value="RN">Rio Grande do Norte</option>
                  <option value="RS">Rio Grande do Sul</option>
                  <option value="RO">Rondônia</option>
                  <option value="RR">Roraima</option>
                  <option value="SC">Santa Catarina</option>
                  <option value="SP">São Paulo</option>
                  <option value="SE">Sergipe</option>
                  <option value="TO">Tocantins</option>
                </select>
              </div>
            </div>
          </div>

          {/* Contato de Emergência */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-slate-200 dark:border-gray-700 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                <Phone size={20} className="text-orange-600 dark:text-orange-400" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-gray-100">Contato de Emergência</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Nome
                </label>
                <input
                  type="text"
                  name="contatoNome"
                  value={formData.contatoNome}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Nome do contato"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Telefone
                </label>
                <input
                  type="tel"
                  name="contatoTelefone"
                  value={formData.contatoTelefone}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="(00) 00000-0000"
                  maxLength={15}
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Relação
                </label>
                <input
                  type="text"
                  name="contatoRelacao"
                  value={formData.contatoRelacao}
                  onChange={handleChange}
                  className="input w-full"
                  placeholder="Ex: Filho(a), Cônjuge"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Actions - Footer fixo */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-900 flex justify-end gap-3 sticky bottom-0 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary px-6 py-2.5"
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={loading}
            className="btn btn-primary px-6 py-2.5 shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Salvando...
              </span>
            ) : (
              'Salvar'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
