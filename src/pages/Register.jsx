import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Building2, Briefcase, ShieldCheck, Home, PawPrint, HeartPulse } from 'lucide-react';
import HeroBackground from '../components/HeroBackground';
import authService from '../services/auth.service';
import toast from 'react-hot-toast';
import { errorMessage, customErrorMessage } from '../utils/toastMessages';
import { formatCPF, formatCNPJ, isValidCPF, isValidCNPJ } from '../utils/locale';

export default function Register() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    tipoSistema: 'casa-repouso',
    nomeEmpresa: '',
    cnpj: '',
    nomeUsuario: '',
    email: '',
    senha: '',
    confirmarSenha: '',
    cpf: '',
    contato: '',
  });
  const [loading, setLoading] = useState(false);
  const highlights = [
    {
      title: 'Cadastro guiado',
      description: 'Organizamos os campos para você concluir o registro em poucos minutos.',
      icon: UserPlus,
    },
    {
      title: 'Informações seguras',
      description: 'Seus dados ficam protegidos com padrões de segurança usados na saúde.',
      icon: ShieldCheck,
    },
    {
      title: 'Tudo em um só lugar',
      description: 'Centralize empresas, usuários e prescrições em uma única plataforma.',
      icon: Briefcase,
    },
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;

    const maskCPF = (v) => {
      const digits = String(v || '').replace(/\D/g, '').slice(0, 11);
      if (digits.length <= 3) return digits;
      if (digits.length <= 6) return digits.replace(/(\d{3})(\d{0,3})/, '$1.$2');
      if (digits.length <= 9) return digits.replace(/(\d{3})(\d{3})(\d{0,3})/, '$1.$2.$3');
      return formatCPF(digits);
    };

    const maskCNPJ = (v) => {
      const digits = String(v || '').replace(/\D/g, '').slice(0, 14);
      if (digits.length <= 2) return digits;
      if (digits.length <= 5) return digits.replace(/(\d{2})(\d{0,3})/, '$1.$2');
      if (digits.length <= 8) return digits.replace(/(\d{2})(\d{3})(\d{0,3})/, '$1.$2.$3');
      if (digits.length <= 12) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{0,4})/, '$1.$2.$3/$4');
      return formatCNPJ(digits);
    };

    if (name === 'cpf') {
      setFormData({ ...formData, cpf: maskCPF(value) });
      return;
    }
    if (name === 'cnpj') {
      setFormData({ ...formData, cnpj: maskCNPJ(value) });
      return;
    }

    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cpfDigits = (formData.cpf || '').replace(/\D/g, '');
    const cnpjDigits = (formData.cnpj || '').replace(/\D/g, '');

    if (!isValidCNPJ(cnpjDigits)) {
      toast.error('CNPJ inválido');
      return;
    }
    if (!isValidCPF(cpfDigits)) {
      toast.error('CPF inválido');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      toast.error(customErrorMessage('passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      await authService.register({
        tipoSistema: formData.tipoSistema,
        nomeEmpresa: formData.nomeEmpresa,
        cnpj: cnpjDigits,
        nomeAdmin: formData.nomeUsuario,
        email: formData.email,
        senha: formData.senha,
        cpf: cpfDigits,
        contato: formData.contato,
      });

      toast.success('Cadastro realizado com sucesso! Faça login para continuar.');
      navigate('/login');
    } catch (error) {
      const errorMsg = error?.response?.data?.error || errorMessage('register', 'conta');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
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
          <p className="text-primary-100">Onboarding & Setup</p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold mb-6 leading-tight">
            Comece a transformar sua gestão clínica hoje.
          </h2>
          <div className="space-y-6 text-left">
            {highlights.map(({ title, description, icon: Icon }) => (
              <div key={title} className="flex gap-4 items-start">
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon size={22} className="text-white" />
                </div>
                <div>
                  <p className="font-semibold text-white text-lg">{title}</p>
                  <p className="text-primary-100 leading-relaxed">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-primary-200">
          © 2025 Prescrimed System. Todos os direitos reservados.
        </div>
      </div>

      {/* Right Side - Registration Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 md:p-12 bg-slate-50 overflow-y-auto">
        <div className="w-full max-w-xl space-y-8">
          <div className="text-center lg:text-left">
            <div className="lg:hidden flex justify-center mb-6">
              <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white">
                <Building2 size={24} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Criar nova conta</h2>
            <p className="text-slate-500 mt-2">
              Preencha os dados da sua empresa e do administrador.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Step 0: Sistema Type */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
                  <Briefcase size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Tipo de Sistema</h3>
                  <p className="text-xs text-slate-500">Selecione o tipo de estabelecimento</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipoSistema: 'casa-repouso' })}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    formData.tipoSistema === 'casa-repouso'
                      ? 'border-primary-500 bg-primary-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      formData.tipoSistema === 'casa-repouso'
                        ? 'bg-primary-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <Home size={28} />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        formData.tipoSistema === 'casa-repouso'
                          ? 'text-primary-700'
                          : 'text-slate-900'
                      }`}>Casa de Repouso</h4>
                      <p className="text-xs text-slate-500 mt-1">Gestão de residentes e cuidados</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipoSistema: 'fisioterapia' })}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    formData.tipoSistema === 'fisioterapia'
                      ? 'border-rose-500 bg-rose-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      formData.tipoSistema === 'fisioterapia'
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <HeartPulse size={28} />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        formData.tipoSistema === 'fisioterapia'
                          ? 'text-rose-700'
                          : 'text-slate-900'
                      }`}>Clínica de Fisioterapia</h4>
                      <p className="text-xs text-slate-500 mt-1">Gestão de sessões e evoluções</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, tipoSistema: 'petshop' })}
                  className={`p-5 rounded-xl border-2 transition-all duration-200 ${
                    formData.tipoSistema === 'petshop'
                      ? 'border-emerald-500 bg-emerald-50 shadow-md'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-3 text-center">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                      formData.tipoSistema === 'petshop'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      <PawPrint size={28} />
                    </div>
                    <div>
                      <h4 className={`font-semibold ${
                        formData.tipoSistema === 'petshop'
                          ? 'text-emerald-700'
                          : 'text-slate-900'
                      }`}>Petshop / Veterinária</h4>
                      <p className="text-xs text-slate-500 mt-1">Gestão de pets e atendimentos</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Step 1: Company Data */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                  <Building2 size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Dados da Empresa</h3>
                  <p className="text-xs text-slate-500">
                    {formData.tipoSistema === 'casa-repouso' 
                      ? 'Informações da casa de repouso'
                      : formData.tipoSistema === 'petshop'
                        ? 'Informações do petshop/clínica veterinária'
                        : 'Informações da clínica de fisioterapia'}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome da Empresa *</label>
                  <input
                    type="text"
                    name="nomeEmpresa"
                    value={formData.nomeEmpresa}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder={
                      formData.tipoSistema === 'casa-repouso'
                        ? 'Ex.: Casa de Repouso Vida'
                        : formData.tipoSistema === 'petshop'
                          ? 'Ex.: Petshop Amigo Fiel'
                          : 'Ex.: Clínica Fisio Movimento'
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">CNPJ *</label>
                  <input
                    type="text"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="00.000.000/0000-00"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Admin Data */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">Administrador</h3>
                  <p className="text-xs text-slate-500">Dados do responsável</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nome Completo *</label>
                  <input
                    type="text"
                    name="nomeUsuario"
                    value={formData.nomeUsuario}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Nome e sobrenome"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">E-mail *</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">CPF *</label>
                  <input
                    type="text"
                    name="cpf"
                    value={formData.cpf}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="000.000.000-00"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Contato *</label>
                  <input
                    type="text"
                    name="contato"
                    value={formData.contato}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Senha *</label>
                  <input
                    type="password"
                    name="senha"
                    value={formData.senha}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar Senha *</label>
                  <input
                    type="password"
                    name="confirmarSenha"
                    value={formData.confirmarSenha}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="Repita a senha"
                    minLength={6}
                    required
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              {loading ? 'Processando cadastro...' : 'Finalizar Cadastro'}
            </button>

            <p className="text-center text-sm text-slate-600">
              Já possui uma conta?{' '}
              <Link to="/login" className="text-primary-600 font-semibold hover:text-primary-700">
                Fazer login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}