import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guardarraíl contra las clases de color que no existen.
 *
 * EL FALLO QUE FIJA. El botón de envío de /revision llevaba `bg-primary
 * text-white`, pero en tailwind.config.js nunca hubo un color `primary`: solo
 * `ink`, `brand` y `alert`. Tailwind no avisa de una clase que no reconoce,
 * simplemente no genera nada. El botón quedó blanco sobre blanco —presente,
 * pulsable e invisible— en la única página que tiene que convertir.
 *
 * Y los tests lo daban por bueno: localizan por rol y por texto, así que un
 * botón invisible les parece correcto. Esto mira lo que ellos no pueden ver.
 */

/** Colores que Tailwind trae de serie. */
const DE_SERIE = new Set([
  'inherit', 'current', 'transparent', 'black', 'white',
  'slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber', 'yellow',
  'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
  'purple', 'fuchsia', 'pink', 'rose',
]);

/** Sufijos de estas utilidades que NO son colores. */
const NO_SON_COLORES = new Set([
  // text-
  'xs', 'sm', 'base', 'lg', 'xl', 'left', 'center', 'right', 'justify', 'start', 'end',
  'wrap', 'nowrap', 'balance', 'pretty', 'ellipsis', 'clip', 'opacity',
  // bg-
  'none', 'auto', 'cover', 'contain', 'fixed', 'local', 'scroll', 'top', 'bottom',
  'repeat', 'origin', 'blend', 'gradient', 'blur',
  // border- / ring-
  'solid', 'dashed', 'dotted', 'double', 'hidden', 'collapse', 'separate', 'spacing',
  'x', 'y', 't', 'r', 'b', 'l', 'inset', 'offset',
]);

function coloresConfigurados(): Set<string> {
  const fuente = readFileSync('tailwind.config.js', 'utf8');
  const bloque = fuente.slice(fuente.indexOf('colors:'), fuente.indexOf('plugins:'));
  return new Set([...bloque.matchAll(/^\s{8}([a-zA-Z]+):/gm)].map((m) => m[1]));
}

function ficheros(dir: string): string[] {
  return readdirSync(dir).flatMap((entrada) => {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) return ficheros(ruta);
    return /\.tsx?$/.test(ruta) ? [ruta] : [];
  });
}

describe('clases de color de Tailwind', () => {
  it('toda utilidad de color apunta a un color que existe', () => {
    const permitidos = new Set([...DE_SERIE, ...coloresConfigurados()]);
    expect(permitidos.has('brand'), 'no se han leído los colores de la configuración').toBe(true);

    const fantasmas: string[] = [];
    for (const ruta of ficheros('src')) {
      const fuente = readFileSync(ruta, 'utf8');
      // El anticipo hacia atrás evita confundir una ruta como /admin/fill-rules
      // con una clase.
      for (const m of fuente.matchAll(/(?<![\w/-])(bg|text|border|ring|fill|stroke)-([a-z][a-z]+)\b/g)) {
        const [clase, , token] = m;
        if (permitidos.has(token) || NO_SON_COLORES.has(token)) continue;
        fantasmas.push(`${ruta}: ${clase}`);
      }
    }

    expect(fantasmas, 'clases que Tailwind no generará: no pintan nada').toEqual([]);
  });
});
