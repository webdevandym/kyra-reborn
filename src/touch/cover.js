export const COVER_PARAM = 'cover';

export function shouldRetryCover({ coarse, screen, inner, search }) {
  if (!coarse) return false;
  if (Math.min(screen.width, screen.height) >= 500) return false;
  if (new URLSearchParams(search).has(COVER_PARAM)) return false;
  const landscape = inner.width > inner.height;
  const full = landscape ? Math.max(screen.width, screen.height) : Math.min(screen.width, screen.height);
  return inner.width < full - 20;
}

export function retryUrl(base, search, hash) {
  const params = new URLSearchParams(search);
  params.set(COVER_PARAM, '1');
  return `${base}?${params}${hash}`;
}

export function withoutCoverParam(search) {
  const params = new URLSearchParams(search);
  params.delete(COVER_PARAM);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}
