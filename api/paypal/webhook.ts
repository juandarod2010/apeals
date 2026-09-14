import { matchesOffer, parseCaptureEvent } from '../../src/lib/payments/paypal';
import { markLeadPaid, recordPayment } from '../_lib/db';
import { json, serverEnv } from '../_lib/env';
import { verifySignature } from '../_lib/paypal';

export const config = { runtime: 'edge' };

/**
 * Webhook de PayPal. Es la fuente de verdad de qué se ha cobrado.
 *
 * SOBRE LOS CÓDIGOS DE RESPUESTA, que aquí no son decorativos: PayPal reintenta
 * mientras no reciba un 2xx. Así que se devuelve 200 cuando reintentar no
 * arreglaría nada (evento que no nos interesa, duplicado) y un error cuando el
 * fallo es nuestro y el reintento sí puede salir bien (base de datos caída).
 * Devolver 200 ante un fallo propio pierde el pago para siempre.
 *
 * El cuerpo se lee CRUDO y se parsea aquí. Es el motivo por el que estas
 * funciones van en runtime Edge: con un cuerpo ya parseado por el framework no
 * hay garantía de estar verificando exactamente lo que PayPal firmó.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Solo POST' }, 405);

  let env;
  try {
    env = serverEnv();
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  const raw = await request.text();
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return json({ error: 'cuerpo no es JSON' }, 400);
  }

  // Antes de creerse una sola línea del evento. Sin esto, cualquiera que
  // conozca esta URL marca leads como pagados mandando un JSON.
  let verified = false;
  try {
    verified = await verifySignature(env, request.headers, event);
  } catch {
    // Un fallo de red verificando no puede acabar en «lo doy por bueno».
    return json({ error: 'no se ha podido verificar la firma' }, 503);
  }
  if (!verified) return json({ error: 'firma no válida' }, 401);

  const parsed = parseCaptureEvent(event);
  // Reintentar no cambiaría nada: 200 para que PayPal deje de insistir.
  if (!parsed.ok) return json({ ignored: parsed.reason }, 200);

  try {
    const isNew = await recordPayment(env, parsed.payment, event);
    if (!isNew) return json({ duplicate: true }, 200);

    if (!matchesOffer(parsed.payment)) {
      // Ha entrado dinero, pero no es esta oferta. Queda registrado en `pagos`
      // para poder mirarlo, y el lead NO se marca como pagado.
      return json(
        { recorded: true, leadUpdated: false, reason: 'el importe no es el de la oferta' },
        200,
      );
    }

    const leadUpdated = await markLeadPaid(env, parsed.payment.leadId, parsed.payment.cents);
    return json({ recorded: true, leadUpdated }, 200);
  } catch (e) {
    // Fallo nuestro: que PayPal reintente.
    return json({ error: (e as Error).message }, 500);
  }
}
