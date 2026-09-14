import { leadsGoNowhere } from '../lib/deployGuard';
import { storage } from '../lib/storage';

/**
 * Aviso visible cuando el sitio publicado no está conectado a la base de datos.
 *
 * Se pinta en las páginas que recogen leads. Ver src/lib/deployGuard.ts para el
 * fallo que evita: sin este aviso, un despliegue sin credenciales aparenta
 * funcionar y pierde todos los casos.
 */
export default function DeployWarning() {
  const hostname = typeof window === 'undefined' ? '' : window.location.hostname;
  if (!leadsGoNowhere(storage.mode, hostname)) return null;

  return (
    <div role="alert" className="border-b border-red-300 bg-red-50 px-5 py-3">
      <p className="mx-auto max-w-3xl text-sm font-medium text-alert">
        Esta página no está conectada a la base de datos: lo que se envíe ahora no se guardará.
        Falta configurar VITE_MOCK, VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el despliegue.
      </p>
    </div>
  );
}
