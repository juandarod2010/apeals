/**
 * Configuración de PayPal en el navegador.
 *
 * El client ID es público por diseño, igual que la clave `anon` de Supabase:
 * va dentro del botón de pago y cualquiera puede leerlo. El SECRETO no está
 * aquí ni puede estarlo — vive solo en las funciones serverless.
 */

export function paypalClientId(): string {
  return (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) ?? '';
}

export function paypalEnv(): 'sandbox' | 'live' {
  return (import.meta.env.VITE_PAYPAL_ENV as string | undefined) === 'live' ? 'live' : 'sandbox';
}

export function paypalConfigured(): boolean {
  return paypalClientId().length > 0;
}

/** URL del SDK. La moneda va fijada: cobrar en otra añade conversión encima. */
export function sdkUrl(clientId = paypalClientId()): string {
  const params = new URLSearchParams({
    'client-id': clientId,
    currency: 'USD',
    intent: 'capture',
    components: 'buttons',
  });
  return `https://www.paypal.com/sdk/js?${params.toString()}`;
}
