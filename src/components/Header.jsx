import { Bell, Search, Menu, Building2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import empresaService from '../services/empresa.service';
import toast from 'react-hot-toast';
import { emitEmpresaContextChanged } from '../utils/empresaContext';

export default function Header({ onToggleSidebar }) {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [empresas, setEmpresas] = useState([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState(() => localStorage.getItem('superadminEmpresaId') || '');

  const isSuperadmin = user?.role === 'superadmin';

  useEffect(() => {
    if (!isSuperadmin) return;

    let active = true;
    (async () => {
      try {
        const data = await empresaService.getAll();
        if (!active) return;
        const list = Array.isArray(data)
          ? data
          : (data?.empresas || data?.data || []);
        setEmpresas(Array.isArray(list) ? list : []);
      } catch {
        // não bloqueia o header se falhar
      }
    })();
    return () => {
      active = false;
    };
  }, [isSuperadmin]);

  const empresasOptions = useMemo(() => {
    const list = Array.isArray(empresas) ? empresas : [];
    return list
      .map((e) => ({ id: e.id, nome: e.nome }))
      .filter((e) => e.id && e.nome);
  }, [empresas]);

  const empresaSelecionadaNome = useMemo(() => {
    if (!empresaSelecionada) return '';
    const match = empresasOptions.find((e) => String(e.id) === String(empresaSelecionada));
    return match?.nome || '';
  }, [empresaSelecionada, empresasOptions]);

  const handleEmpresaChange = (value) => {
    setEmpresaSelecionada(value);
    if (!value) {
      localStorage.removeItem('superadminEmpresaId');
      toast.success('Modo superadmin: exibindo todas as empresas');
      emitEmpresaContextChanged(null);
      return;
    }
    localStorage.setItem('superadminEmpresaId', value);
    toast.success('Empresa selecionada para navegação');
    emitEmpresaContextChanged(value);
  };

  return (
    <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-100">
      <div className="h-20 px-4 lg:px-8 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <button
            className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
            onClick={onToggleSidebar}
          >
            <Menu size={20} />
          </button>
          <div className="hidden sm:block flex-1">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                placeholder="Pesquisar pacientes, prescrições ou usuários"
                className="w-full pl-12 pr-4 py-3 rounded-2xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm text-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isSuperadmin && (
            <>
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-2xl">
              <Building2 size={18} className="text-slate-500" />
              <select
                value={empresaSelecionada}
                onChange={(e) => handleEmpresaChange(e.target.value)}
                className="bg-transparent text-sm text-slate-700 font-medium focus:outline-none max-w-[260px]"
                title="Selecionar empresa (contexto do superadmin)"
              >
                <option value="">Todas as empresas</option>
                {empresasOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nome}
                  </option>
                ))}
              </select>
              {empresaSelecionada && (
                <button
                  type="button"
                  onClick={() => handleEmpresaChange('')}
                  className="p-1 rounded-xl hover:bg-slate-200 transition"
                  title="Limpar seleção"
                >
                  <X size={16} className="text-slate-500" />
                </button>
              )}
              </div>

              <div className="sm:hidden inline-flex items-center gap-2 px-3 py-2 bg-slate-100 rounded-2xl">
                <Building2 size={16} className="text-slate-500" />
                <span
                  className="text-xs font-semibold text-slate-700 truncate max-w-[140px]"
                  title={empresaSelecionada ? (empresaSelecionadaNome || String(empresaSelecionada)) : 'Todas as empresas'}
                >
                  {empresaSelecionada ? (empresaSelecionadaNome || `Empresa ${empresaSelecionada}`) : 'Todas'}
                </span>
                {empresaSelecionada && (
                  <button
                    type="button"
                    onClick={() => handleEmpresaChange('')}
                    className="p-1 rounded-xl hover:bg-slate-200 transition"
                    title="Limpar seleção"
                  >
                    <X size={14} className="text-slate-500" />
                  </button>
                )}
              </div>
            </>
          )}
          <button 
            onClick={() => navigate('/censo-mp')}
            className="hidden sm:inline-flex items-center px-4 py-2 rounded-2xl bg-primary-50 text-primary-600 text-sm font-semibold hover:bg-primary-100 transition"
          >
            Nova Prescrição
          </button>
          <button className="relative p-3 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full"></span>
          </button>
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-100 rounded-2xl">
            <div className="hidden sm:flex flex-col text-xs text-slate-500 leading-tight">
              <span>Conectado</span>
              <span className="text-slate-800 font-semibold text-sm">{user?.nome}</span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-lg font-semibold">
              {user?.nome?.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}