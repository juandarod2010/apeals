import { useState } from 'react';
import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import { APPEALS_BRAND, ENTRY_DISCLAIMER, ENTRY_OFFER } from '../config/brand';
import { analyzeSuspensionEmail, ANALYZER_DISCLAIMER, severityLabel } from '../modules/appeals/analyzer';
import { storage } from '../lib/storage';
import { composeRevisionStory } from '../lib/revisionLead';

/**
 * Página de la oferta de entrada: revisión de Plan of Action por 59 $.
 *
 * ES LA PÁGINA QUE TIENE QUE CONVERTIR. Las otras dos landings venden cosas
 * que hoy no se pueden entregar (ver ENTRY_OFFER en config/brand.ts). Esta
 * vende un documento revisado en 24 horas, que sí.
 *
 * DECISIONES DE CONVERSIÓN, para que no se deshagan sin querer:
 *
 * - Se cobra DESPUÉS de entregar. Quita el único motivo real para no probar con
 *   un desconocido, y a este precio el riesgo de impago es menor que el de no
 *   vender nada. Se revisa cuando haya volumen.
 * - El precio está arriba, no escondido. Quien no quiera pagar 59 $ se va antes
 *   de rellenar el formulario, y eso es bueno: el tiempo se va en atender leads
 *   que no iban a comprar.
 * - Sin testimonios y sin cifras de éxito, porque no los hay. En su lugar, el
 *   analizador le da algo útil ANTES de pedirle nada: es la única prueba de
 *   competencia que se puede enseñar el primer día.
 */
export default function RevisionPage() {
  const [email, setEmail] = useState('');
  const [story, setStory] = useState('');
  const [draft, setDraft] = useState('');
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
      // El analizador recibe el correo a secas, NO el texto compuesto: el
      // borrador del cliente metería palabras que desvían la clasificación.
      const analysis = analyzeSuspensionEmail(story);
      // Todo lo que hay que conservar viaja dentro del alta. No se escribe nada
      // después: el visitante anónimo puede INSERTAR pero no ACTUALIZAR, así
      // que una segunda escritura fallaría en Supabase y perdería el borrador.
      // Ver src/lib/revisionLead.ts.
      await storage.createAppealLead({
        email: email.trim().toLowerCase(),
        companyName: null,
        appeal: {
          story: composeRevisionStory(story, draft),
          suspensionType: analysis.type,
          suspensionTypeLabel: analysis.typeLabel,
          severity: analysis.severity,
          scope: analysis.scope,
          daysSuspended: null,
        },
      });
      setSent(true);
    } catch (e) {
      setError(
        e instanceof Error ? `No se ha podido enviar: ${e.message}` : 'No se ha podido enviar.',
      );
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 px-5 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link to="/" className="text-lg font-bold tracking-tight">
            {APPEALS_BRAND}
          </Link>
          <span className="text-xs text-slate-500">{ENTRY_OFFER.name}</span>
        </div>
      </header>

      <main className="flex-1 px-5 py-10">
        <div className="mx-auto max-w-2xl">
          {sent ? (
            <section>
              <h1 className="text-2xl font-bold tracking-tight">Recibido.</h1>
              <p className="mt-4 text-slate-700">
                Te escribo a <strong>{email.trim().toLowerCase()}</strong> dentro de{' '}
                {ENTRY_OFFER.deliveryHours} horas con la revisión. Si me falta algo para poder
                hacerla, te lo pido antes y el plazo cuenta desde que me lo mandes.
              </p>
              <p className="mt-4 text-slate-700">
                No pagas nada ahora. Los {ENTRY_OFFER.price.label} se pagan cuando tengas la
                revisión delante.
              </p>
            </section>
          ) : (
            <>
              <section>
                <h1 className="text-3xl font-bold tracking-tight">
                  Te reviso el Plan of Action antes de que lo mandes.
                </h1>
                <p className="mt-4 text-slate-700">
                  El motivo más común de rechazo no son las medidas correctoras: es la causa raíz.
                  Se escribe un síntoma —«tuvimos retrasos», «entraron reseñas negativas»— y el
                  revisor no ve qué ha cambiado para que no se repita.
                </p>
                <p className="mt-3 text-slate-700">
                  Leo tu plan entero, reescribo esa parte y te digo qué pruebas te faltan.{' '}
                  <strong>
                    {ENTRY_OFFER.price.label}, en {ENTRY_OFFER.deliveryHours} horas
                  </strong>
                  , y se paga al recibirlo.
                </p>

                <ul className="mt-6 space-y-2">
                  {ENTRY_OFFER.deliverables.map((d) => (
                    <li key={d} className="flex gap-3 text-sm text-slate-700">
                      <span aria-hidden className="mt-1 text-primary">
                        ✓
                      </span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>

                <p className="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {ENTRY_OFFER.guarantee}
                </p>
              </section>

              <section className="mt-10 border-t border-slate-200 pt-8">
                <h2 className="text-xl font-semibold">Empieza aquí</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Pega el correo de Amazon y te clasifico el caso al momento, gratis y sin dejar
                  tus datos.
                </p>

                <label className="mt-6 block text-sm font-medium" htmlFor="story">
                  El correo de Amazon, tal cual te llegó
                </label>
                <textarea
                  id="story"
                  className="mt-2 h-40 w-full rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="Pega aquí el mensaje completo, sin recortar."
                  value={story}
                  onChange={(e) => setStory(e.target.value)}
                />

                {preview && (
                  <div className="mt-4 rounded-lg border border-slate-300 bg-white p-4">
                    <p className="text-sm">
                      Esto parece un caso de <strong>{preview.typeLabel}</strong>. Dificultad de
                      documentación: <strong>{severityLabel(preview.severity)}</strong>.
                    </p>
                    <p className="mt-2 text-xs text-slate-500">{ANALYZER_DISCLAIMER}</p>
                  </div>
                )}

                <label className="mt-6 block text-sm font-medium" htmlFor="draft">
                  Tu borrador de plan, si ya tienes uno{' '}
                  <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="draft"
                  className="mt-2 h-32 w-full rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="Aunque esté a medias o te parezca malo. Es más útil verlo que no verlo."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                />

                <label className="mt-6 block text-sm font-medium" htmlFor="email">
                  Tu correo
                </label>
                <input
                  id="email"
                  type="email"
                  className="mt-2 w-full rounded-lg border border-slate-300 p-3 text-sm"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />

                {error && (
                  <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-alert">
                    {error}
                  </p>
                )}

                <button
                  type="button"
                  className="mt-6 w-full rounded-lg bg-primary px-5 py-3 font-semibold text-white disabled:opacity-40"
                  disabled={!canSend}
                  onClick={handleSubmit}
                >
                  {sending ? 'Enviando…' : `Pedir la revisión (${ENTRY_OFFER.price.label})`}
                </button>
                <p className="mt-3 text-center text-xs text-slate-500">
                  No se cobra nada ahora. {ENTRY_OFFER.upsell}
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
