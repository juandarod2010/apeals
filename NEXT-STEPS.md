# Qué queda, en orden

Actualizado al terminar la fase 2.

---

## Bloque 0 — Lo único que te bloquea de verdad

Todo lo demás está construido y funcionando. Esto no lo puede hacer una máquina:
hay que leer fuentes oficiales y hablar con personas.

1. **Rellenar la base de reglas.** 18 combinaciones (6 países × 3 flujos).
   Se hace en `/admin/fill-rules`, con la guía de EUR-Lex desplegada al lado, y
   el avance se ve en `/admin/rules-status`. Método completo en RULES-GUIDE.md.
   Hasta que esto esté, cada obligación del informe sale marcada como
   **PENDIENTE DE VERIFICACIÓN** y el informe no se le puede enseñar a un
   cliente. Es el bloqueante del Track B entero.

2. **Verificar el Reglamento (UE) 2025/40 y su fecha de aplicación** en EUR-Lex.
   Es el único dato normativo escrito en el código (`src/config/brand.ts`) y
   viene de tu encargo, no de una fuente consultada. Aparece en la landing, en
   el informe y en las dos plantillas de prospección.

3. **Cerrar el acuerdo con el socio establecido en la Unión Europea.** El
   descargo de responsabilidad afirma que las altas se tramitan a través de
   socios establecidos en la UE. Si ese socio no existe todavía, el descargo
   dice algo que no es verdad, y va en el pie de cada página del PDF.

4. **Pasar el descargo por un abogado.** `DISCLAIMER` en `src/config/brand.ts`.

5. **Track A: reunir tus primeros casos cerrados.** La página `/appeals` no
   publica ninguna tasa de éxito porque no hay nada que la respalde. Cuando
   tengas casos, rellena `APPEALS.successRate` con la cifra y el tamaño de la
   muestra, y la página la enseña sola.

---

## Bloque 1 — Para operar de verdad (una tarde)

El código de este bloque **ya está hecho**. Lo que queda son tus claves y tus
decisiones. Ejecuta `npm run predeploy:check` y te dice exactamente qué falta.

6. **Conectar Supabase** → SUPABASE.md. Sin esto, cada lead vive en el navegador
   del visitante y **tú no lo ves nunca**. Tres migraciones y dos variables.

7. ~~Añadir inicio de sesión en `/admin`~~ **Hecho.** El panel detecta si hay
   Supabase: si lo hay, pide correo y contraseña reales contra Supabase Auth, y
   esa sesión es la que hace que RLS te deje leer. Si no lo hay, sigue el
   portero local. Solo te queda **crear tu usuario** en Authentication → Users
   (SUPABASE.md, sección 6). Nunca la `service_role` en el navegador.

8. **Cambiar `VITE_ADMIN_PASSWORD`.** La de por defecto es `complyo-dev` y está
   escrita en el README. Con Supabase conectado deja de ser la puerta, pero
   sigue siendo la del modo local.

9. **Decidir la marca real.** Hecho salvo el dominio: Complyo es la marca
   matriz, Complyo APEALS el producto de apelaciones, y el correo de contacto
   ya es real. `domain` sigue en `complyo.eu` y no lo ve ningún cliente. Un solo
   fichero: `src/config/brand.ts`. Ahí están también los colores del PDF y el
   hueco del logo (`BRAND_LOGO`).

10. **Ajustar `SERVICE_COMMITMENTS`.** Promete informe en 24 horas y alta
    iniciada al confirmar el pago. Son promesas tuyas.

11. **Desplegar.** `vercel.json` y `netlify.toml` están listos, con la
    redirección de rutas a `index.html`. Antes: `npm run predeploy:check`, que
    revisa marca, descargo, claves, contraseña y build. Hay CI en
    `.github/workflows/ci.yml` con lint, build, tests y comprobación de salud.

