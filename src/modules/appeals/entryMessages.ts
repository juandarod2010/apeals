import { APPEALS_BRAND, BRAND, ENTRY_OFFER } from '../../config/brand';
import { SUSPENSION_TYPES, type SuspensionType } from './poa-template';

/**
 * Mensajería de la oferta de entrada (revisión de Plan of Action, 59 $).
 *
 * REGLA QUE MANDA SOBRE TODO LO DEMÁS: cada mensaje parte de algo que el
 * vendedor ha escrito él mismo en público. Nada de "somos una empresa líder",
 * nada de listas compradas, nada de mensajes que valgan para cualquiera. Si no
 * se puede citar el problema concreto de esa persona, ese prospecto no se
 * contacta: no es cautela moral, es que el mensaje genérico no responde nadie.
 *
 * Y NO SE AFIRMA: ni tasas de éxito, ni plazos de Amazon, ni políticas citadas
 * de memoria, ni haber reactivado cuentas que no se han reactivado.
 */

export const PLACEHOLDERS = {
  name: '[Nombre]',
  quote: '[lo que ha escrito él, en sus palabras]',
} as const;

export interface EntryMessageInput {
  /** Nombre o alias público. Vacío = saludo neutro. */
  name?: string;
  /**
   * Lo que el prospecto ha contado en su propio mensaje público. Es el ancla
   * del correo entero: sin esto el mensaje no se envía.
   */
  quote?: string;
  /** Tipo detectado, si se ha pasado su texto por el analizador. */
  suspensionType?: SuspensionType;
  /** ¿Ha dicho que ya le han rechazado algún plan? Cambia el ángulo. */
  planRejected?: boolean;
}

const SIGNATURE = `${APPEALS_BRAND}\n${BRAND.contactEmail}`;

function greet(name?: string): string {
  return name?.trim() ? `Hola, ${name.trim()}:` : 'Hola:';
}

function quoteOf(input: EntryMessageInput): string {
  return input.quote?.trim() || PLACEHOLDERS.quote;
}

/**
 * Gancho específico del tipo de suspensión. Es lo que separa este mensaje de
 * los veinte que recibe esa misma semana: demuestra que se conoce el caso
 * concreto, no la categoría "Amazon". Cada línea describe un error de redacción
 * frecuente en ese tipo de plan, no una política de Amazon.
 */
const HOOKS: Record<SuspensionType, string> = {
  order_defect_rate:
    'En los planes de ODR el fallo típico es enumerar los pedidos malos uno a uno. Al revisor no le interesa el listado: le interesa qué parte de tu proceso los produjo.',
  late_shipment:
    'En los de retraso de envío casi todos echan la culpa al transportista. Puede ser verdad y aun así no vale como causa raíz: la pregunta es por qué tu proceso no lo detectó a tiempo.',
  policy_violation:
    'En las violaciones de política, el plan que se rechaza es el que discute si la política es justa. El que avanza es el que asume el incumplimiento concreto y enseña el control nuevo.',
  intellectual_property:
    'En las quejas de propiedad intelectual, lo que mueve el caso suele ser la retirada de la queja por parte del titular. Un plan que no aborda esa vía va corto por más largo que sea.',
  inauthentic:
    'En los casos de autenticidad todo se juega en las facturas: que sean del proveedor real, con sus datos completos y cubriendo las unidades del periodo que te piden. La redacción es secundaria.',
  condition_complaints:
    'En las quejas de estado del producto, el plan flojo habla de "mejorar el control de calidad". El que funciona dice qué se inspecciona, quién y con qué frecuencia.',
  restricted_product:
    'En producto restringido el plan tiene que demostrar que sabes qué lo hacía restringido y cómo evitas que vuelva a entrar en catálogo. Retirar el ASIN no basta como plan.',
  linked_account:
    'En cuentas vinculadas, primero hay que saber con qué cuenta te han vinculado y por qué. Escribir el plan antes de averiguarlo es tirar un intento.',
  dropshipping:
    'En dropshipping el punto es quién aparece como vendedor en el albarán que recibe el cliente. Si eso no está resuelto, ningún plan lo tapa.',
  review_manipulation:
    'En manipulación de reseñas el plan tiene que explicar de dónde salieron, aunque no las pidieras tú. Decir "yo no he sido" y nada más es el plan que se rechaza.',
  unknown:
    'Lo primero es clasificar bien el motivo: un plan escrito contra el motivo equivocado se rechaza aunque esté bien redactado.',
};

