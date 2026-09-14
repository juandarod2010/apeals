import { useEffect, useState, type ReactNode } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { BRAND } from '../config/brand';
import {
  authMode,
  currentSession,
  onSessionChange,
  signIn,
  type AdminSession,
} from '../lib/adminAuth';
import { SessionContext } from './adminSession';

/**
 * Portero de las pantallas internas.
 * Pide correo y contraseña si hay Supabase; solo contraseña si no.
 * Ver src/lib/adminAuth.ts para la diferencia entre los dos modos.
 */
export default function AdminGate({
  children,
}: {
  children: (session: AdminSession) => ReactNode;
}) {
  const mode = authMode();
  const [session, setSession] = useState<AdminSession | null>(null);
  const [checking, setChecking] = useState(true);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    currentSession()
      .then(setSession)
      .finally(() => setChecking(false));
    // Si la sesión expira o se cierra en otra pestaña, el panel se cierra aquí.
    return onSessionChange(setSession);
  }, []);

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Comprobando sesión…
      </div>
    );
  }

  if (session)
    return <SessionContext.Provider value={session}>{children(session)}</SessionContext.Provider>;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn({ email: email.trim(), password });
    if (result.session) {
      setSession(result.session);
    } else {
      setError(result.error);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <form className="w-full max-w-sm space-y-4" onSubmit={handleSubmit}>
        <h1 className="text-xl font-bold">{BRAND.name} · panel interno</h1>

        {mode === 'supabase' ? (
          <>
            <input
              className="field"
              type="email"
              autoComplete="username"
              placeholder="Tu correo"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
            />
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
            <p className="text-xs text-slate-500">
              Sesión de Supabase. Es la que hace que puedas leer los leads: sin ella, Row Level
              Security solo deja insertar.
            </p>
          </>
        ) : (
          <>
            <input
              className="field"
              type="password"
              autoComplete="current-password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
            />
            <p className="text-xs text-slate-500">
              Modo local: los datos están en este navegador. Esta contraseña es un portero, no
              seguridad.
            </p>
          </>
        )}

        {error && <p className="text-sm font-medium text-alert">{error}</p>}

        <button type="submit" className="btn-primary w-full" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        <Link to="/" className="block text-center text-sm text-slate-500 underline">
          Volver al inicio
        </Link>
      </form>
    </div>
  );
}


/**
 * Portero a nivel de ruta: las pantallas internas se MONTAN solo cuando ya hay
 * sesión.
 *
 * EL FALLO QUE ARREGLA. Antes cada página envolvía al portero, o sea que la
 * página era el padre y su carga de datos se disparaba al montarse, con el
 * portero todavía comprobando la sesión. Esa consulta salía como `anon`, y ahí
 * está lo venenoso: RLS no deniega un SELECT con un error, responde 200 con
 * cero filas. El panel pintaba «no hay leads» teniendo leads, sin un solo
 * mensaje en la consola. Y al iniciar sesión nada volvía a pedir los datos,
 * porque las dependencias del efecto no habían cambiado.
 *
 * Montando las páginas por debajo del portero, no existen hasta que hay sesión
 * y su primera consulta ya va autenticada.
 */
export function AdminRoutes() {
  return <AdminGate>{() => <Outlet />}</AdminGate>;
}
