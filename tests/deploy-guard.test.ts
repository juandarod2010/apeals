import { describe, expect, it } from 'vitest';
import { leadsGoNowhere } from '../src/lib/deployGuard';

/**
 * El fallo de despliegue que no da ninguna señal: build de producción sin las
 * variables VITE_*, la aplicación cae a localStorage, el visitante ve
 * «Recibido» y su caso no llega nunca. Ver src/lib/deployGuard.ts.
 */
describe('aviso de despliegue sin base de datos', () => {
  it('avisa en un dominio público en modo MOCK', () => {
    expect(leadsGoNowhere('mock', 'complyo.vercel.app')).toBe(true);
    expect(leadsGoNowhere('mock', 'apeals.com')).toBe(true);
  });

  it('calla en local, donde MOCK es el modo de trabajo normal', () => {
    for (const host of ['localhost', '127.0.0.1', '[::1]', 'miequipo.local', '']) {
      expect(leadsGoNowhere('mock', host), host).toBe(false);
    }
  });

  it('calla siempre que hay Supabase, esté donde esté', () => {
    for (const host of ['complyo.vercel.app', 'localhost', '']) {
      expect(leadsGoNowhere('supabase', host), host).toBe(false);
    }
  });
});
