import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardarraíles de las funciones serverless de pago.
 *
 * Nada de esto se puede probar ejecutándolo aquí: haría falta PayPal, Supabase
 * y un despliegue. Pero sí se puede comprobar sobre el código, y son justo los
 * fallos que no dan ninguna señal hasta que hay dinero de por medio.
 */

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((e) => {
    const ruta = join(dir, e);
    return statSync(ruta).isDirectory() ? ficheros(ruta) : ruta.endsWith('.ts') ? [ruta] : [];
  });
}

describe('enrutado de /api', () => {
  const vercel = JSON.parse(readFileSync('vercel.json', 'utf8')) as {
    rewrites: Record<string, unknown>[] & { source: string }[];
  };

  it('cada reescritura solo usa claves que Vercel acepta', () => {
    /**
     * Vercel valida vercel.json ANTES de construir. Una clave de más -por
     * ejemplo un "comment", porque JSON no admite comentarios- tira el
     * despliegue sin generar un solo registro de build, mientras `npm run
     * build` sigue pasando en local tan contento. Pasó exactamente eso.
     */
    const permitidas = new Set(['source', 'destination', 'has', 'missing', 'statusCode']);
    for (const r of vercel.rewrites) {
      for (const clave of Object.keys(r)) {
        expect(permitidas.has(clave), `clave no admitida en rewrites: ${clave}`).toBe(true);
      }
    }
  });

  it('la reescritura de la SPA no se traga las funciones', () => {
    /**
     * Era `/(.*)` → index.html, que captura también /api/paypal/webhook. PayPal
     * habría recibido el HTML de la portada con un 200, habría dado el webhook
     * por entregado, y ningún pago se habría registrado. Sin un solo error.
     */
    for (const r of vercel.rewrites) {
      expect(new RegExp(`^${r.source}$`).test('/api/paypal/webhook'), r.source).toBe(false);
      expect(new RegExp(`^${r.source}$`).test('/revision'), r.source).toBe(true);
    }
  });
});

describe('código de las funciones serverless', () => {
  const fuentes = ficheros('api').map((ruta) => [ruta, readFileSync(ruta, 'utf8')] as const);

  it('hay funciones que revisar', () => {
    expect(fuentes.length).toBeGreaterThan(3);
  });

  it('ninguna usa import.meta.env, que no existe fuera de Vite', () => {
    // Compila igual y revienta en ejecución, con el cliente ya pagando.
    for (const [ruta, src] of fuentes) {
      expect(src, `${ruta} usa import.meta.env`).not.toContain('import.meta.env');
    }
  });

  it('ningún secreto se lee con prefijo VITE_', () => {
    // Todo lo que empieza por VITE_ acaba dentro del JavaScript público.
    for (const [ruta, src] of fuentes) {
      expect(src, `${ruta} lee una VITE_`).not.toMatch(/process\.env\.VITE_/);
    }
  });

  it('el webhook verifica la firma antes de escribir nada', () => {
    const src = readFileSync('api/paypal/webhook.ts', 'utf8');
    // Las llamadas, no los imports de arriba.
    const firma = src.indexOf('await verifySignature');
    const escritura = src.indexOf('await recordPayment');
    expect(firma).toBeGreaterThan(-1);
    expect(escritura).toBeGreaterThan(firma);
  });

  it('el importe lo fija el servidor, no el navegador', () => {
    // Si el cuerpo de la petición pudiera decir cuánto se paga, cualquiera
    // abriría las herramientas de desarrollo y pagaría un dólar.
    const src = readFileSync('api/paypal/create-order.ts', 'utf8');
    expect(src).toContain('buildOrderPayload');
    expect(src).not.toMatch(/body\??\.\s*amount/);
  });
});
