import { describe, expect, it } from 'vitest';
import { ENTRY_OFFER, paymentUrl } from '../src/config/brand';
import { buildRevisionDeliveryEmail, paymentBlock } from '../src/lib/emailTemplates';

const LEAD = '09d55613-fdbb-47d9-86a0-431a7cdcf123';
const ORIGIN = 'https://complyo-apeals.vercel.app';

/**
 * El correo de entrega de la revisión es también la factura: la oferta se cobra
 * AL entregar, no antes. Es el único momento en que se pide dinero, así que el
 * enlace de pago tiene que estar dentro y tiene que saber de qué caso es.
 */
describe('enlace de cobro', () => {
  const entrega = () =>
    buildRevisionDeliveryEmail({
      name: 'Tienda',
      leadId: LEAD,
      origin: ORIGIN,
      changes: [],
      missingEvidence: [],
    });

  it('lleva el lead dentro: es lo que ata el pago al caso', () => {
    expect(paymentUrl(ORIGIN, LEAD)).toBe(`${ORIGIN}/pricing?lead=${LEAD}`);
    expect(entrega().body).toContain(`/pricing?lead=${LEAD}`);
  });

  it('no duplica la barra si el origen trae uno', () => {
    expect(paymentUrl(`${ORIGIN}/`, LEAD)).toBe(`${ORIGIN}/pricing?lead=${LEAD}`);
  });

  it('el bloque de cobro dice el precio de la oferta', () => {
    expect(paymentBlock(ORIGIN, LEAD)).toContain(ENTRY_OFFER.price.label);
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
    expect(entrega().body).not.toContain('complyo.eu');
  });
});