12. **Configurar el aviso de lead nuevo.** El disparador está escrito
    (`supabase/migrations/0003_avisos.sql`): ejecuta la migración y pega tu URL
    en la tabla `ajustes`. Instrucciones en SUPABASE.md, sección 7. Mientras
    tanto, el contador junto a «Leads» dice cuántos hay sin tocar.

    El correo al cliente lo sigues enviando tú: el botón «Correo» de
    `/admin/leads` copia el texto que toca según el tipo de lead (entrega del
    diagnóstico, o primera lectura del caso de Amazon con los próximos pasos del
    analizador ya metidos). Las versiones editables están en `/templates/`.

---

## Bloque 2 — Ideas que me guardé en vez de construir

Ninguna está en el código.

- Envío automático del PDF por correo al cliente (hoy el texto se copia y lo
  envías tú).
- Cobro del informe y del análisis de apelación (enlace de pago externo pegado
  en el botón, sin integración).
- ~~Panel de tasa de respuesta A/B, con serie temporal~~ **Hecho**
  (`/admin/ab`): acumulado y evolución semana a semana.
- ~~Editor del Plan of Action~~ **Hecho** (`/admin/poa`). Prellena desde el lead,
  puntúa lo completo que está el plan, dice qué falta y saca el documento en
  Markdown, texto plano y JSON.
- ~~Historial de versiones de la base de reglas~~ **Hecho**
  (`/admin/rules-history`). Registra cada alta, cambio y baja campo a campo,
  distingue lo que afecta al cliente de lo que es mantenimiento interno, y
  genera el aviso de vigilancia acotado a las obligaciones que salían en el
  informe de ese cliente. Es la sustancia de la suscripción de 39 $/mes.
- Versión del informe en inglés, para socios que no hablan español. (En la fase 1
  pediste expresamente nada de multiidioma; sigue sin construirse.)
- Más países y más flujos: el esquema y el motor los soportan sin cambios.
- Un caso por país en los tests del motor, cuando la base de reglas sea real.

---

## Deuda técnica conocida

- ~~`/admin/leads` carga todo de golpe~~ **Resuelto**: el panel pagina en el
  origen. Pide solo las filas de la página, los informes solo de esos leads, y
  las cifras de cabecera con consultas de recuento que no traen filas. La
  exportación sigue pidiéndolo todo, pero solo al pulsar el botón: ese es su
  cometido.
- **La comparación A/B (`/admin/ab`) y el informe semanal sí recorren todos los
  leads.** Son cálculos sobre el conjunto entero, así que hoy es correcto; con
  decenas de miles convendría moverlos a una consulta agregada en la base.
- ~~`rules:check` solo mira las reglas del código~~ **Resuelto**: ahora lee
  también la tabla `reglas` cuando Supabase está configurado, con la misma
  precedencia que la aplicación, y dice de dónde ha leído. Si RLS no le deja
  leer, avisa en vez de dar por buena una base que no ha mirado.
- **En modo MOCK los informes dependen del `localStorage` del visitante**: si lo
  borra, el enlace `/informe/:id` deja de resolver. Se arregla al conectar
  Supabase.
- **Los borradores del Plan of Action viven en tu navegador**, no en la base de
  datos: es un documento de trabajo que cambia cada dos minutos mientras lo
  redactas. Los planes terminados, descárgalos.
- **El analizador de suspensiones es un clasificador por palabras clave.**
  Acierta en los casos típicos y falla en los redactados de forma inusual. Por
  eso nunca dice más del 90 % de confianza y siempre lleva descargo.
- **La cobertura de tests mide la lógica, no las pantallas.** Las pantallas las
  cubre `npm run test:e2e`, que ya está en el repositorio y en el CI: nueve
  recorridos en Chromium contra el build.
- ~~El motor no distingue «no hay obligación» de «ese país no está cargado»~~
  **Resuelto**: ahora lo separa, y el informe (pantalla y PDF) lo dice en claro
  al cliente — «que no aparezca aquí no significa que no tengas obligaciones
  allí». Lo contrario se leía como una respuesta cuando era un hueco nuestro.
