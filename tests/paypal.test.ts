import { describe, expect, it } from 'vitest';
import {
  amountValue,
  apiBase,
  buildOrderPayload,
  centsFromValue,
  EXPECTED_CENTS,
  matchesOffer,
  parseCaptureEvent,
} from '../src/lib/payments/paypal';

const LEAD = '09d55613-fdbb-47d9-86a0-431a7cdcf123';

/** Un evento válido, del que parten todas las variantes. */
function evento(cambios: Record<string, unknown> = {}, recurso: Record<string, unknown> = {}) {
  return {
    event_type: 'PAYMENT.CAPTURE.COMPLETED',
    resource: {
      id: 'CAP-123',
      status: 'COMPLETED',
      custom_id: LEAD,
      amount: { currency_code: 'USD', value: '59.00' },
      supplementary_data: { related_ids: { order_id: 'ORD-9' } },
      payer: { email_address: 'cliente@ejemplo.invalid' },
      ...recurso,
    },
    ...cambios,
  };
}

describe('orden de PayPal', () => {
  it('pide exactamente el precio de la oferta', () => {
    const unidad = (buildOrderPayload(LEAD).purchase_units as Record<string, unknown>[])[0];
    expect(unidad.amount).toEqual({ currency_code: 'USD', value: '59.00' });
  });

  it('lleva el lead en custom_id: es lo que permite saber de quién es el pago', () => {
    const unidad = (buildOrderPayload(LEAD).purchase_units as Record<string, unknown>[])[0];
    expect(unidad.custom_id).toBe(LEAD);
  });

  it('NO manda invoice_id', () => {
    // PayPal lo exige único por comercio. Si el cliente abandona y reintenta,
    // el segundo intento fallaría con DUPLICATE_INVOICE_ID justo cuando iba a
    // pagar. Ver buildOrderPayload.
    const unidad = (buildOrderPayload(LEAD).purchase_units as Record<string, unknown>[])[0];
    expect(unidad).not.toHaveProperty('invoice_id');
  });

  it('el importe va con dos decimales, que es lo que acepta PayPal', () => {
    expect(amountValue()).toBe('59.00');
    expect(amountValue(5)).toBe('0.05');
  });

  it('sandbox y live nunca comparten base', () => {
    expect(apiBase('sandbox')).toContain('sandbox');
    expect(apiBase('live')).not.toContain('sandbox');
  });
});

describe('lectura del evento de captura', () => {
  it('acepta un pago correcto y saca todo lo que hay que guardar', () => {
    const r = parseCaptureEvent(evento());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payment).toEqual({
      captureId: 'CAP-123',
      orderId: 'ORD-9',
      leadId: LEAD,
      cents: EXPECTED_CENTS,
      currency: 'USD',
      status: 'COMPLETED',
      payerEmail: 'cliente@ejemplo.invalid',
    });
  });

  it('registra un importe distinto en vez de tirarlo', () => {
    // El dinero ha entrado igual. Descartar el evento lo dejaría sin rastro.
    const r = parseCaptureEvent(evento({}, { amount: { currency_code: 'USD', value: '1.00' } }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payment.cents).toBe(100);
  });

  it('rechaza una captura que no está completada', () => {
    expect(parseCaptureEvent(evento({}, { status: 'PENDING' })).ok).toBe(false);
  });

  it('ignora los eventos que no son una captura completada', () => {
    expect(parseCaptureEvent(evento({ event_type: 'PAYMENT.CAPTURE.DENIED' })).ok).toBe(false);
    expect(parseCaptureEvent(evento({ event_type: 'CHECKOUT.ORDER.APPROVED' })).ok).toBe(false);
  });

  it('rechaza un custom_id que no es un identificador de lead', () => {
    for (const malo of ['', 'lead-42', undefined, 42]) {
      expect(parseCaptureEvent(evento({}, { custom_id: malo })).ok, String(malo)).toBe(false);
    }
  });

  it('no revienta con basura', () => {
    for (const basura of [null, undefined, 42, 'hola', {}, { resource: null }]) {
      expect(() => parseCaptureEvent(basura)).not.toThrow();
      expect(parseCaptureEvent(basura).ok).toBe(false);
    }
  });

  it('sobrevive a que falten el correo del pagador o el id de orden', () => {
    const r = parseCaptureEvent(evento({}, { payer: undefined, supplementary_data: undefined }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.payment.payerEmail).toBeNull();
    expect(r.payment.orderId).toBe('');
  });

  it('lee los céntimos sin errores de coma flotante', () => {
    expect(centsFromValue('59.00')).toBe(5900);
    expect(centsFromValue('0.29')).toBe(29);
    expect(centsFromValue('no')).toBeNull();
    expect(centsFromValue(null)).toBeNull();
  });
});

describe('¿el pago es la oferta?', () => {
  const pago = (cents: number, currency = 'USD') => ({
    captureId: 'C', orderId: 'O', leadId: LEAD, cents, currency,
    status: 'COMPLETED', payerEmail: null,
  });

  it('acepta exactamente 59 USD', () => {
    expect(matchesOffer(pago(EXPECTED_CENTS))).toBe(true);
  });

  it('RECHAZA pagar de menos', () => {
    // El agujero más caro: alguien copia un custom_id, paga 1 $ y su lead
    // quedaría marcado como convertido por 59 $.
    expect(matchesOffer(pago(100))).toBe(false);
  });

  it('rechaza pagar de más, que también es una anomalía', () => {
    expect(matchesOffer(pago(59000))).toBe(false);
  });

  it('rechaza otra moneda aunque el número cuadre', () => {
    expect(matchesOffer(pago(EXPECTED_CENTS, 'MXN'))).toBe(false);
  });
});
