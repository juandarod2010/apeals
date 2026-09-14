-- ---------------------------------------------------------------------------
-- Complyo APEALS — pagos de la revisión de Plan of Action
--
-- QUÉ RESUELVE: hasta ahora el cobro era un enlace pegado en un correo y el
-- ingreso se anotaba a mano en el lead. Esto registra el pago tal y como lo
-- cuenta PayPal, para poder cuadrar lo cobrado con lo entregado.
--
-- QUIÉN ESCRIBE AQUÍ: solo el webhook, con la clave `service_role`, que se
-- salta RLS. No hay política de INSERT para nadie más, y es deliberado: con una
-- política de inserción, cualquiera con la clave pública del navegador podría
-- fabricarse un pago.
--
-- Idempotente: se puede volver a ejecutar sin romper nada.
-- ---------------------------------------------------------------------------

create table if not exists public.pagos (
  id           uuid primary key,
  -- SIN clave ajena, y es deliberado. Cualquiera puede enviar un pago a tu
  -- cuenta de PayPal con el custom_id que quiera. Con clave ajena, ese pago
  -- reventaria el INSERT, el webhook devolveria error, PayPal reintentaria sin
  -- fin y el pago no quedaria registrado en ninguna parte: dinero recibido y
  -- ni rastro. Se registra siempre; el lead se actualiza solo si existe.
  lead_id      uuid not null,
  proveedor    text not null default 'paypal',
  -- Separa las pruebas del dinero de verdad. Sin esto, un pago de sandbox
  -- cuenta como ingreso en /admin/metas y las cuentas mienten.
  entorno      text not null check (entorno in ('sandbox', 'live')),
  order_id     text not null,
  -- LA CLAVE DE LA IDEMPOTENCIA. PayPal reintenta los webhooks: el mismo pago
  -- llega varias veces. Sin esta restricción, un pago de 59 $ se contaría tres
  -- veces y el lead quedaría con 177 $ de ingreso.
  capture_id   text not null unique,
  importe      numeric(10, 2) not null,
  moneda       text not null,
  estado       text not null,
  pagador_email text,
  -- El evento entero, para poder auditar una disputa meses después.
  evento       jsonb not null,
  created_at   timestamptz not null default now()
);

create index if not exists pagos_lead_id_idx on public.pagos (lead_id);
create index if not exists pagos_created_at_idx on public.pagos (created_at desc);

alter table public.pagos enable row level security;

-- Solo el operador autenticado lee. `anon` no tiene política: RLS deniega.
drop policy if exists "operador lee pagos" on public.pagos;
create policy "operador lee pagos"
  on public.pagos for select
  to authenticated
  using (true);

-- Sin INSERT, UPDATE ni DELETE para nadie. Escribe el webhook con service_role,
-- que no pasa por RLS. Un registro de pagos que se puede editar desde el
-- navegador no sirve como registro de pagos.
