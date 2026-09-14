/**
 * ¿Está esta página capturando leads que no se guardan en ninguna parte?
 *
 * EL FALLO QUE EVITA. Las variables VITE_* se incrustan al CONSTRUIR, no se
 * leen en ejecución. Si el build de producción sale sin ellas —el caso normal
 * cuando se conecta el repositorio a un hosting y nadie las configura allí—,
 * la aplicación cae a localStorage sin protestar: el visitante rellena el
 * formulario, ve «Recibido», y su caso se queda en SU navegador. No llega
 * nunca, y no hay ningún error que lo delate.
 *
 * En localhost eso es el modo de trabajo normal y no se avisa. Fuera de
 * localhost es siempre un despliegue mal configurado.
 */
export function leadsGoNowhere(mode: 'mock' | 'supabase', hostname: string): boolean {
  if (mode !== 'mock') return false;
  return !isLocal(hostname);
}

function isLocal(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname === '' ||
    hostname.endsWith('.local')
  );
}
