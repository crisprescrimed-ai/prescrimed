/**
 * Componente Layout
 * 
 * Layout principal da aplicação que envolve todas as páginas protegidas.
 * Responsável por organizar a estrutura da interface com sidebar, header e conteúdo principal.
 * Implementa design responsivo que adapta a sidebar para mobile (hambúrguer) e desktop (fixa).
 */

// Importa hook useState do React para gerenciar estado local
import { useState } from 'react';

// Importa Outlet do React Router - renderiza componentes filhos das rotas
import { Outlet } from 'react-router-dom';

// Importa componentes de layout
import Sidebar from './Sidebar'; // Menu lateral de navegação
import Header from './Header'; // Cabeçalho com informações do usuário

/**
 * Componente Layout
 * Estrutura principal que organiza sidebar, header e conteúdo das páginas
 */
export default function Layout() {
  // Estado para controlar se a sidebar está aberta (usado em mobile)
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  return (
    // Container principal - altura mínima da tela, fundo cinza claro, layout flex
    <div className="min-h-screen bg-slate-100 flex">
      
      {/* Sidebar - Menu lateral de navegação */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 w-72 
          transform transition-transform duration-300 
          lg:static lg:translate-x-0 
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        // Classes Tailwind explicadas:
        // - fixed inset-y-0 left-0: fixo no lado esquerdo da tela
        // - z-40: índice z alto para ficar sobre o conteúdo
        // - w-72: largura fixa de 18rem (288px)
        // - transform transition-transform duration-300: animação suave ao abrir/fechar
        // - lg:static lg:translate-x-0: em telas grandes (>=1024px) fica estático e sempre visível
        // - translate-x-0/-translate-x-full: mostra/esconde em mobile baseado no estado
      >
        {/* Componente Sidebar com callback para fechar */}
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      
      {/* Overlay - Fundo escuro semi-transparente quando sidebar está aberta em mobile */}
      {isSidebarOpen && (
        <div
          // Classes: cobertura total, fundo preto 40% opaco com blur, z-30 (abaixo da sidebar)
          // lg:hidden: esconde em telas grandes onde sidebar é sempre visível
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
          // Fecha a sidebar ao clicar no overlay
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Área de conteúdo principal */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* flex-1: ocupa espaço restante após sidebar */}
        {/* flex flex-col: layout vertical (header + conteúdo) */}
        {/* min-h-screen: altura mínima da tela */}
        
        {/* Header - Cabeçalho com botão de menu e informações do usuário */}
        <Header 
          // Callback para alternar estado da sidebar (abre/fecha)
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)} 
        />
        
        {/* Conteúdo principal - área onde as páginas são renderizadas */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          {/* flex-1: ocupa espaço restante após header */}
          {/* overflow-y-auto: permite rolagem vertical */}
          {/* p-4 lg:p-8: padding 1rem em mobile, 2rem em desktop */}
          
          {/* Container centralizado com largura máxima e espaçamento entre elementos */}
          <div className="container-responsive space-y-6">
            {/* max-w-6xl: largura máxima de 72rem (1152px) */}
            {/* mx-auto: centraliza horizontalmente */}
            {/* space-y-6: espaçamento vertical de 1.5rem entre filhos */}
            
            {/* Outlet renderiza o componente da rota ativa */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}