import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, RefreshCcw, Users, CheckCircle2, Search } from 'lucide-react';
import usuarioService from '../services/usuario.service';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import { successMessage, errorMessage, customErrorMessage } from '../utils/toastMessages';
import { handleApiError } from '../utils/errorHandler';
import UsuarioModal from '../components/UsuarioModal';
import PageHeader from '../components/common/PageHeader';
import StatsCard from '../components/common/StatsCard';
import SearchFilterBar from '../components/common/SearchFilterBar';
import EmptyState from '../components/common/EmptyState';
import AccessDeniedCard from '../components/common/AccessDeniedCard';
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

export default function Usuarios() {
  const { user } = useAuthStore();
  const [usuarios, setUsuarios] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [density, setDensity] = useState('comfortable');
  const [feedback, setFeedback] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';

  useEffect(() => {
    if (isAdmin) {
      loadUsuarios();
    } else {
      toast.error(customErrorMessage('accessDenied'));
    }
  }, [isAdmin, page]);

  const loadUsuarios = async () => {
    try {
      setLoading(true);
      const data = await usuarioService.getAll({ page, pageSize });
      if (Array.isArray(data)) {
        setUsuarios(data);
        setTotal(data.length);
      } else {
        const usuariosList = Array.isArray(data.items) ? data.items : (data.usuarios || []);
        setUsuarios(usuariosList);
        setTotal(Number(data.total) || 0);
        setPageSize(Number(data.pageSize) || 10);
      }
    } catch (error) {
      handleApiError(error, errorMessage('load', 'usuários'));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (usuario) => {
    setSelectedUsuario(usuario);
    setModalOpen(true);
  };

  const handleDelete = async (id, nome) => {
    if (id === user.id) {
      toast.error(customErrorMessage('cannotDeleteSelf'));
      return;
    }
    const confirmMessage = `Tem certeza que deseja excluir o usuário "${nome}"?\n\nEsta ação não pode ser desfeita.`;
    if (!window.confirm(confirmMessage)) {
      return;
    }
    try {
      setDeletingId(id);
      await usuarioService.delete(id);
      toast.success(successMessage('delete', 'Usuário'));
      setFeedback({ type: 'success', message: 'Usuário excluído e lista atualizada.' });
      loadUsuarios();
    } catch (error) {
      handleApiError(error, errorMessage('delete', 'usuário'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedUsuario(null);
    setFeedback({ type: 'success', message: 'Dados atualizados após salvar usuário.' });
    loadUsuarios();
  };

  const filteredUsuarios = usuarios.filter(u => 
    u.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (u.crm && u.crm.includes(searchTerm))
  );

  const roleLabel = (role) => {
    if (role === 'superadmin') return 'Super Admin';
    if (role === 'admin') return 'Administrador';
    if (role === 'nutricionista') return 'Nutricionista';
    if (role === 'atendente') return 'Atendente';
    if (role === 'enfermeiro') return 'Enfermeiro';
    if (role === 'tecnico_enfermagem') return 'Técnico de Enfermagem';
    if (role === 'fisioterapeuta') return 'Fisioterapeuta';
    if (role === 'assistente_social') return 'Assistente Social';
    if (role === 'auxiliar_administrativo') return 'Auxiliar Administrativo';
    if (role === 'medico') return 'Médico';
    return 'Usuário';
  };

  if (!isAdmin) {
    return (
      <AccessDeniedCard message="Apenas administradores podem acessar esta página." />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        label="Administração"
        title="Usuários"
        subtitle="Gerencie o acesso ao sistema, cadastre novos profissionais e mantenha a equipe atualizada."
      >
        <button
          type="button"
          onClick={loadUsuarios}
          className="btn btn-secondary flex items-center justify-center gap-2"
        >
          <RefreshCcw size={18} /> Atualizar
        </button>
        <button
          onClick={() => setModalOpen(true)}
          className="btn btn-primary flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20"
        >
          <Plus size={18} /> Novo Usuário
        </button>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard
          icon={Users}
          label="Total de Usuários"
          value={usuarios.length}
          color="primary"
        />
        <StatsCard
          icon={CheckCircle2}
          label="Usuários Ativos"
          value={usuarios.filter(u => u.ativo).length}
          color="emerald"
        />
        {/* Placeholder for layout balance or another stat if needed */}
        <div className="hidden md:block"></div> 
      </div>

      <SearchFilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Buscar por nome, email ou CRM..."
      >
        <div className="flex items-center gap-2 text-sm text-slate-500 ml-auto">
          <span>Densidade:</span>
          <button
            type="button"
            onClick={() => setDensity((prev) => (prev === 'comfortable' ? 'compact' : 'comfortable'))}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              density === 'comfortable' 
                ? 'bg-white shadow-sm text-primary-700 ring-1 ring-slate-200' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {density === 'comfortable' ? 'Confortável' : 'Compacta'}
          </button>
        </div>
      </SearchFilterBar>

      {feedback && (
        <div
          className={`card border flex items-center gap-3 ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50'
              : 'border-amber-200 bg-amber-50'
          }`}
        >
          <CheckCircle2 className="text-emerald-500" size={20} />
          <p className="text-sm text-slate-700">{feedback.message}</p>
          <button className="ml-auto text-xs text-slate-500 hover:text-slate-700" onClick={() => setFeedback(null)}>
            Fechar
          </button>
        </div>
      )}

      <TableContainer title="Usuários">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredUsuarios.length > 0 ? (
          <>
            {/* Mobile */}
            <MobileGrid>
              {filteredUsuarios.map((usuario) => (
                <MobileCard key={usuario.id}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm">
                        {usuario.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900 dark:text-gray-100">{usuario.nome}</p>
                        <p className="text-[10px] text-slate-400">Código: {usuario.id}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400">{usuario.email}</p>
                        {usuario.crm && (
                          <span className="text-xs text-slate-500 dark:text-gray-400">CRM: {usuario.crm}</span>
                        )}
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                        usuario.ativo
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}
                    >
                      {usuario.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span
                      className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                        usuario.role === 'admin' || usuario.role === 'superadmin'
                          ? 'bg-purple-50 text-purple-700 border-purple-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {roleLabel(usuario.role)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(usuario)}
                        className="group relative p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                        title="Editar usuário"
                        aria-label="Editar usuário"
                      >
                        <Edit2 size={18} />
                      </button>
                      {usuario.id !== user.id && (
                        <button
                          onClick={() => handleDelete(usuario.id, usuario.nome)}
                          disabled={deletingId === usuario.id}
                          className="group relative p-2.5 text-slate-500 hover:text-white hover:bg-gradient-to-br from-red-500 to-red-600 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Excluir usuário"
                          aria-label="Excluir usuário"
                        >
                          {deletingId === usuario.id ? (
                            <div className="animate-spin rounded-full h-[18px] w-[18px] border-2 border-white border-t-transparent"></div>
                          ) : (
                            <Trash2 size={18} />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </MobileCard>
              ))}
            </MobileGrid>

            {/* Desktop */}
            <TableWrapper>
              <TableHeader columns={["Profissional","Contato","CRM","Função","Status","Ações"]} />
              <TBody>
                {filteredUsuarios.map((usuario) => (
                  <Tr key={usuario.id}>
                    <Td className={density === 'compact' ? 'py-3' : 'py-4'}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs">
                          {usuario.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <div className="font-medium text-slate-900 dark:text-gray-100">{usuario.nome}</div>
                          <span className="text-[11px] text-slate-400">Código: {usuario.id}</span>
                        </div>
                      </div>
                    </Td>
                    <Td className={`${density === 'compact' ? 'py-3' : 'py-4'} text-sm text-slate-600 dark:text-gray-300`}>
                      {usuario.email}
                    </Td>
                    <Td className={`${density === 'compact' ? 'py-3' : 'py-4'} text-sm text-slate-600 dark:text-gray-300`}>
                      {usuario.crm ? (
                        <span className="font-mono bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">{usuario.crm}</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </Td>
                    <Td className={density === 'compact' ? 'py-3' : 'py-4'}>
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                          usuario.role === 'admin' || usuario.role === 'superadmin'
                            ? 'bg-purple-50 text-purple-700 border-purple-100'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {roleLabel(usuario.role)}
                      </span>
                    </Td>
                    <Td className={density === 'compact' ? 'py-3' : 'py-4'}>
                      <span
                        className={`px-2.5 py-1 text-xs rounded-full font-medium border ${
                          usuario.ativo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-red-50 text-red-700 border-red-100'
                        }`}
                      >
                        {usuario.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </Td>
                    <Td className={`${density === 'compact' ? 'py-3' : 'py-4'} text-right`}>
                      <div className="flex items-center justify-end gap-2">
                        <ActionIconButton
                          onClick={() => handleEdit(usuario)}
                          icon={Edit2}
                          tooltip="Editar"
                          ariaLabel="Editar usuário"
                          variant="primary"
                        />
                        {usuario.id !== user.id && (
                          <ActionIconButton
                            onClick={() => handleDelete(usuario.id, usuario.nome)}
                            icon={Trash2}
                            tooltip="Excluir"
                            ariaLabel="Excluir usuário"
                            variant="danger"
                            disabled={deletingId === usuario.id}
                            loading={deletingId === usuario.id}
                          />
                        )}
                      </div>
                    </Td>
                  </Tr>
                ))}
              </TBody>
            </TableWrapper>
          </>
        ) : (
          <EmptyState
            icon={Search}
            title="Nenhum usuário encontrado"
            description={searchTerm ? 'Tente buscar com outros termos.' : 'Comece adicionando novos usuários ao sistema.'}
            actionLabel={!searchTerm ? "Adicionar usuário" : null}
            onAction={!searchTerm ? () => setModalOpen(true) : null}
          />
        )}
      </TableContainer>

      {modalOpen && (
        <UsuarioModal
          usuario={selectedUsuario}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
}