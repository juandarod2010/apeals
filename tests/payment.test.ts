import { describe, expect, it } from 'vitest';
import { ENTRY_OFFER, PAYMENT, PAYMENT_LINK_MISSING } from '../src/config/brand';
import { buildRevisionDeliveryEmail, paymentBlock } from '../src/lib/emailTemplates';

/**
 * El correo de entrega de la revisión es también la factura: la oferta se cobra
 * AL entregar, no antes. O sea que es el único momento en que se pide dinero.
 *
 * EL FALLO QUE EVITA. Sin enlace de cobro configurado, lo fácil es que el
 * bloque de pago se quede vacío y el correo salga igual: trabajo entregado y
 * nada cobrado, sin que nada lo delate. Así que cuando falta el enlace, el
 * texto lo grita.
 */
describe('cobro de la revisión', () => {
  const entrega = () =>
    buildRevisionDeliveryEmail({ name: 'Tienda', changes: [], missingEvidence: [] });

  it('sin enlace configurado, el correo avisa de que no puede salir', () => {
    expect(PAYMENT.link, 'si ya hay enlace, actualiza este test').toBe('');
    expect(paymentBlock()).toBe(PAYMENT_LINK_MISSING);
    expect(entrega().body).toContain(PAYMENT_LINK_MISSING);
  });

  it('el correo no promete la reactivación de la cuenta', () => {
    const cuerpo = entrega().body.toLowerCase();
    expect(cuerpo).not.toContain('garantiz');
    expect(cuerpo).not.toContain('reactivaremos');
  });

  it('deja huecos visibles en vez de inventarse el trabajo hecho', () => {
    expect(entrega().body).toContain('(rellena qué has reescrito)');
    expect(entrega().body).toContain('(rellena qué pruebas faltan)');
  });

  it('firma como el producto y con el correo real', () => {
    expect(entrega().body).toContain('Complyo APEALS');
    expect(entrega().body).toContain('@');
    expect(entrega().body).not.toContain('complyo.eu');
  });

  it('el precio sale de la configuración de la oferta, no escrito a mano', () => {
    expect(ENTRY_OFFER.price.label).toBe('59 $');
  });
});
