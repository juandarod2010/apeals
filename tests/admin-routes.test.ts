import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Guardarraíl del portero de las pantallas internas.
 *
 * EL FALLO QUE FIJA. Cada página del panel envolvía al portero, o sea que la
 * página era el padre y su carga de datos salía antes de que hubiera sesión.
 * Esa consulta iba como `anon`, y ahí está lo venenoso: RLS no deniega un
 * SELECT con un error, responde 200 con cero filas. El panel pintaba «no hay
 * leads» teniendo leads, sin nada en la consola. Y al entrar, nadie volvía a
 * pedirlos.
 *
 * Solo se nota con Supabase de verdad: en MOCK no hay RLS y todo pasa. Así que
 * se comprueba sobre el código, que es donde sí se puede: ninguna ruta interna
 * puede quedarse fuera del portero.
 */
describe('las rutas internas cuelgan del portero', () => {
  const app = readFileSync('src/App.tsx', 'utf8');

  const abre = app.indexOf('<Route element={<AdminRoutes />}>');
  const cierra = app.indexOf('</Route>', abre);

  it('App.tsx monta el portero como ruta padre', () => {
    expect(abre, 'falta <Route element={<AdminRoutes />}>').toBeGreaterThan(-1);
    expect(cierra).toBeGreaterThan(abre);
  });

  it('ninguna ruta interna queda fuera', () => {
    const rutas = [...app.matchAll(/path="([^"]+)"/g)];
    const internas = rutas.filter(
      (m) => m[1].startsWith('/admin') || m[1] === '/prospeccion',
    );

    expect(internas.length).toBeGreaterThan(0);
    for (const ruta of internas) {
      expect(
        ruta.index,
        `la ruta ${ruta[1]} está fuera del portero: pediría datos sin sesión`,
      ).toBeGreaterThan(abre);
      expect(ruta.index).toBeLessThan(cierra);
    }
  });

  it('AdminLayout ya no envuelve al portero desde dentro de la página', () => {
    const layout = readFileSync('src/components/AdminLayout.tsx', 'utf8');
    expect(layout).not.toContain('<AdminGate>');
  });
});
