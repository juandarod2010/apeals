/**
 * Comprobación de salud del proyecto.
 *
 * Verifica lo que se puede verificar sin navegador:
 *   - Variables de entorno presentes y coherentes.
 *   - Conexión con Supabase y existencia de las tablas (si está configurado).
 *   - Estado de la base de reglas.
 *   - Que el generador de PDF produce un fichero válido.
 *   - Que el build está hecho y las rutas tienen su fichero de páginas.
 *
 * Uso: npm run health:check [-- --json]
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { RULES } from '../data/rules';
import { isMock, loadEnv, supabaseCredentials } from './lib/env';

type Status = 'ok' | 'aviso' | 'fallo';

interface Check {
  name: string;
  status: Status;
  detail: string;
}

const checks: Check[] = [];
const add = (name: string, status: Status, detail: string) => checks.push({ name, status, detail });

async function run(): Promise<void> {
  const env = loadEnv();

  // --- Variables de entorno ------------------------------------------------
  if (!existsSync(resolve(process.cwd(), '.env'))) {
    add('Fichero .env', 'aviso', 'No existe. Se usan valores por defecto (modo MOCK).');
  } else {
    add('Fichero .env', 'ok', 'Presente.');
  }

  const credentials = supabaseCredentials(env);
  if (isMock(env) && credentials) {
    // La contradiccion que mas caro sale: las claves estan puestas y son
    // buenas, asi que las tablas de abajo responden y el resumen sale sin
    // fallos. Pero la aplicacion no las usa, y cada lead se queda en el
    // navegador del visitante. Parece conectado y no lo esta.
    add(
      'Modo',
      'fallo',
      'Hay credenciales de Supabase, pero VITE_MOCK no vale exactamente "false": ' +
        'la aplicacion NO las usa y los leads se guardan en el navegador del visitante.',
    );
  } else if (isMock(env)) {
    add('Modo', 'ok', 'MOCK: los datos viven en el localStorage del navegador.');
  } else if (!credentials) {
    add('Modo', 'fallo', 'VITE_MOCK=false pero faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY.');
  } else {
    add('Modo', 'ok', 'Supabase con credenciales presentes.');
  }

  if (!env.VITE_ADMIN_PASSWORD) {
    add(
      'Contraseña de admin',
      'aviso',
      'VITE_ADMIN_PASSWORD sin definir: se usa la de desarrollo, que está escrita en el README.',
    );
  } else if (env.VITE_ADMIN_PASSWORD === 'complyo-dev') {
    add('Contraseña de admin', 'aviso', 'Sigue siendo la de desarrollo. Cámbiala antes de desplegar.');
  } else {
    add('Contraseña de admin', 'ok', 'Definida y distinta de la de desarrollo.');
  }

  // --- Supabase ------------------------------------------------------------
  if (credentials) {
    const db = createClient(credentials.url, credentials.key);
    for (const table of ['leads', 'informes', 'prospectos', 'reglas', 'reglas_historial']) {
      try {
        const { error } = await db.from(table).select('id').limit(1);
        if (!error) {
          add(`Tabla ${table}`, 'ok', 'Responde.');
        } else if (/permission denied|row-level security/i.test(error.message)) {
          // Con RLS bien puesto, la clave anónima NO puede leer. Es lo correcto.
          add(`Tabla ${table}`, 'ok', 'Existe y RLS bloquea la lectura anónima, como debe ser.');
        } else {
          add(`Tabla ${table}`, 'fallo', error.message);
        }
      } catch (e) {
        add(`Tabla ${table}`, 'fallo', (e as Error).message);
      }
    }
  } else {
    add('Supabase', 'aviso', 'Sin credenciales: no se ha comprobado la base de datos.');
  }

  // --- Base de reglas ------------------------------------------------------
  const verified = RULES.filter((r) => r.verified).length;
  if (verified === 0) {
    add(
      'Base de reglas',
      'aviso',
      `0 de ${RULES.length} obligaciones verificadas. El informe no se puede enseñar a un cliente.`,
    );
  } else if (verified < RULES.length) {
    add('Base de reglas', 'aviso', `${verified} de ${RULES.length} verificadas.`);
  } else {
    add('Base de reglas', 'ok', `Las ${RULES.length} obligaciones están verificadas.`);
  }

  // --- Generación de PDF ---------------------------------------------------
  try {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    doc.text('health-check', 10, 10);
    const output = doc.output('arraybuffer');
    const head = Buffer.from(output.slice(0, 5)).toString();
    if (head === '%PDF-') {
      add('Generación de PDF', 'ok', `jsPDF produce un PDF válido (${output.byteLength} bytes).`);
    } else {
      add('Generación de PDF', 'fallo', 'La salida de jsPDF no empieza por %PDF-.');
    }
  } catch (e) {
    add('Generación de PDF', 'fallo', (e as Error).message);
  }

  // --- Rutas ---------------------------------------------------------------
  const appPath = resolve(process.cwd(), 'src/App.tsx');
  const app = existsSync(appPath) ? readFileSync(appPath, 'utf8') : '';
  const routes = [...app.matchAll(/path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '*');
  const pageImports = [...app.matchAll(/from '\.\/pages\/([^']+)'/g)].map((m) => m[1]);
  const missingPages = pageImports.filter(
    (page) => !existsSync(resolve(process.cwd(), `src/pages/${page}.tsx`)),
  );
  if (missingPages.length > 0) {
    add('Rutas', 'fallo', `Faltan ficheros de página: ${missingPages.join(', ')}.`);
  } else {
    add('Rutas', 'ok', `${routes.length} rutas declaradas, todas con su página: ${routes.join(', ')}.`);
  }

  // --- Build ---------------------------------------------------------------
  if (existsSync(resolve(process.cwd(), 'dist/index.html'))) {
    add('Build', 'ok', 'Existe dist/index.html.');
  } else {
    add('Build', 'aviso', 'No hay build todavía. Ejecuta npm run build.');
  }

  // --- Salida --------------------------------------------------------------
  const failures = checks.filter((c) => c.status === 'fallo');

  if (process.argv.includes('--json')) {
    console.log(JSON.stringify({ checks, ok: failures.length === 0 }, null, 2));
  } else {
    const icon: Record<Status, string> = { ok: '✓', aviso: '!', fallo: '✗' };
    const width = Math.max(...checks.map((c) => c.name.length));
    for (const check of checks) {
      console.log(`${icon[check.status]} ${check.name.padEnd(width)}  ${check.detail}`);
    }
    console.log(
      `\n${checks.filter((c) => c.status === 'ok').length} correcto(s), ` +
        `${checks.filter((c) => c.status === 'aviso').length} aviso(s), ` +
        `${failures.length} fallo(s).`,
    );
  }

  process.exit(failures.length === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
