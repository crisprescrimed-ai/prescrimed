import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  UserCog,
  Settings,
  LogOut,
  X,
  Calendar,
  CalendarDays,
  ClipboardList,
  Package,
  Activity,
  DollarSign,
  Building2,
  BookOpen,
  ShoppingCart,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export default function Sidebar({ onClose }) {
  const { user, logout, hasPermission } = useAuthStore();

  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: null },
    { path: '/agenda', label: 'Agenda', icon: Calendar, permission: 'agenda' },
    { path: '/cronograma', label: 'Cronograma', icon: CalendarDays, permission: 'cronograma' },
    { path: '/prescricoes', label: 'Prescrições', icon: FileText, permission: 'prescricoes' },
    { path: '/censo-mp', label: 'Censo M.P', icon: ClipboardList, permission: 'prescricoes' },
    { path: '/residentes', label: 'Pacientes', icon: Users, permission: 'pacientes' },
    { path: '/estoque', label: 'Estoque', icon: Package, permission: 'estoque' },
    { path: '/evolucao', label: 'Evolução', icon: Activity, permission: 'evolucao' },
    { path: '/financeiro', label: 'Financeiro', icon: DollarSign, permission: 'financeiro' },
    { path: '/comercial', label: 'Comercial', icon: ShoppingCart, permission: null },
    { path: '/usuarios', label: 'Usuários', icon: UserCog, roles: ['admin', 'superadmin'] },
    { path: '/configuracoes', label: 'Configurações', icon: Settings, permission: 'configuracoes' },
    { path: '/manual', label: 'Manual', icon: BookOpen, permission: null },
    { path: '/empresas', label: 'Empresas', icon: Building2, roles: ['superadmin'] },
  ];

  return (
    <aside className="h-full w-64 lg:w-72 bg-primary-900 text-white flex flex-col border-r border-white/5 shadow-2xl">
      <div className="h-20 px-4 md:px-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-primary-200">Prescrimed</p>
          <h1 className="text-2xl font-bold tracking-tight">Painel</h1>
        </div>
        <button
          className="lg:hidden p-2 rounded-xl bg-white/10 hover:bg-white/20 transition"
          onClick={() => onClose?.()}
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-4 md:px-6 py-4 md:py-5 border-b border-white/10">
        <p className="text-sm text-primary-100">Bem-vindo</p>
        <p className="text-lg font-semibold">{user?.nome}</p>
        <p
          className="text-sm text-primary-200/60 truncate"
          title={user?.empresa?.nome || user?.email}
        >
          {user?.empresa?.nome || user?.email}
        </p>
        {(user?.role === 'admin' || user?.role === 'superadmin') && (
          <span className="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold text-primary-300">
            {user?.role === 'superadmin' ? 'Super Admin' : 'Administrador'}
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-xs uppercase tracking-[0.4em] text-primary-300/50 mb-4">Navegação</p>
        <ul className="space-y-2">
          {menuItems.map((item) => {
            // SuperAdmin vê tudo
            if (user?.role === 'superadmin') {
              return (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => onClose?.()}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                        isActive
                          ? 'bg-white text-primary-900 shadow-xl'
                          : 'text-primary-100 hover:bg-white/10'
                      }`
                    }
                  >
                    <item.icon size={20} />
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            }

            // Verificar roles específicas
            if (item.roles && !item.roles.includes(user?.role)) {
              return null;
            }
            
            // Verificar permissões
            if (item.permission && !hasPermission(item.permission)) {
              return null;
            }

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                      isActive
                        ? 'bg-white text-primary-900 shadow-xl'
                        : 'text-primary-100 hover:bg-white/10'
                    }`
                  }
                >
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="px-4 py-6 border-t border-white/10">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/10 hover:bg-white/20 transition text-red-100"
        >
          <LogOut size={18} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}