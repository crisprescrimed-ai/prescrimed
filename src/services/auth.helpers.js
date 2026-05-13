export const isNetworkLikeSupabaseError = (error) => {
  if (!error) return false;

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  return message.includes('failed to fetch')
    || message.includes('networkerror')
    || message.includes('network error')
    || message.includes('load failed');
};

export const loginWithSupabaseFallback = async ({ signInWithPassword, loginWithBackend, email, senha }) => {
  try {
    const response = await signInWithPassword({
      email,
      password: senha,
    });

    if (!response?.error) {
      return { provider: 'supabase' };
    }

    try {
      return await loginWithBackend(email, senha);
    } catch (backendError) {
      const supabaseError = response.error;
      const status = supabaseError.status === 400 ? 401 : (supabaseError.status || 401);
      if (backendError?.response?.status === 401) {
        throw Object.assign(new Error(supabaseError.message), {
          response: { status, data: { error: supabaseError.message } },
        });
      }

      throw backendError;
    }
  } catch (supabaseError) {
    if (isNetworkLikeSupabaseError(supabaseError)) {
      return loginWithBackend(email, senha);
    }

    throw supabaseError;
  }
};