/**
 * Variables de entorno de las funciones serverless.
 *
 * NINGUNA lleva el prefijo VITE_, y no es un descuido: todo lo que empieza por
 * VITE_ lo incrusta Vite en el JavaScript que descarga cualquiera. El secreto
 * de PayPal y la clave service_role de Supabase viven solo aquí, en el
 * servidor. `predeploy:check` ya bloquea el despliegue si aparecen en el
 * entorno del cliente.
 */

export interface ServerEnv {
  paypalEnv: 'sandbox' | 'live';
  clientId: string;
  clientSecret: string;
  webhookId: string;
  supabaseUrl: string;
  serviceRoleKey: string;
}

export class MissingEnv extends Error {}

function read(name: string): string {
  const value = process.env[name];
  if (!value) throw new MissingEnv(`Falta la variable de entorno ${name}`);
  return value;
}

export function serverEnv(): ServerEnv {
  const paypalEnv = process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
  return {
    paypalEnv,
    clientId: read('PAYPAL_CLIENT_ID'),
    clientSecret: read('PAYPAL_CLIENT_SECRET'),
    webhookId: read('PAYPAL_WEBHOOK_ID'),
    supabaseUrl: read('SUPABASE_URL'),
    serviceRoleKey: read('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

/** Respuesta JSON, que es lo único que devuelven estas funciones. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
