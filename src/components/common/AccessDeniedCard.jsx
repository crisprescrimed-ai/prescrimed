import { Shield } from 'lucide-react';

export default function AccessDeniedCard({
  title = 'Acesso Negado',
  message = 'Você não tem permissão para acessar esta página.',
  messageClassName = 'text-slate-600',
}) {
  return (
    <div className="card text-center py-12">
      <Shield size={48} className="mx-auto text-red-500 mb-4" />
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className={messageClassName}>{message}</p>
    </div>
  );
}
