import { BRAND, DISCLAIMER } from '../config/brand';

/**
 * Pie común. El descargo de responsabilidad es obligatorio y visible.
 *
 * Los valores por defecto son los del informe RAP. Las páginas de APEALS pasan
 * los suyos: su descargo habla de la revisión del Plan of Action, no de un
 * informe, y no menciona figuras regulatorias que no vienen al caso.
 */
export default function Footer({
  brand = BRAND.name,
  disclaimer = DISCLAIMER,
}: {
  brand?: string;
  disclaimer?: string;
}) {
  return (
    <footer className="mt-16 border-t border-slate-200 bg-slate-50 px-5 py-8">
      <div className="mx-auto max-w-3xl space-y-3">
        <p className="text-sm font-semibold text-ink">{brand}</p>
        <p className="text-sm leading-relaxed text-slate-600">{disclaimer}</p>
      </div>
    </footer>
  );
}
