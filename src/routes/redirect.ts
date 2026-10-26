// Lee el destino guardado por ProtectedRoute en location.state.from.
// Solo acepta rutas internas ("/..."), nunca URLs externas.
export function getRedirectTarget(state: unknown): string {
  if (
    typeof state === 'object' &&
    state !== null &&
    'from' in state &&
    typeof state.from === 'string' &&
    state.from.startsWith('/') &&
    !state.from.startsWith('//')
  ) {
    return state.from;
  }
  return '/';
}
