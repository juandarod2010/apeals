# Acción ahora — del 0 al primer cliente

Este fichero sustituye a NEXT-STEPS.md como lista de trabajo diaria. NEXT-STEPS
sigue siendo válido, pero es la lista del Track B, y el Track B no puede cobrar
todavía. Esto es lo que sí puede.

---

## Por qué hemos cambiado de oferta

Después de cuatro fases hay mucha infraestructura y **cero dólares**. El motivo
no es que falte código: es que las dos ofertas existentes están bloqueadas por
cosas que no dependen del código.

| Oferta | Precio | Qué la bloquea | ¿Se puede cobrar hoy? |
| --- | --- | --- | --- |
| Informe RAP (Track B) | 97 $ | Base de reglas real, socio en la UE, revisión de abogado | **No** |
| Apelación completa (Track A) | 1.500 $ | Nadie paga 1.500 $ en frío a alguien sin historial | **No, todavía** |
| **Revisión de Plan of Action** | **59 $** | Nada | **Sí** |

La revisión se apoya solo en piezas terminadas: el analizador
(`src/modules/appeals/analyzer.ts`) y el motor de Plan of Action
(`src/modules/appeals/poa-template.ts`). No necesita dato regulatorio, ni socio,
ni abogado, ni afirmar ninguna tasa de éxito.

### Evidencia de que el precio tiene hueco

Consultado el 13 de septiembre de 2026:

- The Appeal Guru: **1.495 $** por apelación completa.
- Servicio en Fiverr, redacción de apelación y plan: **395 $**.
- Consultoría por horas: **318 $** (159 $/h × 2 h).
- Suelo de Fiverr: **15–100 $**, calidad muy desigual.

Los 59 $ quedan por encima del tramo basura y muy por debajo del tramo de
redacción completa. Y el producto es distinto: **no escribimos tu plan, lo
revisamos**. Es lo que hace defendible entregar en 24 horas sin mentir.

