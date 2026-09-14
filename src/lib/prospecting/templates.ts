import { BRAND, PRICING, REGULATION, regulationInForce } from '../../config/brand';
import { COUNTRY_LABELS, type CountryCode } from '../../types/domain';
import type { ProspectVariant } from '../storage/types';

/**
 * Plantillas de prospección.
 *
 * IMPORTANTE: aquí NO se afirma ningún hecho jurídico concreto (ni importes de
 * sanción, ni nombres de autoridades, ni plazos administrativos). Solo se cita
 * la norma y su fecha de aplicación, y se describe lo que ofrecemos nosotros.
 * La variante B habla de sanción económica SIN dar cifras: no las tenemos
 * verificadas y no se inventan.
 */

/** Cosas que el operador observa a mano en la ficha del producto. */
export const MISSING_ITEMS = [
  'no_aparece_numero_rap',
  'sin_datos_de_productor',
  'sin_representante_ue',
  'sin_direccion_ue',
  'sin_marcado_contenedor',
  'ficha_solo_en_ingles',
] as const;
export type MissingItem = (typeof MISSING_ITEMS)[number];

export const MISSING_ITEM_LABELS: Record<MissingItem, string> = {
  no_aparece_numero_rap: 'No aparece número de registro de productor',
  sin_datos_de_productor: 'No aparecen los datos del productor o responsable',
  sin_representante_ue: 'No consta representante en la Unión Europea',
  sin_direccion_ue: 'No consta dirección postal en la Unión Europea',
  sin_marcado_contenedor: 'Las imágenes no muestran el marcado de recogida selectiva',
  ficha_solo_en_ingles: 'La ficha está solo en inglés para un mercado de destino distinto',
};

export interface ProspectInput {
  listingRef: string;
  country: CountryCode;
  missing: MissingItem[];
  sellerName?: string;
}

/** Alterna A y B a partir de cuántos prospectos se han registrado ya. */
export function nextVariant(previousCount: number): ProspectVariant {
  return previousCount % 2 === 0 ? 'A' : 'B';
}

function bullets(missing: MissingItem[]): string {
  if (missing.length === 0) return '- (marca en el formulario qué falta en la ficha)';
  return missing.map((m) => `- ${MISSING_ITEM_LABELS[m]}`).join('\n');
}

function greeting(sellerName?: string): string {
  return sellerName?.trim() ? `Hola, ${sellerName.trim()}:` : 'Hola:';
}

const OFFER = (country: string) =>
  `Hago un informe de exposición para ${country} por ${PRICING.report.label} y lo tienes en 24 horas: qué te falta exactamente, qué norma lo exige y qué cuesta arreglarlo.`;

const SIGNATURE = `${BRAND.name}\n${BRAND.contactEmail}`;

/** Variante A — enfoque: te desactivan el listing. */
function variantA(input: ProspectInput): string {
  const country = COUNTRY_LABELS[input.country];
  return `${greeting(input.sellerName)}

He mirado tu ficha (${input.listingRef}) porque vendes a ${country} y he visto esto:

${bullets(input.missing)}

${regulationInForce() ? 'Desde el' : 'A partir del'} ${REGULATION.applicationDate}, el ${REGULATION.reference} ${regulationInForce() ? 'obliga' : 'obligará'} al marketplace a comprobar tu registro de responsabilidad ampliada del productor antes de mantener publicados tus anuncios. Si el dato no está, el canal deja de publicar el producto. No es una multa que discutes después: es el anuncio que deja de vender.

${OFFER(country)}

¿Te lo preparo?

${SIGNATURE}`;
}

/** Variante B — enfoque: sanción económica. */
function variantB(input: ProspectInput): string {
  const country = COUNTRY_LABELS[input.country];
  return `${greeting(input.sellerName)}

He mirado tu ficha (${input.listingRef}) porque vendes a ${country} y he visto esto:

${bullets(input.missing)}

Vender en ${country} sin estar dado de alta en el registro de responsabilidad ampliada del productor te expone a la sanción económica que prevea la normativa de ese país, además de a la reclamación de las cantidades no declaradas de ejercicios anteriores. El ${REGULATION.reference} lo ${regulationInForce() ? 'pone' : 'pondrá'} en el radar del marketplace desde el ${REGULATION.applicationDate}, así que deja de ser un riesgo teórico.

${OFFER(country)}

¿Te lo preparo?

${SIGNATURE}`;
}

export function buildMessage(variant: ProspectVariant, input: ProspectInput): string {
  return variant === 'A' ? variantA(input) : variantB(input);
}

export const VARIANT_DESCRIPTION: Record<ProspectVariant, string> = {
  A: 'Variante A — desactivación del listing',
  B: 'Variante B — sanción económica',
};
