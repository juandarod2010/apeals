import { useState } from 'react';
import { Link } from 'react-router-dom';
import DeployWarning from '../components/DeployWarning';
import Footer from '../components/Footer';
import { APPEALS, APPEALS_BRAND, ENTRY_DISCLAIMER, ENTRY_OFFER } from '../config/brand';
import { analyzeSuspensionEmail, severityLabel } from '../modules/appeals/analyzer';
import { storage } from '../lib/storage';

/**
 * Landing pública de apelaciones (Track A).
 *
 * El visitante pega lo que le ha pasado; el analizador clasifica el caso al
 * vuelo y el lead se guarda con `type: 'appeal'`.
 *
 * NO se publica ninguna tasa de éxito mientras `APPEALS.successRate` sea null.
 * Ver DECISIONS.md: prometer "90 % de éxito" sin casos cerrados es exactamente
 * la cifra que no se puede demostrar, y aquí se la estarías enseñando a alguien
 * que está perdiendo dinero cada día.
 */
export default function AppealsPage() {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [story, setStory] = useState('');
  const [days, setDays] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  const canSend = emailOk && story.trim().length >= 20 && !sending;

  const preview = story.trim().length >= 20 ? analyzeSuspensionEmail(story) : null;

  async function handleSubmit() {
    if (!canSend) return;
    setSending(true);
    setError(null);
    try {
      const analysis = analyzeSuspensionEmail(story);
      await storage.createAppealLead({
        email: email.trim().toLowerCase(),
        companyName: companyName.trim() || null,
        appeal: {
          story: story.trim(),
          suspensionType: analysis.type,
          suspensionTypeLabel: analysis.typeLabel,
          severity: analysis.severity,
          scope: analysis.scope,
          daysSuspended: days.trim() ? Number(days) : null,
        },
      });
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? `No se ha podido enviar: ${e.message}` : 'No se ha podido enviar.');
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DeployWarning />
      <header className="border-b border-slate-200 px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight">
            {APPEALS_BRAND}
          </Link>
          <span className="text-xs text-slate-500">Apelaciones Amazon</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-10">
        <div className="mx-auto max-w-2xl">
          {sent ? (
            <div className="card border-green-300 bg-green-50">
              <h1 className="text-xl font-bold">Recibido.</h1>
              <p className="mt-3 text-sm text-slate-700">
                Te escribo a <strong>{email.trim().toLowerCase()}</strong> con la lectura de tu caso
                y qué haría yo primero. Mientras tanto, no envíes otro Plan of Action: cada intento
                rechazado deja rastro en el expediente.
              </p>
              <p className="mt-3 text-sm text-slate-700">
                Ten a mano el correo original de Amazon completo, con fecha y cabeceras.
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-3xl font-bold leading-tight tracking-tight">
                Te han suspendido la cuenta y el siguiente Plan of Action que envíes cuenta más de
                lo que crees.
              </h1>

              <div className="mt-6 space-y-4 text-base leading-relaxed text-slate-700">
                <p>
                  Casi todos los planes rechazados fallan por lo mismo: cuentan lo que pasó en vez de
                  demostrar qué lo causó y qué has cambiado para que no se repita.
                </p>
                <p>
                  Analizo tu caso, identifico la causa raíz que va a buscar el revisor y te entrego
                  el Plan of Action redactado y listo para enviar. {APPEALS.analysisPrice.label}.
                </p>
                <p className="text-sm text-slate-600">
                  {APPEALS.successRate ? (
                    <>
                      Casos reactivados: {Math.round(APPEALS.successRate.rate * 100)} % sobre{' '}
                      {APPEALS.successRate.sampleSize} casos desde {APPEALS.successRate.since}.
                    </>
                  ) : (
                    <>
                      No publico tasa de éxito porque todavía no tengo casos cerrados suficientes
                      para respaldarla. Cuando los tenga, aparecerá aquí con el tamaño de la
                      muestra. Nadie puede garantizarte una reactivación, y quien te la garantice
                      te está mintiendo.
                    </>
                  )}
                </p>
              </div>

              <section className="mt-9 space-y-4">
                <h2 className="text-lg font-bold">Cuéntame qué ha pasado</h2>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">Tu correo</span>
                  <input
                    className="field"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="tu@empresa.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>

                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-600">
                      Nombre de tu tienda (opcional)
                    </span>
                    <input
                      className="field"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-600">
                      Días suspendido (opcional)
                    </span>
                    <input
                      className="field"
                      type="number"
                      min={0}
                      value={days}
                      onChange={(e) => setDays(e.target.value)}
                    />
                  </label>
                </div>

                <label className="block text-sm">
                  <span className="mb-1 block font-medium text-slate-600">
                    Pega aquí el correo de Amazon, o cuéntamelo con tus palabras
                  </span>
                  <textarea
                    className="field"
                    rows={8}
                    placeholder="Cuanto más literal sea el texto de Amazon, mejor lo puedo clasificar."
                    value={story}
                    onChange={(e) => setStory(e.target.value)}
                  />
                </label>

                {preview && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                    <p className="font-semibold">Lectura preliminar automática</p>
                    <p className="mt-1 text-slate-700">
                      Parece un caso de <strong>{preview.typeLabel}</strong>
                      {preview.scope !== 'indeterminado' && <> con alcance de {preview.scope}</>}.{' '}
                      {severityLabel(preview.severity)}.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{preview.disclaimer}</p>
                  </div>
                )}

                {error && <p className="text-sm font-medium text-alert">{error}</p>}

                <button type="button" className="btn-primary w-full sm:w-auto" disabled={!canSend} onClick={handleSubmit}>
                  {sending ? 'Enviando…' : `Analizar mi caso · ${APPEALS.analysisPrice.label}`}
                </button>
                <p className="text-xs text-slate-500">
                  No se cobra nada ahora. Te escribo con la lectura del caso y decides.
                </p>
                {/*
                  Salida hacia la oferta de entrada. 1.500 $ es mucho dinero para
                  alguien que no te conoce de nada: al que no vaya a dar ese paso,
                  más vale ofrecerle el de 59 $ que perderlo.
                */}
                <p className="text-sm text-slate-600">
                  ¿Te parece mucho para empezar? Si ya tienes un plan escrito, te lo{' '}
                  <Link to="/revision" className="font-medium text-primary underline">
                    reviso por {ENTRY_OFFER.price.label} en {ENTRY_OFFER.deliveryHours} horas
                  </Link>
                  .
                </p>
              </section>
            </>
          )}
        </div>
      </main>

      <Footer brand={APPEALS_BRAND} disclaimer={ENTRY_DISCLAIMER} />
    </div>
  );
}
