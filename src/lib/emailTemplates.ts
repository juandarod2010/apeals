import {
  APPEALS,
  APPEALS_BRAND,
  BRAND,
  DISCLAIMER,
  ENTRY_OFFER,
  PAYMENT,
  PAYMENT_LINK_MISSING,
} from '../config/brand';

/**
 * Correo de entrega del diagnóstico.
 *
 * La versión editable a mano está en /templates/email-diagnosis-sent.txt.
 * Esta es la misma, con los marcadores rellenos, para poder copiarla desde el
 * panel interno. Si cambias una, cambia la otra.
 */
export interface DiagnosisEmailInput {
  name?: string | null;
  reference: string;
}

export function buildDiagnosisEmail({ name, reference }: DiagnosisEmailInput): {
  subject: string;
  body: string;
} {
  return {
    subject: 'Tu diagnóstico de cumplimiento UE está listo',
    body: `Hola${name ? `, ${name}` : ''}:

Tu diagnóstico está listo. Lo tienes en el archivo adjunto (${reference}).

Incluye:
- Qué te falta, país por país
- El riesgo de cada obligación y qué norma lo exige
- Qué cuesta resolverlo y en qué plazos

Si tienes dudas, responde a este correo y lo vemos.

${BRAND.name}
${BRAND.contactEmail}

---
${DISCLAIMER}`,
  };
}

/**
 * Primera respuesta a un lead de apelaciones.
 * La versión editable a mano está en /templates/email-appeal-received.txt.
 * Los próximos pasos salen del analizador: no se inventan aquí.
 */
export interface AppealEmailInput {
  name?: string | null;
  suspensionTypeLabel: string;
  nextSteps: string[];
}

export function buildAppealReplyEmail({
  name,
  suspensionTypeLabel,
  nextSteps,
}: AppealEmailInput): { subject: string; body: string } {
  const steps = nextSteps.slice(0, 3);
  return {
    subject: 'Tu caso de Amazon — primera lectura',
    body: `Hola${name ? `, ${name}` : ''}:

He leído lo que me has contado. Por lo que describes, tu caso cae en:
${suspensionTypeLabel}

Lo primero que haría yo, en este orden:

${steps.length ? steps.map((s, i) => `${i + 1}. ${s}`).join('\n') : '1. Leer entero el correo original de Amazon.'}

Y lo que NO haría todavía: enviar otro Plan of Action. Cada intento rechazado
deja rastro en el expediente y hace más cuesta arriba el siguiente.

Si quieres que lo lleve yo: analizo el caso a fondo, identifico la causa raíz
que va a buscar el revisor y te entrego el Plan of Action redactado y listo para
enviar. Son ${APPEALS.analysisPrice.label}.

Lo que no te voy a decir es que tengo un porcentaje de éxito garantizado. Nadie
puede garantizarte una reactivación, y quien te la garantice te está mintiendo.

¿Seguimos?

${BRAND.name}
${BRAND.contactEmail}`,
  };
}

/**
 * Correo de ENTREGA de la revisión de Plan of Action. Es también la factura.
 *
 * La oferta se cobra al entregar, no antes (ver ENTRY_OFFER en config/brand).
 * O sea que este correo es el único momento en que se pide dinero: si sale sin
 * enlace de pago, has hecho el trabajo y no lo vas a cobrar. Por eso, cuando no
 * hay enlace configurado, el texto lo dice en alto en vez de callarse.
 *
 * No promete reactivación en ningún punto: esa decisión es de Amazon.
 */
export interface RevisionDeliveryInput {
  name?: string | null;
  /** Lo que se ha reescrito, en una línea por punto. */
  changes: string[];
  /** Pruebas que le faltan al cliente, una por línea. */
  missingEvidence: string[];
}

/** El bloque de cobro, o el aviso de que no se puede cobrar todavía. */
export function paymentBlock(): string {
  if (!PAYMENT.link) return PAYMENT_LINK_MISSING;
  const via = PAYMENT.provider ? ` por ${PAYMENT.provider}` : '';
  return `Para pagar los ${ENTRY_OFFER.price.label}${via}: ${PAYMENT.link}`;
}

export function buildRevisionDeliveryEmail({
  name,
  changes,
  missingEvidence,
}: RevisionDeliveryInput): { subject: string; body: string } {
  const lista = (items: string[], vacio: string) =>
    items.length ? items.map((i) => `- ${i}`).join('\n') : `- ${vacio}`;

  return {
    subject: 'Tu Plan of Action revisado',
    body: `Hola${name ? `, ${name}` : ''}:

Aquí tienes tu Plan of Action revisado, en el adjunto.

Lo que he cambiado:
${lista(changes, '(rellena qué has reescrito)')}

Lo que te falta reunir antes de enviarlo:
${lista(missingEvidence, '(rellena qué pruebas faltan)')}

Un aviso que te ahorra un intento: no lo mandes hasta tener esas pruebas. Cada
plan rechazado deja rastro en el expediente y hace más cuesta arriba el
siguiente.

${paymentBlock()}

Si algo de la revisión no te cuadra, respóndeme y lo repasamos: eso no se paga
aparte.

${APPEALS_BRAND}
${BRAND.contactEmail}`,
  };
}
