export default function HeroBackground() {
  const photoUrl = import.meta.env.VITE_BG_IMAGE_URL || 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80';

  // Construir URL do pattern de forma segura:
  // - Em dev `import.meta.env.BASE_URL` costuma ser '/' (não é um base absoluto),
  //   o que causa `new URL(..., base)` a lançar "Invalid base URL".
  // - Quando executado no navegador, usamos `window.location.origin` + BASE_URL
  //   para formar uma base absoluta. Em ambientes sem `window`, usamos caminho relativo.
  let patternUrl;
  try {
    if (typeof window !== 'undefined') {
      const base = import.meta.env.BASE_URL || '/';
      const origin = window.location.origin;
      patternUrl = new URL('pattern.svg', origin + base).href;
    } else {
      patternUrl = '/pattern.svg';
    }
  } catch (err) {
    // Fallback seguro para qualquer ambiente
    patternUrl = '/pattern.svg';
  }

  return (
    <>
      {/* Padrão leve para textura - usa BASE_URL para caminhos corretos em produção */}
      <div
        className="absolute inset-0 opacity-20 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: `url('${patternUrl}')` }}
        aria-hidden="true"
      />
      {/* Foto opcional (pode ser substituída via VITE_BG_IMAGE_URL) */}
      <div
        className="absolute inset-0 opacity-10 bg-cover bg-center mix-blend-overlay"
        style={{ backgroundImage: `url('${photoUrl}')` }}
        aria-hidden="true"
      />
      {/* Gradiente superior para profundidade */}
      <div className="absolute inset-0 bg-gradient-to-t from-primary-900/50 to-transparent" aria-hidden="true" />
    </>
  );
}
