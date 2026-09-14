import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import { ENTRY_OFFER } from '../config/brand';
import {
  goalProgress,
  observeFunnel,
  requiredProspects,
  revenueLast7Days,
  WEEKLY_GOAL_USD,
  type FunnelObservation,
  type FunnelTarget,
} from '../lib/funnel';
import { storage } from '../lib/storage';

/**
 * Metas: cuántos prospectos hay que tocar esta semana para llegar a 100 $.
 *
 * Es la pantalla que convierte el objetivo en una cantidad diaria de trabajo.
 * Mientras no haya muestra suficiente usa las tasas de arranque y lo dice en
 * claro: el número de prospectos no se presenta nunca como si estuviera medido
 * cuando no lo está.
 */
export default function AdminMetasPage() {
  const [observation, setObservation] = useState<FunnelObservation | null>(null);
  const [target, setTarget] = useState<FunnelTarget | null>(null);
  const [weekRevenue, setWeekRevenue] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([storage.listProspects(), storage.listLeads()])
      .then(([prospects, leads]) => {
        const obs = observeFunnel(prospects, leads);
        setObservation(obs);
        setTarget(requiredProspects(obs, ENTRY_OFFER.price.amount));
        setWeekRevenue(revenueLast7Days(leads));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Error al cargar los datos.'));
  }, []);

  const progress = goalProgress(weekRevenue, WEEKLY_GOAL_USD);

  return (
    <AdminLayout title="Metas">
      <p className="max-w-3xl text-sm text-slate-600">
        El objetivo son {WEEKLY_GOAL_USD} $ por semana. Con la oferta de entrada a{' '}
        {ENTRY_OFFER.price.label}, esto es lo que hace falta hacer para llegar.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-alert">
          {error}
        </p>
      )}

      {!observation || !target ? (
        <p className="mt-6 text-sm text-slate-500">Cargando…</p>
      ) : (
        <>
          <section className="mt-6 rounded-lg border border-slate-300 bg-white p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Esta semana
            </h2>
            <p className="mt-2 text-3xl font-bold">
              {progress.revenue} $ <span className="text-base font-normal text-slate-500">de {progress.goal} $</span>
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full bg-brand-600"
                style={{ width: `${Math.round(progress.ratio * 100)}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-slate-600">
              {progress.reached
                ? 'Objetivo cubierto. Lo que entre de más, adelante de la semana que viene.'
                : `Faltan ${progress.missing} $.`}
            </p>
          </section>

          <section className="mt-6">
            <h2 className="text-lg font-semibold">Trabajo necesario</h2>
            <p className="mt-1 text-sm text-slate-600">{target.rationale}</p>
            <dl className="mt-4 grid gap-4 sm:grid-cols-4">
              <Metric label="Clientes / semana" value={target.plan.clientsPerWeek} />
              <Metric label="Respuestas / semana" value={target.plan.responsesPerWeek} />
              <Metric label="Prospectos / semana" value={target.plan.prospectsPerWeek} />
              <Metric
                label="Prospectos / día"
                value={target.plan.prospectsPerWorkday}
                hint="Contando 5 días"
              />
            </dl>
            <p className="mt-3 text-xs text-slate-500">
              Tasas usadas: {Math.round(target.plan.responseRate * 100)} % de respuesta y{' '}
              {Math.round(target.plan.closeRate * 100)} % de cierre ({target.source}).
            </p>
          </section>

          <section className="mt-8">
            <h2 className="text-lg font-semibold">Embudo real</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-5">
              <Metric label="Prospectos" value={observation.prospectsContacted} />
              <Metric label="Respuestas" value={observation.responses} />
              <Metric label="Leads" value={observation.leads} />
              <Metric label="Clientes" value={observation.clients} />
              <Metric label="Ingresos" value={`${observation.revenue} $`} />
            </dl>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <Metric label="Tasa de respuesta" value={percent(observation.responseRate)} />
              <Metric label="Tasa de cierre" value={percent(observation.closeRate)} />
              <Metric
                label="Ingreso medio"
                value={observation.averageTicket === null ? '—' : `${Math.round(observation.averageTicket)} $`}
              />
            </dl>
            {!observation.ratesAreReliable && (
              <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-slate-700">
                Faltan {observation.sampleMissing} prospectos para que estas tasas signifiquen algo.
                Hasta entonces son un recuento, no una medida: no cambies el mensaje ni el canal
                basándote en ellas.
              </p>
            )}
          </section>
        </>
      )}
    </AdminLayout>
  );
}

function percent(rate: number | null): string {
  return rate === null ? '—' : `${Math.round(rate * 100)} %`;
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-300 bg-white p-4">
      <dt className="text-xs uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-2xl font-bold">{value}</dd>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}
