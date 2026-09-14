import { json, serverEnv } from '../_lib/env.js';
import { paypalFetch } from '../_lib/paypal.js';

export const config = { runtime: 'edge' };

/**
 * Captura la orden aprobada.
 *
 * Esto es solo para poder enseñarle «pagado» al comprador al instante. La
 * verdad la establece el webhook: el navegador puede cerrarse justo aquí, y si
 * el registro del pago dependiera de esta llamada, ese pago se perdería.
 */
export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'Solo POST' }, 405);

  let env;
  try {
    env = serverEnv();
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }

  const body = (await request.json().catch(() => null)) as { orderId?: unknown } | null;
  const orderId = typeof body?.orderId === 'string' ? body.orderId : '';
  if (!/^[A-Z0-9]{6,32}$/i.test(orderId)) return json({ error: 'orderId no válido' }, 400);

  try {
    const { status, data } = await paypalFetch(
      env,
      `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
      { method: 'POST', body: {} },
    );
    if (status >= 300) return json({ error: 'PayPal ha rechazado la captura', status }, 502);
    return json({ status: (data as { status?: string } | null)?.status ?? 'UNKNOWN' });
  } catch (e) {
    return json({ error: (e as Error).message }, 502);
  }
}
