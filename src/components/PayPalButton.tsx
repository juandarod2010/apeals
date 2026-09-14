import { useEffect, useRef, useState } from 'react';
import { paypalClientId, sdkUrl } from '../lib/payments/client';

/**
 * Botón de pago de PayPal para un lead concreto.
 *
 * El importe NO se manda desde aquí. Lo fija el servidor al crear la orden
 * (ver api/paypal/create-order.ts): si el navegador pudiera decir cuánto paga,
 * cualquiera abriría las herramientas de desarrollo y pagaría un dólar.
 */
export default function PayPalButton({
  leadId,
  onPaid,
}: {
  leadId: string;
  onPaid: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const existing = document.querySelector<HTMLScriptElement>('script[data-paypal]');
      if (!existing) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = sdkUrl();
          script.dataset.paypal = 'true';
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('No se ha podido cargar PayPal.'));
          document.head.appendChild(script);
        });
      }
      if (cancelled || !box.current) return;

      const paypal = (window as unknown as { paypal?: Record<string, never> }).paypal;
      if (!paypal) throw new Error('PayPal no se ha inicializado.');

      const post = async (path: string, body: unknown) => {
        const res = await fetch(path, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? `Error ${res.status}`);
        return data;
      };

      (paypal as unknown as { Buttons: (o: unknown) => { render: (e: HTMLElement) => void } })
        .Buttons({
          style: { layout: 'vertical', label: 'pay' },
          createOrder: async () => {
            setError(null);
            const { id } = await post('/api/paypal/create-order', { leadId });
            return id;
          },
          onApprove: async (data: { orderID: string }) => {
            setWorking(true);
            try {
              await post('/api/paypal/capture', { orderId: data.orderID });
              onPaid();
            } finally {
              setWorking(false);
            }
          },
          onError: () => setError('El pago no ha podido completarse. Inténtalo otra vez.'),
        })
        .render(box.current);
    }

    load().catch((e) => !cancelled && setError((e as Error).message));
    return () => {
      cancelled = true;
    };
  }, [leadId, onPaid]);

  return (
    <div>
      {!paypalClientId() && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-alert">
          El pago no está configurado en este despliegue.
        </p>
      )}
      <div ref={box} />
      {working && <p className="mt-3 text-sm text-slate-600">Confirmando el pago…</p>}
      {error && <p className="mt-3 text-sm text-alert">{error}</p>}
    </div>
  );
}
