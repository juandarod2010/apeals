import { apiBase } from '../../src/lib/payments/paypal.js';
import type { ServerEnv } from './env.js';

/** Token de acceso. Se pide por petición: son funciones sin estado. */
export async function accessToken(env: ServerEnv): Promise<string> {
  const credentials = btoa(`${env.clientId}:${env.clientSecret}`);
  const res = await fetch(`${apiBase(env.paypalEnv)}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) throw new Error(`PayPal no da token: ${res.status}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error('PayPal no ha devuelto access_token');
  return data.access_token;
}

export async function paypalFetch(
  env: ServerEnv,
  path: string,
  init: { method: string; body?: unknown },
): Promise<{ status: number; data: unknown }> {
  const token = await accessToken(env);
  const res = await fetch(`${apiBase(env.paypalEnv)}${path}`, {
    method: init.method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

/** Las cabeceras con las que PayPal firma cada webhook. */
export const SIGNATURE_HEADERS = [
  'paypal-auth-algo',
  'paypal-cert-url',
  'paypal-transmission-id',
  'paypal-transmission-sig',
  'paypal-transmission-time',
] as const;

/**
 * Verifica la firma contra PayPal antes de creer nada del evento.
 *
 * PayPal no usa HMAC con secreto compartido: firma con su clave privada y se
 * comprueba contra su endpoint. Sin esto, cualquiera que conozca la URL del
 * webhook puede marcar leads como pagados mandando un JSON.
 *
 * Devuelve false ante cualquier duda: un fallo de red aquí no puede acabar en
 * «lo doy por bueno».
 */
export async function verifySignature(
  env: ServerEnv,
  headers: Headers,
  event: unknown,
): Promise<boolean> {
  for (const h of SIGNATURE_HEADERS) {
    if (!headers.get(h)) return false;
  }

  const { status, data } = await paypalFetch(env, '/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: {
      auth_algo: headers.get('paypal-auth-algo'),
      cert_url: headers.get('paypal-cert-url'),
      transmission_id: headers.get('paypal-transmission-id'),
      transmission_sig: headers.get('paypal-transmission-sig'),
      transmission_time: headers.get('paypal-transmission-time'),
      webhook_id: env.webhookId,
      webhook_event: event,
    },
  });

  if (status !== 200) return false;
  return (data as { verification_status?: string } | null)?.verification_status === 'SUCCESS';
}
