import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { LogIn, Mail, Lock, Building2, ArrowRight } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import HeroBackground from '../components/HeroBackground';
import toast from 'react-hot-toast';
import { errorMessage, apiErrorMessage, apiErrorCode, friendlyErrorFromCode } from '../utils/toastMessages';

export default function Login() {
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  
  const [formData, setFormData] = useState({
    email: '',
    senha: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.senha);
      toast.success('Login realizado com sucesso!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erro no login:', error);
      
      // Verifica se é erro de rede (backend offline)
      if (error.isNetworkError || !error.response) {
        toast.error('Não foi possível conectar ao servidor. Verifique sua conexão ou tente novamente mais tarde.');
      } 
      // Verifica se é erro 401 (credenciais inválidas)
      else if (error.response?.status === 401) {
        toast.error('Email ou senha incorretos. Verifique suas credenciais e tente novamente.');
      }
      // Verifica se é erro 403 (empresa inativa / trial vencido / acesso negado)
      else if (error.response?.status === 403) {
        const code = apiErrorCode(error);
        const friendly = friendlyErrorFromCode(code);
        toast.error(friendly || apiErrorMessage(error, 'Acesso negado.'));
      }
      // Outros erros
      else {
        toast.error(apiErrorMessage(error, 'Erro ao fazer login. Tente novamente.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Hero/Branding (Hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 to-primary-800 relative overflow-hidden text-white p-12 flex-col justify-between items-center text-center">
        <HeroBackground />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="flex items-center gap-3 text-2xl font-bold mb-2">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
              <Building2 size={24} />
            </div>
            Prescrimed
          </div>
          <p className="text-primary-100">Sistema de Gestão de Prescrições</p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Simplifique a gestão de prescrições da sua clínica.
          </h2>
          <p className="text-primary-100 text-lg leading-relaxed mb-8">
            Segurança, agilidade e conformidade em um único lugar. Desenvolvido especialmente para Instituições de Longa Permanência e Clínicas.
          </p>
          <div className="flex gap-4 justify-center">
            <div className="flex -space-x-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-10 h-10 rounded-full border-2 border-primary-700 bg-primary-800 flex items-center justify-center text-xs font-bold">
                  {i}
                </div>
              ))}
            </div>
            <div className="flex flex-col justify-center text-left">
              <span className="font-bold">Mais de 500+</span>
              <span className="text-xs text-primary-200">Profissionais confiam</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-sm text-primary-200">
          © 2025 Prescrimed System. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-slate-50">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white">
                <Building2 size={24} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Bem-vindo de volta</h2>
            <p className="text-slate-500 mt-2">
              Acesse sua conta para gerenciar prescrições e pacientes.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Profissional</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="nome@clinica.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-slate-700">Senha</label>
                  <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">Esqueceu a senha?</a>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={20} />
                  </div>
                  <input
                    type="password"
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">Não tem uma conta?</span>
              </div>
            </div>

            <Link 
              to="/register"
              className="w-full bg-white border border-slate-200 text-slate-700 font-semibold py-3.5 rounded-xl hover:bg-slate-50 transition-all duration-200 flex items-center justify-center gap-2"
            >
              Criar conta da clínica
            </Link>
          </form>

          <p className="text-center text-xs text-slate-400">
            Protegido por reCAPTCHA e sujeito à Política de Privacidade e Termos de Serviço do Google.
          </p>
        </div>
      </div>
    </div>
  );
}