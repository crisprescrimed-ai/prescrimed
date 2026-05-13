import { useEffect, useState } from 'react';
import { AlertCircle, WifiOff } from 'lucide-react';
import { getApiRootUrl } from '../services/api';
import { getSupabaseConfigStatus } from '../lib/supabase';

export default function BackendStatusMonitor() {
  const [status, setStatus] = useState('online'); // online | degraded | offline
  const [showAlert, setShowAlert] = useState(false);
  const [lastCheck, setLastCheck] = useState(null);
  const [dbStatus, setDbStatus] = useState(null);
  const [supabaseStatus] = useState(() => getSupabaseConfigStatus());

  useEffect(() => {
    const evaluateHealthResponse = async (response) => {
      // offline: erro de rede ou CORS (tratado no catch)
      // degraded: backend respondeu, mas DB não conectou ainda ou retornou 503
      // online: backend respondeu e DB conectado

      let data = null;
      try {
        data = await response.clone().json();
      } catch (_) {
        data = null;
      }

      // Se /health não retorna JSON, pode ter caído no frontend estático (HTML) ou ser texto simples.
      // HTML => offline; texto simples => considerar online.
      if (response.ok && !data) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.includes('text/html')) {
          setStatus('offline');
          setDbStatus(null);
          setShowAlert(true);
          return;
        }

        setStatus('online');
        setDbStatus('connected');
        setShowAlert(false);
        return;
      }

      // Alguns ambientes retornam 503 quando o banco não está pronto
      if (response.status === 503) {
        setStatus('degraded');
        setDbStatus('connecting');
        setShowAlert(true);
        return;
      }

      if (!response.ok) {
        setStatus('offline');
        setDbStatus(null);
        setShowAlert(true);
        return;
      }

      const reportedDb = data?.database;
      if (reportedDb && reportedDb !== 'connected') {
        setStatus('degraded');
        setDbStatus(reportedDb);
        setShowAlert(true);
        return;
      }

      setStatus('online');
      setDbStatus(reportedDb || 'connected');
      setShowAlert(false);
    };

    const checkBackendStatus = async () => {
      try {
        const healthUrlRoot = getApiRootUrl();

        const tryFetchHealth = async (url, options = {}) => {
          try {
            const response = await fetch(url, {
              method: 'GET',
              signal: AbortSignal.timeout(5000),
              ...options
            });

            // 404 normalmente indica endpoint incorreto neste ambiente; tente o próximo.
            if (response.status === 404) return null;
            return response;
          } catch (_) {
            return null;
          }
        };

        // Comparar ORIGIN (host + porta) para decidir mesma origem
        let isSameOrigin = false;
        try {
          if (!healthUrlRoot) {
            isSameOrigin = true; // sem root explícito, tenta mesma origem (caso backend sirva o frontend)
          } else {
            const backendOrigin = new URL(healthUrlRoot).origin;
            isSameOrigin = backendOrigin === window.location.origin;
          }
        } catch (_) {
          isSameOrigin = false;
        }

        if (isSameOrigin) {
          // Frontend e backend na MESMA origem (mesmo host+porta)
          const candidates = ['/api/health', '/health'];

          let response = null;
          for (const url of candidates) {
            response = await tryFetchHealth(url);
            if (response) break;
          }

          if (!response) {
            setStatus('offline');
            setDbStatus(null);
            setShowAlert(true);
            setLastCheck(new Date());
            return;
          }

          await evaluateHealthResponse(response);
          setLastCheck(new Date());
          return;
        }

        // Se não há raiz configurada e não é mesma origem, assumir localhost:3000 em desenvolvimento
        if (!healthUrlRoot) {
          if (import.meta.env.DEV) {
            const guessedRoot = 'http://localhost:3000';
            const candidates = ['/api/health', `${guessedRoot}/health`, '/health'];

            let response = null;
            for (const url of candidates) {
              response = await tryFetchHealth(url, /^https?:\/\//i.test(url) ? { mode: 'cors' } : {});
              if (response) break;
            }

            if (!response) {
              setStatus('offline');
              setDbStatus(null);
              setShowAlert(true);
              setLastCheck(new Date());
              return;
            }

            await evaluateHealthResponse(response);
            setLastCheck(new Date());
            return;
          }

          // Em produção sem backend root explícito, use a mesma origem
          if (import.meta.env.PROD) {
            const candidates = ['/api/health', '/health'];

            let response = null;
            for (const url of candidates) {
              response = await tryFetchHealth(url);
              if (response) break;
            }

            if (!response) {
              setStatus('offline');
              setDbStatus(null);
              setShowAlert(true);
              setLastCheck(new Date());
              return;
            }

            await evaluateHealthResponse(response);
            setLastCheck(new Date());
            return;
          }

          console.warn('⚠️ BackendStatusMonitor: VITE_BACKEND_ROOT não configurado, desabilitando healthcheck');
          setStatus('online');
          setDbStatus(null);
          setShowAlert(false);
          setLastCheck(new Date());
          return;
        }

        // Evitar tentar localhost em produção hospedada
        if (healthUrlRoot.includes('localhost') && 
          import.meta.env.PROD) {
          console.error('❌ BackendStatusMonitor: tentando acessar localhost em produção! Configure VITE_BACKEND_ROOT/VITE_API_URL ou use mesma origem.');
          setStatus('offline');
          setDbStatus(null);
          setShowAlert(true);
          setLastCheck(new Date());
          return;
        }

        const normalizedRoot = healthUrlRoot.replace(/\/+$/, '');
        const candidates = [`${normalizedRoot}/api/health`, `${normalizedRoot}/health`];

        let response = null;
        for (const url of candidates) {
          response = await tryFetchHealth(url, { mode: 'cors' });
          if (response) break;
        }

        if (!response) {
          setStatus('offline');
          setDbStatus(null);
          setShowAlert(true);
          setLastCheck(new Date());
          return;
        }

        await evaluateHealthResponse(response);
      } catch (error) {
        console.error('BackendStatusMonitor error:', error.message);
        setStatus('offline');
        setDbStatus(null);
        setShowAlert(true);
      }
      setLastCheck(new Date());
    };

    // Checa imediatamente
    checkBackendStatus();

    // Checa a cada 30 segundos (reduzido de 10s para economizar requisições)
    const interval = setInterval(checkBackendStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!showAlert) return null;

  const isOffline = status === 'offline';
  const isDegraded = status === 'degraded';

  const title = isOffline ? 'Backend Offline' : 'Backend Online (Banco Inicializando)';
  const description = isOffline
    ? 'Não foi possível conectar ao servidor. Verifique se o backend está rodando.'
    : 'O servidor respondeu, mas o banco de dados ainda não está conectado. Aguarde alguns instantes e tente novamente.';

  const testUrl = (() => {
    const root = getApiRootUrl();
    if (!root) return '/api/health';
    return root.replace(/\/+$/, '') + '/api/health';
  })();
  const supabaseStatusLabel = supabaseStatus === 'ready'
    ? 'Cliente Supabase configurado'
    : supabaseStatus === 'partial'
      ? 'Cliente Supabase incompleto'
      : 'Cliente Supabase não configurado';

  const barClass = isOffline ? 'bg-red-600' : 'bg-amber-500';
  const barSubClass = isOffline ? 'bg-red-700' : 'bg-amber-600';

  return (
    <div className="fixed top-4 left-4 right-4 lg:left-auto lg:right-4 z-50 animate-slide-down pointer-events-auto">
      <div className={`${barClass} text-white px-4 py-3 shadow-lg rounded-md`}>
        <div className="max-w-full lg:max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isOffline ? (
              <WifiOff className="w-5 h-5 animate-pulse" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <div>
              <p className="font-semibold">{title}</p>
              <p className="text-sm opacity-90">
                {description}
              </p>
              {isDegraded && dbStatus ? (
                <p className="text-xs opacity-90 mt-1">
                  Status do banco: <span className="font-semibold">{dbStatus}</span>
                </p>
              ) : null}
              <p className="text-xs opacity-90 mt-1">
                {supabaseStatusLabel}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {testUrl ? (
              <a
                href={testUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm underline hover:no-underline"
              >
                Testar Conexão
              </a>
            ) : null}
            <button
              onClick={() => setShowAlert(false)}
              className="text-white hover:bg-black/15 rounded p-1 transition-colors"
              aria-label="Fechar alerta"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
      
      <div className={`${barSubClass} px-4 py-2 rounded-b-md`}>
        <div className="max-w-full lg:max-w-md mx-auto">
          <p className="text-sm text-white/90">
            <strong>Como resolver:</strong>{' '}
            {isOffline ? (
              <>Verifique se a API está rodando no mesmo domínio ou se as variáveis <code className="bg-black/20 px-2 py-1 rounded text-xs">VITE_BACKEND_ROOT</code> e <code className="bg-black/20 px-2 py-1 rounded text-xs">VITE_API_URL</code> apontam para o backend correto.</>
            ) : (
              <>Confirme se o PostgreSQL está acessível e se <code className="bg-black/20 px-2 py-1 rounded text-xs">DATABASE_URL</code> ou <code className="bg-black/20 px-2 py-1 rounded text-xs">PGHOST</code> estão configuradas. Enquanto isso, o sistema pode ficar parcialmente indisponível.</>
            )}
            {' '}
            {supabaseStatus !== 'ready' ? (
              <>Para usar o SDK no frontend, preencha <code className="bg-black/20 px-2 py-1 rounded text-xs">VITE_SUPABASE_URL</code> e <code className="bg-black/20 px-2 py-1 rounded text-xs">VITE_SUPABASE_ANON_KEY</code>.</>
            ) : null}
          </p>
        </div>
      </div>
    </div>
  );
}
