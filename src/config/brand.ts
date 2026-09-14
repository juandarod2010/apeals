/**
 * Marca y textos centralizados.
 * Para cambiar el nombre del producto, cambia SOLO este fichero.
 */

export const BRAND = {
  name: 'Complyo',
  tagline: 'Cumplimiento RAP para vender en la Unión Europea',
  domain: 'complyo.eu',
  contactEmail: 'juandrodf2010@hotmail.com',
  /** Se usa en el pie del PDF y en la web. */
  legalEntityNote: 'Complyo',
} as const;

/**
 * Nombre del producto de apelaciones, de cara al cliente.
 *
 * Complyo es la marca matriz; APEALS es el servicio de apelaciones y revisión
 * de Plan of Action, que es lo que se vende primero. Las páginas y los mensajes
 * de ese servicio firman con esto; el informe RAP y su PDF siguen firmando con
 * BRAND.name, porque son otro producto de la misma casa.
 */
export const APPEALS_BRAND = `${BRAND.name} APEALS`;

/**
 * DESCARGO DE RESPONSABILIDAD.
 * Obligatorio en el informe (pantalla y PDF) y en el pie de la web.
 * No modificar sin revisarlo con un abogado.
 */
export const DISCLAIMER =
  'Este informe es orientativo y no constituye asesoramiento jurídico. ' +
  `${BRAND.name} no actúa como representante autorizado ni como organismo de responsabilidad ` +
  'de productor.';

/**
 * DESCARGO DE LA OFERTA DE APELACIONES (/revision y /appeals).
 *
 * El DISCLAIMER de arriba está escrito para el informe RAP: habla de un informe
 * que este servicio no entrega y de figuras regulatorias que no vienen al caso.
 * Este dice lo que APEALS hace de verdad, y nada más. Texto aprobado por el
 * responsable del negocio; no cambiar sin su visto bueno.
 */
export const ENTRY_DISCLAIMER =
  `${BRAND.name} revisa el Plan of Action que le envías y le indica qué pruebas le faltan. ` +
  'No somos abogados y esto no constituye asesoramiento jurídico. La decisión de reactivar ' +
  'una cuenta es exclusivamente de Amazon: no la garantizamos.';

/** Etiqueta que se pinta sobre toda obligación con verified: false. */
export const UNVERIFIED_BADGE = 'PENDIENTE DE VERIFICACIÓN — no usar con cliente';

/**
 * Norma de referencia del producto.
 * Es el único dato normativo del código y viene del propio encargo del negocio.
 * Verifícalo igual que el resto antes de publicar.
 */
export const REGULATION = {
  reference: 'Reglamento (UE) 2025/40',
  applicationDate: '12 de agosto de 2026',
  /** La misma fecha en ISO, para poder compararla. Ver `regulationInForce()`. */
  applicationDateIso: '2026-08-12',
} as const;

/**
 * ¿La fecha de aplicación ya ha pasado?
 *
 * POR QUÉ EXISTE. Los textos estaban escritos en futuro («el 12 de agosto de
 * 2026, Amazon puede desactivar tus listings») y esa fecha se pasó sola: el
 * mismo texto que el primer día creaba urgencia, el día después delataba que la
 * página llevaba meses sin tocarse. A un visitante que sabe de la norma le dice
 * que no estamos al día, y es de las cosas que hunden una conversión sin que te
 * enteres. Ahora el texto se adapta en vez de caducar.
 */
export function regulationInForce(now: Date = new Date()): boolean {
  return now.getTime() >= Date.parse(`${REGULATION.applicationDateIso}T00:00:00Z`);
}

/** Titular de la landing, en el tiempo verbal que toca. */
export function regulationHeadline(now: Date = new Date()): string {
  return regulationInForce(now)
    ? `Desde el ${REGULATION.applicationDate}, Amazon puede desactivar tus listings en Europa.`
    : `El ${REGULATION.applicationDate}, Amazon puede desactivar tus listings en Europa.`;
}

/** Primera línea de la landing, igual. */
export function regulationLead(now: Date = new Date()): string {
  const verb = regulationInForce(now) ? 'obliga' : 'obligará';
  return `El ${REGULATION.reference} ${verb} a los marketplaces a comprobar tu registro de responsabilidad ampliada del productor antes de mantener activos tus anuncios.`;
}

