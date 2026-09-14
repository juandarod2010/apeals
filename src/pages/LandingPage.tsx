import { Link } from 'react-router-dom';
import Footer from '../components/Footer';
import {
  APPEALS_BRAND,
  APPEALS_LANDING,
  BRAND,
  ENTRY_DISCLAIMER,
  REGULATION,
} from '../config/brand';

/**
 * Portada de una sola pantalla.
 *
 * Deliberadamente SIN testimonios, SIN logos de clientes y SIN cifras que no
 * podamos demostrar. Cuando haya clientes reales, se añaden aquí.
 *
 * La puerta principal es APEALS, que es lo único que hoy se puede entregar y
 * cobrar. El diagnóstico de cumplimiento RAP sigue accesible como segunda
 * puerta —es un servicio de Complyo y no se retira—, pero sin precio ni plazo
 * mientras su base de reglas no esté verificada.
 */
export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="px-5 pt-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <span className="text-lg font-bold tracking-tight">{BRAND.name}</span>
          {/* La matriz a la izquierda, el producto a la derecha: 'Complyo |
              Complyo APEALS' se repetía. */}
          <span className="text-xs text-slate-500">APEALS</span>
        </div>
      </header>

      <main className="flex flex-1 items-center px-5 py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            {APPEALS_LANDING.headline}
          </h1>

          <div className="mt-6 space-y-4">
            {APPEALS_LANDING.lines.map((line) => (
              <p key={line} className="text-base leading-relaxed text-slate-700">
                {line}
              </p>
            ))}
          </div>

          <div className="mt-9">
            <Link to="/revision" className="btn-primary w-full sm:w-auto">
              {APPEALS_LANDING.ctaLabel}
            </Link>
            <p className="mt-3 text-sm text-slate-500">
              Sin registro. No se cobra nada por adelantado.
            </p>

            {/*
              Segunda puerta. Otro servicio de Complyo, para quien todavía no
              tiene un problema abierto. Sin precio ni plazo: su base de reglas
              no está verificada y anunciarlo sería prometer lo que no se puede
              cumplir.
            */}
            <p className="mt-6 border-t border-slate-200 pt-6 text-sm text-slate-600">
              ¿Vendes a la Unión Europea y quieres saber qué te exige el{' '}
              {REGULATION.reference}?{' '}
              <Link to="/diagnostico" className="font-medium text-brand-600 underline">
                Ver mi exposición
              </Link>
              .
            </p>
          </div>
        </div>
      </main>

      <Footer brand={APPEALS_BRAND} disclaimer={ENTRY_DISCLAIMER} />
    </div>
  );
}
