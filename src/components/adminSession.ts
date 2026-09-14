import { createContext, useContext } from 'react';
import type { AdminSession } from '../lib/adminAuth';

/**
 * La sesión del operador, publicada por AdminGate.
 *
 * Vive en su propio fichero para que AdminGate.tsx solo exporte componentes:
 * mezclar un hook con ellos rompe el recargado en caliente de Vite.
 */
export const SessionContext = createContext<AdminSession | null>(null);

export function useAdminSession(): AdminSession {
  const session = useContext(SessionContext);
  if (!session) throw new Error('useAdminSession se ha usado fuera de AdminGate.');
  return session;
}
