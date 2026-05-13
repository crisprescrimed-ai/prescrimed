import { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, AlertCircle } from 'lucide-react';
import pacienteService from '../services/paciente.service';
import toast from 'react-hot-toast';
import { successMessage, errorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';

export default function PacienteModal({ paciente, onClose }) {
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    dataNascimento: '',
    sexo: '',
    telefone: '',
    email: '',
    endereco: {
      rua: '',
      numero: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
    },
    contatoEmergencia: {
      nome: '',
      telefone: '',
      relacao: '',
    },
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  useEffect(() => {
    if (paciente) {
      setFormData(paciente);
    }
  }, [paciente]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (paciente) {
        await pacienteService.update(paciente.id, formData);
        toast.success(successMessage('update', 'Paciente'));
      } else {
        await pacienteService.create(formData);
        toast.success(successMessage('create', 'Paciente'));
      }
      onClose();
    } catch (error) {
      handleApiError(error, errorMessage('save', 'paciente'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value,
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-full md:max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">
            {paciente ? 'Editar Paciente' : 'Novo Paciente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Dados Pessoais */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome Completo *</label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">CPF *</label>
                <input
                  type="text"
                  name="cpf"
                  value={formData.cpf}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Data de Nascimento *</label>
                <input
                  type="date"
                  name="dataNascimento"
                  value={formData.dataNascimento}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Sexo *</label>
                <select
                  name="sexo"
                  value={formData.sexo}
                  onChange={handleChange}
                  className="input"
                  required
                >
                  <option value="">Selecione</option>
                  <option value="M">Masculino</option>
                  <option value="F">Feminino</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefone *</label>
                <input
                  type="tel"
                  name="telefone"
                  value={formData.telefone}
                  onChange={handleChange}
                  className="input"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">E-mail</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">CEP</label>
                <input
                  type="text"
                  name="endereco.cep"
                  value={formData.endereco.cep}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Rua</label>
                <input
                  type="text"
                  name="endereco.rua"
                  value={formData.endereco.rua}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Número</label>
                <input
                  type="text"
                  name="endereco.numero"
                  value={formData.endereco.numero}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Bairro</label>
                <input
                  type="text"
                  name="endereco.bairro"
                  value={formData.endereco.bairro}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Cidade</label>
                <input
                  type="text"
                  name="endereco.cidade"
                  value={formData.endereco.cidade}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Estado</label>
                <input
                  type="text"
                  name="endereco.estado"
                  value={formData.endereco.estado}
                  onChange={handleChange}
                  className="input"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Contato de Emergência */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contato de Emergência</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Nome</label>
                <input
                  type="text"
                  name="contatoEmergencia.nome"
                  value={formData.contatoEmergencia.nome}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Telefone</label>
                <input
                  type="tel"
                  name="contatoEmergencia.telefone"
                  value={formData.contatoEmergencia.telefone}
                  onChange={handleChange}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Relação</label>
                <input
                  type="text"
                  name="contatoEmergencia.relacao"
                  value={formData.contatoEmergencia.relacao}
                  onChange={handleChange}
                  className="input"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}