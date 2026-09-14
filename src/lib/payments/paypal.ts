import { ENTRY_OFFER } from '../../config/brand';

/**
 * Lógica de cobro de PayPal, sin nada de red ni de entorno.
 *
 * Está separada de las funciones serverless a propósito: aquí vive todo lo que
 * decide si un pago vale o no, y aquí se puede probar entero sin credenciales
 * ni sandbox. Las funciones de /api son adaptadores finos por encima de esto.
 */

export const EXPECTED_CURRENCY = 'USD';

/** El importe que se espera, en céntimos, sacado de la oferta. */
export const EXPECTED_CENTS = Math.round(ENTRY_OFFER.price.amount * 100);

/** Lo que PayPal quiere como importe: cadena con dos decimales. */
export function amountValue(cents = EXPECTED_CENTS): string {
  return (cents / 100).toFixed(2);
}

/** Céntimos a partir de la cadena que devuelve PayPal. Null si no es un número. */
export function centsFromValue(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

/**
 * Cuerpo de la orden de Orders v2.
 *
 * NO se manda `invoice_id`. PayPal obliga a que sea único por comercio, así que
 * si el cliente abandona el pago y vuelve a intentarlo, el segundo intento
 * fallaría con DUPLICATE_INVOICE_ID justo cuando por fin iba a pagar. El enlace
 * con el lead lo lleva `custom_id`, que no tiene esa restricción.
 */
export function buildOrderPayload(leadId: string): Record<string, unknown> {
  return {
    intent: 'CAPTURE',
    purchase_units: [
      {
        custom_id: leadId,
        description: ENTRY_OFFER.name,
        amount: { currency_code: EXPECTED_CURRENCY, value: amountValue() },
      },
    ],
  };
}

export const LEAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface PaymentRecord {
  captureId: string;
  orderId: string;
  leadId: string;
  cents: number;
  currency: string;
  status: string;
  payerEmail: string | null;
}

export type ParseResult =
  | { ok: true; payment: PaymentRecord }
  | { ok: false; reason: string };

function get(obj: unknown, ...path: string[]): unknown {
  let cur: unknown = obj;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return cur;
}

/**
 * Convierte un evento de PayPal en una fila de `pagos`, o explica por qué no.
 *
 * Aquí NO se comprueba el importe, y es deliberado: si alguien paga 1 $, ese
 * dinero ha entrado igual. Descartar el evento lo dejaría sin rastro en ningún
 * sitio. Se registra siempre, y es `matchesOffer` quien decide si además se
 * marca el lead como pagado. Ver api/paypal/webhook.ts.
 */
export function parseCaptureEvent(event: unknown): ParseResult {
  if (get(event, 'event_type') !== 'PAYMENT.CAPTURE.COMPLETED') {
    return { ok: false, reason: `evento ignorado: ${String(get(event, 'event_type'))}` };
  }

  const resource = get(event, 'resource');
  const status = get(resource, 'status');
  if (status !== 'COMPLETED') {
    return { ok: false, reason: `captura no completada: ${String(status)}` };
  }

  const captureId = get(resource, 'id');
  if (typeof captureId !== 'string' || !captureId) {
    return { ok: false, reason: 'falta el identificador de la captura' };
  }

  const leadId = get(resource, 'custom_id');
  if (typeof leadId !== 'string' || !LEAD_ID.test(leadId)) {
    return { ok: false, reason: 'custom_id ausente o no es un identificador de lead' };
  }

  const currency = get(resource, 'amount', 'currency_code');
  if (typeof currency !== 'string' || !currency) {
    return { ok: false, reason: 'moneda ausente' };
  }

  const cents = centsFromValue(get(resource, 'amount', 'value'));
  if (cents === null) {
    return { ok: false, reason: 'importe ilegible' };
  }

  const orderId = get(resource, 'supplementary_data', 'related_ids', 'order_id');
  const payerEmail = get(resource, 'payer', 'email_address');

  return {
    ok: true,
    payment: {
      captureId,
      orderId: typeof orderId === 'string' ? orderId : '',
      leadId,
      cents,
      currency,
      status: 'COMPLETED',
      payerEmail: typeof payerEmail === 'string' ? payerEmail : null,
    },
  };
}

/** Las dos bases de PayPal. Nunca se mezclan: una mueve dinero de verdad. */
export function apiBase(environment: 'sandbox' | 'live'): string {
  return environment === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

/**
 * ¿El pago es exactamente la oferta que vendemos?
 *
 * Separado de la lectura del evento a propósito. Sin esta comprobación,
 * cualquiera que copie un `custom_id` paga 1 $ y deja el lead marcado como
 * convertido por 59 $.
 */
export function matchesOffer(payment: PaymentRecord): boolean {
  return payment.cents === EXPECTED_CENTS && payment.currency === EXPECTED_CURRENCY;
}
