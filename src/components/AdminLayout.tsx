import { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAdminSession } from './adminSession';
import { BRAND } from '../config/brand';
import { signOut, type AdminSession } from '../lib/adminAuth';
import { storage } from '../lib/storage';

const LINKS = [
  { to: '/admin/leads', label: 'Leads' },
  { to: '/admin/metas', label: 'Metas' },
  { to: '/admin/mensajes', label: 'Mensajes' },
  { to: '/admin/poa', label: 'Plan of Action' },
  { to: '/prospeccion', label: 'Prospección' },
  { to: '/admin/ab', label: 'A/B' },
  { to: '/admin/rules-status', label: 'Estado de reglas' },
  { to: '/admin/fill-rules', label: 'Rellenar reglas' },
  { to: '/admin/rules-history', label: 'Historial' },
];

/** Marco común de las pantallas internas: portero + navegación. */
export default function AdminLayout({
  title,
  actions,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  // El portero va en las rutas (AdminRoutes), no aquí: si envolviera a la
  // pagina desde dentro, la pagina seria su padre y pediria los datos sin
  // sesion. Ver AdminGate.tsx.
  const session = useAdminSession();
  return (
    <Shell session={session} title={title} actions={actions}>
      {children}
    </Shell>
  );
}

/**
 * Cuántos leads están sin tocar. Es lo más cerca de un aviso que se puede
 * tener sin backend: mientras el disparador de Supabase no esté configurado
 * (ver supabase/migrations/0003_avisos.sql), esto es lo que te dice que hay
 * trabajo esperando.
 */
function useNewLeadCount(): number | null {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    // Cuenta en el servidor: no se trae la tabla para contar.
    storage
      .countNewLeads()
      .then(setCount)
      .catch(() => setCount(null));
  }, []);
  return count;
}

function Shell({
  session,
  title,
  actions,
  children,
}: {
  session: AdminSession;
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const newLeads = useNewLeadCount();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-slate-50 px-5 py-3">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2">
          <span className="text-sm font-bold">{BRAND.name}</span>

          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-brand-700 underline' : 'text-slate-600 hover:text-ink'
                }
              >
                {link.label}
                {link.to === '/admin/leads' && newLeads ? (
                  <span className="ml-1.5 rounded-full bg-brand-600 px-1.5 py-0.5 text-xs font-bold text-white">
                    {newLeads}
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>

          <span className="ml-auto flex items-center gap-3 text-xs text-slate-500">
            <span className="rounded bg-white px-2 py-1">almacenamiento: {storage.mode}</span>
            <span className="hidden sm:inline">{session.email}</span>
            <button
              type="button"
              className="underline hover:text-ink"
              onClick={async () => {
                await signOut();
                window.location.reload();
              }}
            >
              Salir
            </button>
          </span>
        </div>
      </header>

      <main className="px-5 py-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-bold">{title}</h1>
            {actions}
          </div>
          <div className="mt-6">{children}</div>
        </div>
      </main>
    </div>
  );
}
