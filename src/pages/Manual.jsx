import { useState } from 'react';
import { 
  BookOpen, 
  Home, 
  Calendar, 
  Clock, 
  Pill, 
  FileText, 
  Users, 
  Package, 
  TrendingUp, 
  DollarSign, 
  User, 
  Building2, 
  Settings,
  ChevronRight,
  Search,
  Download,
  ExternalLink,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import PageHeader from '../components/common/PageHeader';

export default function Manual() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState(null);

  const modules = [
    {
      id: 'dashboard',
      icon: Home,
      title: 'Dashboard',
      color: 'bg-blue-500',
      description: 'Visão geral do sistema com métricas e gráficos',
      sections: [
        {
          title: 'Visualizar Métricas',
          content: 'Acompanhe em tempo real os indicadores principais: Pacientes Ativos, Prescrições Ativas, Agendamentos do Dia e Receita Mensal.',
          steps: ['Acesse o Dashboard', 'Visualize os cards com métricas', 'Clique em cada card para detalhes']
        },
        {
          title: 'Analisar Gráficos',
          content: 'Gráficos interativos mostram evolução de pacientes, comparativo financeiro e taxa de ocupação.',
          steps: ['Passe o mouse sobre os gráficos', 'Veja detalhes por período', 'Use filtros para personalizar']
        },
        {
          title: 'Ações Rápidas',
          content: 'Botões de acesso rápido para criar prescrições, agendamentos e evoluções diretamente do Dashboard.',
          steps: ['Localize os botões de ação', 'Clique para criar novo item', 'Preencha e salve']
        }
      ],
      permissions: 'Todos os usuários'
    },
    {
      id: 'agenda',
      icon: Calendar,
      title: 'Agenda',
      color: 'bg-purple-500',
      description: 'Gerenciamento de agendamentos e compromissos',
      sections: [
        {
          title: 'Criar Agendamento',
          content: 'Agende consultas, visitas, procedimentos e reuniões com facilidade.',
          steps: [
            'Clique em "+ Novo Agendamento"',
            'Selecione o paciente',
            'Escolha tipo, data, hora e profissional',
            'Adicione observações',
            'Clique em "Salvar"'
          ]
        },
        {
          title: 'Visualizar Agenda',
          content: 'Escolha entre visualização por dia, semana ou mês para melhor organização.',
          steps: ['Selecione a visualização desejada', 'Navegue entre datas', 'Clique em agendamento para detalhes']
        },
        {
          title: 'Gerenciar Agendamentos',
          content: 'Edite, confirme ou cancele agendamentos conforme necessário.',
          steps: ['Clique no agendamento', 'Escolha ação: Editar, Confirmar ou Cancelar', 'Confirme a operação']
        }
      ],
      permissions: 'Admin, Atendente, Enfermeiro, Fisioterapeuta'
    },
    {
      id: 'cronograma',
      icon: Clock,
      title: 'Cronograma',
      color: 'bg-indigo-500',
      description: 'Planejamento de tarefas e rotinas',
      sections: [
        {
          title: 'Criar Tarefa',
          content: 'Organize tarefas com prioridades, responsáveis e prazos definidos.',
          steps: [
            'Clique em "+ Nova Tarefa"',
            'Defina título, descrição e prioridade',
            'Atribua responsável e prazo',
            'Configure recorrência se necessário',
            'Salve a tarefa'
          ]
        },
        {
          title: 'Acompanhar Status',
          content: 'Visualize tarefas pendentes, em progresso, concluídas ou atrasadas.',
          steps: ['Veja quadro de tarefas', 'Filtre por status', 'Marque como concluída quando finalizar']
        },
        {
          title: 'Configurar Rotinas',
          content: 'Crie tarefas recorrentes para medicação, higienização, alimentação e atividades.',
          steps: ['Crie tarefa com recorrência', 'Defina frequência (diária, semanal, mensal)', 'Sistema criará automaticamente']
        }
      ],
      permissions: 'Admin, Enfermeiro, Técnico de Enfermagem, Auxiliar Administrativo'
    },
    {
      id: 'prescricoes',
      icon: Pill,
      title: 'Prescrições',
      color: 'bg-green-500',
      description: 'Gestão de prescrições médicas e veterinárias',
      sections: [
        {
          title: 'Criar Prescrição',
          content: 'Prescreva medicamentos com dosagem, via, frequência e duração detalhadas.',
          steps: [
            'Clique em "+ Nova Prescrição"',
            'Selecione o paciente',
            'Adicione medicamentos e dosagens',
            'Defina via, frequência e duração',
            'Adicione observações especiais',
            'Salve a prescrição'
          ]
        },
        {
          title: 'Administrar Medicamento',
          content: 'Registre cada administração de medicamento com horário e observações.',
          steps: ['Abra prescrição ativa', 'Clique em "Registrar Administração"', 'Confirme horário e dosagem', 'Salve o registro']
        },
        {
          title: 'Renovar Prescrição',
          content: 'Renove prescrições finalizadas com ajustes de datas e dosagens.',
          steps: ['Abra prescrição finalizada', 'Clique em "Renovar"', 'Ajuste conforme necessário', 'Salve nova prescrição']
        }
      ],
      permissions: 'Nutricionista/Admin (criar) | Enfermeiro/Técnico de Enfermagem (registrar administração)'
    },
    {
      id: 'censo',
      icon: FileText,
      title: 'Censo M.P.',
      color: 'bg-amber-500',
      description: 'Censo de medicamentos prescritos',
      sections: [
        {
          title: 'Gerar Censo',
          content: 'Relatório consolidado de todos os medicamentos em uso no período selecionado.',
          steps: ['Selecione o período desejado', 'Clique em "Gerar Censo"', 'Analise os dados apresentados']
        },
        {
          title: 'Exportar Relatório',
          content: 'Exporte censo em PDF, Excel ou CSV para impressão ou análise externa.',
          steps: ['Clique em "Exportar"', 'Escolha o formato', 'Salve ou imprima o arquivo']
        },
        {
          title: 'Mapa de Medicação',
          content: 'Imprima mapa organizado por paciente, horário ou medicamento para a equipe.',
          steps: ['Clique em "Imprimir Mapa"', 'Escolha organização', 'Imprima para distribuição']
        }
      ],
      permissions: 'Nutricionista, Enfermeiro, Técnico de Enfermagem, Admin'
    },
    {
      id: 'pacientes',
      icon: Users,
      title: 'Pacientes',
      color: 'bg-rose-500',
      description: 'Cadastro completo de residentes ou pets',
      sections: [
        {
          title: 'Cadastrar Paciente',
          content: 'Registre dados pessoais, responsável, histórico médico e documentos.',
          steps: [
            'Clique em "+ Novo Paciente"',
            'Preencha dados pessoais e contato',
            'Cadastre responsável (obrigatório)',
            'Adicione dados médicos e alergias',
            'Defina status (Ativo, Inativo, Alta)',
            'Salve o cadastro'
          ]
        },
        {
          title: 'Visualizar Prontuário',
          content: 'Acesse prontuário completo com prescrições, evoluções, agendamentos e documentos.',
          steps: ['Clique no paciente', 'Navegue pelas abas', 'Visualize histórico completo']
        },
        {
          title: 'Anexar Documentos',
          content: 'Anexe exames, laudos, receitas e contratos ao prontuário do paciente.',
          steps: ['Abra aba Documentos', 'Clique em "+ Anexar"', 'Selecione tipo e arquivo', 'Faça upload']
        }
      ],
      permissions: 'Admin/Atendente (cadastrar/editar) | Demais perfis (visualizar conforme permissões)'
    },
    {
      id: 'estoque',
      icon: Package,
      title: 'Estoque',
      color: 'bg-orange-500',
      description: 'Controle de medicamentos e materiais',
      sections: [
        {
          title: 'Cadastrar Produto',
          content: 'Registre medicamentos, alimentos, materiais e produtos com estoque mínimo.',
          steps: [
            'Clique em "+ Novo Produto"',
            'Preencha nome, categoria e código',
            'Defina unidade e estoque mínimo',
            'Adicione localização e validade',
            'Informe fornecedor e valor',
            'Salve o produto'
          ]
        },
        {
          title: 'Movimentar Estoque',
          content: 'Registre entradas e saídas com lote, validade e motivo.',
          steps: ['Clique no produto', 'Escolha Entrada ou Saída', 'Preencha dados da movimentação', 'Salve o registro']
        },
        {
          title: 'Gerenciar Alertas',
          content: 'Sistema alerta automaticamente sobre estoque baixo e produtos vencendo.',
          steps: ['Visualize alertas no topo', 'Clique para ver detalhes', 'Tome ações necessárias']
        }
      ],
      permissions: 'Admin/Auxiliar Administrativo (gerenciar) | Enfermeiro/Técnico de Enfermagem (movimentações)'
    },
    {
      id: 'evolucao',
      icon: TrendingUp,
      title: 'Evolução',
      color: 'bg-teal-500',
      description: 'Acompanhamento clínico e evolução',
      sections: [
        {
          title: 'Registrar Evolução',
          content: 'Documente sinais vitais, observações clínicas e condutas realizadas.',
          steps: [
            'Selecione o paciente',
            'Clique em "+ Nova Evolução"',
            'Registre sinais vitais',
            'Descreva observações clínicas',
            'Documente condutas realizadas',
            'Salve a evolução'
          ]
        },
        {
          title: 'Consultar Histórico',
          content: 'Visualize evolução do paciente ao longo do tempo com gráficos.',
          steps: ['Abra paciente', 'Visualize todas evoluções', 'Use filtros por período', 'Analise gráficos']
        },
        {
          title: 'Imprimir Evolução',
          content: 'Gere relatório em PDF de evolução específica ou período completo.',
          steps: ['Selecione evolução', 'Clique em "Imprimir"', 'Escolha formato', 'Salve ou imprima']
        }
      ],
      permissions: 'Enfermeiro/Técnico de Enfermagem (criar) | Todos (visualizar)'
    },
    {
      id: 'financeiro',
      icon: DollarSign,
      title: 'Financeiro',
      color: 'bg-emerald-500',
      description: 'Gestão de receitas e despesas',
      sections: [
        {
          title: 'Registrar Receitas',
          content: 'Lance mensalidades, serviços e produtos recebidos com forma de pagamento.',
          steps: [
            'Clique em "+ Nova Receita"',
            'Preencha descrição e valor',
            'Selecione categoria e paciente',
            'Defina data e forma de pagamento',
            'Anexe comprovante (opcional)',
            'Salve o lançamento'
          ]
        },
        {
          title: 'Registrar Despesas',
          content: 'Controle pagamentos a fornecedores, salários, aluguel e outras despesas.',
          steps: [
            'Clique em "+ Nova Despesa"',
            'Informe descrição e valor',
            'Selecione categoria e fornecedor',
            'Defina data e status de pagamento',
            'Salve o lançamento'
          ]
        },
        {
          title: 'Analisar Relatórios',
          content: 'Visualize fluxo de caixa, DRE e relatórios por categoria ou período.',
          steps: ['Clique em "Relatórios"', 'Escolha tipo de relatório', 'Analise gráficos e tabelas', 'Exporte se necessário']
        }
      ],
      permissions: 'Admin (total) | Auxiliar Administrativo (registrar)'
    },
    {
      id: 'usuarios',
      icon: User,
      title: 'Usuários',
      color: 'bg-violet-500',
      description: 'Gerenciamento de usuários e permissões',
      sections: [
        {
          title: 'Criar Usuário',
          content: 'Cadastre novos usuários com role, permissões e status definidos.',
          steps: [
            'Clique em "+ Novo Usuário"',
            'Preencha dados pessoais',
            'Defina e-mail e senha',
            'Escolha a função (admin, enfermeiro, fisioterapeuta, etc.)',
            'Selecione permissões de módulos',
            'Defina status e salve'
          ]
        },
        {
          title: 'Gerenciar Permissões',
          content: 'Controle acesso aos módulos do sistema por usuário ou role.',
          steps: ['Abra usuário', 'Vá para Permissões', 'Marque/desmarque módulos', 'Salve alterações']
        },
        {
          title: 'Resetar Senha',
          content: 'Redefina senha de usuários que esqueceram ou por segurança.',
          steps: ['Clique no usuário', 'Clique em "Resetar Senha"', 'Digite nova senha', 'Confirme operação']
        }
      ],
      permissions: 'Admin (própria empresa) | Superadmin (todos)'
    },
    {
      id: 'empresas',
      icon: Building2,
      title: 'Empresas',
      color: 'bg-cyan-500',
      description: 'Gerenciamento de empresas (Superadmin)',
      sections: [
        {
          title: 'Criar Empresa',
          content: 'Cadastre novas empresas com plano, módulos e administrador.',
          steps: [
            'Clique em "+ Nova Empresa"',
            'Preencha dados cadastrais',
            'Escolha tipo (Casa Repouso ou Petshop)',
            'Defina plano e módulos',
            'Crie administrador',
            'Salve a empresa'
          ]
        },
        {
          title: 'Gerenciar Planos',
          content: 'Faça upgrade/downgrade de planos e configure limites de usuários.',
          steps: ['Abra empresa', 'Vá para Plano', 'Altere configurações', 'Salve mudanças']
        },
        {
          title: 'Relatório Consolidado',
          content: 'Visualize métricas de todas as empresas cadastradas no sistema.',
          steps: ['Clique em "Relatório Geral"', 'Analise estatísticas', 'Exporte se necessário']
        }
      ],
      permissions: 'Apenas Superadmin'
    },
    {
      id: 'configuracoes',
      icon: Settings,
      title: 'Configurações',
      color: 'bg-slate-500',
      description: 'Personalização e preferências',
      sections: [
        {
          title: 'Editar Perfil',
          content: 'Atualize foto, nome, e-mail, telefone e outros dados pessoais.',
          steps: ['Acesse Configurações', 'Vá para Meu Perfil', 'Edite campos desejados', 'Salve alterações']
        },
        {
          title: 'Alterar Senha',
          content: 'Troque sua senha regularmente para manter segurança.',
          steps: ['Vá para Segurança', 'Digite senha atual', 'Digite nova senha duas vezes', 'Confirme alteração']
        },
        {
          title: 'Configurar Preferências',
          content: 'Personalize tema, idioma, fuso horário e notificações.',
          steps: ['Acesse Preferências', 'Ajuste configurações desejadas', 'Ative/desative notificações', 'Salve mudanças']
        }
      ],
      permissions: 'Todos (próprio perfil) | Admin (empresa)'
    }
  ];

  const filteredModules = modules.filter(module =>
    module.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    module.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tips = [
    { icon: AlertCircle, text: 'Use senhas fortes com mínimo 8 caracteres', color: 'text-red-600' },
    { icon: CheckCircle, text: 'Faça backup regular dos dados importantes', color: 'text-green-600' },
    { icon: AlertCircle, text: 'Mantenha informações atualizadas no sistema', color: 'text-blue-600' },
    { icon: CheckCircle, text: 'Configure notificações para não perder prazos', color: 'text-purple-600' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Manual do Sistema" 
        subtitle="Guia completo de como utilizar cada módulo"
      />

      {/* Search Bar */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Buscar por módulo ou funcionalidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Quick Tips */}
      <div className="bg-gradient-to-br from-primary-50 to-purple-50 p-6 rounded-xl border border-primary-100">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="text-primary-600" size={24} />
          <h3 className="text-lg font-semibold text-slate-900">Dicas Rápidas</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {tips.map((tip, index) => (
            <div key={index} className="flex items-start gap-3 bg-white p-4 rounded-lg">
              <tip.icon className={tip.color} size={20} />
              <p className="text-sm text-slate-700">{tip.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modules Grid */}
      {!selectedModule ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredModules.map((module) => {
            const Icon = module.icon;
            return (
              <button
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-200 text-left group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-14 h-14 ${module.color} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className="text-white" size={28} />
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:text-primary-600 transition-colors" size={24} />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{module.title}</h3>
                <p className="text-sm text-slate-600 mb-3">{module.description}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <User size={14} />
                  <span>{module.permissions}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Module Detail */
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className={`${selectedModule.color} p-6 text-white`}>
            <button
              onClick={() => setSelectedModule(null)}
              className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
            >
              <ChevronRight size={20} className="rotate-180" />
              <span>Voltar para módulos</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <selectedModule.icon size={32} />
              </div>
              <div>
                <h2 className="text-3xl font-bold mb-1">{selectedModule.title}</h2>
                <p className="text-white/90">{selectedModule.description}</p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Permissions */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 text-slate-700">
                <User size={18} />
                <span className="font-medium">Permissões necessárias:</span>
                <span className="text-slate-600">{selectedModule.permissions}</span>
              </div>
            </div>

            {/* Sections */}
            {selectedModule.sections.map((section, index) => (
              <div key={index} className="border-l-4 border-primary-500 pl-6 py-2">
                <h3 className="text-xl font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-8 h-8 bg-primary-100 text-primary-600 rounded-full text-sm font-bold">
                    {index + 1}
                  </span>
                  {section.title}
                </h3>
                <p className="text-slate-700 mb-4 leading-relaxed">{section.content}</p>
                
                {section.steps && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-600 mb-2">Passo a passo:</p>
                    {section.steps.map((step, stepIndex) => (
                      <div key={stepIndex} className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg">
                        <span className="flex items-center justify-center w-6 h-6 bg-primary-600 text-white rounded-full text-xs font-bold flex-shrink-0 mt-0.5">
                          {stepIndex + 1}
                        </span>
                        <p className="text-sm text-slate-700">{step}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-4 pt-4 border-t border-slate-200">
              <button 
                onClick={() => window.open('/docs/MANUAL_COMPLETO_SISTEMA.md', '_blank')}
                className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-colors"
              >
                <Download size={20} />
                <span>Baixar Manual Completo</span>
              </button>
              <button 
                onClick={() => window.open('mailto:suporte@prescrimed.com', '_blank')}
                className="flex items-center gap-2 px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition-colors"
              >
                <ExternalLink size={20} />
                <span>Contatar Suporte</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Support Section */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-8 rounded-xl">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-bold mb-4">Precisa de Ajuda?</h3>
          <p className="text-slate-300 mb-6">
            Nossa equipe de suporte está pronta para ajudar você com qualquer dúvida ou problema.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a
              href="mailto:suporte@prescrimed.com"
              className="flex items-center gap-2 px-6 py-3 bg-white text-slate-900 font-semibold rounded-xl hover:bg-slate-100 transition-colors"
            >
              📧 suporte@prescrimed.com
            </a>
            <a
              href="https://wa.me/5571999999999"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors"
            >
              📱 WhatsApp
            </a>
          </div>
          <p className="text-sm text-slate-400 mt-4">
            Horário de atendimento: Segunda a Sexta, 8h às 18h
          </p>
        </div>
      </div>
    </div>
  );
}
