/**
 * Roles operativos de FootyEdge.
 *
 * Esta lista se usa para decidir qué controles se pueden mostrar en cliente,
 * pero las rutas sensibles deben comprobarla de nuevo en servidor.
 */
const ADMIN_EMAILS = new Set([
  'admin@footyedge.com',
  'carlosmartens8@gmail.com',
])

export function isAdminEmail(email: string | null | undefined) {
  return typeof email === 'string' && ADMIN_EMAILS.has(email.toLowerCase())
}
