import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import AdminLayout from '../components/AdminLayout';
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS,
  LEAD_TYPE_LABELS,
  storage,
  type Lead,
  type LeadAggregates,
  type LeadStatus,
  type LeadType,
  type Report,
} from '../lib/storage';
import {
  clampPage,
  DEFAULT_PAGE_SIZE,
  pageCount,
  PAGE_SIZES,
  rangeLabel,
  type LeadFilters,
} from '../lib/leadFilters';
import {
  buildAppealReplyEmail,
  buildDiagnosisEmail,
  buildRevisionDeliveryEmail,
} from '../lib/emailTemplates';
import { isRevisionLead } from '../lib/revisionLead';
import { analyzeSuspensionEmail } from '../modules/appeals/analyzer';
import { COUNTRIES, COUNTRY_LABELS, type CountryCode } from '../types/domain';

/** Panel de leads: filtros, búsqueda, estado, ingresos y notas. */
export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<LeadAggregates>({ total: 0, converted: 0, revenue: 0 });
  const [reports, setReports] = useState<Record<string, Report | undefined>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openLead, setOpenLead] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const [country, setCountry] = useState<CountryCode | ''>('');
  const [type, setType] = useState<LeadType | ''>('');
  const [status, setStatus] = useState<LeadStatus | ''>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [query, setQuery] = useState('');

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);
  /** Texto de búsqueda ya reposado: evita una consulta por tecla pulsada. */
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const filters: LeadFilters = useMemo(
    () => ({ type, status, country, from, to, search: debouncedQuery }),
    [type, status, country, from, to, debouncedQuery],
  );

  // Cambiar un filtro vuelve a la primera página: si no, te quedas mirando una
  // página 7 que ya no existe.
  useEffect(() => setPage(0), [filters]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      try {
        // Se piden SOLO las filas de esta página, más las cifras del conjunto
        // filtrado entero. Antes se traía la tabla completa al navegador.
        const [pageResult, aggregates] = await Promise.all([
          storage.queryLeads({ ...filters, limit: pageSize, offset: page * pageSize }),
          storage.aggregateLeads(filters),
        ]);
        if (cancelled) return;

        // Y los informes solo de los leads que se ven.
        const found = await storage.getReportsForLeads(pageResult.rows.map((l) => l.id));
        if (cancelled) return;

        setLeads(pageResult.rows);
        setTotal(pageResult.total);
        setStats(aggregates);
        setReports(found);
        setError(null);

        // Si el filtro dejó menos páginas de las que había, se recoloca.
        const corrected = clampPage(page, pageResult.total, pageSize);
        if (corrected !== page) setPage(corrected);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Error al cargar los leads.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filters, page, pageSize]);

  const pages = pageCount(total, pageSize);

  /** Copia al portapapeles el correo que toca según el tipo de lead. */
  function copyEmail(lead: Lead, reference?: string) {
    const mail =
      lead.type === 'appeal'
        ? buildAppealReplyEmail({
            name: lead.companyName,
            suspensionTypeLabel: lead.appeal?.suspensionTypeLabel ?? 'Sin clasificar',
            // Los próximos pasos se recalculan del relato: no se guardan porque
            // el analizador puede mejorar y el consejo debe ir con él.
            nextSteps: analyzeSuspensionEmail(lead.appeal?.story ?? '').nextSteps,
          })
        : buildDiagnosisEmail({ name: lead.companyName, reference: reference ?? '' });

    navigator.clipboard
      .writeText(`${mail.subject}\n\n${mail.body}`)
      .then(() => setCopied(lead.id))
      .catch(() => setError('El navegador ha bloqueado el portapapeles.'));
  }

  /**
   * Copia el correo de ENTREGA, que es también la factura: la revisión se cobra
   * al entregarla. Los dos huecos se rellenan a mano antes de enviarlo, porque
   * solo tú sabes qué has reescrito en ese plan.
   */
  function copyDelivery(lead: Lead) {
    const mail = buildRevisionDeliveryEmail({
      name: lead.companyName,
      changes: [],
      missingEvidence: [],
    });
    navigator.clipboard
      .writeText(`${mail.subject}\n\n${mail.body}`)
      .then(() => setCopied(`${lead.id}:entrega`))
      .catch(() => setError('El navegador ha bloqueado el portapapeles.'));
  }

  function replaceLead(updated: Lead | null) {
    if (!updated) return;
    setLeads((list) => list.map((l) => (l.id === updated.id ? updated : l)));
    // Las cifras de arriba son del filtro entero, no de la página: cambiar un
    // estado o un importe aquí las mueve, así que hay que recalcularlas.
    storage.aggregateLeads(filters).then(setStats).catch(() => {});
  }

  async function changeStatus(id: string, next: LeadStatus) {
    replaceLead(await storage.updateLead(id, { status: next }));
  }

  async function changeRevenue(id: string, value: string) {
    const parsed = value.trim() === '' ? null : Number(value);
    if (parsed !== null && Number.isNaN(parsed)) return;
    replaceLead(await storage.updateLead(id, { revenue: parsed }));
  }

  /**
   * Exporta todo a reports/export.json. Es lo que da de comer a
   * `npm run report:weekly` mientras estemos en modo MOCK: los datos viven en
   * el localStorage del navegador y Node no puede leerlos desde fuera.
   */
  async function exportData() {
    if (exporting) return;
    setExporting(true);
    try {
      // La exportación es lo único que sigue pidiendo TODO: es su cometido.
      // Se pide al pulsar, no al abrir la pantalla.
      const [allLeads, allReports, allProspects] = await Promise.all([
        storage.listLeads(),
        storage.listReports(),
        storage.listProspects(),
      ]);
      const payload = {
        exportedAt: new Date().toISOString(),
        leads: allLeads,
        reports: allReports,
        prospects: allProspects,
        rulesVerified: 0,
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'export.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se ha podido exportar.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <AdminLayout
      title="Leads"
      actions={
        <button
          type="button"
          className="btn-secondary"
          onClick={exportData}
          disabled={exporting}
          title="Descarga export.json con todo, para npm run report:weekly"
        >
          {exporting ? 'Exportando…' : 'Exportar datos'}
        </button>
      }
    >
      {error && (
        <p className="mb-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-alert">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <label className="text-sm lg:col-span-2">
          <span className="mb-1 block font-medium text-slate-600">Buscar por correo o empresa</span>
          <input className="field" value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Tipo</span>
          <select className="field" value={type} onChange={(e) => setType(e.target.value as LeadType | '')}>
            <option value="">Todos</option>
            {(Object.keys(LEAD_TYPE_LABELS) as LeadType[]).map((t) => (
              <option key={t} value={t}>
                {LEAD_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">Estado</span>
          <select
            className="field"
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
          >
            <option value="">Todos</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="mb-1 block font-medium text-slate-600">País</span>
          <select
            className="field"
            value={country}
            onChange={(e) => setCountry(e.target.value as CountryCode | '')}
          >
            <option value="">Todos</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {COUNTRY_LABELS[c]}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <label>
            <span className="mb-1 block font-medium text-slate-600">Desde</span>
            <input type="date" className="field" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label>
            <span className="mb-1 block font-medium text-slate-600">Hasta</span>
            <input type="date" className="field" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <Stat label="Leads del filtro" value={String(stats.total)} />
        <Stat label="Convertidos" value={String(stats.converted)} />
        <Stat
          label="Conversión del grupo"
          value={`${stats.total ? Math.round((stats.converted / stats.total) * 100) : 0} %`}
        />
        <Stat label="Ingresos registrados" value={`${stats.revenue.toLocaleString('es-ES')} $`} />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {loading ? 'Cargando…' : `Mostrando ${rangeLabel(page * pageSize, leads.length, total)}`}
        </p>
        <label className="flex items-center gap-2 text-sm text-slate-500">
          <span>Por página</span>
          <select
            className="rounded border border-slate-300 px-2 py-1"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-300 text-left text-slate-500">
              <th className="py-2 pr-3 font-semibold">Fecha</th>
              <th className="py-2 pr-3 font-semibold">Tipo</th>
              <th className="py-2 pr-3 font-semibold">Correo</th>
              <th className="py-2 pr-3 font-semibold">Detalle</th>
              <th className="py-2 pr-3 font-semibold">Var.</th>
              <th className="py-2 pr-3 font-semibold">Estado</th>
              <th className="py-2 pr-3 font-semibold">Ingreso $</th>
              <th className="py-2 font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => {
              const report = reports[lead.id];
              const isOpen = openLead === lead.id;
              return (
                <Fragment key={lead.id}>
                  <tr className="border-b border-slate-200 align-top">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {new Date(lead.createdAt).toLocaleDateString('es-ES')}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">{LEAD_TYPE_LABELS[lead.type]}</td>
                    <td className="py-2 pr-3">
                      {lead.email}
                      {lead.companyName && (
                        <span className="block text-xs text-slate-500">{lead.companyName}</span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      {lead.type === 'complyo' ? (
                        <>
                          {(lead.answers?.countries ?? []).map((c) => COUNTRY_LABELS[c]).join(', ')}
                          <span className="block text-xs text-slate-500">
                            {lead.answers?.establishedInEU ? 'Establecido en UE' : 'Fuera de la UE'} ·{' '}
                            {lead.answers?.volume}
                          </span>
                        </>
                      ) : (
                        <>
                          {lead.appeal?.suspensionTypeLabel ?? '—'}
                          <span className="block text-xs text-slate-500">
                            Gravedad {lead.appeal?.severity ?? '—'}/100 · alcance{' '}
                            {lead.appeal?.scope ?? '—'}
                          </span>
                        </>
                      )}
                    </td>
                    <td className="py-2 pr-3 font-semibold">{lead.variant ?? '—'}</td>
                    <td className="py-2 pr-3">
                      <select
                        className="rounded border border-slate-300 px-2 py-1 text-sm"
                        value={lead.status}
                        onChange={(e) => changeStatus(lead.id, e.target.value as LeadStatus)}
                        aria-label={`Estado de ${lead.email}`}
                      >
                        {LEAD_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {LEAD_STATUS_LABELS[s]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <input
                        className="w-24 rounded border border-slate-300 px-2 py-1 text-sm"
                        defaultValue={lead.revenue ?? ''}
                        onBlur={(e) => changeRevenue(lead.id, e.target.value)}
                        aria-label={`Ingreso de ${lead.email}`}
                      />
                    </td>
                    <td className="py-2 whitespace-nowrap">
                      {report && (
                        <Link className="text-brand-600 underline" to={`/informe/${report.id}`}>
                          Informe
                        </Link>
                      )}
                      {(lead.type === 'appeal' || report) && (
                        <button
                          type="button"
                          className="ml-3 text-brand-600 underline"
                          title="Copia el correo que toca para este lead, listo para pegar"
                          onClick={() => copyEmail(lead, report?.reference)}
                        >
                          {copied === lead.id ? 'Copiado' : 'Correo'}
                        </button>
                      )}
                      {isRevisionLead(lead.appeal?.story) && (
                        <button
                          type="button"
                          className="ml-3 text-brand-600 underline"
                          title="Copia el correo de entrega con el cobro de la revisión"
                          onClick={() => copyDelivery(lead)}
                        >
                          {copied === `${lead.id}:entrega` ? 'Copiado' : 'Entrega y cobro'}
                        </button>
                      )}
                      <button
                        type="button"
                        className="ml-3 text-brand-600 underline"
                        onClick={() => setOpenLead(isOpen ? null : lead.id)}
                      >
                        Notas ({lead.notes.length})
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <td colSpan={8} className="p-4">
                        <LeadNotes lead={lead} onChange={replaceLead} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && leads.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-slate-500">
                  No hay leads con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <nav className="mt-5 flex flex-wrap items-center justify-between gap-3" aria-label="Paginación">
        <button
          type="button"
          className="btn-secondary"
          disabled={page === 0 || loading}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Anterior
        </button>

        <p className="text-sm text-slate-500">
          Página {pages === 0 ? 1 : page + 1} de {pages}
        </p>

        <button
          type="button"
          className="btn-secondary"
          disabled={page + 1 >= pages || loading}
          onClick={() => setPage((p) => p + 1)}
        >
          Siguiente
        </button>
      </nav>
    </AdminLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  );
}

function LeadNotes({ lead, onChange }: { lead: Lead; onChange: (lead: Lead | null) => void }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!text.trim() || saving) return;
    setSaving(true);
    onChange(await storage.addLeadNote(lead.id, text.trim()));
    setText('');
    setSaving(false);
  }

  return (
    <div className="space-y-3">
      {lead.type === 'appeal' && lead.appeal?.story && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Lo que contó el vendedor
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{lead.appeal.story}</p>
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          className="field"
          placeholder="Nueva nota…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
        />
        <button type="button" className="btn-secondary" onClick={add} disabled={saving}>
          Añadir
        </button>
      </div>

      {lead.notes.length === 0 ? (
        <p className="text-sm text-slate-500">Sin notas todavía.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {lead.notes.map((note) => (
            <li key={note.id}>
              <span className="font-mono text-xs text-slate-500">
                {note.createdAt.slice(0, 10)}
              </span>{' '}
              {note.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
