import { APPEALS, APPEALS_BRAND, BRAND } from '../../config/brand';

/**
 * Plantillas de primer contacto para vendedores con la cuenta o el listing
 * suspendido en Amazon.
 *
 * Como en el resto del proyecto: aquí NO se afirma ningún hecho verificable que
 * no tengamos (ni tasas de éxito, ni plazos de reactivación, ni políticas
 * concretas de Amazon citadas de memoria). Se describe lo que hacemos nosotros.
 */

export type AppealVariant = 'A' | 'B';

export interface AppealMessageInput {
  /** Marcador [Nombre]. Si va vacío, el saludo queda neutro. */
  name?: string;
  /** Marcador [Razón]: lo que dice el correo de Amazon, en sus palabras. */
  reason?: string;
  /** Días que lleva suspendido, si se sabe. Solo lo usa la variante A. */
  daysSuspended?: number;
}

export const PLACEHOLDERS = {
  name: '[Nombre]',
  reason: '[Razón]',
  days: '[Días]',
} as const;

export interface AppealTemplate {
  variant: AppealVariant;
  title: string;
  /** Cuándo conviene usar esta variante y cuándo no. */
  whenToUse: string;
  whenNotToUse: string;
  subject: string;
  body: string;
}

function fill(template: string, input: AppealMessageInput): string {
  return template
    .replaceAll(PLACEHOLDERS.name, input.name?.trim() || 'ahí')
    .replaceAll(PLACEHOLDERS.reason, input.reason?.trim() || PLACEHOLDERS.reason)
    .replaceAll(PLACEHOLDERS.days, input.daysSuspended ? String(input.daysSuspended) : PLACEHOLDERS.days);
}

const SIGNATURE = `${APPEALS_BRAND}\n${BRAND.contactEmail}`;

/**
 * VARIANTE A — urgencia.
 * El eje es el coste de cada día parado y el hecho de que el primer Plan of
 * Action condiciona los siguientes.
 */
const TEMPLATE_A: AppealTemplate = {
  variant: 'A',
  title: 'Variante A — urgencia',
  whenToUse:
    'Suspensión reciente (menos de 7 días) y el vendedor todavía no ha enviado ningún Plan of Action. Es cuando el coste de oportunidad es más evidente y todavía no ha quemado intentos.',
  whenNotToUse:
    'Si ya lleva semanas suspendido y ha enviado varios planes rechazados: meterle prisa a alguien que ya está desesperado suena a oportunismo. Ahí va mejor la variante B.',
  subject: `Tu cuenta lleva ${PLACEHOLDERS.days} días parada`,
  body: `Hola ${PLACEHOLDERS.name}:

He visto que tienes la cuenta suspendida por esto: ${PLACEHOLDERS.reason}.

Cada día parado es inventario inmovilizado, posiciones de búsqueda que pierdes y reseñas que no entran. Y hay algo que la mayoría no sabe: el primer Plan of Action que envías condiciona todos los siguientes. Si el primero es flojo, el revisor ya te ha catalogado, y los intentos posteriores parten cuesta arriba.

Reviso tu caso y te digo qué está fallando: la causa raíz real que busca el revisor, qué pruebas te faltan y cómo se estructura el plan para que lo lean entero. El análisis cuesta ${APPEALS.analysisPrice.label}.

Si prefieres intentarlo por tu cuenta, te lo digo igual y te cuento por dónde empezar. Pero no envíes otro plan sin que alguien lo lea antes.

¿Te lo miro?

${SIGNATURE}`,
};

/**
 * VARIANTE B — solución.
 * El eje es el método: qué se hace, en qué orden y qué entregamos.
 */
const TEMPLATE_B: AppealTemplate = {
  variant: 'B',
  title: 'Variante B — solución',
  whenToUse:
    'Suspensiones con recorrido (ya ha enviado planes y se los han rechazado), o vendedores con volumen que responden mejor a un método que a una alarma. Es la variante por defecto cuando dudes.',
  whenNotToUse:
    'Primer contacto en frío con alguien que acaba de recibir la suspensión hoy: todavía no sabe que necesita un método, y la variante A conecta mejor.',
  subject: 'Cómo se estructura un Plan of Action que sí leen',
  body: `Hola ${PLACEHOLDERS.name}:

He visto que tienes la cuenta suspendida por esto: ${PLACEHOLDERS.reason}.

Casi todos los planes rechazados fallan por lo mismo: cuentan lo que pasó en vez de demostrar qué lo causó y qué has cambiado para que no se repita. El revisor busca tres cosas concretas, en este orden:

1. Causa raíz. No "un proveedor falló", sino qué parte de tu proceso permitió que ese fallo llegara al cliente.
2. Correcciones ya hechas, con prueba. Fechas y evidencia, no intenciones.
3. Medidas preventivas, con cómo se implementan. Un control que se pueda comprobar, no una promesa.

Lo que hago es exactamente eso: analizo tu caso, identifico la causa raíz que va a buscar el revisor, y te entrego el Plan of Action redactado y listo para enviar. Cuesta ${APPEALS.analysisPrice.label}.

Si me respondes con el correo que te mandó Amazon, te digo en qué categoría cae tu caso antes de que decidas nada.

${SIGNATURE}`,
};

export const APPEAL_TEMPLATES: Record<AppealVariant, AppealTemplate> = {
  A: TEMPLATE_A,
  B: TEMPLATE_B,
};

/** Devuelve la plantilla con los marcadores sustituidos. */
export function buildAppealMessage(
  variant: AppealVariant,
  input: AppealMessageInput = {},
): { subject: string; body: string } {
  const template = APPEAL_TEMPLATES[variant];
  return {
    subject: fill(template.subject, input),
    body: fill(template.body, input),
  };
}

/**
 * Recomienda variante a partir de los días suspendido.
 * Criterio comercial nuestro, no un dato de Amazon.
 */
export function recommendVariant(daysSuspended: number | undefined): AppealVariant {
  if (daysSuspended !== undefined && daysSuspended <= 7) return 'A';
  return 'B';
}
