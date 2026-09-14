import { expect, test, type Page } from '@playwright/test';
import { BRAND } from '../src/config/brand';

/**
 * El recorrido completo, en el navegador y contra el build.
 * Cada bloque es lo que haría una persona: no se tocan estados internos.
 */

const ADMIN_PASSWORD = 'complyo-dev';

async function entrarEnAdmin(page: Page, ruta = '/admin/leads') {
  await page.goto(ruta);
  const password = page.getByPlaceholder('Contraseña');
  if (await password.count()) {
    await password.fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Entrar' }).click();
  }
}

test.describe('Track B — cumplimiento', () => {
  test('landing, diagnóstico, informe y PDF', async ({ page }) => {
    await page.goto('/');
    // La portada vende APEALS. El diagnóstico RAP sigue accesible, pero como
    // segunda puerta: ver «la portada lleva a la oferta que se puede entregar».
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Plan of Action');
    await page.getByRole('link', { name: 'Ver mi exposición' }).click();
    await expect(page).toHaveURL(/\/diagnostico/);

    const siguiente = () => page.getByRole('button', { name: 'Siguiente' }).click();

    await page.getByRole('checkbox', { name: 'Alemania' }).click();
    await page.getByRole('checkbox', { name: 'Francia' }).click();
    await siguiente();
    await page.getByRole('checkbox', { name: 'Amazon EU' }).click();
    await siguiente();
    await page.getByRole('checkbox', { name: 'Electrónica de consumo' }).click();
    await siguiente();
    await page.getByRole('checkbox', { name: 'Papel y cartón' }).click();
    await siguiente();
    await page.getByRole('radio', { name: /No, vendo desde fuera/ }).click();
    await siguiente();
    await page.getByRole('radio', { name: /Más de 10.000/ }).click();
    await siguiente();
    await page.getByPlaceholder('tu@empresa.com').fill('cliente@ejemplo.invalid');
    await page.getByPlaceholder(/Nombre de tu empresa/).fill('Tienda Prueba SL');
    await siguiente();

    // La pantalla 8 resume lo respondido antes de generar nada.
    await expect(page.locator('body')).toContainText('Revisa antes de generar');
    await expect(page.locator('body')).toContainText('Alemania, Francia');

    await page.getByRole('button', { name: 'Generar mi informe' }).click();
    await expect(page).toHaveURL(/\/informe\//);

    const informe = page.locator('body');
    await expect(informe).toContainText(/INFORME-\d{8}-[A-Z0-9]{4}/);
    for (const seccion of [
      'Situación actual, país por país',
      'Qué falta y qué norma lo exige',
      'Qué pasa si no se arregla',
      'Qué cuesta y en cuánto tiempo se resuelve',
      'Resolverlo',
    ]) {
      await expect(informe).toContainText(seccion);
    }

    // El guardarraíl: con datos de ejemplo, todo va marcado.
    await expect(informe).toContainText('PENDIENTE DE VERIFICACIÓN');
    await expect(informe).toContainText('no constituye asesoramiento jurídico');

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar en PDF' }).click();
    const fichero = await descarga;
    expect(fichero.suggestedFilename()).toMatch(/^complyo-informe-\d{8}-[a-z0-9]{4}\.pdf$/);

    // El botón de «Resolverlo» tiene que hacer algo VISIBLE siempre. Cuando era
    // un enlace mailto, en un navegador sin gestor de correo el clic no hacía
    // nada y el visitante se iba pensando que la página estaba rota.
    await page.getByRole('button', { name: 'Resolverlo' }).click();
    await expect(page.locator('body')).toContainText('Vamos a ello');
    // Contra la configuración, no contra una copia: una dirección escrita a mano
    // aquí se queda obsoleta en cuanto cambia la de verdad, y este test dejaría
    // de comprobar lo único que importa —que el cliente ve un buzón que existe—.
    await expect(page.locator('body')).toContainText(BRAND.contactEmail);
    await expect(page.locator('body')).toContainText(/Quiero resolverlo — INFORME-\d{8}/);
  });

  test('el diagnóstico no deja avanzar sin responder', async ({ page }) => {
    await page.goto('/diagnostico');
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Atrás' })).toBeDisabled();
    await page.getByRole('checkbox', { name: 'España' }).click();
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeEnabled();
    await page.getByRole('button', { name: 'Siguiente' }).click();
    await expect(page.getByRole('button', { name: 'Atrás' })).toBeEnabled();
  });
});

test.describe('Track A — apelaciones', () => {
  test('clasifica el caso y guarda el lead', async ({ page }) => {
    await page.goto('/appeals');

    // Mientras no haya casos cerrados, no se publica ninguna tasa de éxito.
    await expect(page.locator('body')).toContainText('No publico tasa de éxito');

    await page.getByPlaceholder('tu@empresa.com').fill('vendedor@ejemplo.invalid');
    await page.getByLabel(/Nombre de tu tienda/).fill('Tienda Suspendida');
    await page
      .locator('textarea')
      .fill(
        'Your Amazon seller account has been deactivated because your Order Defect Rate is above the target. Please send a Plan of Action.',
      );

    await expect(page.locator('body')).toContainText('Order Defect Rate');
    await expect(page.locator('body')).toContainText('orientativo');

    await page.getByRole('button', { name: /Analizar mi caso/ }).click();
    await expect(page.locator('body')).toContainText('Recibido');
  });
});

test.describe('Oferta de entrada', () => {
  /**
   * La portada vendía el informe RAP de 97 $, que sigue bloqueado por la base de
   * reglas sin verificar. Un prospecto de APEALS aterrizaba en una oferta que no
   * se le podía entregar. Esto fija el orden.
   */
  test('la portada lleva a la oferta que se puede entregar', async ({ page }) => {
    await page.goto('/');

    // La llamada principal es APEALS.
    await page.getByRole('link', { name: 'Empezar con mi caso' }).click();
    await expect(page).toHaveURL(/\/revision/);

    // Y la portada no anuncia el precio del informe RAP, que no se puede cumplir.
    await page.goto('/');
    await expect(page.locator('main')).not.toContainText('97 $');
  });

  test('revisión de plan: analiza, recoge el lead y no cobra por adelantado', async ({ page }) => {
    await page.goto('/revision');

    // El precio está a la vista antes de pedir ningún dato.
    await expect(page.locator('body')).toContainText('59 $');
    await expect(page.locator('body')).toContainText('24 horas');

    await page
      .getByPlaceholder(/Pega aquí el mensaje completo/)
      .fill('Your listing was removed due to an intellectual property complaint from a rights owner.');

    // El analizador da algo útil antes de pedir el correo.
    await expect(page.locator('body')).toContainText('Intellectual Property');
    await expect(page.locator('body')).toContainText('orientativo');

    await page.getByPlaceholder(/Aunque esté a medias/).fill('Mi borrador: pedimos perdón.');
    await page.getByPlaceholder('tu@correo.com').fill('revision@ejemplo.invalid');
    await page.getByRole('button', { name: /Pedir la revisión/ }).click();

    await expect(page.locator('body')).toContainText('Recibido');
    await expect(page.locator('body')).toContainText('No pagas nada ahora');

    // Y el caso llega al panel con el origen y el borrador dentro del propio
    // lead: no se escribe nada después del alta, porque el visitante anónimo
    // no puede actualizar. Ver src/lib/revisionLead.ts.
    await entrarEnAdmin(page);
    await expect(page.locator('body')).toContainText('revision@ejemplo.invalid');
    await page.getByRole('textbox').first().fill('revision@ejemplo.invalid');
    await expect(page.locator('table')).toContainText('Intellectual Property');
  });

  test('mensajes: el gancho se adapta a lo que ha escrito el prospecto', async ({ page }) => {
    await entrarEnAdmin(page, '/admin/mensajes');

    // Sin cita, avisa en vez de dejar copiar un mensaje genérico.
    await expect(page.locator('body')).toContainText('no lo contesta nadie');

    await page
      .getByPlaceholder(/Pega su mensaje del foro/)
      .fill('Me han quitado el listing por una queja de trademark de un rights owner.');

    // El gancho concreto del tipo detectado, no el genérico.
    await expect(page.locator('body')).toContainText('intellectual_property');
    await expect(page.locator('body')).toContainText('retirada de la queja por parte del titular');

    // Y las respuestas a objeciones están todas.
    await expect(page.locator('body')).toContainText('"No me interesa"');
    await expect(page.locator('body')).toContainText('no insisto');
  });

  test('metas: convierte el objetivo en prospectos por día', async ({ page }) => {
    await entrarEnAdmin(page, '/admin/metas');
    await expect(page.locator('body')).toContainText('Prospectos / día');
    // Sin muestra, se avisa de que las tasas todavía no significan nada.
    await expect(page.locator('body')).toContainText('para que estas tasas signifiquen algo');
  });
});

test.describe('Panel interno', () => {
  test('el portero rechaza una contraseña incorrecta', async ({ page }) => {
    await page.goto('/admin');
    await page.getByPlaceholder('Contraseña').fill('lo-que-sea');
    await page.getByRole('button', { name: 'Entrar' }).click();
    await expect(page.locator('body')).toContainText('Contraseña incorrecta');
  });

  test('leads: filtros, estado, ingresos y notas', async ({ page }) => {
    // Se generan los dos leads por la vía normal, no tocando el almacenamiento.
    await page.goto('/appeals');
    await page.getByPlaceholder('tu@empresa.com').fill('apelacion@ejemplo.invalid');
    await page.getByLabel(/Nombre de tu tienda/).fill('Tienda A');
    await page.locator('textarea').fill('Intellectual property complaint from a rights owner.');
    await page.getByRole('button', { name: /Analizar mi caso/ }).click();
    await expect(page.locator('body')).toContainText('Recibido');

    await entrarEnAdmin(page);
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('body')).toContainText('apelacion@ejemplo.invalid');

    // Filtro por tipo.
    await page.locator('select').first().selectOption('complyo');
    await expect(page.locator('body')).not.toContainText('apelacion@ejemplo.invalid');
    await page.locator('select').first().selectOption('');

    // Búsqueda.
    await page.getByRole('textbox').first().fill('apelacion');
    await expect(page.locator('body')).toContainText('apelacion@ejemplo.invalid');
    await page.getByRole('textbox').first().fill('');

    // Estado e ingreso.
    await page.getByLabel('Estado de apelacion@ejemplo.invalid').selectOption('convertido');
    await page.getByLabel('Ingreso de apelacion@ejemplo.invalid').fill('1500');
    await page.keyboard.press('Tab');
    await expect(page.locator('body')).toContainText('1500 $');

    // Notas.
    await page.getByRole('button', { name: /Notas \(0\)/ }).first().click();
    await page.getByPlaceholder('Nueva nota…').fill('Primer contacto.');
    await page.getByRole('button', { name: 'Añadir' }).click();
    await expect(page.locator('body')).toContainText('Primer contacto.');
  });

  test('los leads se paginan y los filtros no se saltan páginas', async ({ page }) => {
    // Se crean 7 leads por la vía normal para que haya varias páginas.
    for (let i = 0; i < 7; i += 1) {
      await page.goto('/appeals');
      await page.getByPlaceholder('tu@empresa.com').fill(`pag-${i}@ejemplo.invalid`);
      await page.locator('textarea').fill('Order Defect Rate above target. Account deactivated.');
      await page.getByRole('button', { name: /Analizar mi caso/ }).click();
      await expect(page.locator('body')).toContainText('Recibido');
    }

    await entrarEnAdmin(page);
    await page.getByLabel('Por página').selectOption('25');
    await expect(page.locator('body')).toContainText('de 7');

    // Con 25 por página caben todos: no hay siguiente.
    await expect(page.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Anterior' })).toBeDisabled();

    // El total de arriba es del filtro entero, no de la página.
    await expect(page.locator('body')).toContainText('Leads del filtro');

    // Un filtro que no deja nada recoloca a la página 1 y lo dice.
    await page.getByRole('textbox').first().fill('no-existe-nadie-asi');
    await expect(page.locator('body')).toContainText('No hay leads con esos filtros');
    await expect(page.locator('body')).toContainText('Página 1 de 1');

    await page.getByRole('textbox').first().fill('');
    await expect(page.locator('body')).toContainText('de 7');
  });

  test('rellenar reglas: valida, avisa y guarda', async ({ page }) => {
    await entrarEnAdmin(page, '/admin/fill-rules');

    await page.getByRole('button', { name: 'Validar' }).click();
    await expect(page.locator('body')).toContainText('No se puede guardar');

    await page.getByLabel(/Nombre del registro/).fill('Registro de prueba');
    await page.getByLabel(/Periodicidad/).fill('anual');
    await page.getByLabel(/Datos que exige/).fill('Número de identificación fiscal');
    await page.getByLabel(/Consecuencia/).fill('Consecuencia documentada en la fuente.');
    await page
      .getByLabel(/URL de la fuente/)
      .fill('https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32025R0040');

    await page.getByRole('button', { name: 'Validar' }).click();
    // Es válida, pero avisa de que sigue sin verificar: eso no bloquea.
    await expect(page.locator('body')).toContainText('Avisos');

    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('body')).toContainText('Guardada la obligación');

    await page.goto('/admin/rules-status');
    await expect(page.locator('body')).toContainText('de 18 obligaciones completas');
    await expect(page.locator('body')).toContainText('Registro de prueba');
  });

  test('prospección alterna A y B y registra la variante', async ({ page }) => {
    await entrarEnAdmin(page, '/prospeccion');

    await expect(page.locator('body')).toContainText('Variante A — desactivación del listing');
    await expect(page.locator('body')).toContainText('Variante B — sanción económica');

    await page.getByPlaceholder(/B0XXXXXXXX/).fill('B0PRUEBA01');
    await page.getByRole('button', { name: /Registrar prospecto \(A\)/ }).click();
    await expect(page.locator('body')).toContainText('con variante A');

    await page.getByPlaceholder(/B0XXXXXXXX/).fill('B0PRUEBA02');
    await page.getByRole('button', { name: /Registrar prospecto \(B\)/ }).click();
    await expect(page.locator('body')).toContainText('A = 1, B = 1');

    await page.getByLabel('Respondió B0PRUEBA02').check();

    // El panel A/B recoge lo anterior y avisa de que la muestra es corta.
    await page.goto('/admin/ab');
    await expect(page.locator('body')).toContainText('Muestra corta');
    await expect(page.locator('body')).not.toContainText('significativ');
  });

  test('el Plan of Action puntúa, avisa de lo que falta y genera el documento', async ({ page }) => {
    await entrarEnAdmin(page, '/admin/poa');

    await expect(page.locator('body')).toContainText('Le falta');
    await expect(page.locator('body')).toContainText('Al menos una causa raíz');

    await page.getByLabel('Nombre del vendedor').fill('Tienda Prueba');
    await page.getByLabel(/Motivo, tal y como/).fill('Order Defect Rate');
    await page
      .getByLabel(/Causa raíz/)
      .fill('El control de calidad de salida no cubría los envíos directos del proveedor.');

    await page.getByRole('button', { name: 'Añadir corrección' }).click();
    await page.getByPlaceholder('Qué has corregido').fill('Cambio de proveedor');
    await page.getByPlaceholder(/Prueba: URL/).fill('Contrato firmado el 1 de septiembre');
    await page.locator('input[type="date"]').first().fill('2026-09-01');

    await page.getByRole('button', { name: 'Añadir medida' }).click();
    await page.getByPlaceholder('La medida').fill('Inspección del 100 % de las entradas');
    await page.getByPlaceholder(/Cómo se implementa/).fill('Checklist diario del almacén');

    await expect(page.locator('body')).toContainText('Las tres partes están');
    await expect(page.locator('pre')).toContainText('# Plan of Action — Tienda Prueba');
    await expect(page.locator('pre')).toContainText('1. Causa raíz');

    // La puntuación mide lo completo que está el plan, y se dice así.
    await expect(page.locator('body')).toContainText('no la probabilidad de que te');

    await page.getByRole('button', { name: 'Texto plano' }).click();
    await expect(page.locator('pre')).not.toContainText('**');

    await page.getByRole('button', { name: 'JSON' }).click();
    await expect(page.locator('pre')).toContainText('"suspensionType"');

    const descarga = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Descargar' }).click();
    expect((await descarga).suggestedFilename()).toBe('poa-tienda-prueba.json');
  });

  test('el historial recoge el alta y el cambio de una obligación', async ({ page }) => {
    await entrarEnAdmin(page, '/admin/fill-rules');

    await page.getByLabel(/Nombre del registro/).fill('Registro inicial');
    await page.getByLabel(/Periodicidad/).fill('anual');
    await page.getByLabel(/Datos que exige/).fill('Número de identificación fiscal');
    await page.getByLabel(/Consecuencia/).fill('Consecuencia documentada en la fuente.');
    await page
      .getByLabel(/URL de la fuente/)
      .fill('https://eur-lex.europa.eu/legal-content/ES/TXT/?uri=CELEX:32025R0040');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('body')).toContainText('Guardada la obligación');

    // Se edita y se vuelve a guardar: debe quedar una modificación con el campo.
    await page.getByRole('button', { name: 'Editar' }).first().click();
    await page.getByLabel(/Periodicidad/).fill('trimestral');
    await page.getByRole('button', { name: 'Guardar' }).click();
    await expect(page.locator('body')).toContainText('Guardada la obligación');

    await page.goto('/admin/rules-history');
    const historial = page.locator('body');
    await expect(historial).toContainText('Alta');
    await expect(historial).toContainText('Modificación');
    await expect(historial).toContainText('Periodicidad de declaración');
    await expect(historial).toContainText('anual');
    await expect(historial).toContainText('trimestral');
  });

  test('la sesión se cierra al salir', async ({ page }) => {
    await entrarEnAdmin(page);
    await expect(page.locator('body')).toContainText('operador (local)');
    await page.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByPlaceholder('Contraseña')).toBeVisible();
  });
});
