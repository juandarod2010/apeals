import type { PaymentRecord } from '../../src/lib/payments/paypal.js';
import type { ServerEnv } from './env.js';

/**
 * Acceso a Supabase desde el servidor, con `service_role`.
 *
 * Se llama a PostgREST directamente en vez de traerse el cliente de Supabase:
 * son tres consultas y así no entra una dependencia entera en el paquete de la
 * función.
 *
 * OJO CON ESTA CLAVE: `service_role` se salta Row Level Security por completo.
 * Solo puede vivir en el entorno del servidor. Ver api/_lib/env.ts.
 */

function headers(env: ServerEnv, extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: env.serviceRoleKey,
    authorization: `Bearer ${env.serviceRoleKey}`,
    'content-type': 'application/json',
    ...extra,
  };
}

export async function leadExists(env: ServerEnv, leadId: string): Promise<boolean> {
  const res = await fetch(
    `${env.supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}&select=id`,
    { headers: headers(env) },
  );
  if (!res.ok) throw new Error(`Supabase (leads): ${res.status}`);
  return ((await res.json()) as unknown[]).length > 0;
}

/**
 * Registra el pago. Devuelve false si ya estaba.
 *
 * AQUÍ VIVE LA IDEMPOTENCIA. PayPal reintenta los webhooks hasta que le
 * respondes 200, así que el mismo pago llega varias veces. La restricción única
 * sobre `capture_id` (migración 0005) hace que el segundo intento no inserte
 * nada, y al devolver false el llamante sabe que no debe volver a sumar el
 * ingreso al lead.
 */
export async function recordPayment(
  env: ServerEnv,
  payment: PaymentRecord,
  event: unknown,
): Promise<boolean> {
  const res = await fetch(
    `${env.supabaseUrl}/rest/v1/pagos?on_conflict=capture_id`,
    {
      method: 'POST',
      headers: headers(env, {
        prefer: 'resolution=ignore-duplicates,return=representation',
      }),
      body: JSON.stringify({
        id: crypto.randomUUID(),
        lead_id: payment.leadId,
        proveedor: 'paypal',
        entorno: env.paypalEnv,
        order_id: payment.orderId,
        capture_id: payment.captureId,
        importe: (payment.cents / 100).toFixed(2),
        moneda: payment.currency,
        estado: payment.status,
        pagador_email: payment.payerEmail,
        evento: event,
      }),
    },
  );
  if (!res.ok) throw new Error(`Supabase (pagos): ${res.status} ${await res.text()}`);
  return ((await res.json()) as unknown[]).length > 0;
}

/** Marca el lead como convertido con su ingreso. */
export async function markLeadPaid(
  env: ServerEnv,
  leadId: string,
  cents: number,
): Promise<boolean> {
  const res = await fetch(`${env.supabaseUrl}/rest/v1/leads?id=eq.${encodeURIComponent(leadId)}`, {
    method: 'PATCH',
    headers: headers(env, { prefer: 'return=representation' }),
    body: JSON.stringify({
      status: 'convertido',
      revenue: cents / 100,
      updated_at: new Date().toISOString(),
    }),
  });
  if (!res.ok) throw new Error(`Supabase (leads PATCH): ${res.status}`);
  return ((await res.json()) as unknown[]).length > 0;
}