/** Precios del servicio. Son precios nuestros, no importes regulatorios. */
export const PRICING = {
  report: { amount: 97, currency: 'USD', label: '97 $' },
  resolution: { min: 349, max: 499, currency: 'USD', label: '349–499 $' },
  monitoring: { min: 39, max: 99, currency: 'USD', label: '39–99 $/mes' },
} as const;

/** Textos de la landing. Sin testimonios, sin logos, sin cifras no demostrables. */
/**
 * Textos de la landing. Sin testimonios, sin logos, sin cifras no demostrables.
 *
 * Es una función y no una constante porque el titular depende de si la fecha de
 * aplicación ya ha pasado. Ver `regulationHeadline()`.
 */
export function landingCopy(now: Date = new Date()) {
  return {
    headline: regulationHeadline(now),
    lines: [
      regulationLead(now),
      'Si vendes a la Unión Europea sin estar dado de alta en el país de destino, el canal deja de publicar tus productos. No hay aviso gradual.',
      `Responde 8 preguntas y te decimos, país por país, qué te falta y qué pasa si no lo arreglas. Informe en 24 horas por ${PRICING.report.label}.`,
    ],
    ctaLabel: 'Ver mi exposición',
  };
}

export const REPORT_CTA_LABEL = 'Resolverlo';

/**
 * Compromisos de servicio. Son promesas COMERCIALES TUYAS, no plazos legales.
 * Ajústalos a lo que puedas cumplir de verdad antes de publicar.
 */
export const SERVICE_COMMITMENTS = {
  reportDelivery: 'Informe entregado en 24 horas desde el diagnóstico.',
  // No se afirma tener socio en la Unión Europea, porque hoy no lo hay. Decir
  // lo contrario en una página pública es vender algo que no se puede entregar.
  resolutionStart:
    'La tramitación del alta requiere un socio establecido en la Unión Europea. Ese servicio todavía no está disponible.',
} as const;

/**
 * Plazo de tramitación ante cada autoridad.
 * NO se rellena aquí: depende del país y es un dato regulatorio.
 * El informe lo muestra como pendiente de verificación mientras la base de
 * reglas no esté verificada. Ver RULES-GUIDE.md.
 */
export const AUTHORITY_LEAD_TIME_UNKNOWN =
  'Plazo de tramitación ante la autoridad: pendiente de verificar en fuente oficial.';

/**
 * TRACK A — Apelaciones de cuentas y listings suspendidos en Amazon.
 */
export const APPEALS = {
  analysisPrice: { amount: 1500, currency: 'USD', label: '1.500 $' },
  /**
   * Tasa de éxito publicada.
   *
   * DELIBERADAMENTE VACÍA. Publicar "90 % de éxito" sin haber cerrado casos es
   * exactamente el tipo de cifra que no se puede demostrar, y en la página de
   * apelaciones se lo estarías diciendo a alguien que está perdiendo dinero
   * cada día. Cuando tengas casos cerrados, pon aquí el número real y el
   * tamaño de la muestra: `{ rate: 0.9, sampleSize: 20, since: '2026-09' }`.
   * Mientras sea null, la página no enseña ninguna cifra. Ver DECISIONS.md.
   */
  successRate: null as { rate: number; sampleSize: number; since: string } | null,
} as const;

/**
 * OFERTA DE ENTRADA — revisión de Plan of Action.
 *
 * POR QUÉ EXISTE. Las dos ofertas anteriores (informe RAP de 97 $ y apelación
 * de 1.500 $) están bloqueadas por cosas que no dependen del código: la base de
 * reglas real, el socio en la Unión Europea, el abogado y un historial de casos
 * cerrados. Sin nada de eso no se puede cobrar un dólar. Esta sí se puede
 * entregar hoy, porque se apoya solo en piezas ya terminadas y sin bloqueantes:
 * el analizador (`modules/appeals/analyzer.ts`) y el motor de Plan of Action
 * (`modules/appeals/poa-template.ts`).
 *
 * POR QUÉ 59 $. Es el precio más alto que sigue siendo una decisión individual
 * —se paga sin pedir presupuesto ni consultarlo con nadie— y a la vez hace que
 * dos ventas pasen del objetivo de 100 $/semana. Ver `lib/funnel.ts`.
 *
 * QUÉ NO PROMETE. Ni reactivación, ni plazos de Amazon, ni tasa de éxito. Lo
 * que se vende es un documento revisado y una lista de lo que falta, entregado
 * en 24 horas. Es lo único que podemos cumplir siempre.
 */
