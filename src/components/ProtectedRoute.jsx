/**
 * Componente ProtectedRoute
 * 
 * Componente de proteção de rotas (Route Guard).
 * Verifica se o usuário está autenticado e tem as permissões necessárias
 * antes de permitir o acesso a uma rota específica.
 * 
 * Fluxo de validação:
 * 1. Verifica autenticação - se não autenticado, redireciona para /login
 * 2. Verifica permissão (se requerida) - se sem permissão, redireciona para /dashboard
 * 3. Se passou nas verificações, renderiza o componente filho
 * 
 * @param {ReactNode} children - Componente filho a ser renderizado se autorizado
 * @param {string} requiredPermission - Permissão necessária para acessar a rota (opcional)
 */

// Importa Navigate do React Router para redirecionamentos
import { Navigate } from 'react-router-dom';

// Importa store de autenticação (Zustand) que gerencia estado do usuário
import { useAuthStore } from '../store/authStore';

/**
 * Componente que protege rotas verificando autenticação e permissões
 */
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { isAuthenticated, hasPermission, loading } = useAuthStore();

  // Enquanto a sessão do Supabase está sendo verificada, exibe spinner
  // (evita flash de redirect para /login em usuários já autenticados)
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Primeira verificação: usuário está autenticado?
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Segunda verificação: se a rota requer permissão específica
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Exporta componente para uso nas rotas do App.jsx
export default ProtectedRoute;
