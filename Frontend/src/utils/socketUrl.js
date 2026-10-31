/**
 * Base URL for the Socket.IO server.
 *
 * VITE_API_BASE_URL may be absolute ("https://api.example.com/api") or relative ("/api") when a reverse
 * proxy serves the API on the same origin. Stripping "/api" from a relative value leaves an empty string,
 * which used to fall through to localhost:5000 in production, so sockets never connected.
 */
export const getSocketUrl = () => {
  const explicit = import.meta.env.VITE_SOCKET_URL;
  if (explicit) return explicit;

  const fromApi = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/, '');
  if (fromApi) return fromApi;

  // Relative API base: dev server doesn't proxy /socket.io, production serves it from the same origin
  return import.meta.env.DEV ? 'http://localhost:5000' : window.location.origin;
};
