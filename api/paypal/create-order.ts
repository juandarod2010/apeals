import { buildOrderPayload, LEAD_ID } from '../../src/lib/payments/paypal.js';
import { leadExists } from '../_lib/db.js';
import { json, serverEnv } from '../_lib/env.js';
import { paypalFetch } from '../_lib/paypal.js';

export const config = { runtime: 'edge' };

/** Crea la orden de 59 USD. El secreto de PayPal no sale de aquí. */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Solo POST' }, 405);

  let env;
  try {
    env = serverEnv();
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  const body = (await request.json().catch(() => null)) as { leadId?: unknown } | null;
  const leadId = typeof body?.leadId === 'string' ? body.leadId : '';
  if (!LEAD_ID.test(leadId)) return json({ error: 'leadId no válido' }, 400);

  try {
    // Se comprueba que el lead existe para no crear órdenes huérfanas. El
    // webhook NO depende de esto: registra el pago aunque el lead no exista.
    if (!(await leadExists(env, leadId))) return json({ error: 'lead desconocido' }, 404);

    const { status, data } = await paypalFetch(env, '/v2/checkout/orders', {
      method: 'POST',
      body: buildOrderPayload(leadId),
    });
    if (status >= 300) return json({ error: 'PayPal ha rechazado la orden', status }, 502);

    return json({ id: (data as { id?: string } | null)?.id });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