export const ENTRY_OFFER = {
  price: { amount: 59, currency: 'USD', label: '59 $' },
  name: 'Revisión de Plan of Action',
  deliveryHours: 24,
  /** Lo que recibe el cliente. Cada línea tiene que ser entregable sin excepción. */
  deliverables: [
    'Tu Plan of Action leído entero y reescrito donde haga falta, en el formato que espera el revisor.',
    'La causa raíz reformulada: es el punto por el que se rechaza la mayoría de los planes.',
    'Lista de las pruebas que te faltan, una por una, y qué documento sirve para cada una.',
    'Qué quitar. Los planes largos se rechazan más que los cortos y concretos.',
  ],
  /**
   * Garantía. Es reembolso, no resultado: prometer reactivación sería prometer
   * una decisión que toma Amazon, no nosotros.
   */
  guarantee:
    'Si no te entrego la revisión dentro de 24 horas, te devuelvo el dinero. No garantizo la reactivación: esa decisión es de Amazon y nadie honesto puede venderla.',
  /** Escalón siguiente, una vez hay un caso atendido y confianza. */
  upsell:
    'Si después de leerlo prefieres que lleve el caso entero —redacción, envío y las réplicas hasta cerrar—, el análisis completo cuesta 1.500 $ y te descuento lo que ya has pagado.',
} as const;

/**
 * Portada: textos de la oferta que SÍ se puede entregar hoy.
 *
 * La portada vendía el informe RAP de 97 $, que sigue bloqueado por la base de
 * reglas sin verificar. Mandar ahí a un prospecto de APEALS era enseñarle
 * primero algo que no se le puede entregar. La redacción es la misma que ya
 * convierte en /revision, para no inventar promesas nuevas.
 *
 * El diagnóstico RAP no desaparece: baja a segunda puerta y sin precio, porque
 * es un servicio futuro de Complyo y no se anuncia hasta que se pueda cumplir.
 */
export const APPEALS_LANDING = {
  headline: 'Te reviso el Plan of Action antes de que lo mandes.',
  lines: [
    'El motivo más común de rechazo no son las medidas correctoras: es la causa raíz. Se escribe un síntoma —«tuvimos retrasos», «entraron reseñas negativas»— y el revisor no ve qué ha cambiado para que no se repita.',
    `Leo tu plan entero, reescribo esa parte y te digo qué pruebas te faltan. ${ENTRY_OFFER.price.label}, en ${ENTRY_OFFER.deliveryHours} horas, y se paga al recibirlo.`,
    'Antes de pedirte nada: pega el correo de Amazon y te clasifico el caso al momento, gratis y sin dejar tus datos.',
  ],
  ctaLabel: 'Empezar con mi caso',
} as const;

/**
 * Colores corporativos. Se usan en el PDF y como referencia para la web.
 * Formato RGB 0–255, que es lo que consume jsPDF directamente.
 * Si los cambias aquí, cambian en el PDF sin tocar más código; en la web,
 * los equivalentes están en tailwind.config.js.
 */
export const BRAND_COLORS = {
  primary: [29, 78, 216] as [number, number, number],
  ink: [20, 27, 42] as [number, number, number],
  muted: [90, 100, 115] as [number, number, number],
  warning: [146, 64, 14] as [number, number, number],
  hairline: [210, 214, 220] as [number, number, number],
};

/**
 * Logo del PDF.
 *
 * `dataUri` vacío = se dibuja un recuadro con las iniciales de la marca. En
 * cuanto pegues aquí una imagen en base64 (`data:image/png;base64,…`), el PDF
 * la usa en su lugar. Se deja así para no inventarme un logo que no existe.
 * Tamaño recomendado: 240 × 80 px, fondo transparente.
 */
export const BRAND_LOGO = {
  dataUri: '',
  widthMm: 32,
  heightMm: 11,
};
