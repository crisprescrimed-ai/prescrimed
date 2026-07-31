export default function HeroBackground() {
  // Para manter consistência visual entre ambientes e evitar diferenças
  // causadas por imagens externas, usamos overlays CSS sutis em vez de
  // carregar fotos/patterns por padrão. Se quiser uma imagem custom, defina
  // `VITE_BG_IMAGE_URL` no ambiente e altere a renderização aqui.

  const useExternal = Boolean(import.meta.env.VITE_BG_IMAGE_URL);

  return (
    <>
      {/* Subtle radial/linear overlays to add depth without external assets */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 10% 10%, rgba(255,255,255,0.03), transparent 20%), radial-gradient(ellipse at 90% 90%, rgba(0,0,0,0.04), transparent 30%)',
          mixBlendMode: 'overlay',
          opacity: 0.9,
        }}
        aria-hidden="true"
      />

      {/* Gentle top gradient for depth */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.06), transparent 35%)' }}
        aria-hidden="true"
      />

      {/* If explicitly requested via env var, fall back to external photo */}
      {useExternal && (
        <div
          className="absolute inset-0 opacity-8 bg-cover bg-center"
          style={{ backgroundImage: `url('${import.meta.env.VITE_BG_IMAGE_URL}')` }}
          aria-hidden="true"
        />
      )}
    </>
  );
}
