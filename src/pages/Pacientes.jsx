import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  RefreshCcw,
  Download,
  FileDown,
  FileUp,
  Users,
  CheckCircle2,
  Filter,
  FileText,
  X,
  ChevronDown,
  Calendar,
  Phone,
  Mail,
  MapPin,
  UserX
} from 'lucide-react';
import pacienteService from '../services/paciente.service';
import toast from 'react-hot-toast';
import { successMessage, errorMessage } from '../utils/toastMessages';
import PacienteModal from '../components/PacienteModalNew';
import PageHeader from '../components/common/PageHeader';
import { useAuthStore } from '../store/authStore';
import { handleApiError } from '../utils/errorHandler';
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
import { openPrintWindow, escapeHtml } from '../utils/printWindow';

export default function Pacientes() {
  const [pacientes, setPacientes] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [residentesOpen, setResidentesOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPaciente, setSelectedPaciente] = useState(null);
  const [viewHistorico, setViewHistorico] = useState(null);
  const [historicoPrescricoes, setHistoricoPrescricoes] = useState([]);
  const [deletingId, setDeletingId] = useState(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadPacientes();
  }, [page]);

  const loadPacientes = async (search = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('pageSize', String(pageSize));
      
      const data = await pacienteService.getAll(params.toString());
      if (Array.isArray(data)) {
        setPacientes(data);
        setTotal(data.length);
      } else {
        const pacientesList = Array.isArray(data.items) ? data.items : (data.pacientes || []);
        setPacientes(pacientesList);
        setTotal(Number(data.total) || 0);
        setPageSize(Number(data.pageSize) || 10);
      }
    } catch (error) {
      handleApiError(error, errorMessage('load', 'pacientes'));
    } finally {
      setLoading(false);
    }
  };

  const handleViewHistorico = async (paciente) => {
    try {
      setViewHistorico(paciente);
      const response = await pacienteService.getHistorico(paciente.id || paciente._id);
      setHistoricoPrescricoes(response.prescricoes || []);
    } catch (error) {
      handleApiError(error, errorMessage('load', 'histórico'));
    }
  };

  const closeHistorico = () => {
    setViewHistorico(null);
    setHistoricoPrescricoes([]);
  };

  const handleEdit = (paciente) => {
    setSelectedPaciente(paciente);
    setModalOpen(true);
  };

  const handleInativar = async (id, nome) => {
    const confirmMessage = `Confirmar inativação do residente "${nome}"?`;
    if (!window.confirm(confirmMessage)) return;
    try {
      setDeletingId(id);
      await pacienteService.inactivate(id);
      toast.success('Residente inativado com sucesso');
      loadPacientes(searchTerm);
    } catch (error) {
      handleApiError(error, 'Não foi possível inativar o residente');
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedPaciente(null);
    loadPacientes(searchTerm);
  };

  const filteredPacientes = pacientes.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.cpf && p.cpf.includes(searchTerm));
    const matchesStatus = statusFilter ? p.status === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const novosMes = pacientes.filter(p => {
    if (!p.createdAt) return false;
    const date = new Date(p.createdAt);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).length;
  const pacientesComNascimento = pacientes.filter(p => p.dataNascimento);
  const idadeMedia = pacientesComNascimento.length > 0
    ? Math.round(pacientesComNascimento.reduce((acc, p) => {
        const age = new Date().getFullYear() - new Date(p.dataNascimento).getFullYear();
        return acc + age;
      }, 0) / pacientesComNascimento.length)
    : 0;
  const stats = {
    total: pacientes.length,
    novosMes,
    idadeMedia
  };

  // RBAC: permissões para editar/excluir residentes conforme tipoSistema e role
  const { user } = useAuthStore.getState();
  const role = user?.role;
  const tipoSistema = user?.empresa?.tipoSistema || 'casa-repouso';
  const canManage = role === 'superadmin'
    || (tipoSistema === 'fisioterapia'
      ? ['admin','enfermeiro','assistente_social','fisioterapeuta','medico'].includes(role)
      : ['admin','enfermeiro','assistente_social','medico'].includes(role));

  const onEditClick = (paciente) => {
    if (!canManage) {
      handleApiError({ response: { data: { code: 'access_denied' } } }, 'Acesso negado: seu perfil não pode editar residentes neste módulo');
      return;
    }
    handleEdit(paciente);
  };

  // Nova regra: exclusão não é permitida; somente inativação por Administrador
  const canInactivate = role === 'admin';
  const onInativarClick = (id, nome) => {
    if (!canInactivate) {
      handleApiError({ response: { data: { code: 'access_denied' } } }, 'Apenas Administrador pode inativar residentes');
      return;
    }
    handleInativar(id, nome);
  };

  const normalizeDate = (value) => {
    if (!value) return undefined;
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    const text = String(value).trim();
    if (!text) return undefined;

    // dd/mm/yyyy
    const br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (br) {
      const dd = br[1].padStart(2, '0');
      const mm = br[2].padStart(2, '0');
      const yyyy = br[3];
      return `${yyyy}-${mm}-${dd}`;
    }

    // yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    return undefined;
  };

  const normalizeCpf = (value) => {
    if (!value) return undefined;
    const digits = String(value).replace(/\D/g, '');
    return digits || undefined;
  };

  const normalizeHeaderKey = (value) =>
    String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const pickValue = (row, candidates) => {
    const entries = Object.entries(row || {});
    for (const [k, v] of entries) {
      const key = normalizeHeaderKey(k);
      if (candidates.includes(key)) return v;
    }
    return undefined;
  };

  const handleImportExcelClick = () => {
    fileInputRef.current?.click();
  };

  const parseSpreadsheetRows = async (file) => {
    const fileName = String(file?.name || '').toLowerCase();

    if (fileName.endsWith('.csv')) {
      const { default: Papa } = await import('papaparse');
      const text = await file.text();
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true
      });

      if (parsed.errors?.length) {
        throw new Error('Erro ao ler CSV');
      }

      return Array.isArray(parsed.data) ? parsed.data : [];
    }

    if (fileName.endsWith('.xls')) {
      throw new Error('Formato .xls não é suportado. Use .xlsx ou .csv.');
    }

    let ExcelJS;
    if (typeof window !== 'undefined' && window.ExcelJS) {
      ExcelJS = window.ExcelJS;
    } else {
      const mod = await import('exceljs');
      ExcelJS = mod.default || mod;
    }
    const workbook = new ExcelJS.Workbook();
    const arrayBuffer = await file.arrayBuffer();
    await workbook.xlsx.load(arrayBuffer);

    const worksheet = workbook.worksheets?.[0];
    if (!worksheet) {
      throw new Error('Arquivo inválido: nenhuma planilha encontrada');
    }

    const headers = [];
    worksheet.getRow(1).eachCell({ includeEmpty: true }, (cell, columnNumber) => {
      headers[columnNumber - 1] = String(cell.text || cell.value || '').trim();
    });

    return worksheet.getRows(2, Math.max(worksheet.rowCount - 1, 0))
      ?.map((row) => {
        const entry = {};
        let hasValue = false;

        headers.forEach((header, index) => {
          if (!header) return;

          const cell = row.getCell(index + 1);
          const value = cell.value instanceof Date
            ? cell.value
            : String(cell.text || cell.value || '').trim();

          if (value !== '' && value !== null && value !== undefined) {
            hasValue = true;
          }

          entry[header] = value;
        });

        return hasValue ? entry : null;
      })
      .filter(Boolean) || [];
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      setImporting(true);
      const rows = await parseSpreadsheetRows(file);
      if (!Array.isArray(rows) || rows.length === 0) {
        toast.error('Planilha vazia');
        return;
      }

      let created = 0;
      let skipped = 0;
      let failed = 0;

      const toastId = toast.loading(`Importando ${rows.length} residentes...`);

      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index] || {};

        const nome = pickValue(row, ['nome', 'name']);
        const cpf = pickValue(row, ['cpf', 'documento', 'document']);
        const dataNascimento = pickValue(row, ['datanascimento', 'nascimento', 'datadenascimento']);
        const telefone = pickValue(row, ['telefone', 'fone', 'celular']);
        const email = pickValue(row, ['email', 'emailpessoal', 'e-mail', 'e-mailpessoal', 'emailresponsavel']);
        const endereco = pickValue(row, ['endereco', 'endereco1', 'logradouro']);
        const observacoes = pickValue(row, ['observacoes', 'observacao', 'obs', 'anotacoes', 'anotacao']);

        const nomeStr = String(nome || '').trim();
        if (!nomeStr) {
          skipped += 1;
          continue;
        }

        const payload = {
          nome: nomeStr,
          cpf: normalizeCpf(cpf),
          dataNascimento: normalizeDate(dataNascimento),
          telefone: String(telefone || '').trim() || undefined,
          email: String(email || '').trim() || undefined,
          endereco: String(endereco || '').trim() || undefined,
          observacoes: String(observacoes || '').trim() || undefined
        };

        // remove undefined
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

        try {
          await pacienteService.create(payload);
          created += 1;
        } catch (err) {
          failed += 1;
        }

        if ((index + 1) % 10 === 0) {
          toast.loading(`Importando... (${index + 1}/${rows.length})`, { id: toastId });
        }
      }

      toast.dismiss(toastId);
      toast.success(`Importação concluída: ${created} criados, ${skipped} ignorados, ${failed} com erro.`);
      loadPacientes(searchTerm);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Erro ao importar planilha');
    } finally {
      setImporting(false);
    }
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
        @media print { body { padding: 0; } }
      `;

      const rowsHtml = filteredPacientes
        .map((p) => {
          const nascimento = p.dataNascimento ? new Date(p.dataNascimento).toLocaleDateString('pt-BR') : '-';
          return `
            <tr>
              <td>${escapeHtml(p.nome || '-')}</td>
              <td>${escapeHtml(p.cpf || '-')}</td>
              <td>${escapeHtml(nascimento)}</td>
              <td>${escapeHtml(p.telefone || '-')}</td>
              <td>${escapeHtml(p.email || '-')}</td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <h1>Relatório - Residentes</h1>
        <div class="meta">Gerado em: ${escapeHtml(generatedAt.toLocaleDateString('pt-BR'))} às ${escapeHtml(generatedAt.toLocaleTimeString('pt-BR'))}</div>
        <div class="meta">Registros: ${escapeHtml(filteredPacientes.length)}</div>
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Nascimento</th>
              <th>Telefone</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      `;

      openPrintWindow({
        title: 'Relatório - Residentes',
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
        label="Cadastros"
        title="Residentes"
        subtitle="Gerencie os residentes da instituição, histórico clínico e dados pessoais."
      >
        {(() => {
          const { user } = useAuthStore.getState();
          const role = user?.role;
          const tipo = user?.empresa?.tipoSistema || 'casa-repouso';
          const canCreate = role === 'superadmin'
            || (tipo === 'fisioterapia'
              ? ['admin','enfermeiro','assistente_social','fisioterapeuta','medico'].includes(role)
              : ['admin','enfermeiro','assistente_social','medico'].includes(role));
          const onNewClick = () => {
            if (!canCreate) {
              handleApiError({ response: { data: { code: 'access_denied' } } }, 'Acesso negado: seu perfil não pode cadastrar residentes neste módulo');
              return;
            }
            setModalOpen(true);
          };
        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
          <button
            onClick={onNewClick}
            className="btn btn-primary flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!canCreate}
            title={!canCreate ? 'Sem permissão para cadastrar residentes neste módulo' : 'Cadastrar novo residente'}
          >
            <Plus size={20} /> Novo Residente
          </button>
          <button
            type="button"
            onClick={exportToPDF}
            disabled={filteredPacientes.length === 0}
            className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar para PDF"
          >
            <FileDown size={18} /> Exportar PDF
          </button>
          <button
            type="button"
            onClick={handleImportExcelClick}
            disabled={importing}
            className="btn btn-secondary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Importar planilha (.xlsx ou .csv)"
          >
            <FileUp size={18} /> {importing ? 'Importando...' : 'Importar Planilha'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="hidden"
            onChange={handleImportExcel}
          />
        </div>
        })()}
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
          label="Novos"
          value={`+${stats.novosMes}`}
          description="Cadastrados este mês"
          color="emerald"
        />
        <StatsCard
          icon={Download}
          label="Média"
          value={`${stats.idadeMedia} anos`}
          description="Idade média dos residentes"
          color="purple"
        />
      </div>

      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Buscar por nome ou CPF..."
      >
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="inativo">Inativos</option>
        </select>
        <button
          type="button"
          onClick={() => loadPacientes(searchTerm)}
          className="btn btn-secondary flex items-center gap-2"
        >
          <RefreshCcw size={18} /> Atualizar
        </button>
      </SearchFilterBar>

      <TableContainer
        title={
          <button
            type="button"
            onClick={() => setResidentesOpen((v) => !v)}
            aria-expanded={residentesOpen}
            aria-controls="residentes-accordion"
            className="w-full flex items-center justify-between gap-3 text-left"
            title="Clique para abrir/fechar"
          >
            <span className="flex items-center gap-3">
              <span className="text-lg font-semibold text-gray-800 dark:text-gray-100">Residentes</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-200">
                {filteredPacientes.length}
              </span>
            </span>
            <ChevronDown
              size={18}
              className={`text-slate-500 transition-transform ${residentesOpen ? 'rotate-180' : 'rotate-0'}`}
            />
          </button>
        }
      >
        {!residentesOpen ? (
          <div className="px-4 py-6 text-center text-sm text-slate-500 dark:text-gray-400">
            Clique em “Residentes” para abrir a lista.
          </div>
        ) : loading ? (
          <div id="residentes-accordion" className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredPacientes.length > 0 ? (
          <div id="residentes-accordion">
            {/* Mobile */}
            <MobileGrid>
              {filteredPacientes.map((paciente) => (
                <MobileCard key={paciente.id || paciente._id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-sm">
                        {paciente.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-gray-100">{paciente.nome}</p>
                        <p className="text-[10px] text-slate-400">Código: {paciente.id || paciente._id}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">CPF: {paciente.cpf || '-'}</p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 mt-1">
                          <Calendar size={12} />
                          {paciente.dataNascimento ? new Date(paciente.dataNascimento).toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-gray-400">
                      {paciente.status === 'inativo' ? 'Inativo' : 'Ativo'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs text-slate-600 dark:text-gray-300">
                    <div className="flex items-center gap-2">
                      <Phone size={12} />
                      <span>{paciente.telefone || '-'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={12} />
                      <span>{paciente.email || '-'}</span>
                    </div>
                    {paciente.endereco && (
                      <div className="flex items-center gap-2 col-span-2">
                        <MapPin size={12} />
                        <span className="line-clamp-1">{paciente.endereco}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3">
                    <button
                      onClick={() => handleViewHistorico(paciente)}
                      className="group relative p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Ver Histórico"
                      aria-label="Ver histórico do paciente"
                    >
                      <FileText size={18} />
                    </button>
                    <button
                      onClick={() => onEditClick(paciente)}
                      className="group relative p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      title="Editar paciente"
                      aria-label="Editar paciente"
                      disabled={!canManage}
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => onInativarClick(paciente.id || paciente._id, paciente.nome)}
                      disabled={!canInactivate || deletingId === (paciente.id || paciente._id)}
                      className="group relative p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-red-500 to-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Inativar residente"
                      aria-label="Inativar residente"
                    >
                      {deletingId === (paciente.id || paciente._id) ? (
                        <div className="animate-spin rounded-full h-[18px] w-[18px] border-2 border-white border-t-transparent"></div>
                      ) : (
                        <UserX size={18} />
                      )}
                    </button>
                  </div>
                </MobileCard>
              ))}
            </MobileGrid>

            {/* Desktop */}
            <TableWrapper>
              <TableHeader columns={["Nome","CPF","Nascimento","Telefone","Ações"]} />
              <TBody>
                {filteredPacientes.map((paciente) => (
                  <Tr key={paciente.id || paciente._id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xs">
                          {paciente.nome.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 dark:text-gray-100">{paciente.nome}</span>
                          <span className="text-[11px] text-slate-400">Código: {paciente.id || paciente._id}</span>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-sm text-slate-600 dark:text-gray-300">{paciente.cpf || '-'}</Td>
                    <Td className="text-sm text-slate-600 dark:text-gray-300">
                      {paciente.dataNascimento ? new Date(paciente.dataNascimento).toLocaleDateString('pt-BR') : '-'}
                    </Td>
                    <Td className="text-sm text-slate-600 dark:text-gray-300">{paciente.telefone || '-'}</Td>
                    <Td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <ActionIconButton
                          onClick={() => handleViewHistorico(paciente)}
                          icon={FileText}
                          tooltip="Histórico"
                          ariaLabel="Ver histórico do paciente"
                          variant="emerald"
                        />
                        <ActionIconButton
                          onClick={() => onEditClick(paciente)}
                          icon={Edit2}
                          tooltip="Editar"
                          ariaLabel="Editar paciente"
                          variant="primary"
                          disabled={!canManage}
                        />
                        <ActionIconButton
                          onClick={() => onInativarClick(paciente.id || paciente._id, paciente.nome)}
                          icon={UserX}
                          tooltip="Inativar"
                          ariaLabel="Inativar residente"
                          variant="danger"
                          disabled={!canInactivate || deletingId === (paciente.id || paciente._id)}
                          loading={deletingId === (paciente.id || paciente._id)}
                        />
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrapper>
            </div>
          ) : (
            <EmptyState
              title="Nenhum residente encontrado"
              description="Ajuste os filtros ou cadastre um novo residente."
              actionLabel="Novo residente"
              onAction={() => setModalOpen(true)}
            />
          )}
      </TableContainer>

      {modalOpen && (
        <PacienteModal
          paciente={selectedPaciente}
          onClose={handleModalClose}
        />
      )}

      {/* Modal Histórico de Prescrições */}
      {viewHistorico && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-full md:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <FileText className="text-primary-600" />
                  Histórico de Prescrições
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  {viewHistorico.nome} - {viewHistorico.cpf}
                </p>
              </div>
              <button
                onClick={closeHistorico}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {historicoPrescricoes.length > 0 ? (
                <div className="space-y-4">
                  {historicoPrescricoes.map((prescricao) => (
                    <div
                      key={prescricao._id}
                      className="p-4 rounded-2xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="text-sm text-slate-500">
                            {new Date(prescricao.createdAt).toLocaleString('pt-BR')}
                          </p>
                          <p className="text-sm font-medium text-slate-700 mt-1">
                            Dr(a). {prescricao.medicoId?.nome || 'Não informado'}
                            {prescricao.medicoId?.crm && ` - CRM ${prescricao.medicoId.crm}`}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              prescricao.tipo === 'controlado'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-primary-100 text-primary-700'
                            }`}
                          >
                            {prescricao.tipo === 'controlado' ? 'Controlado' : 'Comum'}
                          </span>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              prescricao.status === 'ativa'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {prescricao.status}
                          </span>
                        </div>
                      </div>

                      {prescricao.medicamentos && prescricao.medicamentos.length > 0 && (
                        <div className="mt-3">
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">
                            Medicamentos
                          </p>
                          <ul className="space-y-1">
                            {prescricao.medicamentos.map((med, idx) => (
                              <li key={idx} className="text-sm text-slate-700">
                                • {med.nome}
                                {med.dosagem && ` - ${med.dosagem}`}
                                {med.via && ` (${med.via})`}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {prescricao.observacoes && (
                        <div className="mt-3 p-3 bg-white rounded-lg">
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                            Observações
                          </p>
                          <p className="text-sm text-slate-600">{prescricao.observacoes}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500">Nenhuma prescrição encontrada</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Este paciente ainda não possui prescrições registradas.
                  </p>
                </div>
              )}
            </div>
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