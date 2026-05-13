import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Users, Clock, CheckCircle2, AlertCircle, CalendarIcon, Edit, Trash2, User, MapPin, X, Stethoscope, FileText, FileDown } from 'lucide-react';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import SearchFilterBar from '../components/common/SearchFilterBar';
import { TableContainer, TableWrapper, TableHeader, TBody, Tr, Td, MobileCard, MobileGrid } from '../components/common/Table';
import ActionIconButton from '../components/common/ActionIconButton';
import EmptyState from '../components/common/EmptyState';
import agendamentoService from '../services/agendamento.service';
import pacienteService from '../services/paciente.service';
import { openPrintWindow, escapeHtml } from '../utils/printWindow';
import { handleApiError } from '../utils/errorHandler';

export default function Agenda() {
  const [agendamentos, setAgendamentos] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [pacienteSearch, setPacienteSearch] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [showPacienteDropdown, setShowPacienteDropdown] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo: 'Compromisso',
    titulo: '',
    data: '',
    horario: '',
    participante: '',
    pacienteId: '',
    local: '',
    descricao: ''
  });

  useEffect(() => {
    loadAgendamentos();
    loadPacientes();
  }, [page]);

  const loadAgendamentos = async () => {
    try {
      setLoading(true);
      const data = await agendamentoService.getAll({ page, pageSize });
      if (Array.isArray(data)) {
        setAgendamentos(data);
        setTotal(data.length);
      } else {
        setAgendamentos(Array.isArray(data.items) ? data.items : []);
        setTotal(Number(data.total) || 0);
        setPageSize(Number(data.pageSize) || 10);
      }
    } catch (error) {
      handleApiError(error, 'Erro ao carregar agendamentos');
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPacientes = async () => {
    try {
      const data = await pacienteService.getAll();
      setPacientes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Erro ao carregar pacientes:', error);
      setPacientes([]);
    }
  };

  const handleEdit = (agendamento) => {
    const dataHora = agendamento.dataHora ? new Date(agendamento.dataHora) : new Date();
    const data = dataHora.toISOString().split('T')[0];
    const horario = dataHora.toTimeString().split(' ')[0].substring(0, 5);
    
    const paciente = pacientes.find(p => p.id === agendamento.pacienteId);
    
    setFormData({
      tipo: agendamento.tipo || 'Compromisso',
      titulo: agendamento.titulo || '',
      data: data,
      horario: horario,
      participante: agendamento.participante || paciente?.nome || '',
      pacienteId: agendamento.pacienteId || '',
      local: agendamento.local || '',
      descricao: agendamento.observacoes || ''
    });
    
    if (paciente) {
      setSelectedPaciente(paciente);
      setPacienteSearch(paciente.nome);
    }
    
    setEditingId(agendamento.id || agendamento._id);
    setModalOpen(true);
  };

  const handleDelete = async (id, titulo) => {
    if (!window.confirm(`Deseja realmente excluir "${titulo}"?`)) return;
    try {
      setDeletingId(id);
      await agendamentoService.delete(id);
      toast.success('Agendamento excluído com sucesso!');
      loadAgendamentos();
    } catch (error) {
      handleApiError(error, 'Erro ao excluir agendamento');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const empresaId = user?.empresaId || '';
      const dataHora = formData.data && formData.horario ? new Date(`${formData.data}T${formData.horario}:00`).toISOString() : '';

      let pacienteId = formData.pacienteId;
      if ((!pacienteId || pacienteId === '') && selectedPaciente && selectedPaciente.id) {
        pacienteId = selectedPaciente.id;
      }

      if (!pacienteId) {
        toast.error('Selecione um paciente da lista!');
        return;
      }
      if (!empresaId) {
        toast.error('Empresa não encontrada no usuário logado!');
        return;
      }
      if (!formData.titulo) {
        toast.error('Título é obrigatório!');
        return;
      }
      if (!dataHora) {
        toast.error('Data e horário obrigatórios!');
        return;
      }

      const payload = {
        titulo: formData.titulo,
        tipo: formData.tipo,
        pacienteId,
        empresaId,
        local: formData.local,
        observacoes: formData.descricao,
        dataHora
      };

      if (editingId) {
        await agendamentoService.update(editingId, payload);
        toast.success('Agendamento atualizado com sucesso!');
      } else {
        await agendamentoService.create(payload);
        toast.success('Agendamento criado com sucesso!');
      }
      setModalOpen(false);
      resetForm();
      loadAgendamentos();
    } catch (error) {
      handleApiError(error, 'Erro ao salvar agendamento');
    }
  };

  const resetForm = () => {
    setFormData({
      tipo: 'Compromisso',
      titulo: '',
      data: '',
      horario: '',
      participante: '',
      pacienteId: '',
      local: '',
      descricao: ''
    });
    setEditingId(null);
    setPacienteSearch('');
    setSelectedPaciente(null);
    setShowPacienteDropdown(false);
  };

  const openModal = (tipo = 'Compromisso') => {
    resetForm();
    setFormData(prev => ({ ...prev, tipo }));
    setModalOpen(true);
  };

  const getIconByType = (type) => {
    switch (type) {
      case 'Consulta': return <Stethoscope size={18} />;
      case 'Reunião': return <Users size={18} />;
      case 'Exame': return <FileText size={18} />;
      default: return <CalendarIcon size={18} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Data não informada';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Data inválida';
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      });
    } catch (error) {
      return 'Data inválida';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return '--:--';
      return date.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '--:--';
    }
  };

  const filteredAgendamentos = agendamentos.filter(ag => 
    ag.titulo.toLowerCase().includes(filterTerm.toLowerCase()) ||
    ag.participante?.toLowerCase().includes(filterTerm.toLowerCase())
  );

  const stats = {
    total: agendamentos.length,
    confirmados: agendamentos.filter(a => a.status === 'confirmado').length,
    pendentes: agendamentos.filter(a => a.status === 'agendado').length,
    hoje: agendamentos.filter(a => {
      const date = new Date(a.dataHora);
      const now = new Date();
      return date.getDate() === now.getDate() && 
             date.getMonth() === now.getMonth() && 
             date.getFullYear() === now.getFullYear();
    }).length
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
        .confirmado { background: #d1fae5; color: #065f46; }
        .agendado { background: #fef3c7; color: #92400e; }
        .realizado { background: #e0f2fe; color: #075985; }
        @media print { body { padding: 0; } }
      `;

      const rowsHtml = filteredAgendamentos
        .map((a) => {
          const id = a.id || a._id;
          const paciente = pacientes.find((p) => (p.id || p._id) === a.pacienteId);
          const pacienteNome = a.participante || paciente?.nome || '-';
          const status = (a.status || 'agendado').toLowerCase();
          const statusClass = status === 'confirmado' ? 'confirmado' : status === 'realizado' ? 'realizado' : 'agendado';
          return `
            <tr>
              <td>${escapeHtml(formatDate(a.dataHora))} ${escapeHtml(formatTime(a.dataHora))}</td>
              <td>${escapeHtml(a.tipo || '-')}</td>
              <td>${escapeHtml(a.titulo || '-')}</td>
              <td>${escapeHtml(pacienteNome)}</td>
              <td>${escapeHtml(a.local || '-')}</td>
              <td><span class="badge ${statusClass}">${escapeHtml(a.status || 'Agendado')}</span></td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <h1>Relatório - Agenda</h1>
        <div class="meta">Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</div>
        <div class="meta">Registros: ${escapeHtml(filteredAgendamentos.length)}</div>
        <table>
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Tipo</th>
              <th>Título</th>
              <th>Participante/Paciente</th>
              <th>Local</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      openPrintWindow({
        title: 'Relatório - Agenda',
        bodyHtml,
        styles
      });
      toast.success('Abrindo visualização para impressão/PDF');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao gerar PDF');
    }
  };

  const handleStatusChange = async (id, currentStatus, newStatus) => {
    if (currentStatus === newStatus) return;
    try {
      setUpdatingStatusId(id);
      await agendamentoService.update(id, { status: newStatus });
      toast.success('Status atualizado com sucesso!');
      loadAgendamentos();
    } catch (error) {
      toast.error('Erro ao atualizar status');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        label="Institucional"
        title="Agenda"
        subtitle="Gerencie consultas, reuniões e compromissos da instituição de forma centralizada."
      >
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <button 
            onClick={() => openModal('Reunião')}
            className="btn btn-secondary flex items-center justify-center gap-2"
          >
            <Users size={18} /> Nova Reunião
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            disabled={filteredAgendamentos.length === 0}
            className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar para PDF"
          >
            <FileDown size={18} /> Exportar PDF
          </button>
          <button 
            onClick={() => openModal('Compromisso')}
            className="btn btn-primary flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
          >
            <Plus size={18} /> Novo Compromisso
          </button>
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatsCard
          icon={CalendarIcon}
          label="Total"
          value={stats.total}
          description="Agendamentos futuros"
          color="primary"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Confirmados"
          value={stats.confirmados}
          description="Confirmados"
          color="emerald"
        />
        <StatsCard
          icon={AlertCircle}
          label="Pendentes"
          value={stats.pendentes}
          description="Aguardando confirmação"
          color="orange"
        />
        <StatsCard
          icon={Clock}
          label="Hoje"
          value={stats.hoje}
          description="Eventos para hoje"
          color="purple"
        />
      </div>

      <SearchFilterBar
        searchTerm={filterTerm}
        onSearchChange={setFilterTerm}
        placeholder="Buscar por título ou participante..."
      />

      <TableContainer title="Agendamentos">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredAgendamentos.length > 0 ? (
          <>
            {/* Mobile */}
            <MobileGrid>
              {filteredAgendamentos.map((ag) => (
                <MobileCard key={ag.id || ag._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        ag.tipo === 'Consulta' ? 'bg-blue-50 text-blue-600' :
                        ag.tipo === 'Reunião' ? 'bg-purple-50 text-purple-600' :
                        ag.tipo === 'Exame' ? 'bg-amber-50 text-amber-600' :
                        'bg-primary-50 text-primary-600'
                      }`}>
                        {getIconByType(ag.tipo)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-gray-100">{ag.titulo}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{ag.tipo}</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Código: {ag.id || ag._id}</p>
                      </div>
                    </div>
                    <select 
                      value={ag.status}
                      onChange={(e) => handleStatusChange(ag.id || ag._id, ag.status, e.target.value)}
                      disabled={updatingStatusId === (ag.id || ag._id)}
                      className={`text-xs font-bold px-2 py-1 rounded-full border-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                        ag.status === 'agendado' ? 'bg-primary-50 text-primary-700' : 
                        ag.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700' : 
                        ag.status === 'cancelado' ? 'bg-red-50 text-red-700' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <option value="agendado">Agendado</option>
                      <option value="confirmado">Confirmado</option>
                      <option value="cancelado">Cancelado</option>
                      <option value="concluido">Concluído</option>
                    </select>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                      <Clock size={14} />
                      <span>{formatDate(ag.dataHora)} às {formatTime(ag.dataHora)}</span>
                    </div>
                    {ag.participante ? (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                        <User size={14} />
                        <span>{ag.participante}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-slate-400 dark:text-gray-500">
                        <User size={14} />
                        <span className="italic">Sem participante</span>
                      </div>
                    )}
                    {ag.local && (
                      <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                        <MapPin size={14} />
                        <span>{ag.local}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <ActionIconButton
                      onClick={() => handleEdit(ag)}
                      icon={Edit}
                      variant="primary"
                      tooltip="Editar"
                      title="Editar agendamento"
                      ariaLabel="Editar agendamento"
                    />
                    <ActionIconButton
                      onClick={() => handleDelete(ag.id || ag._id, ag.titulo)}
                      icon={Trash2}
                      variant="danger"
                      tooltip="Excluir"
                      title="Excluir agendamento"
                      ariaLabel="Excluir agendamento"
                      disabled={deletingId === (ag.id || ag._id)}
                      loading={deletingId === (ag.id || ag._id)}
                    />
                  </div>
                </MobileCard>
              ))}
            </MobileGrid>

            {/* Desktop */}
            <TableWrapper>
              <TableHeader columns={["Tipo","Título","Data/Hora","Participante","Local","Status","Ações"]} />
              <TBody>
                {filteredAgendamentos.map((ag) => (
                  <Tr key={ag.id || ag._id}>
                    <Td>
                      <div className="flex items-center gap-2 text-slate-700 dark:text-gray-200 font-medium">
                        <div className={`p-2 rounded-lg ${
                          ag.tipo === 'Consulta' ? 'bg-blue-50 text-blue-600' :
                          ag.tipo === 'Reunião' ? 'bg-purple-50 text-purple-600' :
                          ag.tipo === 'Exame' ? 'bg-amber-50 text-amber-600' :
                          'bg-primary-50 text-primary-600'
                        }`}>
                          {getIconByType(ag.tipo)}
                        </div>
                        <span className="text-sm">{ag.tipo}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-gray-100">{ag.titulo}</span>
                        <span className="text-[11px] text-slate-400">Código: {ag.id || ag._id}</span>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-700 dark:text-gray-200">
                          {formatDate(ag.dataHora)}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-gray-400">
                          {formatTime(ag.dataHora)}
                        </span>
                      </div>
                    </Td>
                    <Td>
                      {ag.participante ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-gray-700 flex items-center justify-center text-slate-500 dark:text-gray-300 text-xs font-bold">
                            {ag.participante.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm text-slate-600 dark:text-gray-300">{ag.participante}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 text-sm italic">Sem participante</span>
                      )}
                    </Td>
                    <Td>
                      {ag.local ? (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300">
                          <MapPin size={14} className="text-slate-400" />
                          <span className="text-sm">{ag.local}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-gray-500 text-sm">-</span>
                      )}
                    </Td>
                    <Td>
                      <select 
                        value={ag.status}
                        onChange={(e) => handleStatusChange(ag.id || ag._id, ag.status, e.target.value)}
                        disabled={updatingStatusId === (ag.id || ag._id)}
                        className={`text-xs font-bold px-3 py-1 rounded-full border-none focus:ring-2 focus:ring-primary-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                          ag.status === 'agendado' ? 'bg-primary-50 text-primary-700 ring-1 ring-primary-100' : 
                          ag.status === 'confirmado' ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100' : 
                          ag.status === 'cancelado' ? 'bg-red-50 text-red-700 ring-1 ring-red-100' : 'bg-slate-100 text-slate-700 ring-1 ring-slate-200'
                        }`}
                      >
                        <option value="agendado">Agendado</option>
                        <option value="confirmado">Confirmado</option>
                        <option value="cancelado">Cancelado</option>
                        <option value="concluido">Concluído</option>
                      </select>
                    </Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ActionIconButton
                          onClick={() => handleEdit(ag)}
                          icon={Edit}
                          variant="primary"
                          tooltip="Editar"
                          title="Editar agendamento"
                          ariaLabel="Editar agendamento"
                        />
                        <ActionIconButton
                          onClick={() => handleDelete(ag.id || ag._id, ag.titulo)}
                          icon={Trash2}
                          variant="danger"
                          tooltip="Excluir"
                          title="Excluir agendamento"
                          ariaLabel="Excluir agendamento"
                          disabled={deletingId === (ag.id || ag._id)}
                          loading={deletingId === (ag.id || ag._id)}
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
              icon={CalendarIcon}
              title="Nenhum agendamento encontrado"
              description="Nenhum agendamento encontrado."
            />
          </div>
        )}
      </TableContainer>

      {/* Modal de Novo/Editar Agendamento */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-gray-700 flex justify-between items-start bg-slate-50/50 dark:bg-gray-700/50">
              <div>
                <h3 className="font-bold text-xl text-slate-800 dark:text-gray-100">{editingId ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <p className="text-sm text-slate-500 dark:text-gray-400 mt-1">Preencha os dados do compromisso.</p>
              </div>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 p-1 hover:bg-slate-100 dark:hover:bg-gray-600 rounded-lg transition">
                <X size={24} />
              </button>
            </div>
            <form className="overflow-y-auto p-6 space-y-5 custom-scrollbar" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Tipo</label>
                <select
                  className="input w-full"
                  value={formData.tipo}
                  onChange={e => setFormData({ ...formData, tipo: e.target.value })}
                >
                  <option>Compromisso</option>
                  <option>Reunião</option>
                  <option>Consulta</option>
                  <option>Exame</option>
                  <option>Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Título *</label>
                <input
                  type="text"
                  required
                  className="input w-full"
                  placeholder="Título do compromisso"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Data *</label>
                  <input
                    type="date"
                    required
                    className="input w-full"
                    value={formData.data}
                    onChange={e => setFormData({ ...formData, data: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Horário *</label>
                  <input
                    type="time"
                    required
                    className="input w-full"
                    value={formData.horario}
                    onChange={e => setFormData({ ...formData, horario: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                  Paciente/Residente *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={18} />
                  <input
                    type="text"
                    className="input w-full pl-10 pr-10"
                    placeholder="Buscar residente cadastrado..."
                    value={pacienteSearch}
                    onChange={e => {
                      setPacienteSearch(e.target.value);
                      setShowPacienteDropdown(true);
                      // Se limpar o campo, limpar a seleção
                      if (e.target.value === '') {
                        setSelectedPaciente(null);
                        setFormData({ ...formData, pacienteId: '', participante: '' });
                      }
                    }}
                    onFocus={() => setShowPacienteDropdown(true)}
                    onBlur={() => {
                      // Delay para permitir click no dropdown
                      setTimeout(() => setShowPacienteDropdown(false), 200);
                    }}
                    required
                  />
                  {selectedPaciente && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      <CheckCircle2 size={18} className="text-green-500" />
                    </div>
                  )}
                  {showPacienteDropdown && pacienteSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded-lg shadow-xl z-20 max-h-72 overflow-y-auto">
                      {pacientes.length === 0 ? (
                        <div className="px-4 py-6 text-center">
                          <AlertCircle className="mx-auto mb-2 text-slate-400" size={24} />
                          <p className="text-sm text-slate-500 dark:text-gray-400">Nenhum residente cadastrado</p>
                        </div>
                      ) : (
                        <>
                          {pacientes.filter(p =>
                            p.nome.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
                            p.cpf?.includes(pacienteSearch)
                          ).map(p => (
                            <div
                              key={p.id}
                              className={`px-4 py-3 cursor-pointer hover:bg-primary-50 dark:hover:bg-gray-700 transition-colors border-b border-slate-100 dark:border-gray-700 last:border-0 ${
                                selectedPaciente?.id === p.id ? 'bg-primary-100 dark:bg-gray-700' : ''
                              }`}
                              onClick={() => {
                                setSelectedPaciente(p);
                                setFormData({ ...formData, pacienteId: p.id, participante: p.nome });
                                setPacienteSearch(p.nome);
                                setShowPacienteDropdown(false);
                              }}
                            >
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center text-primary-600 dark:text-primary-300 font-bold text-sm flex-shrink-0">
                                  {p.nome.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-slate-700 dark:text-gray-200 truncate">{p.nome}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {p.cpf && (
                                      <span className="text-xs text-slate-500 dark:text-gray-400">
                                        CPF: {p.cpf}
                                      </span>
                                    )}
                                    {p.idade && (
                                      <span className="text-xs text-slate-500 dark:text-gray-400">
                                        • {p.idade} anos
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                          {pacientes.filter(p =>
                            p.nome.toLowerCase().includes(pacienteSearch.toLowerCase()) ||
                            p.cpf?.includes(pacienteSearch)
                          ).length === 0 && (
                            <div className="px-4 py-6 text-center">
                              <AlertCircle className="mx-auto mb-2 text-slate-400" size={24} />
                              <p className="text-sm text-slate-500 dark:text-gray-400 mb-1">
                                Nenhum residente encontrado
                              </p>
                              <p className="text-xs text-slate-400 dark:text-gray-500">
                                Tente buscar por nome ou CPF
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                {selectedPaciente && (
                  <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 size={16} className="text-green-600 dark:text-green-400 flex-shrink-0" />
                      <span className="font-medium text-green-700 dark:text-green-300">
                        Residente selecionado: {selectedPaciente.nome}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Local</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type="text"
                    className="input w-full pl-10"
                    placeholder="Local do evento"
                    value={formData.local}
                    onChange={e => setFormData({ ...formData, local: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 dark:text-gray-300 mb-1.5">Descrição</label>
                <textarea
                  className="input w-full min-h-[100px] py-3"
                  placeholder="Detalhes adicionais..."
                  value={formData.descricao}
                  onChange={e => setFormData({ ...formData, descricao: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-3 border-t border-slate-100 dark:border-gray-700 mt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="btn btn-secondary flex-1 py-2.5"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary flex-1 py-2.5 shadow-lg shadow-primary-500/20"
                >
                  {editingId ? 'Salvar Alterações' : 'Agendar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
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
    </div>
  );
}


