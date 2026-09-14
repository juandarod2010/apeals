import { useCallback, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Footer from '../components/Footer';
import PayPalButton from '../components/PayPalButton';
import { APPEALS_BRAND, BRAND, ENTRY_DISCLAIMER, ENTRY_OFFER } from '../config/brand';
import { LEAD_ID } from '../lib/payments/paypal';

/**
 * Página de la oferta y pasarela de pago.
 *
 * QUÉ NO ES: un paso obligatorio para pedir la revisión. /revision sigue sin
 * cobrar nada por adelantado, y así se queda: quitar el pago del principio es
 * lo que hace que un desconocido se atreva a probar. Aquí se llega desde el
 * correo de entrega, con la revisión ya hecha y `?lead=<id>` en la dirección.
 *
 * Sin ese parámetro es solo la página de la oferta, con su enlace a /revision.
 */
export default function PricingPage() {
  const [params] = useSearchParams();
  const leadId = params.get('lead') ?? '';
  const paying = LEAD_ID.test(leadId);
  const [paid, setPaid] = useState(false);
  const handlePaid = useCallback(() => setPaid(true), []);

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
          {paid ? (
            <section>
              <h1 className="text-2xl font-bold tracking-tight">Pago recibido. Gracias.</h1>
              <p className="mt-4 text-slate-700">
                Te llega el justificante de PayPal a tu correo. Si algo de la revisión no te cuadra,
                respóndeme al correo de entrega y lo repasamos: eso no se paga aparte.
              </p>
            </section>
          ) : (
            <>
              <section>
                <h1 className="text-3xl font-bold tracking-tight">{ENTRY_OFFER.name}</h1>
                <p className="mt-4 text-slate-700">
                  Leo tu Plan of Action entero, reescribo la causa raíz —que es por donde se rechaza
                  la mayoría— y te digo qué pruebas te faltan.{' '}
                  <strong>
                    {ENTRY_OFFER.price.label}, en {ENTRY_OFFER.deliveryHours} horas.
                  </strong>
                </p>

                <ul className="mt-6 space-y-2">
                  {ENTRY_OFFER.deliverables.map((d) => (
                    <li key={d} className="flex gap-3 text-sm text-slate-700">
                      <span aria-hidden className="mt-1 text-brand-600">
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
                {paying ? (
                  <>
                    <h2 className="text-xl font-semibold">Pagar la revisión</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {ENTRY_OFFER.price.label} en un solo pago. El importe lo fija el servidor, no
                      esta página.
                    </p>
                    <div className="mt-6">
                      <PayPalButton leadId={leadId} onPaid={handlePaid} />
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="text-xl font-semibold">Empieza sin pagar nada</h2>
                    <p className="mt-2 text-slate-700">
                      No se cobra por adelantado. Mándame el caso, te entrego la revisión, y el
                      enlace de pago va dentro de esa entrega.
                    </p>
                    <Link to="/revision" className="btn-primary mt-6 w-full sm:w-auto">
                      Mandar mi caso
                    </Link>
                  </>
                )}
              </section>
            </>
          )}
        </div>
      </main>

      <Footer brand={BRAND.name} disclaimer={ENTRY_DISCLAIMER} />
    </div>
  );
}