export function hookFor(type: SuspensionType | undefined): string {
  return HOOKS[type ?? 'unknown'];
}

export interface EntryMessage {
  id: string;
  label: string;
  /** Cuándo se manda. */
  when: string;
  subject: string;
  body: string;
}

/** PRIMER CONTACTO. Cita su problema, aporta algo útil gratis, pide poco. */
export function firstTouch(input: EntryMessageInput = {}): EntryMessage {
  const typeLabel = input.suspensionType ? SUSPENSION_TYPES[input.suspensionType].label : null;
  return {
    id: 'primer_contacto',
    label: 'Primer contacto',
    when: 'Cuando alguien publica su caso en un foro, grupo o comunidad y todavía no tiene respuestas útiles.',
    subject: typeLabel ? `Sobre tu caso de ${typeLabel}` : 'Sobre el plan que estás escribiendo',
    body: `${greet(input.name)}

He leído lo que has contado: ${quoteOf(input)}.

${hookFor(input.suspensionType)}

${
  input.planRejected
    ? 'Como ya te han rechazado uno, la parte importante es no repetir el mismo encuadre: si vuelves a mandar lo mismo con más palabras, el resultado suele ser el mismo.'
    : 'Si todavía no has mandado nada, estás en el mejor momento: el primer plan es el que se lee con menos prejuicio.'
}

Si quieres, me pegas tu borrador y te digo por escrito qué le falta. Reviso el plan entero, reescribo la causa raíz y te listo las pruebas que te faltan una a una. Son ${ENTRY_OFFER.price.label} y lo tienes en ${ENTRY_OFFER.deliveryHours} horas. ${ENTRY_OFFER.guarantee}

Y si prefieres apañártelo tú, dime el motivo exacto que te han puesto y te oriento por dónde empezar, sin coste. Peor que pagar por ayuda es quemar intentos.

${SIGNATURE}`,
  };
}

/** SEGUIMIENTO 1. Aporta algo nuevo; no es "¿lo viste?". */
export function followUpOne(input: EntryMessageInput = {}): EntryMessage {
  return {
    id: 'seguimiento_1',
    label: 'Seguimiento 1',
    when: 'A los 3 días, y solo si no ha contestado nada. Si contestó "no", no hay seguimiento.',
    subject: 'Una cosa más sobre tu caso',
    body: `${greet(input.name)}

Te escribí hace unos días por tu caso. No hace falta que me contestes; te dejo lo único que te habría dicho igualmente:

La mayoría de los planes que se rechazan no fallan por las medidas correctoras, fallan por la causa raíz. Se escribe una causa que es en realidad un síntoma —"tuvimos retrasos", "entraron reseñas negativas"— y el revisor no ve qué ha cambiado para que no se repita. Si reescribes esa parte sola, cambia el plan entero.

Si te sirve, adelante con ello. Y si quieres que lo lea yo antes de mandarlo, sigue en pie: ${ENTRY_OFFER.price.label}, en ${ENTRY_OFFER.deliveryHours} horas.

${SIGNATURE}`,
  };
}

/** SEGUIMIENTO 2. El último. Cierra la puerta con educación. */
export function followUpTwo(input: EntryMessageInput = {}): EntryMessage {
  return {
    id: 'seguimiento_2',
    label: 'Seguimiento 2 (último)',
    when: 'A los 7 días del primero. Es el último mensaje: después de este no se vuelve a escribir a esta persona.',
    subject: 'Lo dejo aquí',
    body: `${greet(input.name)}

No te molesto más con esto: doy por hecho que lo tienes encarrilado o que has decidido otra cosa, y las dos me parecen bien.

Si dentro de unas semanas sigue atascado, escríbeme y lo miro. Suerte con ello.

${SIGNATURE}`,
  };
}

