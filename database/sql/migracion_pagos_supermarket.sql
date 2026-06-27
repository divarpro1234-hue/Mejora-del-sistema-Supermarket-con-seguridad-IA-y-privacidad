-- =====================================================
-- MIGRACION SEGURA - PAGOS AVANZADOS SUPERMARKET
-- Tarjeta ficticia, QR simulado y Transferencia tipo CPT
-- Ejecutar en pgAdmin conectado a la base supermarket_db.
-- =====================================================

BEGIN;

ALTER TABLE app.pedidos_virtuales
ADD COLUMN IF NOT EXISTS metodo_pago varchar(30) DEFAULT 'EFECTIVO',
ADD COLUMN IF NOT EXISTS referencia_pago varchar(100),
ADD COLUMN IF NOT EXISTS estado_pago varchar(30) DEFAULT 'PENDIENTE',
ADD COLUMN IF NOT EXISTS monto_pago numeric(12,2),
ADD COLUMN IF NOT EXISTS tarjeta_enmascarada varchar(30),
ADD COLUMN IF NOT EXISTS codigo_autorizacion varchar(80),
ADD COLUMN IF NOT EXISTS fecha_vencimiento_pago timestamptz,
ADD COLUMN IF NOT EXISTS qr_payload jsonb;

ALTER TABLE app.ventas
ADD COLUMN IF NOT EXISTS referencia_pago varchar(100),
ADD COLUMN IF NOT EXISTS estado_pago varchar(30) DEFAULT 'CONFIRMADO',
ADD COLUMN IF NOT EXISTS tarjeta_enmascarada varchar(30),
ADD COLUMN IF NOT EXISTS codigo_autorizacion varchar(80),
ADD COLUMN IF NOT EXISTS pago_metadata jsonb;

UPDATE app.pedidos_virtuales
SET
  metodo_pago = COALESCE(metodo_pago, 'EFECTIVO'),
  estado_pago = COALESCE(estado_pago, CASE WHEN estado = 'CONFIRMADO' THEN 'CONFIRMADO' ELSE 'PENDIENTE' END),
  monto_pago = COALESCE(monto_pago, total_estimado)
WHERE metodo_pago IS NULL
   OR estado_pago IS NULL
   OR monto_pago IS NULL;

UPDATE app.ventas
SET estado_pago = COALESCE(estado_pago, 'CONFIRMADO')
WHERE estado_pago IS NULL;

CREATE INDEX IF NOT EXISTS idx_pedidos_virtuales_metodo_pago
ON app.pedidos_virtuales(metodo_pago);

CREATE INDEX IF NOT EXISTS idx_pedidos_virtuales_referencia_pago
ON app.pedidos_virtuales(referencia_pago);

CREATE INDEX IF NOT EXISTS idx_ventas_referencia_pago
ON app.ventas(referencia_pago);

CREATE OR REPLACE VIEW app.v_pedidos_virtuales AS
SELECT
    id_pedido,
    codigo,
    cliente,
    telefono_ci,
    sucursal,
    estado,
    total_estimado,
    items,
    fecha_creacion,
    fecha_confirmacion,
    id_venta,
    observacion,
    metodo_pago,
    referencia_pago,
    estado_pago,
    monto_pago,
    tarjeta_enmascarada,
    codigo_autorizacion,
    fecha_vencimiento_pago,
    qr_payload
FROM app.pedidos_virtuales
ORDER BY fecha_creacion DESC;

COMMIT;

-- Verificacion rapida opcional:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_schema = 'app'
-- AND table_name IN ('pedidos_virtuales', 'ventas')
-- AND column_name IN ('metodo_pago', 'referencia_pago', 'estado_pago', 'tarjeta_enmascarada', 'codigo_autorizacion', 'qr_payload', 'pago_metadata')
-- ORDER BY table_name, ordinal_position;