Fuentes: [Appeal Guru](https://theappealguru.com/) ·
[gig de Fiverr a 395 $](https://www.fiverr.com/tscharr22/write-a-amazon-suspension-appeal-letter-and-plan-of-action) ·
[Amazon Sellers Lawyer, planes de acción 2026](https://amazonsellerslawyer.com/blog/amazon-plans-of-action/2026-plans-of-action-for-suspended-sellers/)

---

## Las cuentas

Están calculadas en `src/lib/funnel.ts` y se ven en `/admin/metas`.

```
100 $/semana ÷ 59 $  =  2 clientes/semana
2 clientes ÷ 20 % de cierre  =  10 respuestas/semana
10 respuestas ÷ 10 % de respuesta  =  100 prospectos/semana  =  20 al día
```

**El 10 % y el 20 % no están medidos.** Son tasas de arranque conservadoras
para tener un número el primer día. A los 40 prospectos contactados, la pantalla
empieza a usar las tuyas reales y te lo dice. Si salen peores, el número de
prospectos sube: eso es información, no un fracaso.

20 prospectos al día, a unos 3 minutos cada uno bien personalizado, es alrededor
de **1 hora diaria**. Cabe de sobra en tus 15 horas semanales, y deja sitio para
entregar las revisiones (1–2 horas cada una las primeras veces).

---

## Dónde están los prospectos

El criterio que manda: **alguien que ha publicado él mismo, en público, que
tiene una suspensión o un plan rechazado.** Si no puedes citar sus palabras, no
es un prospecto. Nada de listas, nada de scraping, nada de mensajes en masa.

| Canal | Qué buscar | Nota |
| --- | --- | --- |
| Foros de vendedores de Amazon (Seller Central Forums) | Hilos de suspensión sin respuesta útil | Lee sus normas antes de ofrecer nada: varios foros prohíben la promoción y ahí se responde aportando, no vendiendo |
| r/AmazonSeller, r/FulfillmentByAmazon | «account deactivated», «POA rejected» | Responde en público con algo útil y ofrece por privado solo si lo pide |
| Grupos de Facebook de vendedores FBA | Lo mismo | Pide permiso al administrador antes de ofrecer servicios |
| Discord y Slack de ecommerce | Canales de account health | Preséntate antes de ofrecer |

**Regla que no se salta:** primero se aporta algo útil en público y gratis, sin
pedir nada. La oferta solo aparece si la persona sigue la conversación. Un
mensaje privado no solicitado a alguien que no ha hablado de su caso es spam,
aunque esté bien escrito.

### Calificación (antes de escribir)

Cuenta como prospecto si cumple las cuatro:

1. Ha dicho él mismo que tiene una suspensión o un plan rechazado.
2. Se entiende el motivo, aunque sea a grandes rasgos.
3. Vende de verdad (no es una cuenta recién abierta pidiendo consejo general).
4. No lleva más de ~60 días parado. Más allá, el caso suele necesitar bastante
   más que una revisión de documento y le estarías vendiendo algo que no le
   resuelve.

Si falla alguna: no se contacta. Anótalo igualmente como descartado.

---

## El proceso, de principio a fin

1. **Encontrar** — 20 casos al día según el criterio de arriba.
2. **Clasificar** — pega su texto en `/revision` y el analizador te dice el tipo
   y la dificultad. Tarda segundos y es lo que hace específico el mensaje.
3. **Escribir** — `/prospeccion` genera el mensaje. El gancho sale del tipo de
   suspensión (`src/modules/appeals/entryMessages.ts`): hay uno distinto por
   cada uno de los 11 tipos, y es lo que separa tu mensaje de los otros veinte
   que recibe esa semana.
4. **Registrar** — cada prospecto contactado se anota, o las métricas mienten.
5. **Seguir** — seguimiento 1 a los 3 días, seguimiento 2 a los 7. Después no se
   vuelve a escribir a esa persona. Nunca.
6. **Entregar** — el caso entra por `/revision` y aparece en `/admin/leads` con
   la nota `ORIGEN: Revisión de Plan of Action`. Redactas en `/admin/poa`, que
   prellena desde el lead, puntúa lo completo que está el plan y te dice qué
   falta.
7. **Cobrar** — al entregar, no antes. Anota el ingreso en el lead: es lo que
   alimenta `/admin/metas`.
8. **Pedir testimonio** — al entregar, no después. Y si la revisión le ha
   servido, ofrécele el caso completo por 1.500 $ descontando los 59 $.

---

## Lo que tienes que hacer tú

Esto es lo único que no puede hacer una máquina. En orden, y no lleva más de una
tarde.

### 1. Decidir la marca — HECHO

Complyo es la marca matriz y **Complyo APEALS** el producto de apelaciones y
revisión de Plan of Action, que es lo que se vende primero. El correo de
contacto ya es real y firma todos los mensajes salientes.

Queda sin decidir `domain`, que sigue en `complyo.eu`. **No lo ve ningún
cliente**: sólo lo usa `predeploy:check` para avisarte. Se rellena cuando
decidas dónde se publica.

### 2. Desplegar — HECHO

Proyecto de Vercel `complyo-apeals`, enlazado a `juandarod2010/apeals`. La rama
de producción es `main`: **cada push a `main` despliega solo**, no hace falta
ejecutar nada a mano.

```bash
npm run predeploy:check     # antes de empujar: te dice qué falta
```

**Lo que no se puede olvidar.** Las variables `VITE_*` se incrustan al
CONSTRUIR, no se leen en ejecución. Viven en Vercel, en Settings →
Environment Variables, y hay que marcarlas en **Production**:

| Variable | Valor |
| --- | --- |
| `VITE_MOCK` | `false` |
| `VITE_SUPABASE_URL` | la del proyecto de Supabase |
| `VITE_SUPABASE_ANON_KEY` | la clave `anon`, que es pública por diseño |
| `VITE_ADMIN_PASSWORD` | una contraseña propia |

Si faltan, el build sale en MOCK y el sitio publicado se traga todos los leads.
Para que eso no pase en silencio, las páginas que recogen casos avisan en rojo
cuando el almacenamiento es MOCK y el dominio no es local. Ver
`src/lib/deployGuard.ts`.

**Un cambio de variables no se aplica solo:** hay que desplegar otra vez, porque
lo que cambia es el build.

### 3. Conectar Supabase (30 minutos)

Sigue `SUPABASE.md`. **Sin esto, cada lead se queda en el navegador del visitante
y tú no lo ves nunca.** Es el único paso técnico que es de verdad obligatorio:
sin él, la página de captación no captura nada.

Resultado esperado: envías una prueba desde `/revision` y la ves en
`/admin/leads`.

### 4. Cambiar la contraseña del panel

`VITE_ADMIN_PASSWORD`. La de por defecto está escrita en el README.

### 5. Abrir la vía de cobro (20 minutos)

**PayPal**, cuenta Business, con el banco panameño vinculado. No hay que
integrar nada: se cobra al entregar, pegando el enlace en el correo.

Comprobado para Panamá, porque no todo vale:

| Proveedor | ¿Sirve? | Por qué |
| --- | --- | --- |
| **PayPal** | **Sí** | Recibe pagos comerciales y retira a banco panameño vía MetroBank-Kipo: 750 $/día, 5.000 $/mes por persona natural |
| Payoneer | Sí | Alternativa. Cédula y prueba de domicilio; retiro en 2–5 días por B/.1,50–3,00 |
| Stripe | No | Panamá no está soportado. Solo con una LLC en EE. UU. |
| Wise | No | Un residente en Panamá no puede mantener saldo ni tener tarjeta |

**Cuenta con un 4,4 % + comisión fija** en pagos internacionales, que es lo que
serán casi todos: sobre 59 $ son unos 2,90 $. Y **cobra en USD**; si el pago
llega en otra moneda, PayPal añade un 3–4 % de diferencial de cambio encima.

Los tres proveedores exigen **18 años cumplidos**, porque abrir la cuenta es
firmar un contrato. Si no los tienes, la cuenta la abre un adulto a su nombre y
pasa a ser el titular legal y fiscal de esos ingresos. Falsear la edad acaba en
cierre de cuenta y retención de fondos, justo cuando ya hay dinero dentro.

Cuando tengas el enlace, va en `PAYMENT` (`src/config/brand.ts`). Mientras esté
vacío, el correo de entrega avisa de que no puede salir, y `predeploy:check`
también.

Resultado esperado: un enlace que abre una pantalla de pago de 59 $.

### 6. Los primeros 20 prospectos

Una hora. Foros y subreddits de la tabla de arriba. Antes de escribir a nadie,
**lee las normas de cada comunidad**: en varias, ofrecer servicios sin permiso
del administrador es motivo de expulsión, y perder la cuenta te cierra el canal.

---

## Cómo sabremos si esto funciona

Un experimento, una variable, y un criterio de parada escrito antes de empezar.

- **Hipótesis:** un vendedor con la cuenta suspendida paga 59 $ por una revisión
  de su Plan of Action entregada en 24 horas.
- **Acción:** 100 prospectos calificados, mensaje personalizado a partir de lo
  que ha escrito él.
- **Métrica principal:** respuestas. La de decisión es clientes.
- **Criterio de éxito:** ≥ 1 cliente en los primeros 100 prospectos.
- **Criterio de fracaso:** 0 respuestas en 100 prospectos → el problema es el
  canal o el mensaje, no el precio. Se cambia **una** cosa: primero el canal.
- **Si hay respuestas pero nadie compra:** el problema es la oferta o el precio.
  Ahí se prueba entregar la primera revisión gratis a cambio de un testimonio;
  sin historial, el testimonio vale más que los 59 $.

Revisar a los 100 prospectos, no antes. Con 20 no se concluye nada.

---

## Lo que sigue bloqueado, y da igual por ahora

El Track B entero (base de reglas, socio en la UE, abogado) sigue donde estaba,
en NEXT-STEPS.md. No lo toques hasta que la revisión esté dando clientes: es
trabajo grande, sin cobro, y contra una fecha —agosto de 2026— que **ya ha
pasado**. Eso también hay que revisarlo: la landing del Track B anuncia como
futuro algo con fecha de aplicación anterior a hoy.