/**
 * RESPUESTAS A OBJECIONES.
 *
 * Ninguna intenta darle la vuelta a un "no". Una objeción sincera se respeta:
 * insistir sobre alguien que está perdiendo dinero cada día es justo lo que
 * convierte esto en algo que no queremos ser, y además no cierra ventas.
 */
export const OBJECTIONS: EntryMessage[] = [
  {
    id: 'interes',
    label: 'Cuando muestra interés',
    when: 'Ha contestado algo positivo o ha preguntado detalles.',
    subject: 'Cómo lo hacemos',
    body: `Perfecto. Para empezar necesito tres cosas:

1. El correo de Amazon completo, tal cual te llegó, sin recortar.
2. El borrador de plan que tengas, aunque esté a medias o te parezca malo.
3. Una línea sobre qué pasó de verdad. Esto me lo cuentas a mí, no a Amazon: si hubo un error por vuestra parte, saberlo es lo que permite escribir una causa raíz creíble.

Te lo devuelvo en ${ENTRY_OFFER.deliveryHours} horas: el plan reescrito, la causa raíz reformulada y la lista de pruebas que te faltan. Son ${ENTRY_OFFER.price.label}, se pagan al recibirlo, no por adelantado.

Si en algún momento veo que tu caso no se arregla con una revisión de documento, te lo digo y no te cobro.`,
  },
  {
    id: 'precio',
    label: '"¿Cuánto cuesta?"',
    when: 'Pregunta el precio antes que nada.',
    subject: 'Precio',
    body: `${ENTRY_OFFER.price.label}, una vez, y lo tienes en ${ENTRY_OFFER.deliveryHours} horas.

Por eso recibes: ${ENTRY_OFFER.deliverables[0]} ${ENTRY_OFFER.deliverables[1]} Y la lista de pruebas que te faltan.

${ENTRY_OFFER.guarantee}

Lo digo claro para que decidas con la información correcta: esto es una revisión de tu documento, no una gestión ante Amazon. Si lo que buscas es que alguien lleve el caso entero hasta el final, eso es otro servicio y cuesta bastante más; dímelo y te cuento.`,
  },
  {
    id: 'no_interesa',
    label: '"No me interesa"',
    when: 'Dice que no. Se acepta a la primera.',
    subject: '',
    body: `Entendido, no insisto. Te dejo lo único útil que tenía para ti por si te sirve más adelante: la parte que hunde la mayoría de los planes es la causa raíz, no las medidas.

Suerte con el caso.`,
  },
  {
    id: 'ya_tengo_alguien',
    label: '"Ya tengo a alguien"',
    when: 'Trabaja con un consultor o una agencia.',
    subject: '',
    body: `Me parece bien, y no voy a intentar convencerte de cambiar de caballo en mitad del caso: cambiar de manos a mitad de una apelación suele perjudicar más que ayudar.

Una sola cosa por si te sirve: pídele que te enseñe la causa raíz que ha escrito antes de mandarla. Si ahí pone algo parecido a "hemos tenido problemas puntuales", eso no es una causa raíz y lo vas a saber tú antes que el revisor.

Si más adelante te quedas sin opciones, aquí estoy.`,
  },
  {
    id: 'lo_pensare',
    label: '"Lo voy a pensar"',
    when: 'Ni sí ni no. No se presiona.',
    subject: '',
    body: `Claro. Te dejo una referencia para decidir, no una prisa: mientras tanto, no mandes otro plan sin que lo lea alguien. Un intento gastado no se recupera, y el tiempo de pensártelo no te cuesta nada.

Cuando lo tengas decidido, me dices. Si es que no, también me sirve saberlo y no te vuelvo a escribir.`,
  },
];

/** Los tres mensajes de la secuencia, en orden. */
export function sequence(input: EntryMessageInput = {}): EntryMessage[] {
  return [firstTouch(input), followUpOne(input), followUpTwo(input)];
}
