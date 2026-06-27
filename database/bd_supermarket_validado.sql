-- ============================================================
-- BD SUPERMARKET VALIDADA - VERSION V3
-- Correccion clave: evita columnas calculadas que causan ERROR 42P17.
-- La columna sec.secretos_referenciados.proxima_rotacion es normal
-- y se calcula con trigger.
-- ============================================================

-- ============================================================
-- PROYECTO: SUPERMARKET
-- Base de datos: PostgreSQL
-- Materia: Seguridad en Base de Datos
-- Enfoque: Criptografía, auditoría, control de acceso por sucursal,
--          automatización de ventas/inventario, backups, reportes,
--          firewall lógico, horarios de acceso, privacidad, monitoreo,
--          alta disponibilidad, cumplimiento e IA defensiva/avanzada.
--
-- IMPORTANTE:
-- 1) Crea primero una base de datos llamada supermarket_db desde pgAdmin.
-- 2) Conéctate a supermarket_db.
-- 3) Ejecuta este script completo.
--
-- Usuarios de prueba del sistema:
--   admin             / Supermarket123*
--   gerente           / Supermarket123*
--   auditor           / Supermarket123*
--   cajero_centro     / Supermarket123*
--   cajero_sur        / Supermarket123*
--   cajero_elalto     / Supermarket123*
--   almacen_centro    / Supermarket123*
--   ia_bot            / Supermarket123*
--
-- Usuarios críticos con 2FA demo:
--   admin / gerente / auditor usan código 2FA: 123456
--
-- Roles lógicos:
--   ADMIN, GERENTE_GENERAL, AUDITOR, CAJERO, ALMACENERO, SISTEMA_IA
--
-- NOTA SOBRE LA CLAVE CRIPTOGRÁFICA:
-- Este script usa una clave de demostración con SET app.crypto_key.
-- En producción, la clave NO debe estar quemada en el script ni en la BD.
-- Debe venir desde un gestor seguro de secretos.
-- ============================================================


-- ============================================================
-- 0. LIMPIEZA DE INSTALACIÓN ANTERIOR
-- ============================================================

DROP SCHEMA IF EXISTS mon CASCADE;
DROP SCHEMA IF EXISTS privacy CASCADE;
DROP SCHEMA IF EXISTS qa CASCADE;
DROP SCHEMA IF EXISTS gov CASCADE;
DROP SCHEMA IF EXISTS integ CASCADE;
DROP SCHEMA IF EXISTS rpt CASCADE;
DROP SCHEMA IF EXISTS ops CASCADE;
DROP SCHEMA IF EXISTS ai CASCADE;
DROP SCHEMA IF EXISTS audit CASCADE;
DROP SCHEMA IF EXISTS sec CASCADE;
DROP SCHEMA IF EXISTS app CASCADE;

CREATE SCHEMA app;
CREATE SCHEMA sec;
CREATE SCHEMA audit;
CREATE SCHEMA ai;

CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ============================================================
-- 1. FUNCIONES BASE DE SEGURIDAD Y CRIPTOGRAFÍA
-- ============================================================

CREATE OR REPLACE FUNCTION sec.require_crypto_key()
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_key text;
BEGIN
    v_key := current_setting('app.crypto_key', true);

    IF v_key IS NULL OR length(v_key) < 16 THEN
        RAISE EXCEPTION 'Clave criptográfica no configurada. Ejecuta: SET app.crypto_key = ''tu_clave_larga_y_segura'';';
    END IF;

    RETURN v_key;
END;
$$;


CREATE OR REPLACE FUNCTION sec.encrypt_text(p_text text)
RETURNS bytea
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_text IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN pgp_sym_encrypt(
        p_text,
        sec.require_crypto_key(),
        'compress-algo=1, cipher-algo=aes256'
    );
END;
$$;


CREATE OR REPLACE FUNCTION sec.decrypt_text(p_data bytea)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_data IS NULL THEN
        RETURN NULL;
    END IF;

    RETURN pgp_sym_decrypt(p_data, sec.require_crypto_key());
EXCEPTION
    WHEN OTHERS THEN
        RETURN '[NO DESCIFRABLE]';
END;
$$;


CREATE OR REPLACE FUNCTION sec.hash_password(p_password text)
RETURNS text
LANGUAGE sql
AS $$
    SELECT crypt(p_password, gen_salt('bf', 12));
$$;


CREATE OR REPLACE FUNCTION sec.verify_password(p_password text, p_hash text)
RETURNS boolean
LANGUAGE sql
AS $$
    SELECT crypt(p_password, p_hash) = p_hash;
$$;


CREATE OR REPLACE FUNCTION sec.mask_email(p_email text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_pos int;
BEGIN
    IF p_email IS NULL THEN
        RETURN NULL;
    END IF;

    v_pos := position('@' in p_email);

    IF v_pos <= 2 THEN
        RETURN '***@***';
    END IF;

    RETURN left(p_email, 1) || '***' || substring(p_email from v_pos);
END;
$$;


CREATE OR REPLACE FUNCTION sec.mask_phone(p_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_phone IS NULL THEN
        RETURN NULL;
    END IF;

    IF length(p_phone) <= 4 THEN
        RETURN '****';
    END IF;

    RETURN repeat('*', greatest(length(p_phone) - 4, 0)) || right(p_phone, 4);
END;
$$;


CREATE OR REPLACE FUNCTION sec.mask_ci(p_ci text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_ci IS NULL THEN
        RETURN NULL;
    END IF;

    IF length(p_ci) <= 3 THEN
        RETURN '***';
    END IF;

    RETURN repeat('*', greatest(length(p_ci) - 3, 0)) || right(p_ci, 3);
END;
$$;


-- ============================================================
-- 2. TABLAS PRINCIPALES DEL SISTEMA
-- ============================================================

CREATE TABLE app.sucursales (
    id_sucursal       serial PRIMARY KEY,
    nombre            varchar(80) NOT NULL UNIQUE,
    ciudad            varchar(80) NOT NULL DEFAULT 'La Paz',
    zona              varchar(80) NOT NULL,
    direccion         varchar(200) NOT NULL,
    telefono          varchar(30),
    activo            boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.roles (
    id_rol            serial PRIMARY KEY,
    nombre            varchar(50) NOT NULL UNIQUE,
    descripcion       text NOT NULL,
    nivel_seguridad   int NOT NULL DEFAULT 1 CHECK (nivel_seguridad BETWEEN 1 AND 10),
    activo            boolean NOT NULL DEFAULT true
);


CREATE TABLE app.usuarios (
    id_usuario        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    username          varchar(60) NOT NULL UNIQUE,
    password_hash     text NOT NULL,
    nombre_completo   varchar(150) NOT NULL,
    email_enc         bytea,
    telefono_enc      bytea,
    id_rol            int NOT NULL REFERENCES app.roles(id_rol),
    id_sucursal       int REFERENCES app.sucursales(id_sucursal),
    activo            boolean NOT NULL DEFAULT true,
    intentos_fallidos int NOT NULL DEFAULT 0,
    bloqueado_hasta   timestamptz,
    last_login_at     timestamptz,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ck_usuario_sucursal CHECK (
        id_sucursal IS NOT NULL
        OR id_rol IN (1, 2, 3, 6)
    )
);


CREATE TABLE app.categorias (
    id_categoria      serial PRIMARY KEY,
    nombre            varchar(100) NOT NULL UNIQUE,
    descripcion       text,
    activo            boolean NOT NULL DEFAULT true
);


CREATE TABLE app.proveedores (
    id_proveedor      serial PRIMARY KEY,
    razon_social      varchar(150) NOT NULL,
    nit               varchar(40),
    contacto          varchar(120),
    email_enc         bytea,
    telefono_enc      bytea,
    direccion         varchar(200),
    activo            boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.productos (
    id_producto       serial PRIMARY KEY,
    codigo_barra      varchar(60) NOT NULL UNIQUE,
    nombre            varchar(150) NOT NULL,
    descripcion       text,
    id_categoria      int NOT NULL REFERENCES app.categorias(id_categoria),
    id_proveedor      int REFERENCES app.proveedores(id_proveedor),
    precio_compra     numeric(12,2) NOT NULL CHECK (precio_compra >= 0),
    precio_venta      numeric(12,2) NOT NULL CHECK (precio_venta >= precio_compra),
    unidad_medida     varchar(30) NOT NULL DEFAULT 'unidad',
    activo            boolean NOT NULL DEFAULT true,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.inventario (
    id_sucursal       int NOT NULL REFERENCES app.sucursales(id_sucursal),
    id_producto       int NOT NULL REFERENCES app.productos(id_producto),
    stock_actual      numeric(12,2) NOT NULL DEFAULT 0 CHECK (stock_actual >= 0),
    stock_minimo      numeric(12,2) NOT NULL DEFAULT 10 CHECK (stock_minimo >= 0),
    stock_maximo      numeric(12,2) NOT NULL DEFAULT 100 CHECK (stock_maximo >= stock_minimo),
    ubicacion         varchar(100),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (id_sucursal, id_producto)
);


CREATE TABLE app.clientes (
    id_cliente             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombres                varchar(100) NOT NULL,
    apellidos              varchar(100) NOT NULL,
    ci_enc                 bytea,
    email_enc              bytea,
    telefono_enc           bytea,
    id_sucursal_registro   int NOT NULL REFERENCES app.sucursales(id_sucursal),
    creado_por             uuid REFERENCES app.usuarios(id_usuario),
    activo                 boolean NOT NULL DEFAULT true,
    created_at             timestamptz NOT NULL DEFAULT now(),
    updated_at             timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.cajas (
    id_caja           serial PRIMARY KEY,
    id_sucursal       int NOT NULL REFERENCES app.sucursales(id_sucursal),
    codigo            varchar(30) NOT NULL,
    descripcion       varchar(120),
    activo            boolean NOT NULL DEFAULT true,
    UNIQUE (id_sucursal, codigo)
);


CREATE TABLE app.ventas (
    id_venta          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_sucursal       int NOT NULL REFERENCES app.sucursales(id_sucursal),
    id_caja           int NOT NULL REFERENCES app.cajas(id_caja),
    id_cliente        uuid REFERENCES app.clientes(id_cliente),
    id_cajero         uuid NOT NULL REFERENCES app.usuarios(id_usuario),
    fecha             timestamptz NOT NULL DEFAULT now(),
    subtotal          numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    descuento         numeric(12,2) NOT NULL DEFAULT 0 CHECK (descuento >= 0),
    impuesto          numeric(12,2) NOT NULL DEFAULT 0 CHECK (impuesto >= 0),
    total             numeric(12,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
    metodo_pago       varchar(30) NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'QR', 'TRANSFERENCIA', 'MIXTO')),
    estado            varchar(30) NOT NULL DEFAULT 'COMPLETADA' CHECK (estado IN ('PENDIENTE', 'COMPLETADA', 'ANULADA')),
    observacion       text,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.venta_detalle (
    id_detalle        bigserial PRIMARY KEY,
    id_venta          uuid NOT NULL REFERENCES app.ventas(id_venta) ON DELETE CASCADE,
    id_producto       int NOT NULL REFERENCES app.productos(id_producto),
    cantidad          numeric(12,2) NOT NULL CHECK (cantidad > 0),
    precio_unitario   numeric(12,2) NOT NULL DEFAULT 0 CHECK (precio_unitario >= 0),
    subtotal          numeric(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    created_at        timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.movimientos_inventario (
    id_movimiento     bigserial PRIMARY KEY,
    id_sucursal       int NOT NULL REFERENCES app.sucursales(id_sucursal),
    id_producto       int NOT NULL REFERENCES app.productos(id_producto),
    tipo              varchar(30) NOT NULL CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'VENTA', 'DEVOLUCION')),
    cantidad          numeric(12,2) NOT NULL CHECK (cantidad > 0),
    stock_anterior    numeric(12,2) NOT NULL,
    stock_nuevo       numeric(12,2) NOT NULL,
    referencia        varchar(120),
    descripcion       text,
    realizado_por     uuid REFERENCES app.usuarios(id_usuario),
    fecha             timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE app.devoluciones (
    id_devolucion     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_venta          uuid NOT NULL REFERENCES app.ventas(id_venta),
    id_producto       int NOT NULL REFERENCES app.productos(id_producto),
    cantidad          numeric(12,2) NOT NULL CHECK (cantidad > 0),
    motivo            text NOT NULL,
    autorizado_por    uuid REFERENCES app.usuarios(id_usuario),
    fecha             timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. TABLAS DE AUDITORÍA
-- ============================================================

CREATE TABLE audit.login_intentos (
    id_login          bigserial PRIMARY KEY,
    username          varchar(60) NOT NULL,
    exito             boolean NOT NULL,
    motivo            text,
    ip                inet DEFAULT inet_client_addr(),
    programa          text DEFAULT current_setting('application_name', true),
    fecha             timestamptz NOT NULL DEFAULT now()
);


CREATE TABLE audit.eventos (
    id_evento         bigserial PRIMARY KEY,
    fecha             timestamptz NOT NULL DEFAULT now(),
    usuario_db        text NOT NULL DEFAULT current_user,
    usuario_app       text,
    rol_app           text,
    sucursal_app      int,
    esquema           text NOT NULL,
    tabla             text NOT NULL,
    operacion         text NOT NULL,
    fila_pk           text,
    datos_antes       jsonb,
    datos_despues     jsonb,
    ip                inet DEFAULT inet_client_addr(),
    observacion       text
);


-- ============================================================
-- 4. FUNCIONES DE CONTEXTO DE SESIÓN
-- ============================================================

CREATE OR REPLACE FUNCTION sec.current_user_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v text;
BEGIN
    v := current_setting('app.user_id', true);
    IF v IS NULL OR v = '' THEN
        RETURN NULL;
    END IF;
    RETURN v::uuid;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION sec.current_username()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.username', true), '');
$$;


CREATE OR REPLACE FUNCTION sec.current_rol()
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT upper(COALESCE(NULLIF(current_setting('app.rol', true), ''), 'ANONIMO'));
$$;


CREATE OR REPLACE FUNCTION sec.current_sucursal_id()
RETURNS int
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v text;
BEGIN
    v := current_setting('app.sucursal_id', true);
    IF v IS NULL OR v = '' THEN
        RETURN NULL;
    END IF;
    RETURN v::int;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;


CREATE OR REPLACE FUNCTION sec.is_management_role()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
    SELECT sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'AUDITOR', 'SISTEMA_IA');
$$;


CREATE OR REPLACE FUNCTION sec.clear_app_context()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM set_config('app.user_id', '', false);
    PERFORM set_config('app.username', '', false);
    PERFORM set_config('app.rol', '', false);
    PERFORM set_config('app.sucursal_id', '', false);
END;
$$;


CREATE OR REPLACE FUNCTION app.autenticar(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, public
AS $$
DECLARE
    v_user record;
BEGIN
    SELECT
        u.id_usuario,
        u.username,
        u.password_hash,
        u.nombre_completo,
        u.id_sucursal,
        u.activo,
        u.intentos_fallidos,
        u.bloqueado_hasta,
        r.nombre AS rol
    INTO v_user
    FROM app.usuarios u
    JOIN app.roles r ON r.id_rol = u.id_rol
    WHERE u.username = p_username;

    IF NOT FOUND THEN
        INSERT INTO audit.login_intentos(username, exito, motivo)
        VALUES (p_username, false, 'Usuario inexistente');
        RETURN false;
    END IF;

    IF v_user.activo = false THEN
        INSERT INTO audit.login_intentos(username, exito, motivo)
        VALUES (p_username, false, 'Usuario inactivo');
        RETURN false;
    END IF;

    IF v_user.bloqueado_hasta IS NOT NULL AND v_user.bloqueado_hasta > now() THEN
        INSERT INTO audit.login_intentos(username, exito, motivo)
        VALUES (p_username, false, 'Usuario bloqueado temporalmente');
        RETURN false;
    END IF;

    IF sec.verify_password(p_password, v_user.password_hash) THEN
        UPDATE app.usuarios
        SET intentos_fallidos = 0,
            bloqueado_hasta = NULL,
            last_login_at = now(),
            updated_at = now()
        WHERE id_usuario = v_user.id_usuario;

        PERFORM set_config('app.user_id', v_user.id_usuario::text, false);
        PERFORM set_config('app.username', v_user.username, false);
        PERFORM set_config('app.rol', v_user.rol, false);
        PERFORM set_config('app.sucursal_id', COALESCE(v_user.id_sucursal::text, ''), false);

        INSERT INTO audit.login_intentos(username, exito, motivo)
        VALUES (p_username, true, 'Login correcto');

        RETURN true;
    ELSE
        UPDATE app.usuarios
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado_hasta = CASE
                WHEN intentos_fallidos + 1 >= 5 THEN now() + interval '15 minutes'
                ELSE bloqueado_hasta
            END,
            updated_at = now()
        WHERE id_usuario = v_user.id_usuario;

        INSERT INTO audit.login_intentos(username, exito, motivo)
        VALUES (p_username, false, 'Contraseña incorrecta');

        RETURN false;
    END IF;
END;
$$;


-- ============================================================
-- 5. FUNCIONES DE AUDITORÍA Y ACTUALIZACIÓN AUTOMÁTICA
-- ============================================================

CREATE OR REPLACE FUNCTION app.fn_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION audit.fn_auditar_cambios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, public
AS $$
DECLARE
    v_old jsonb;
    v_new jsonb;
    v_pk text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_new := to_jsonb(NEW);
        v_old := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_new := to_jsonb(NEW);
        v_old := to_jsonb(OLD);
    ELSE
        v_new := NULL;
        v_old := to_jsonb(OLD);
    END IF;

    v_pk := COALESCE(
        v_new ->> 'id',
        v_old ->> 'id',
        v_new ->> 'id_usuario',
        v_old ->> 'id_usuario',
        v_new ->> 'id_cliente',
        v_old ->> 'id_cliente',
        v_new ->> 'id_venta',
        v_old ->> 'id_venta',
        v_new ->> 'id_producto',
        v_old ->> 'id_producto',
        v_new ->> 'id_sucursal',
        v_old ->> 'id_sucursal',
        v_new ->> 'id_movimiento',
        v_old ->> 'id_movimiento'
    );

    INSERT INTO audit.eventos(
        usuario_app,
        rol_app,
        sucursal_app,
        esquema,
        tabla,
        operacion,
        fila_pk,
        datos_antes,
        datos_despues
    )
    VALUES (
        sec.current_username(),
        sec.current_rol(),
        sec.current_sucursal_id(),
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP,
        v_pk,
        v_old,
        v_new
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$;


-- ============================================================
-- 6. TABLAS DE IA, ALERTAS Y AUTOMATIZACIÓN
-- ============================================================

CREATE TABLE ai.alertas_seguridad (
    id_alerta         bigserial PRIMARY KEY,
    fecha             timestamptz NOT NULL DEFAULT now(),
    severidad         varchar(20) NOT NULL CHECK (severidad IN ('BAJA', 'MEDIA', 'ALTA', 'CRITICA')),
    tipo              varchar(80) NOT NULL,
    descripcion       text NOT NULL,
    id_sucursal       int REFERENCES app.sucursales(id_sucursal),
    id_usuario        uuid REFERENCES app.usuarios(id_usuario),
    id_venta          uuid REFERENCES app.ventas(id_venta),
    atendida          boolean NOT NULL DEFAULT false,
    atendida_por      uuid REFERENCES app.usuarios(id_usuario),
    atendida_en       timestamptz
);


CREATE TABLE ai.alertas_negocio (
    id_alerta         bigserial PRIMARY KEY,
    fecha             timestamptz NOT NULL DEFAULT now(),
    tipo              varchar(80) NOT NULL,
    descripcion       text NOT NULL,
    id_sucursal       int REFERENCES app.sucursales(id_sucursal),
    id_producto       int REFERENCES app.productos(id_producto),
    prioridad         varchar(20) NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('BAJA', 'MEDIA', 'ALTA')),
    atendida          boolean NOT NULL DEFAULT false
);


CREATE TABLE ai.prediccion_demanda (
    id_prediccion     bigserial PRIMARY KEY,
    fecha_generacion  timestamptz NOT NULL DEFAULT now(),
    id_sucursal       int NOT NULL REFERENCES app.sucursales(id_sucursal),
    id_producto       int NOT NULL REFERENCES app.productos(id_producto),
    dias_analizados   int NOT NULL,
    cantidad_estimada numeric(12,2) NOT NULL,
    metodo            varchar(80) NOT NULL DEFAULT 'PROMEDIO_MOVIL_SQL',
    observacion       text
);


-- Tabla preparada para IA externa.
-- Aquí una aplicación Python puede guardar resultados de un modelo real.
CREATE TABLE ai.predicciones_externas (
    id_prediccion     bigserial PRIMARY KEY,
    fecha             timestamptz NOT NULL DEFAULT now(),
    modelo            varchar(120) NOT NULL,
    modulo            varchar(120) NOT NULL,
    entrada           jsonb NOT NULL,
    salida            jsonb NOT NULL,
    confianza         numeric(5,2) CHECK (confianza BETWEEN 0 AND 100)
);


-- Si instalas pgvector más adelante, puedes activar esto:
-- CREATE EXTENSION IF NOT EXISTS vector;
-- CREATE TABLE ai.producto_embeddings (
--     id_producto int PRIMARY KEY REFERENCES app.productos(id_producto),
--     embedding vector(384),
--     updated_at timestamptz DEFAULT now()
-- );


-- ============================================================
-- 7. AUTOMATIZACIÓN DE VENTAS, INVENTARIO E IA
-- ============================================================

CREATE OR REPLACE FUNCTION app.fn_venta_detalle_before()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_sucursal int;
    v_precio numeric(12,2);
    v_stock numeric(12,2);
BEGIN
    SELECT id_sucursal
    INTO v_sucursal
    FROM app.ventas
    WHERE id_venta = NEW.id_venta
      AND estado <> 'ANULADA';

    IF v_sucursal IS NULL THEN
        RAISE EXCEPTION 'La venta no existe o está anulada.';
    END IF;

    SELECT precio_venta
    INTO v_precio
    FROM app.productos
    WHERE id_producto = NEW.id_producto
      AND activo = true;

    IF v_precio IS NULL THEN
        RAISE EXCEPTION 'Producto inexistente o inactivo.';
    END IF;

    SELECT stock_actual
    INTO v_stock
    FROM app.inventario
    WHERE id_sucursal = v_sucursal
      AND id_producto = NEW.id_producto
    FOR UPDATE;

    IF v_stock IS NULL THEN
        RAISE EXCEPTION 'El producto no tiene inventario registrado en esta sucursal.';
    END IF;

    IF v_stock < NEW.cantidad THEN
        RAISE EXCEPTION 'Stock insuficiente. Stock actual: %, cantidad solicitada: %', v_stock, NEW.cantidad;
    END IF;

    NEW.precio_unitario := v_precio;
    NEW.subtotal := round(NEW.cantidad * NEW.precio_unitario, 2);

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION app.fn_venta_detalle_after()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_sucursal int;
    v_stock_anterior numeric(12,2);
    v_stock_nuevo numeric(12,2);
    v_cajero uuid;
BEGIN
    SELECT id_sucursal, id_cajero
    INTO v_sucursal, v_cajero
    FROM app.ventas
    WHERE id_venta = NEW.id_venta;

    SELECT stock_actual
    INTO v_stock_anterior
    FROM app.inventario
    WHERE id_sucursal = v_sucursal
      AND id_producto = NEW.id_producto
    FOR UPDATE;

    v_stock_nuevo := v_stock_anterior - NEW.cantidad;

    UPDATE app.inventario
    SET stock_actual = v_stock_nuevo,
        updated_at = now()
    WHERE id_sucursal = v_sucursal
      AND id_producto = NEW.id_producto;

    INSERT INTO app.movimientos_inventario(
        id_sucursal,
        id_producto,
        tipo,
        cantidad,
        stock_anterior,
        stock_nuevo,
        referencia,
        descripcion,
        realizado_por
    )
    VALUES (
        v_sucursal,
        NEW.id_producto,
        'VENTA',
        NEW.cantidad,
        v_stock_anterior,
        v_stock_nuevo,
        NEW.id_venta::text,
        'Salida automática por venta',
        v_cajero
    );

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION ai.fn_alerta_stock_bajo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_producto text;
    v_sucursal text;
BEGIN
    IF NEW.stock_actual <= NEW.stock_minimo THEN
        SELECT nombre INTO v_producto
        FROM app.productos
        WHERE id_producto = NEW.id_producto;

        SELECT nombre INTO v_sucursal
        FROM app.sucursales
        WHERE id_sucursal = NEW.id_sucursal;

        INSERT INTO ai.alertas_negocio(
            tipo,
            descripcion,
            id_sucursal,
            id_producto,
            prioridad
        )
        VALUES (
            'STOCK_BAJO',
            'El producto "' || v_producto || '" tiene stock bajo en la sucursal ' || v_sucursal ||
            '. Stock actual: ' || NEW.stock_actual || ', mínimo: ' || NEW.stock_minimo || '.',
            NEW.id_sucursal,
            NEW.id_producto,
            CASE WHEN NEW.stock_actual = 0 THEN 'ALTA' ELSE 'MEDIA' END
        );
    END IF;

    RETURN NEW;
END;
$$;


CREATE OR REPLACE FUNCTION ai.fn_detectar_venta_anomala(p_id_venta uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_venta record;
    v_promedio numeric(12,2);
    v_hora int;
BEGIN
    SELECT *
    INTO v_venta
    FROM app.ventas
    WHERE id_venta = p_id_venta;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    SELECT COALESCE(avg(total), 0)
    INTO v_promedio
    FROM app.ventas
    WHERE id_sucursal = v_venta.id_sucursal
      AND id_venta <> p_id_venta
      AND estado = 'COMPLETADA'
      AND fecha >= now() - interval '30 days';

    v_hora := extract(hour from v_venta.fecha)::int;

    IF v_promedio > 0 AND v_venta.total > (v_promedio * 3) AND v_venta.total >= 500 THEN
        INSERT INTO ai.alertas_seguridad(
            severidad,
            tipo,
            descripcion,
            id_sucursal,
            id_usuario,
            id_venta
        )
        VALUES (
            'ALTA',
            'VENTA_ANOMALA_MONTO',
            'Venta con monto muy superior al promedio de la sucursal. Total: ' ||
            v_venta.total || ', promedio: ' || round(v_promedio, 2) || '.',
            v_venta.id_sucursal,
            v_venta.id_cajero,
            v_venta.id_venta
        );
    END IF;

    IF v_hora < 7 OR v_hora > 22 THEN
        INSERT INTO ai.alertas_seguridad(
            severidad,
            tipo,
            descripcion,
            id_sucursal,
            id_usuario,
            id_venta
        )
        VALUES (
            'MEDIA',
            'VENTA_FUERA_DE_HORARIO',
            'Venta registrada fuera del horario normal. Hora: ' || v_hora || ':00.',
            v_venta.id_sucursal,
            v_venta.id_cajero,
            v_venta.id_venta
        );
    END IF;

    IF v_venta.subtotal > 0 AND v_venta.descuento > (v_venta.subtotal * 0.20) THEN
        INSERT INTO ai.alertas_seguridad(
            severidad,
            tipo,
            descripcion,
            id_sucursal,
            id_usuario,
            id_venta
        )
        VALUES (
            'ALTA',
            'DESCUENTO_EXCESIVO',
            'Descuento superior al 20% del subtotal. Subtotal: ' ||
            v_venta.subtotal || ', descuento: ' || v_venta.descuento || '.',
            v_venta.id_sucursal,
            v_venta.id_cajero,
            v_venta.id_venta
        );
    END IF;
END;
$$;


CREATE OR REPLACE FUNCTION app.registrar_venta(
    p_id_caja int,
    p_id_cliente uuid,
    p_metodo_pago text,
    p_descuento numeric,
    p_items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_id_venta uuid := gen_random_uuid();
    v_id_sucursal int;
    v_id_usuario uuid;
    v_rol text;
    v_item jsonb;
    v_id_producto int;
    v_cantidad numeric(12,2);
    v_subtotal numeric(12,2);
    v_descuento numeric(12,2);
    v_total numeric(12,2);
BEGIN
    v_id_usuario := sec.current_user_id();
    v_rol := sec.current_rol();

    IF v_id_usuario IS NULL THEN
        RAISE EXCEPTION 'Debe autenticarse con app.autenticar antes de registrar una venta.';
    END IF;

    IF v_rol NOT IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO') THEN
        RAISE EXCEPTION 'Rol no autorizado para registrar ventas: %', v_rol;
    END IF;

    SELECT id_sucursal
    INTO v_id_sucursal
    FROM app.cajas
    WHERE id_caja = p_id_caja
      AND activo = true;

    IF v_id_sucursal IS NULL THEN
        RAISE EXCEPTION 'Caja inexistente o inactiva.';
    END IF;

    IF v_rol = 'CAJERO' AND sec.current_sucursal_id() <> v_id_sucursal THEN
        RAISE EXCEPTION 'El cajero solo puede vender en su propia sucursal.';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'La venta debe tener al menos un producto.';
    END IF;

    INSERT INTO app.ventas(
        id_venta,
        id_sucursal,
        id_caja,
        id_cliente,
        id_cajero,
        metodo_pago,
        descuento,
        estado
    )
    VALUES (
        v_id_venta,
        v_id_sucursal,
        p_id_caja,
        p_id_cliente,
        v_id_usuario,
        upper(p_metodo_pago),
        COALESCE(p_descuento, 0),
        'COMPLETADA'
    );

    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_id_producto := (v_item ->> 'id_producto')::int;
        v_cantidad := (v_item ->> 'cantidad')::numeric;

        INSERT INTO app.venta_detalle(
            id_venta,
            id_producto,
            cantidad
        )
        VALUES (
            v_id_venta,
            v_id_producto,
            v_cantidad
        );
    END LOOP;

    SELECT COALESCE(sum(subtotal), 0)
    INTO v_subtotal
    FROM app.venta_detalle
    WHERE id_venta = v_id_venta;

    v_descuento := LEAST(COALESCE(p_descuento, 0), v_subtotal);
    v_total := v_subtotal - v_descuento;

    UPDATE app.ventas
    SET subtotal = round(v_subtotal, 2),
        descuento = round(v_descuento, 2),
        impuesto = round(v_total * 0.13, 2),
        total = round(v_total, 2),
        updated_at = now()
    WHERE id_venta = v_id_venta;

    PERFORM ai.fn_detectar_venta_anomala(v_id_venta);

    RETURN v_id_venta;
END;
$$;


CREATE OR REPLACE FUNCTION app.crear_cliente_seguro(
    p_nombres text,
    p_apellidos text,
    p_ci text,
    p_email text,
    p_telefono text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_id_cliente uuid := gen_random_uuid();
    v_id_sucursal int;
BEGIN
    IF sec.current_user_id() IS NULL THEN
        RAISE EXCEPTION 'Debe autenticarse antes de crear clientes.';
    END IF;

    IF sec.current_rol() NOT IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO') THEN
        RAISE EXCEPTION 'Rol no autorizado para crear clientes.';
    END IF;

    v_id_sucursal := sec.current_sucursal_id();

    IF v_id_sucursal IS NULL AND sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL') THEN
        v_id_sucursal := 1;
    END IF;

    INSERT INTO app.clientes(
        id_cliente,
        nombres,
        apellidos,
        ci_enc,
        email_enc,
        telefono_enc,
        id_sucursal_registro,
        creado_por
    )
    VALUES (
        v_id_cliente,
        p_nombres,
        p_apellidos,
        sec.encrypt_text(p_ci),
        sec.encrypt_text(lower(p_email)),
        sec.encrypt_text(p_telefono),
        v_id_sucursal,
        sec.current_user_id()
    );

    RETURN v_id_cliente;
END;
$$;


CREATE OR REPLACE FUNCTION app.registrar_movimiento_manual(
    p_id_sucursal int,
    p_id_producto int,
    p_tipo text,
    p_cantidad numeric,
    p_descripcion text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_rol text;
    v_stock_anterior numeric(12,2);
    v_stock_nuevo numeric(12,2);
BEGIN
    v_rol := sec.current_rol();

    IF sec.current_user_id() IS NULL THEN
        RAISE EXCEPTION 'Debe autenticarse antes de modificar inventario.';
    END IF;

    IF v_rol NOT IN ('ADMIN', 'GERENTE_GENERAL', 'ALMACENERO') THEN
        RAISE EXCEPTION 'Rol no autorizado para modificar inventario.';
    END IF;

    IF v_rol = 'ALMACENERO' AND sec.current_sucursal_id() <> p_id_sucursal THEN
        RAISE EXCEPTION 'El almacenero solo puede modificar inventario de su sucursal.';
    END IF;

    SELECT stock_actual
    INTO v_stock_anterior
    FROM app.inventario
    WHERE id_sucursal = p_id_sucursal
      AND id_producto = p_id_producto
    FOR UPDATE;

    IF v_stock_anterior IS NULL THEN
        RAISE EXCEPTION 'Inventario inexistente para la sucursal/producto.';
    END IF;

    IF upper(p_tipo) = 'ENTRADA' THEN
        v_stock_nuevo := v_stock_anterior + p_cantidad;
    ELSIF upper(p_tipo) = 'SALIDA' THEN
        v_stock_nuevo := v_stock_anterior - p_cantidad;
    ELSIF upper(p_tipo) = 'AJUSTE' THEN
        v_stock_nuevo := p_cantidad;
    ELSE
        RAISE EXCEPTION 'Tipo de movimiento inválido. Usa ENTRADA, SALIDA o AJUSTE.';
    END IF;

    IF v_stock_nuevo < 0 THEN
        RAISE EXCEPTION 'El stock no puede quedar negativo.';
    END IF;

    UPDATE app.inventario
    SET stock_actual = v_stock_nuevo,
        updated_at = now()
    WHERE id_sucursal = p_id_sucursal
      AND id_producto = p_id_producto;

    INSERT INTO app.movimientos_inventario(
        id_sucursal,
        id_producto,
        tipo,
        cantidad,
        stock_anterior,
        stock_nuevo,
        referencia,
        descripcion,
        realizado_por
    )
    VALUES (
        p_id_sucursal,
        p_id_producto,
        upper(p_tipo),
        p_cantidad,
        v_stock_anterior,
        v_stock_nuevo,
        'MOVIMIENTO_MANUAL',
        p_descripcion,
        sec.current_user_id()
    );
END;
$$;


CREATE OR REPLACE FUNCTION app.anular_venta(
    p_id_venta uuid,
    p_motivo text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_venta record;
    v_det record;
    v_stock_anterior numeric(12,2);
    v_stock_nuevo numeric(12,2);
BEGIN
    IF sec.current_user_id() IS NULL THEN
        RAISE EXCEPTION 'Debe autenticarse antes de anular ventas.';
    END IF;

    SELECT *
    INTO v_venta
    FROM app.ventas
    WHERE id_venta = p_id_venta
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta inexistente.';
    END IF;

    IF v_venta.estado = 'ANULADA' THEN
        RAISE EXCEPTION 'La venta ya fue anulada.';
    END IF;

    IF sec.current_rol() NOT IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO') THEN
        RAISE EXCEPTION 'Rol no autorizado para anular ventas.';
    END IF;

    IF sec.current_rol() = 'CAJERO'
       AND (v_venta.id_cajero <> sec.current_user_id() OR v_venta.id_sucursal <> sec.current_sucursal_id()) THEN
        RAISE EXCEPTION 'El cajero solo puede anular sus ventas de su sucursal.';
    END IF;

    FOR v_det IN
        SELECT *
        FROM app.venta_detalle
        WHERE id_venta = p_id_venta
    LOOP
        SELECT stock_actual
        INTO v_stock_anterior
        FROM app.inventario
        WHERE id_sucursal = v_venta.id_sucursal
          AND id_producto = v_det.id_producto
        FOR UPDATE;

        v_stock_nuevo := v_stock_anterior + v_det.cantidad;

        UPDATE app.inventario
        SET stock_actual = v_stock_nuevo,
            updated_at = now()
        WHERE id_sucursal = v_venta.id_sucursal
          AND id_producto = v_det.id_producto;

        INSERT INTO app.movimientos_inventario(
            id_sucursal,
            id_producto,
            tipo,
            cantidad,
            stock_anterior,
            stock_nuevo,
            referencia,
            descripcion,
            realizado_por
        )
        VALUES (
            v_venta.id_sucursal,
            v_det.id_producto,
            'DEVOLUCION',
            v_det.cantidad,
            v_stock_anterior,
            v_stock_nuevo,
            p_id_venta::text,
            'Reposición automática por anulación de venta. Motivo: ' || p_motivo,
            sec.current_user_id()
        );
    END LOOP;

    UPDATE app.ventas
    SET estado = 'ANULADA',
        observacion = COALESCE(observacion, '') || ' | ANULADA: ' || p_motivo,
        updated_at = now()
    WHERE id_venta = p_id_venta;

    INSERT INTO ai.alertas_seguridad(
        severidad,
        tipo,
        descripcion,
        id_sucursal,
        id_usuario,
        id_venta
    )
    VALUES (
        'MEDIA',
        'VENTA_ANULADA',
        'Venta anulada. Motivo: ' || p_motivo,
        v_venta.id_sucursal,
        sec.current_user_id(),
        p_id_venta
    );
END;
$$;


CREATE OR REPLACE FUNCTION ai.fn_generar_alertas_reposicion()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_count int;
BEGIN
    INSERT INTO ai.alertas_negocio(
        tipo,
        descripcion,
        id_sucursal,
        id_producto,
        prioridad
    )
    SELECT
        'REPOSICION_RECOMENDADA',
        'IA recomienda reposición de "' || p.nombre || '" en sucursal ' || s.nombre ||
        '. Stock actual: ' || i.stock_actual || ', mínimo: ' || i.stock_minimo ||
        ', máximo sugerido: ' || i.stock_maximo || '.',
        i.id_sucursal,
        i.id_producto,
        CASE
            WHEN i.stock_actual = 0 THEN 'ALTA'
            WHEN i.stock_actual <= i.stock_minimo THEN 'MEDIA'
            ELSE 'BAJA'
        END
    FROM app.inventario i
    JOIN app.productos p ON p.id_producto = i.id_producto
    JOIN app.sucursales s ON s.id_sucursal = i.id_sucursal
    WHERE i.stock_actual <= i.stock_minimo
      AND p.activo = true;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


CREATE OR REPLACE FUNCTION ai.fn_generar_prediccion_demanda(p_dias int DEFAULT 30)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_count int;
BEGIN
    DELETE FROM ai.prediccion_demanda
    WHERE fecha_generacion::date = current_date
      AND dias_analizados = p_dias;

    INSERT INTO ai.prediccion_demanda(
        id_sucursal,
        id_producto,
        dias_analizados,
        cantidad_estimada,
        observacion
    )
    SELECT
        v.id_sucursal,
        d.id_producto,
        p_dias,
        round((sum(d.cantidad) / greatest(p_dias, 1)) * 7, 2) AS cantidad_estimada,
        'Estimación de demanda para los próximos 7 días usando promedio móvil simple.'
    FROM app.ventas v
    JOIN app.venta_detalle d ON d.id_venta = v.id_venta
    WHERE v.estado = 'COMPLETADA'
      AND v.fecha >= now() - (p_dias || ' days')::interval
    GROUP BY v.id_sucursal, d.id_producto;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


-- ============================================================
-- 8. TRIGGERS
-- ============================================================

CREATE TRIGGER trg_sucursales_updated_at
BEFORE UPDATE ON app.sucursales
FOR EACH ROW EXECUTE FUNCTION app.fn_set_updated_at();

CREATE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON app.usuarios
FOR EACH ROW EXECUTE FUNCTION app.fn_set_updated_at();

CREATE TRIGGER trg_proveedores_updated_at
BEFORE UPDATE ON app.proveedores
FOR EACH ROW EXECUTE FUNCTION app.fn_set_updated_at();

CREATE TRIGGER trg_productos_updated_at
BEFORE UPDATE ON app.productos
FOR EACH ROW EXECUTE FUNCTION app.fn_set_updated_at();

CREATE TRIGGER trg_clientes_updated_at
BEFORE UPDATE ON app.clientes
FOR EACH ROW EXECUTE FUNCTION app.fn_set_updated_at();

CREATE TRIGGER trg_ventas_updated_at
BEFORE UPDATE ON app.ventas
FOR EACH ROW EXECUTE FUNCTION app.fn_set_updated_at();

CREATE TRIGGER trg_venta_detalle_before
BEFORE INSERT ON app.venta_detalle
FOR EACH ROW EXECUTE FUNCTION app.fn_venta_detalle_before();

CREATE TRIGGER trg_venta_detalle_after
AFTER INSERT ON app.venta_detalle
FOR EACH ROW EXECUTE FUNCTION app.fn_venta_detalle_after();

CREATE TRIGGER trg_stock_bajo
AFTER UPDATE OF stock_actual ON app.inventario
FOR EACH ROW EXECUTE FUNCTION ai.fn_alerta_stock_bajo();


-- Triggers de auditoría sobre tablas sensibles
CREATE TRIGGER audit_usuarios
AFTER INSERT OR UPDATE OR DELETE ON app.usuarios
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();

CREATE TRIGGER audit_clientes
AFTER INSERT OR UPDATE OR DELETE ON app.clientes
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();

CREATE TRIGGER audit_productos
AFTER INSERT OR UPDATE OR DELETE ON app.productos
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();

CREATE TRIGGER audit_inventario
AFTER INSERT OR UPDATE OR DELETE ON app.inventario
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();

CREATE TRIGGER audit_ventas
AFTER INSERT OR UPDATE OR DELETE ON app.ventas
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();

CREATE TRIGGER audit_venta_detalle
AFTER INSERT OR UPDATE OR DELETE ON app.venta_detalle
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();

CREATE TRIGGER audit_movimientos_inventario
AFTER INSERT OR UPDATE OR DELETE ON app.movimientos_inventario
FOR EACH ROW EXECUTE FUNCTION audit.fn_auditar_cambios();


-- ============================================================
-- 9. SEGURIDAD A NIVEL DE FILA - ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE app.inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.inventario FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_inventario_select
ON app.inventario
FOR SELECT
USING (
    sec.is_management_role()
    OR id_sucursal = sec.current_sucursal_id()
);

CREATE POLICY rls_inventario_modificar
ON app.inventario
FOR UPDATE
USING (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'ALMACENERO')
    AND (sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL') OR id_sucursal = sec.current_sucursal_id())
)
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'ALMACENERO')
    AND (sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL') OR id_sucursal = sec.current_sucursal_id())
);


ALTER TABLE app.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.clientes FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_clientes_select
ON app.clientes
FOR SELECT
USING (
    sec.is_management_role()
    OR id_sucursal_registro = sec.current_sucursal_id()
);

CREATE POLICY rls_clientes_insert
ON app.clientes
FOR INSERT
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO')
    AND (
        sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL')
        OR id_sucursal_registro = sec.current_sucursal_id()
    )
);

CREATE POLICY rls_clientes_update
ON app.clientes
FOR UPDATE
USING (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO')
    AND (
        sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL')
        OR id_sucursal_registro = sec.current_sucursal_id()
    )
)
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO')
    AND (
        sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL')
        OR id_sucursal_registro = sec.current_sucursal_id()
    )
);


ALTER TABLE app.ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.ventas FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_ventas_select
ON app.ventas
FOR SELECT
USING (
    sec.is_management_role()
    OR id_sucursal = sec.current_sucursal_id()
);

CREATE POLICY rls_ventas_insert
ON app.ventas
FOR INSERT
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO')
    AND (
        sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL')
        OR id_sucursal = sec.current_sucursal_id()
    )
);

CREATE POLICY rls_ventas_update
ON app.ventas
FOR UPDATE
USING (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO')
    AND (
        sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL')
        OR id_sucursal = sec.current_sucursal_id()
    )
)
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL')
    OR id_sucursal = sec.current_sucursal_id()
);


ALTER TABLE app.venta_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.venta_detalle FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_venta_detalle_select
ON app.venta_detalle
FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM app.ventas v
        WHERE v.id_venta = venta_detalle.id_venta
          AND (sec.is_management_role() OR v.id_sucursal = sec.current_sucursal_id())
    )
);


ALTER TABLE app.movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.movimientos_inventario FORCE ROW LEVEL SECURITY;

CREATE POLICY rls_movimientos_select
ON app.movimientos_inventario
FOR SELECT
USING (
    sec.is_management_role()
    OR id_sucursal = sec.current_sucursal_id()
);


-- Políticas RLS complementarias para que las funciones transaccionales
-- puedan insertar detalle de venta, movimientos e inventario respetando rol y sucursal.
CREATE POLICY rls_inventario_insert
ON app.inventario
FOR INSERT
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'ALMACENERO')
    AND (sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL') OR id_sucursal = sec.current_sucursal_id())
);

CREATE POLICY rls_venta_detalle_insert
ON app.venta_detalle
FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM app.ventas v
        WHERE v.id_venta = venta_detalle.id_venta
          AND sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO')
          AND (sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL') OR v.id_sucursal = sec.current_sucursal_id())
    )
);

CREATE POLICY rls_movimientos_insert
ON app.movimientos_inventario
FOR INSERT
WITH CHECK (
    sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'CAJERO', 'ALMACENERO', 'SISTEMA_IA')
    AND (sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'SISTEMA_IA') OR id_sucursal = sec.current_sucursal_id())
);


-- ============================================================
-- 10. VISTAS SEGURAS Y ENMASCARAMIENTO DINÁMICO
-- ============================================================

CREATE VIEW app.v_clientes_seguro
WITH (security_invoker = true)
AS
SELECT
    c.id_cliente,
    c.nombres,
    c.apellidos,
    CASE
        WHEN sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'AUDITOR')
            THEN sec.decrypt_text(c.ci_enc)
        ELSE sec.mask_ci(sec.decrypt_text(c.ci_enc))
    END AS ci,
    CASE
        WHEN sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'AUDITOR')
            THEN sec.decrypt_text(c.email_enc)
        ELSE sec.mask_email(sec.decrypt_text(c.email_enc))
    END AS email,
    CASE
        WHEN sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'AUDITOR')
            THEN sec.decrypt_text(c.telefono_enc)
        ELSE sec.mask_phone(sec.decrypt_text(c.telefono_enc))
    END AS telefono,
    s.nombre AS sucursal_registro,
    c.activo,
    c.created_at
FROM app.clientes c
JOIN app.sucursales s ON s.id_sucursal = c.id_sucursal_registro;


CREATE VIEW app.v_usuarios_seguro
WITH (security_invoker = true)
AS
SELECT
    u.id_usuario,
    u.username,
    u.nombre_completo,
    r.nombre AS rol,
    s.nombre AS sucursal,
    CASE
        WHEN sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'AUDITOR')
            THEN sec.decrypt_text(u.email_enc)
        ELSE sec.mask_email(sec.decrypt_text(u.email_enc))
    END AS email,
    CASE
        WHEN sec.current_rol() IN ('ADMIN', 'GERENTE_GENERAL', 'AUDITOR')
            THEN sec.decrypt_text(u.telefono_enc)
        ELSE sec.mask_phone(sec.decrypt_text(u.telefono_enc))
    END AS telefono,
    u.activo,
    u.last_login_at
FROM app.usuarios u
JOIN app.roles r ON r.id_rol = u.id_rol
LEFT JOIN app.sucursales s ON s.id_sucursal = u.id_sucursal;


CREATE VIEW app.v_inventario_general
WITH (security_invoker = true)
AS
SELECT
    s.nombre AS sucursal,
    p.codigo_barra,
    p.nombre AS producto,
    c.nombre AS categoria,
    i.stock_actual,
    i.stock_minimo,
    i.stock_maximo,
    CASE
        WHEN i.stock_actual <= i.stock_minimo THEN 'STOCK_BAJO'
        WHEN i.stock_actual >= i.stock_maximo THEN 'SOBRESTOCK'
        ELSE 'NORMAL'
    END AS estado_stock,
    p.precio_venta,
    i.ubicacion,
    i.updated_at
FROM app.inventario i
JOIN app.sucursales s ON s.id_sucursal = i.id_sucursal
JOIN app.productos p ON p.id_producto = i.id_producto
JOIN app.categorias c ON c.id_categoria = p.id_categoria;


CREATE VIEW app.v_ventas_resumen
WITH (security_invoker = true)
AS
SELECT
    v.id_venta,
    s.nombre AS sucursal,
    cj.codigo AS caja,
    u.username AS cajero,
    v.fecha,
    v.subtotal,
    v.descuento,
    v.impuesto,
    v.total,
    v.metodo_pago,
    v.estado
FROM app.ventas v
JOIN app.sucursales s ON s.id_sucursal = v.id_sucursal
JOIN app.cajas cj ON cj.id_caja = v.id_caja
JOIN app.usuarios u ON u.id_usuario = v.id_cajero;


CREATE VIEW audit.v_eventos_recientes
AS
SELECT
    id_evento,
    fecha,
    usuario_db,
    usuario_app,
    rol_app,
    sucursal_app,
    esquema,
    tabla,
    operacion,
    fila_pk,
    ip
FROM audit.eventos
ORDER BY fecha DESC;


CREATE VIEW ai.v_alertas_pendientes
WITH (security_invoker = true)
AS
SELECT
    'SEGURIDAD' AS origen,
    id_alerta,
    fecha,
    severidad AS prioridad,
    tipo,
    descripcion,
    id_sucursal,
    id_usuario,
    id_venta,
    atendida
FROM ai.alertas_seguridad
WHERE atendida = false
UNION ALL
SELECT
    'NEGOCIO' AS origen,
    id_alerta,
    fecha,
    prioridad,
    tipo,
    descripcion,
    id_sucursal,
    NULL::uuid AS id_usuario,
    NULL::uuid AS id_venta,
    atendida
FROM ai.alertas_negocio
WHERE atendida = false;


-- ============================================================
-- 11. ÍNDICES PARA RENDIMIENTO Y SEGURIDAD
-- ============================================================

CREATE INDEX idx_usuarios_username ON app.usuarios(username);
CREATE INDEX idx_usuarios_rol_sucursal ON app.usuarios(id_rol, id_sucursal);
CREATE INDEX idx_productos_nombre ON app.productos(nombre);
CREATE INDEX idx_productos_categoria ON app.productos(id_categoria);
CREATE INDEX idx_inventario_sucursal_stock ON app.inventario(id_sucursal, stock_actual);
CREATE INDEX idx_clientes_sucursal ON app.clientes(id_sucursal_registro);
CREATE INDEX idx_ventas_sucursal_fecha ON app.ventas(id_sucursal, fecha DESC);
CREATE INDEX idx_ventas_cajero_fecha ON app.ventas(id_cajero, fecha DESC);
CREATE INDEX idx_venta_detalle_producto ON app.venta_detalle(id_producto);
CREATE INDEX idx_movimientos_sucursal_fecha ON app.movimientos_inventario(id_sucursal, fecha DESC);
CREATE INDEX idx_audit_eventos_fecha ON audit.eventos(fecha DESC);
CREATE INDEX idx_audit_eventos_usuario ON audit.eventos(usuario_app, fecha DESC);
CREATE INDEX idx_audit_eventos_tabla ON audit.eventos(tabla, operacion, fecha DESC);
CREATE INDEX idx_alertas_seguridad_pendientes ON ai.alertas_seguridad(atendida, fecha DESC);
CREATE INDEX idx_alertas_negocio_pendientes ON ai.alertas_negocio(atendida, fecha DESC);


-- ============================================================
-- 12. DATOS INICIALES
-- ============================================================

SET app.crypto_key = 'Supermarket_LaPaz_Clave_Demo_2026_Cambiar_En_Produccion';

INSERT INTO app.roles(nombre, descripcion, nivel_seguridad) VALUES
('ADMIN', 'Control total del sistema y configuración de seguridad.', 10),
('GERENTE_GENERAL', 'Acceso gerencial a todas las sucursales y reportes.', 9),
('AUDITOR', 'Acceso de lectura a auditoría, eventos y reportes de seguridad.', 8),
('CAJERO', 'Registro de ventas y clientes dentro de su sucursal.', 4),
('ALMACENERO', 'Gestión de inventario dentro de su sucursal.', 5),
('SISTEMA_IA', 'Usuario técnico para procesos automáticos de IA y análisis.', 7);


INSERT INTO app.sucursales(nombre, ciudad, zona, direccion, telefono) VALUES
('Supermarket Centro', 'La Paz', 'Centro', 'Av. Camacho, zona central de La Paz', '22110001'),
('Supermarket Zona Sur', 'La Paz', 'Zona Sur', 'Av. Ballivián, sector comercial Zona Sur', '22770002'),
('Supermarket El Alto', 'El Alto', 'Ceja', 'Av. 6 de Marzo, zona comercial El Alto', '22880003');


INSERT INTO app.usuarios(
    username,
    password_hash,
    nombre_completo,
    email_enc,
    telefono_enc,
    id_rol,
    id_sucursal
)
VALUES
('admin',
 sec.hash_password('Supermarket123*'),
 'Administrador General Supermarket',
 sec.encrypt_text('admin@supermarket.bo'),
 sec.encrypt_text('70000001'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'ADMIN'),
 NULL),

('gerente',
 sec.hash_password('Supermarket123*'),
 'Gerente General Supermarket',
 sec.encrypt_text('gerencia@supermarket.bo'),
 sec.encrypt_text('70000002'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'GERENTE_GENERAL'),
 NULL),

('auditor',
 sec.hash_password('Supermarket123*'),
 'Auditor de Seguridad Supermarket',
 sec.encrypt_text('auditoria@supermarket.bo'),
 sec.encrypt_text('70000003'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'AUDITOR'),
 NULL),

('cajero_centro',
 sec.hash_password('Supermarket123*'),
 'Cajero Sucursal Centro',
 sec.encrypt_text('cajero.centro@supermarket.bo'),
 sec.encrypt_text('70000004'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'CAJERO'),
 (SELECT id_sucursal FROM app.sucursales WHERE nombre = 'Supermarket Centro')),

('cajero_sur',
 sec.hash_password('Supermarket123*'),
 'Cajero Sucursal Zona Sur',
 sec.encrypt_text('cajero.sur@supermarket.bo'),
 sec.encrypt_text('70000005'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'CAJERO'),
 (SELECT id_sucursal FROM app.sucursales WHERE nombre = 'Supermarket Zona Sur')),

('cajero_elalto',
 sec.hash_password('Supermarket123*'),
 'Cajero Sucursal El Alto',
 sec.encrypt_text('cajero.elalto@supermarket.bo'),
 sec.encrypt_text('70000006'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'CAJERO'),
 (SELECT id_sucursal FROM app.sucursales WHERE nombre = 'Supermarket El Alto')),

('almacen_centro',
 sec.hash_password('Supermarket123*'),
 'Encargado de Almacén Centro',
 sec.encrypt_text('almacen.centro@supermarket.bo'),
 sec.encrypt_text('70000007'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'ALMACENERO'),
 (SELECT id_sucursal FROM app.sucursales WHERE nombre = 'Supermarket Centro')),

('ia_bot',
 sec.hash_password('Supermarket123*'),
 'Motor IA de Supermarket',
 sec.encrypt_text('ia@supermarket.bo'),
 sec.encrypt_text('70000008'),
 (SELECT id_rol FROM app.roles WHERE nombre = 'SISTEMA_IA'),
 NULL);


INSERT INTO app.categorias(nombre, descripcion) VALUES
('Abarrotes', 'Productos básicos de consumo diario.'),
('Lácteos', 'Leche, yogurt, queso y derivados.'),
('Bebidas', 'Refrescos, aguas, jugos y bebidas no alcohólicas.'),
('Limpieza', 'Artículos de limpieza del hogar.'),
('Higiene Personal', 'Productos de aseo personal.'),
('Carnes y Embutidos', 'Productos cárnicos y procesados.'),
('Panadería', 'Pan, galletas y productos horneados.');


INSERT INTO app.proveedores(razon_social, nit, contacto, email_enc, telefono_enc, direccion) VALUES
('Distribuidora Andina S.R.L.', '1020304050', 'Carlos Mamani', sec.encrypt_text('ventas@andina.bo'), sec.encrypt_text('72000001'), 'La Paz - Bolivia'),
('Lácteos del Valle S.A.', '2030405060', 'María Quispe', sec.encrypt_text('contacto@lacteosvalle.bo'), sec.encrypt_text('72000002'), 'Achocalla - La Paz'),
('Bebidas Altiplano S.A.', '3040506070', 'Rodrigo Flores', sec.encrypt_text('comercial@altiplano.bo'), sec.encrypt_text('72000003'), 'El Alto - Bolivia'),
('Limpieza Total S.R.L.', '4050607080', 'Ana Choque', sec.encrypt_text('proveedores@limpiezatotal.bo'), sec.encrypt_text('72000004'), 'La Paz - Bolivia');


INSERT INTO app.productos(
    codigo_barra,
    nombre,
    descripcion,
    id_categoria,
    id_proveedor,
    precio_compra,
    precio_venta,
    unidad_medida
)
VALUES
('775000000001', 'Arroz Grano de Oro 1kg', 'Arroz seleccionado bolsa 1kg', 1, 1, 6.50, 8.50, 'bolsa'),
('775000000002', 'Azúcar Blanca 1kg', 'Azúcar blanca refinada', 1, 1, 5.80, 7.50, 'bolsa'),
('775000000003', 'Fideo Cortado 400g', 'Fideo familiar paquete 400g', 1, 1, 3.20, 4.80, 'paquete'),
('775000000004', 'Aceite Vegetal 900ml', 'Aceite vegetal botella 900ml', 1, 1, 9.00, 12.50, 'botella'),
('775000000005', 'Leche Entera 1L', 'Leche entera larga vida', 2, 2, 5.00, 7.00, 'unidad'),
('775000000006', 'Yogurt Frutilla 1L', 'Yogurt sabor frutilla', 2, 2, 7.50, 10.00, 'unidad'),
('775000000007', 'Queso Fresco 500g', 'Queso fresco tradicional', 2, 2, 18.00, 24.00, 'unidad'),
('775000000008', 'Agua Mineral 2L', 'Agua mineral sin gas', 3, 3, 3.00, 5.00, 'botella'),
('775000000009', 'Refresco Cola 2L', 'Bebida gaseosa cola', 3, 3, 7.00, 10.50, 'botella'),
('775000000010', 'Jugo Durazno 1L', 'Jugo sabor durazno', 3, 3, 5.50, 8.00, 'unidad'),
('775000000011', 'Detergente 1kg', 'Detergente en polvo', 4, 4, 11.00, 16.00, 'bolsa'),
('775000000012', 'Lavandina 1L', 'Lavandina desinfectante', 4, 4, 4.00, 6.50, 'botella'),
('775000000013', 'Jabón Tocador', 'Jabón de tocador familiar', 5, 4, 2.50, 4.00, 'unidad'),
('775000000014', 'Shampoo 400ml', 'Shampoo familiar', 5, 4, 13.00, 20.00, 'botella'),
('775000000015', 'Papel Higiénico x4', 'Pack papel higiénico 4 unidades', 5, 4, 12.00, 18.00, 'pack'),
('775000000016', 'Pollo por kg', 'Pollo fresco por kilogramo', 6, 1, 13.00, 17.50, 'kg'),
('775000000017', 'Salchicha 500g', 'Salchicha familiar', 6, 1, 12.00, 18.00, 'paquete'),
('775000000018', 'Pan Marraqueta', 'Pan marraqueta por unidad', 7, 1, 0.35, 0.70, 'unidad'),
('775000000019', 'Galletas Vainilla', 'Galletas dulces sabor vainilla', 7, 1, 3.00, 5.00, 'paquete'),
('775000000020', 'Café Instantáneo 170g', 'Café instantáneo frasco 170g', 1, 1, 21.00, 30.00, 'frasco');


INSERT INTO app.cajas(id_sucursal, codigo, descripcion) VALUES
(1, 'CEN-CAJA-01', 'Caja principal Centro'),
(1, 'CEN-CAJA-02', 'Caja secundaria Centro'),
(2, 'SUR-CAJA-01', 'Caja principal Zona Sur'),
(2, 'SUR-CAJA-02', 'Caja secundaria Zona Sur'),
(3, 'ALT-CAJA-01', 'Caja principal El Alto'),
(3, 'ALT-CAJA-02', 'Caja secundaria El Alto');


-- Inventario inicial para las 3 sucursales
INSERT INTO app.inventario(
    id_sucursal,
    id_producto,
    stock_actual,
    stock_minimo,
    stock_maximo,
    ubicacion
)
SELECT
    s.id_sucursal,
    p.id_producto,
    CASE
        WHEN s.nombre = 'Supermarket Centro' THEN 80
        WHEN s.nombre = 'Supermarket Zona Sur' THEN 65
        ELSE 70
    END AS stock_actual,
    15 AS stock_minimo,
    120 AS stock_maximo,
    'Pasillo ' || ((p.id_producto % 7) + 1)
FROM app.sucursales s
CROSS JOIN app.productos p;


-- Clientes iniciales con datos cifrados
INSERT INTO app.clientes(
    nombres,
    apellidos,
    ci_enc,
    email_enc,
    telefono_enc,
    id_sucursal_registro,
    creado_por
)
VALUES
('Juan', 'Pérez Mamani', sec.encrypt_text('1234567'), sec.encrypt_text('juan.perez@mail.com'), sec.encrypt_text('76543210'), 1, (SELECT id_usuario FROM app.usuarios WHERE username = 'cajero_centro')),
('María', 'Quispe Flores', sec.encrypt_text('2345678'), sec.encrypt_text('maria.quispe@mail.com'), sec.encrypt_text('71234567'), 2, (SELECT id_usuario FROM app.usuarios WHERE username = 'cajero_sur')),
('Carlos', 'Choque Apaza', sec.encrypt_text('3456789'), sec.encrypt_text('carlos.choque@mail.com'), sec.encrypt_text('69876543'), 3, (SELECT id_usuario FROM app.usuarios WHERE username = 'cajero_elalto'));


-- ============================================================
-- 13. PRIVILEGIOS BÁSICOS PARA USUARIOS DE BD DE PRUEBA
-- ============================================================
-- Estos roles de PostgreSQL son opcionales. Sirven si quieres conectarte
-- desde pgAdmin con un usuario limitado y probar RLS.
-- Cambia las contraseñas si lo usarás en una máquina compartida.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_backend') THEN
        CREATE ROLE sm_backend LOGIN PASSWORD 'Backend123*';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_readonly') THEN
        CREATE ROLE sm_readonly LOGIN PASSWORD 'Readonly123*';
    END IF;
END;
$$;

REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA sec FROM PUBLIC;
REVOKE ALL ON SCHEMA audit FROM PUBLIC;
REVOKE ALL ON SCHEMA ai FROM PUBLIC;

GRANT USAGE ON SCHEMA app, sec, ai TO sm_backend;
GRANT USAGE ON SCHEMA app, ai TO sm_readonly;

GRANT SELECT ON app.sucursales TO sm_backend, sm_readonly;
GRANT SELECT ON app.categorias TO sm_backend, sm_readonly;
GRANT SELECT ON app.productos TO sm_backend, sm_readonly;
GRANT SELECT ON app.v_clientes_seguro TO sm_backend;
GRANT SELECT ON app.v_usuarios_seguro TO sm_backend;
GRANT SELECT ON app.v_inventario_general TO sm_backend, sm_readonly;
GRANT SELECT ON app.v_ventas_resumen TO sm_backend;
GRANT SELECT ON ai.v_alertas_pendientes TO sm_backend;

GRANT EXECUTE ON FUNCTION app.autenticar(text, text) TO sm_backend;
GRANT EXECUTE ON FUNCTION sec.clear_app_context() TO sm_backend;
GRANT EXECUTE ON FUNCTION app.registrar_venta(int, uuid, text, numeric, jsonb) TO sm_backend;
GRANT EXECUTE ON FUNCTION app.crear_cliente_seguro(text, text, text, text, text) TO sm_backend;
GRANT EXECUTE ON FUNCTION app.registrar_movimiento_manual(int, int, text, numeric, text) TO sm_backend;
GRANT EXECUTE ON FUNCTION app.anular_venta(uuid, text) TO sm_backend;
GRANT EXECUTE ON FUNCTION ai.fn_generar_alertas_reposicion() TO sm_backend;
GRANT EXECUTE ON FUNCTION ai.fn_generar_prediccion_demanda(int) TO sm_backend;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app TO sm_backend;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ai TO sm_backend;


-- ============================================================
-- 14. CONSULTAS DE PRUEBA
-- ============================================================
-- Ejecuta estas pruebas después de instalar la base.
--
-- 1) Definir clave criptográfica de sesión:
-- SET app.crypto_key = 'Supermarket_LaPaz_Clave_Demo_2026_Cambiar_En_Produccion';
--
-- 2) Login como cajero Centro:
-- SELECT app.autenticar('cajero_centro', 'Supermarket123*');
--
-- 3) Ver clientes enmascarados:
-- SELECT * FROM app.v_clientes_seguro;
--
-- 4) Ver inventario permitido por sucursal:
-- SELECT * FROM app.v_inventario_general ORDER BY producto;
--
-- 5) Registrar venta automática:
-- SELECT app.registrar_venta(
--     1,
--     NULL,
--     'EFECTIVO',
--     0,
--     '[{"id_producto":1,"cantidad":2},{"id_producto":5,"cantidad":3}]'::jsonb
-- );
--
-- 6) Revisar ventas:
-- SELECT * FROM app.v_ventas_resumen;
--
-- 7) Revisar inventario actualizado:
-- SELECT * FROM app.v_inventario_general WHERE codigo_barra IN ('775000000001','775000000005');
--
-- 8) Revisar auditoría:
-- SELECT * FROM audit.v_eventos_recientes LIMIT 30;
--
-- 9) Generar alertas de reposición:
-- SELECT ai.fn_generar_alertas_reposicion();
-- SELECT * FROM ai.v_alertas_pendientes;
--
-- 10) Generar predicción básica de demanda:
-- SELECT ai.fn_generar_prediccion_demanda(30);
-- SELECT * FROM ai.prediccion_demanda;
--
-- 11) Limpiar contexto de sesión:
-- SELECT sec.clear_app_context();
--


-- ============================================================
-- 15. AMPLIACIÓN EMPRESARIAL: ALTA SEGURIDAD, BACKUPS, REPORTES E IA
-- ============================================================
-- Esta sección endurece la base original con controles adicionales:
-- firewall lógico, horarios de acceso, 2FA demostrativo, auditoría
-- inmutable con hash, soporte para pool seguro, políticas de backup,
-- reportes auditados, IA defensiva contra intrusos, IA de fraude,
-- reposición inteligente y preparación para tablas federadas.
--
-- NOTA IMPORTANTE:
-- - Ninguna base de datos puede ser "100% invulnerable".
-- - Esta implementación reduce riesgos y deja una arquitectura defendible.
-- - Firewall real, backups reales, SSL/TLS, PgBouncer y secretos deben
--   configurarse también en servidor/backend.
-- ============================================================

DROP SCHEMA IF EXISTS rpt CASCADE;
DROP SCHEMA IF EXISTS ops CASCADE;
DROP SCHEMA IF EXISTS integ CASCADE;

CREATE SCHEMA ops;
CREATE SCHEMA rpt;
CREATE SCHEMA integ;

-- Extensiones útiles. postgres_fdw se usa para tablas federadas.
-- Si tu instalación no permite crear postgres_fdw, comenta esa línea.
CREATE EXTENSION IF NOT EXISTS postgres_fdw;


-- ============================================================
-- 15.1 CONFIGURACIÓN GENERAL DE SEGURIDAD
-- ============================================================

CREATE TABLE sec.configuracion_seguridad (
    clave              varchar(80) PRIMARY KEY,
    valor              text NOT NULL,
    descripcion        text,
    updated_at         timestamptz NOT NULL DEFAULT now()
);

INSERT INTO sec.configuracion_seguridad(clave, valor, descripcion) VALUES
('firewall_logico_activo', 'true', 'Activa validación de IP permitida/bloqueada desde SQL.'),
('bloqueo_ip_automatico', 'true', 'Permite que la IA bloquee IPs sospechosas temporalmente.'),
('riesgo_login_bloqueo_ip', '85', 'Puntaje desde el cual se bloquea la IP.'),
('riesgo_login_2fa', '55', 'Puntaje desde el cual se exige doble factor.'),
('riesgo_login_alerta', '65', 'Puntaje desde el cual se genera alerta de seguridad.'),
('max_intentos_login', '5', 'Intentos fallidos antes de bloqueo del usuario.'),
('minutos_bloqueo_usuario', '15', 'Tiempo de bloqueo temporal de cuenta.'),
('minutos_bloqueo_ip', '30', 'Tiempo de bloqueo automático de IP sospechosa.'),
('timezone_negocio', 'America/La_Paz', 'Zona horaria usada para horarios de acceso.')
ON CONFLICT (clave) DO UPDATE SET valor = EXCLUDED.valor, descripcion = EXCLUDED.descripcion, updated_at = now();

CREATE OR REPLACE FUNCTION sec.get_config_bool(p_clave text, p_default boolean DEFAULT false)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v text;
BEGIN
    SELECT valor INTO v FROM sec.configuracion_seguridad WHERE clave = p_clave;
    IF v IS NULL THEN
        RETURN p_default;
    END IF;
    RETURN lower(v) IN ('true', '1', 'yes', 'si', 'sí');
END;
$$;

CREATE OR REPLACE FUNCTION sec.get_config_int(p_clave text, p_default int DEFAULT 0)
RETURNS int
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v text;
BEGIN
    SELECT valor INTO v FROM sec.configuracion_seguridad WHERE clave = p_clave;
    IF v IS NULL OR v !~ '^[0-9]+$' THEN
        RETURN p_default;
    END IF;
    RETURN v::int;
END;
$$;

CREATE OR REPLACE FUNCTION sec.get_config_text(p_clave text, p_default text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v text;
BEGIN
    SELECT valor INTO v FROM sec.configuracion_seguridad WHERE clave = p_clave;
    RETURN COALESCE(v, p_default);
END;
$$;


-- ============================================================
-- 15.2 FIREWALL LÓGICO POR IP Y BLOQUEO AUTOMÁTICO
-- ============================================================

CREATE TABLE sec.ip_permitidas (
    id_ip              bigserial PRIMARY KEY,
    red                cidr NOT NULL,
    descripcion        text,
    rol                varchar(50),
    id_sucursal        int REFERENCES app.sucursales(id_sucursal),
    activa             boolean NOT NULL DEFAULT true,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sec.ip_bloqueadas (
    id_bloqueo         bigserial PRIMARY KEY,
    ip                 inet NOT NULL,
    motivo             text NOT NULL,
    bloqueada_desde    timestamptz NOT NULL DEFAULT now(),
    bloqueada_hasta    timestamptz,
    severidad          varchar(20) NOT NULL DEFAULT 'ALTA' CHECK (severidad IN ('BAJA','MEDIA','ALTA','CRITICA')),
    creada_por_ia      boolean NOT NULL DEFAULT false,
    activa             boolean NOT NULL DEFAULT true
);

CREATE INDEX idx_ip_bloqueadas_ip_activa ON sec.ip_bloqueadas(ip, activa, bloqueada_hasta);
CREATE INDEX idx_ip_permitidas_red_activa ON sec.ip_permitidas(red, activa);
CREATE UNIQUE INDEX ux_ip_permitidas_red_rol_sucursal ON sec.ip_permitidas(red, COALESCE(rol, ''), COALESCE(id_sucursal, 0));

-- Redes de ejemplo para pruebas locales y redes internas.
INSERT INTO sec.ip_permitidas(red, descripcion) VALUES
('127.0.0.1/32', 'Servidor local'),
('::1/128', 'Servidor local IPv6'),
('10.0.0.0/8', 'Red privada empresarial'),
('172.16.0.0/12', 'Red privada empresarial'),
('192.168.0.0/16', 'Red privada empresarial')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION sec.ip_esta_bloqueada(p_ip inet)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    IF p_ip IS NULL THEN
        RETURN false;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM sec.ip_bloqueadas b
        WHERE b.activa = true
          AND b.ip = p_ip
          AND (b.bloqueada_hasta IS NULL OR b.bloqueada_hasta > now())
    );
END;
$$;

CREATE OR REPLACE FUNCTION sec.ip_esta_permitida(p_ip inet, p_rol text DEFAULT NULL, p_id_sucursal int DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_firewall boolean;
    v_existen_reglas boolean;
BEGIN
    v_firewall := sec.get_config_bool('firewall_logico_activo', true);
    IF v_firewall = false THEN
        RETURN true;
    END IF;

    IF p_ip IS NULL THEN
        RETURN true;
    END IF;

    IF sec.ip_esta_bloqueada(p_ip) THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM sec.ip_permitidas
        WHERE activa = true
          AND (rol IS NULL OR rol = p_rol)
          AND (id_sucursal IS NULL OR id_sucursal = p_id_sucursal)
    ) INTO v_existen_reglas;

    IF v_existen_reglas = false THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM sec.ip_permitidas p
        WHERE p.activa = true
          AND p_ip << p.red
          AND (p.rol IS NULL OR p.rol = p_rol)
          AND (p.id_sucursal IS NULL OR p.id_sucursal = p_id_sucursal)
    );
END;
$$;

CREATE OR REPLACE FUNCTION sec.bloquear_ip(
    p_ip inet,
    p_motivo text,
    p_minutos int DEFAULT NULL,
    p_severidad text DEFAULT 'ALTA',
    p_creada_por_ia boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sec, ai, audit, app, public
AS $$
DECLARE
    v_minutos int;
BEGIN
    IF p_ip IS NULL THEN
        RETURN;
    END IF;

    v_minutos := COALESCE(p_minutos, sec.get_config_int('minutos_bloqueo_ip', 30));

    INSERT INTO sec.ip_bloqueadas(ip, motivo, bloqueada_hasta, severidad, creada_por_ia, activa)
    VALUES (
        p_ip,
        COALESCE(p_motivo, 'Bloqueo preventivo'),
        CASE WHEN v_minutos <= 0 THEN NULL ELSE now() + make_interval(mins => v_minutos) END,
        CASE WHEN p_severidad IN ('BAJA','MEDIA','ALTA','CRITICA') THEN p_severidad ELSE 'ALTA' END,
        p_creada_por_ia,
        true
    );
END;
$$;


-- ============================================================
-- 15.3 HORARIOS DE ACCESO POR ROL
-- ============================================================

CREATE TABLE sec.horarios_acceso (
    id_horario         bigserial PRIMARY KEY,
    rol                varchar(50) NOT NULL,
    dia_semana         int NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 domingo, 6 sábado
    hora_inicio        time NOT NULL,
    hora_fin           time NOT NULL,
    permitido          boolean NOT NULL DEFAULT true,
    descripcion        text,
    UNIQUE(rol, dia_semana, hora_inicio, hora_fin)
);

-- Horarios empresariales por defecto.
INSERT INTO sec.horarios_acceso(rol, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT 'ADMIN', d, '00:00', '23:59', 'Administración con 2FA y auditoría reforzada'
FROM generate_series(0,6) AS d
ON CONFLICT DO NOTHING;

INSERT INTO sec.horarios_acceso(rol, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT 'GERENTE_GENERAL', d, '06:00', '23:00', 'Horario gerencial ampliado'
FROM generate_series(0,6) AS d
ON CONFLICT DO NOTHING;

INSERT INTO sec.horarios_acceso(rol, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT 'CAJERO', d, '06:00', '22:30', 'Horario operativo de cajas'
FROM generate_series(0,6) AS d
ON CONFLICT DO NOTHING;

INSERT INTO sec.horarios_acceso(rol, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT 'ALMACENERO', d, '06:00', '21:00', 'Horario operativo de almacén'
FROM generate_series(0,6) AS d
ON CONFLICT DO NOTHING;

INSERT INTO sec.horarios_acceso(rol, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT 'AUDITOR', d, '07:00', '19:00', 'Horario administrativo de auditoría'
FROM generate_series(1,5) AS d
ON CONFLICT DO NOTHING;

INSERT INTO sec.horarios_acceso(rol, dia_semana, hora_inicio, hora_fin, descripcion)
SELECT 'SISTEMA_IA', d, '00:00', '23:59', 'Procesos automáticos de IA'
FROM generate_series(0,6) AS d
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION sec.rol_en_horario_permitido(p_rol text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_tz text;
    v_dow int;
    v_time time;
BEGIN
    v_tz := sec.get_config_text('timezone_negocio', 'America/La_Paz');
    v_dow := EXTRACT(DOW FROM (now() AT TIME ZONE v_tz));
    v_time := (now() AT TIME ZONE v_tz)::time;

    RETURN EXISTS (
        SELECT 1
        FROM sec.horarios_acceso h
        WHERE h.rol = p_rol
          AND h.dia_semana = v_dow
          AND h.permitido = true
          AND (
                (h.hora_inicio <= h.hora_fin AND v_time BETWEEN h.hora_inicio AND h.hora_fin)
                OR
                (h.hora_inicio > h.hora_fin AND (v_time >= h.hora_inicio OR v_time <= h.hora_fin))
          )
    );
END;
$$;


-- ============================================================
-- 15.4 POLÍTICA DE CONTRASEÑAS, HISTORIAL Y DOBLE FACTOR
-- ============================================================

CREATE TABLE sec.politica_password (
    id_politica        smallint PRIMARY KEY DEFAULT 1,
    min_longitud       int NOT NULL DEFAULT 12,
    exigir_mayuscula   boolean NOT NULL DEFAULT true,
    exigir_minuscula   boolean NOT NULL DEFAULT true,
    exigir_numero      boolean NOT NULL DEFAULT true,
    exigir_simbolo     boolean NOT NULL DEFAULT true,
    max_dias_vigencia  int NOT NULL DEFAULT 90,
    historial_no_repetir int NOT NULL DEFAULT 5,
    updated_at         timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT unica_politica CHECK (id_politica = 1)
);

INSERT INTO sec.politica_password(id_politica) VALUES (1)
ON CONFLICT (id_politica) DO NOTHING;

CREATE TABLE sec.password_historial (
    id_historial       bigserial PRIMARY KEY,
    id_usuario         uuid NOT NULL REFERENCES app.usuarios(id_usuario),
    password_hash      text NOT NULL,
    creado_en          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE app.usuarios
    ADD COLUMN IF NOT EXISTS password_cambiado_en timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN IF NOT EXISTS requiere_cambio_password boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION sec.password_es_fuerte(p_password text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    p sec.politica_password%ROWTYPE;
BEGIN
    SELECT * INTO p FROM sec.politica_password WHERE id_politica = 1;

    IF p_password IS NULL OR length(p_password) < p.min_longitud THEN
        RETURN false;
    END IF;
    IF p.exigir_mayuscula AND p_password !~ '[A-ZÁÉÍÓÚÑ]' THEN
        RETURN false;
    END IF;
    IF p.exigir_minuscula AND p_password !~ '[a-záéíóúñ]' THEN
        RETURN false;
    END IF;
    IF p.exigir_numero AND p_password !~ '[0-9]' THEN
        RETURN false;
    END IF;
    IF p.exigir_simbolo AND p_password !~ '[^A-Za-zÁÉÍÓÚÑáéíóúñ0-9]' THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION app.cambiar_password(
    p_username text,
    p_password_actual text,
    p_password_nueva text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, public
AS $$
DECLARE
    v_user app.usuarios%ROWTYPE;
    v_hist int;
    v_hash text;
    v_no_repetir int;
BEGIN
    SELECT * INTO v_user FROM app.usuarios WHERE username = p_username;
    IF NOT FOUND THEN
        RETURN false;
    END IF;

    IF sec.verify_password(p_password_actual, v_user.password_hash) = false THEN
        INSERT INTO audit.eventos(usuario_app, rol_app, esquema, tabla, operacion, fila_pk, observacion)
        VALUES (p_username, 'DESCONOCIDO', 'app', 'usuarios', 'PASSWORD_CHANGE_DENIED', v_user.id_usuario::text, 'Contraseña actual incorrecta');
        RETURN false;
    END IF;

    IF sec.password_es_fuerte(p_password_nueva) = false THEN
        RAISE EXCEPTION 'La nueva contraseña no cumple la política de seguridad.';
    END IF;

    SELECT historial_no_repetir INTO v_no_repetir FROM sec.politica_password WHERE id_politica = 1;

    SELECT count(*) INTO v_hist
    FROM (
        SELECT password_hash
        FROM sec.password_historial
        WHERE id_usuario = v_user.id_usuario
        ORDER BY creado_en DESC
        LIMIT v_no_repetir
    ) h
    WHERE sec.verify_password(p_password_nueva, h.password_hash);

    IF v_hist > 0 OR sec.verify_password(p_password_nueva, v_user.password_hash) THEN
        RAISE EXCEPTION 'La nueva contraseña no puede repetir contraseñas recientes.';
    END IF;

    INSERT INTO sec.password_historial(id_usuario, password_hash)
    VALUES (v_user.id_usuario, v_user.password_hash);

    v_hash := sec.hash_password(p_password_nueva);

    UPDATE app.usuarios
    SET password_hash = v_hash,
        password_cambiado_en = now(),
        requiere_cambio_password = false,
        updated_at = now()
    WHERE id_usuario = v_user.id_usuario;

    RETURN true;
END;
$$;

CREATE TABLE sec.usuario_mfa (
    id_mfa             bigserial PRIMARY KEY,
    id_usuario         uuid NOT NULL REFERENCES app.usuarios(id_usuario) UNIQUE,
    metodo             varchar(30) NOT NULL DEFAULT 'TOTP_DEMO' CHECK (metodo IN ('TOTP_DEMO','EMAIL_DEMO','APP_AUTH')),
    activo             boolean NOT NULL DEFAULT false,
    secreto_enc        bytea,
    codigo_hash        text,
    codigo_expira_en   timestamptz,
    ultimo_uso_en      timestamptz,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION sec.configurar_mfa_demo(
    p_username text,
    p_codigo_demo text,
    p_activo boolean DEFAULT true
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, public
AS $$
DECLARE
    v_user uuid;
BEGIN
    SELECT id_usuario INTO v_user FROM app.usuarios WHERE username = p_username;
    IF v_user IS NULL THEN
        RETURN false;
    END IF;

    INSERT INTO sec.usuario_mfa(id_usuario, activo, codigo_hash, codigo_expira_en)
    VALUES (v_user, p_activo, sec.hash_password(p_codigo_demo), now() + interval '365 days')
    ON CONFLICT (id_usuario) DO UPDATE
    SET activo = EXCLUDED.activo,
        codigo_hash = EXCLUDED.codigo_hash,
        codigo_expira_en = EXCLUDED.codigo_expira_en;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION sec.verificar_mfa(p_id_usuario uuid, p_codigo text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sec, public
AS $$
DECLARE
    v_mfa sec.usuario_mfa%ROWTYPE;
BEGIN
    SELECT * INTO v_mfa
    FROM sec.usuario_mfa
    WHERE id_usuario = p_id_usuario AND activo = true;

    IF NOT FOUND THEN
        RETURN true;
    END IF;

    IF p_codigo IS NULL THEN
        RETURN false;
    END IF;

    IF v_mfa.codigo_expira_en IS NOT NULL AND v_mfa.codigo_expira_en < now() THEN
        RETURN false;
    END IF;

    IF sec.verify_password(p_codigo, v_mfa.codigo_hash) THEN
        UPDATE sec.usuario_mfa SET ultimo_uso_en = now() WHERE id_mfa = v_mfa.id_mfa;
        RETURN true;
    END IF;

    RETURN false;
END;
$$;

-- 2FA demostrativo para roles críticos. En producción se usa TOTP real.
SELECT sec.configurar_mfa_demo('admin', '123456', true);
SELECT sec.configurar_mfa_demo('gerente', '123456', true);
SELECT sec.configurar_mfa_demo('auditor', '123456', true);


-- ============================================================
-- 15.5 SOPORTE PARA POOL DE CONEXIONES SEGURO
-- ============================================================
-- En producción, el pool se configura en PgBouncer o en el backend.
-- Estas funciones ayudan a evitar fuga de contexto cuando una conexión
-- se reutiliza para otro usuario.

CREATE TABLE sec.sesiones_activas (
    id_sesion          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario         uuid REFERENCES app.usuarios(id_usuario),
    username           varchar(60),
    rol                varchar(50),
    id_sucursal        int,
    ip                 inet,
    user_agent         text,
    inicio_en          timestamptz NOT NULL DEFAULT now(),
    ultimo_uso_en      timestamptz NOT NULL DEFAULT now(),
    finalizada_en      timestamptz,
    estado             varchar(20) NOT NULL DEFAULT 'ACTIVA' CHECK (estado IN ('ACTIVA','FINALIZADA','EXPIRADA','BLOQUEADA'))
);

CREATE OR REPLACE FUNCTION sec.iniciar_contexto_peticion(
    p_id_usuario uuid,
    p_username text,
    p_rol text,
    p_id_sucursal int,
    p_ip inet DEFAULT inet_client_addr(),
    p_user_agent text DEFAULT current_setting('application_name', true)
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sec, app, public
AS $$
DECLARE
    v_sesion uuid;
BEGIN
    PERFORM set_config('app.user_id', COALESCE(p_id_usuario::text,''), false);
    PERFORM set_config('app.username', COALESCE(p_username,''), false);
    PERFORM set_config('app.rol', COALESCE(p_rol,''), false);
    PERFORM set_config('app.sucursal_id', COALESCE(p_id_sucursal::text,''), false);

    INSERT INTO sec.sesiones_activas(id_usuario, username, rol, id_sucursal, ip, user_agent)
    VALUES (p_id_usuario, p_username, p_rol, p_id_sucursal, p_ip, p_user_agent)
    RETURNING id_sesion INTO v_sesion;

    PERFORM set_config('app.session_id', v_sesion::text, false);

    RETURN v_sesion;
END;
$$;

CREATE OR REPLACE FUNCTION sec.finalizar_contexto_peticion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = sec, public
AS $$
DECLARE
    v_sesion text;
BEGIN
    v_sesion := current_setting('app.session_id', true);
    IF v_sesion IS NOT NULL AND v_sesion <> '' THEN
        UPDATE sec.sesiones_activas
        SET estado = 'FINALIZADA', finalizada_en = now(), ultimo_uso_en = now()
        WHERE id_sesion = v_sesion::uuid;
    END IF;

    PERFORM sec.clear_app_context();
    PERFORM set_config('app.session_id', '', false);
END;
$$;


-- ============================================================
-- 15.6 AUDITORÍA INMUTABLE CON HASH ENCADENADO
-- ============================================================

ALTER TABLE audit.eventos
    ADD COLUMN IF NOT EXISTS hash_anterior text,
    ADD COLUMN IF NOT EXISTS hash_evento text,
    ADD COLUMN IF NOT EXISTS criticidad varchar(20) NOT NULL DEFAULT 'NORMAL'
        CHECK (criticidad IN ('NORMAL','ALTA','CRITICA'));

CREATE OR REPLACE FUNCTION audit.fn_sanitizar_jsonb(p_data jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE
        WHEN p_data IS NULL THEN NULL
        ELSE p_data
            - 'password_hash'
            - 'email_enc'
            - 'telefono_enc'
            - 'ci_enc'
            - 'secreto_enc'
            - 'codigo_hash'
    END;
$$;

CREATE OR REPLACE FUNCTION audit.fn_calcular_hash_evento(
    p_hash_anterior text,
    p_fecha timestamptz,
    p_usuario_app text,
    p_rol_app text,
    p_sucursal_app int,
    p_esquema text,
    p_tabla text,
    p_operacion text,
    p_fila_pk text,
    p_datos_antes jsonb,
    p_datos_despues jsonb,
    p_ip inet
)
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT encode(
        digest(
            COALESCE(p_hash_anterior, 'GENESIS') || '|' ||
            COALESCE(p_fecha::text, '') || '|' ||
            COALESCE(p_usuario_app, '') || '|' ||
            COALESCE(p_rol_app, '') || '|' ||
            COALESCE(p_sucursal_app::text, '') || '|' ||
            COALESCE(p_esquema, '') || '|' ||
            COALESCE(p_tabla, '') || '|' ||
            COALESCE(p_operacion, '') || '|' ||
            COALESCE(p_fila_pk, '') || '|' ||
            COALESCE(p_datos_antes::text, '') || '|' ||
            COALESCE(p_datos_despues::text, '') || '|' ||
            COALESCE(p_ip::text, ''),
            'sha256'
        ),
        'hex'
    );
$$;

CREATE OR REPLACE FUNCTION audit.fn_auditar_cambios()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, public
AS $$
DECLARE
    v_old jsonb;
    v_new jsonb;
    v_pk text;
    v_hash_anterior text;
    v_hash_evento text;
    v_fecha timestamptz;
    v_ip inet;
    v_criticidad text;
BEGIN
    IF TG_OP = 'INSERT' THEN
        v_new := audit.fn_sanitizar_jsonb(to_jsonb(NEW));
        v_old := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        v_new := audit.fn_sanitizar_jsonb(to_jsonb(NEW));
        v_old := audit.fn_sanitizar_jsonb(to_jsonb(OLD));
    ELSE
        v_new := NULL;
        v_old := audit.fn_sanitizar_jsonb(to_jsonb(OLD));
    END IF;

    v_pk := COALESCE(
        v_new ->> 'id', v_old ->> 'id',
        v_new ->> 'id_usuario', v_old ->> 'id_usuario',
        v_new ->> 'id_cliente', v_old ->> 'id_cliente',
        v_new ->> 'id_venta', v_old ->> 'id_venta',
        v_new ->> 'id_producto', v_old ->> 'id_producto',
        v_new ->> 'id_sucursal', v_old ->> 'id_sucursal',
        v_new ->> 'id_movimiento', v_old ->> 'id_movimiento'
    );

    v_fecha := now();
    v_ip := inet_client_addr();
    v_criticidad := CASE
        WHEN TG_TABLE_SCHEMA = 'app' AND TG_TABLE_NAME IN ('usuarios','ventas','movimientos_inventario') THEN 'ALTA'
        WHEN TG_OP IN ('DELETE','UPDATE') THEN 'ALTA'
        ELSE 'NORMAL'
    END;

    SELECT e.hash_evento INTO v_hash_anterior
    FROM audit.eventos e
    WHERE e.hash_evento IS NOT NULL
    ORDER BY e.id_evento DESC
    LIMIT 1;

    v_hash_evento := audit.fn_calcular_hash_evento(
        v_hash_anterior,
        v_fecha,
        sec.current_username(),
        sec.current_rol(),
        sec.current_sucursal_id(),
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP,
        v_pk,
        v_old,
        v_new,
        v_ip
    );

    INSERT INTO audit.eventos(
        fecha, usuario_app, rol_app, sucursal_app,
        esquema, tabla, operacion, fila_pk,
        datos_antes, datos_despues, ip,
        hash_anterior, hash_evento, criticidad
    )
    VALUES (
        v_fecha,
        sec.current_username(),
        sec.current_rol(),
        sec.current_sucursal_id(),
        TG_TABLE_SCHEMA,
        TG_TABLE_NAME,
        TG_OP,
        v_pk,
        v_old,
        v_new,
        v_ip,
        v_hash_anterior,
        v_hash_evento,
        v_criticidad
    );

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;


-- Backfill de hashes para eventos generados durante la carga inicial.
DO $$
DECLARE
    r record;
    v_prev text := NULL;
    v_hash text;
BEGIN
    FOR r IN SELECT * FROM audit.eventos ORDER BY id_evento LOOP
        v_hash := audit.fn_calcular_hash_evento(
            v_prev, r.fecha, r.usuario_app, r.rol_app,
            r.sucursal_app, r.esquema, r.tabla, r.operacion,
            r.fila_pk, r.datos_antes, r.datos_despues, r.ip
        );

        UPDATE audit.eventos
        SET hash_anterior = v_prev,
            hash_evento = v_hash
        WHERE id_evento = r.id_evento;

        v_prev := v_hash;
    END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION audit.fn_eventos_hash_before_insert()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_hash_anterior text;
BEGIN
    IF NEW.hash_evento IS NOT NULL THEN
        RETURN NEW;
    END IF;

    SELECT e.hash_evento INTO v_hash_anterior
    FROM audit.eventos e
    WHERE e.hash_evento IS NOT NULL
    ORDER BY e.id_evento DESC
    LIMIT 1;

    NEW.hash_anterior := v_hash_anterior;
    NEW.hash_evento := audit.fn_calcular_hash_evento(
        v_hash_anterior,
        NEW.fecha,
        NEW.usuario_app,
        NEW.rol_app,
        NEW.sucursal_app,
        NEW.esquema,
        NEW.tabla,
        NEW.operacion,
        NEW.fila_pk,
        NEW.datos_antes,
        NEW.datos_despues,
        NEW.ip
    );

    RETURN NEW;
END;
$$;

CREATE TRIGGER audit_eventos_hash_before_insert
BEFORE INSERT ON audit.eventos
FOR EACH ROW EXECUTE FUNCTION audit.fn_eventos_hash_before_insert();

CREATE OR REPLACE FUNCTION audit.fn_bloquear_modificacion_auditoria()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Los registros de auditoría son inmutables: no se permite UPDATE ni DELETE.';
END;
$$;

CREATE TRIGGER audit_eventos_append_only
BEFORE UPDATE OR DELETE ON audit.eventos
FOR EACH ROW EXECUTE FUNCTION audit.fn_bloquear_modificacion_auditoria();

CREATE TRIGGER audit_login_append_only
BEFORE UPDATE OR DELETE ON audit.login_intentos
FOR EACH ROW EXECUTE FUNCTION audit.fn_bloquear_modificacion_auditoria();

CREATE OR REPLACE FUNCTION audit.verificar_integridad_cadena()
RETURNS TABLE(id_evento bigint, valido boolean, hash_guardado text, hash_recalculado text)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN QUERY
    WITH eventos_ordenados AS (
        SELECT
            e.*,
            audit.fn_calcular_hash_evento(
                e.hash_anterior, e.fecha, e.usuario_app, e.rol_app,
                e.sucursal_app, e.esquema, e.tabla, e.operacion,
                e.fila_pk, e.datos_antes, e.datos_despues, e.ip
            ) AS hash_calc
        FROM audit.eventos e
    )
    SELECT
        id_evento,
        hash_evento = hash_calc AS valido,
        hash_evento AS hash_guardado,
        hash_calc AS hash_recalculado
    FROM eventos_ordenados
    ORDER BY id_evento;
END;
$$;

CREATE VIEW audit.v_integridad_auditoria AS
SELECT * FROM audit.verificar_integridad_cadena();


-- ============================================================
-- 15.7 IA DEFENSIVA PARA DETECCIÓN Y BLOQUEO DE INTRUSOS
-- ============================================================

CREATE TABLE ai.riesgos_acceso (
    id_riesgo          bigserial PRIMARY KEY,
    fecha              timestamptz NOT NULL DEFAULT now(),
    username           varchar(60),
    id_usuario         uuid REFERENCES app.usuarios(id_usuario),
    rol                varchar(50),
    id_sucursal        int REFERENCES app.sucursales(id_sucursal),
    ip                 inet,
    user_agent         text,
    riesgo             numeric(5,2) NOT NULL CHECK (riesgo BETWEEN 0 AND 100),
    severidad          varchar(20) NOT NULL CHECK (severidad IN ('BAJA','MEDIA','ALTA','CRITICA')),
    factores           jsonb NOT NULL DEFAULT '{}'::jsonb,
    accion_tomada      text
);

CREATE INDEX idx_riesgos_acceso_fecha ON ai.riesgos_acceso(fecha DESC);
CREATE INDEX idx_riesgos_acceso_ip ON ai.riesgos_acceso(ip, fecha DESC);
CREATE INDEX idx_riesgos_acceso_username ON ai.riesgos_acceso(username, fecha DESC);

CREATE OR REPLACE FUNCTION ai.fn_calcular_riesgo_login(
    p_username text,
    p_ip inet DEFAULT inet_client_addr(),
    p_rol text DEFAULT NULL,
    p_id_sucursal int DEFAULT NULL,
    p_user_agent text DEFAULT current_setting('application_name', true)
)
RETURNS TABLE(riesgo numeric, severidad text, factores jsonb)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_fallos_usuario int;
    v_fallos_ip int;
    v_fuera_horario boolean;
    v_ip_bloqueada boolean;
    v_ip_no_permitida boolean;
    v_ua_nuevo boolean;
    v_riesgo numeric := 0;
BEGIN
    SELECT count(*) INTO v_fallos_usuario
    FROM audit.login_intentos
    WHERE username = p_username
      AND exito = false
      AND fecha >= now() - interval '15 minutes';

    SELECT count(*) INTO v_fallos_ip
    FROM audit.login_intentos
    WHERE ip = p_ip
      AND exito = false
      AND fecha >= now() - interval '15 minutes';

    v_fuera_horario := CASE WHEN p_rol IS NULL THEN false ELSE NOT sec.rol_en_horario_permitido(p_rol) END;
    v_ip_bloqueada := sec.ip_esta_bloqueada(p_ip);
    v_ip_no_permitida := NOT sec.ip_esta_permitida(p_ip, p_rol, p_id_sucursal);

    SELECT NOT EXISTS (
        SELECT 1
        FROM sec.sesiones_activas s
        WHERE s.username = p_username
          AND s.user_agent = p_user_agent
          AND s.estado IN ('ACTIVA','FINALIZADA')
    ) INTO v_ua_nuevo;

    v_riesgo := LEAST(
        100,
        (LEAST(v_fallos_usuario, 5) * 10) +
        (LEAST(v_fallos_ip, 8) * 6) +
        CASE WHEN v_fuera_horario THEN 25 ELSE 0 END +
        CASE WHEN v_ip_bloqueada THEN 100 ELSE 0 END +
        CASE WHEN v_ip_no_permitida THEN 50 ELSE 0 END +
        CASE WHEN v_ua_nuevo AND v_fallos_usuario >= 2 THEN 10 ELSE 0 END
    );

    RETURN QUERY
    SELECT
        v_riesgo::numeric(5,2),
        CASE
            WHEN v_riesgo >= 85 THEN 'CRITICA'
            WHEN v_riesgo >= 65 THEN 'ALTA'
            WHEN v_riesgo >= 35 THEN 'MEDIA'
            ELSE 'BAJA'
        END,
        jsonb_build_object(
            'fallos_usuario_15min', v_fallos_usuario,
            'fallos_ip_15min', v_fallos_ip,
            'fuera_horario', v_fuera_horario,
            'ip_bloqueada', v_ip_bloqueada,
            'ip_no_permitida', v_ip_no_permitida,
            'dispositivo_nuevo', v_ua_nuevo
        );
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_respuesta_defensiva_login(
    p_username text,
    p_id_usuario uuid,
    p_rol text,
    p_id_sucursal int,
    p_ip inet,
    p_user_agent text,
    p_riesgo numeric,
    p_severidad text,
    p_factores jsonb,
    p_motivo text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, sec, app, audit, public
AS $$
DECLARE
    v_accion text := 'REGISTRAR';
    v_bloqueo_ip int;
    v_bloqueo_user int;
BEGIN
    v_bloqueo_ip := sec.get_config_int('riesgo_login_bloqueo_ip', 85);
    v_bloqueo_user := sec.get_config_int('max_intentos_login', 5);

    IF p_riesgo >= v_bloqueo_ip AND sec.get_config_bool('bloqueo_ip_automatico', true) THEN
        PERFORM sec.bloquear_ip(
            p_ip,
            COALESCE(p_motivo, 'Riesgo crítico detectado por IA'),
            sec.get_config_int('minutos_bloqueo_ip', 30),
            'CRITICA',
            true
        );
        v_accion := 'BLOQUEO_IP_TEMPORAL';
    ELSIF p_riesgo >= sec.get_config_int('riesgo_login_2fa', 55) THEN
        v_accion := 'EXIGIR_2FA_O_CAPTCHA';
    END IF;

    IF p_id_usuario IS NOT NULL AND p_riesgo >= 85 THEN
        UPDATE app.usuarios
        SET bloqueado_hasta = now() + make_interval(mins => sec.get_config_int('minutos_bloqueo_usuario', 15)),
            updated_at = now()
        WHERE id_usuario = p_id_usuario;
        v_accion := v_accion || '+BLOQUEO_USUARIO';
    END IF;

    INSERT INTO ai.riesgos_acceso(username, id_usuario, rol, id_sucursal, ip, user_agent, riesgo, severidad, factores, accion_tomada)
    VALUES (p_username, p_id_usuario, p_rol, p_id_sucursal, p_ip, p_user_agent, p_riesgo, p_severidad, p_factores, v_accion);

    IF p_riesgo >= sec.get_config_int('riesgo_login_alerta', 65) THEN
        INSERT INTO ai.alertas_seguridad(severidad, tipo, descripcion, id_sucursal, id_usuario)
        VALUES (
            p_severidad,
            'ACCESO_SOSPECHOSO',
            'IA detectó intento de acceso sospechoso. Usuario=' || COALESCE(p_username,'?') ||
            ', IP=' || COALESCE(p_ip::text,'?') ||
            ', riesgo=' || p_riesgo::text ||
            ', motivo=' || COALESCE(p_motivo,'No especificado'),
            p_id_sucursal,
            p_id_usuario
        );
    END IF;

    RETURN v_accion;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_trg_login_intrusion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, sec, app, audit, public
AS $$
DECLARE
    v_fallos_ip int;
    v_fallos_user int;
BEGIN
    IF NEW.exito = true THEN
        RETURN NEW;
    END IF;

    SELECT count(*) INTO v_fallos_ip
    FROM audit.login_intentos
    WHERE ip = NEW.ip
      AND exito = false
      AND fecha >= now() - interval '10 minutes';

    SELECT count(*) INTO v_fallos_user
    FROM audit.login_intentos
    WHERE username = NEW.username
      AND exito = false
      AND fecha >= now() - interval '10 minutes';

    IF v_fallos_ip >= 10 THEN
        PERFORM sec.bloquear_ip(NEW.ip, 'IA: demasiados intentos fallidos desde la misma IP', 30, 'CRITICA', true);
        INSERT INTO ai.alertas_seguridad(severidad, tipo, descripcion)
        VALUES ('CRITICA', 'FUERZA_BRUTA_IP', 'IA bloqueó temporalmente una IP por demasiados intentos fallidos: ' || COALESCE(NEW.ip::text, '?'));
    ELSIF v_fallos_user >= 5 THEN
        INSERT INTO ai.alertas_seguridad(severidad, tipo, descripcion)
        VALUES ('ALTA', 'FUERZA_BRUTA_USUARIO', 'IA detectó múltiples intentos fallidos contra el usuario: ' || NEW.username);
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_login_intrusion
AFTER INSERT ON audit.login_intentos
FOR EACH ROW EXECUTE FUNCTION ai.fn_trg_login_intrusion();


-- ============================================================
-- 15.8 LOGIN EMPRESARIAL CON IA, HORARIO, IP Y 2FA
-- ============================================================

CREATE OR REPLACE FUNCTION app.autenticar_seguro(
    p_username text,
    p_password text,
    p_ip inet DEFAULT inet_client_addr(),
    p_user_agent text DEFAULT current_setting('application_name', true),
    p_codigo_2fa text DEFAULT NULL
)
RETURNS TABLE(exito boolean, accion text, riesgo numeric, severidad text, mensaje text, id_sesion uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_user record;
    v_r numeric;
    v_s text;
    v_f jsonb;
    v_accion text;
    v_max_intentos int;
    v_min_bloqueo int;
    v_requiere_2fa boolean;
    v_sesion uuid;
BEGIN
    SELECT
        u.id_usuario,
        u.username,
        u.password_hash,
        u.nombre_completo,
        u.id_sucursal,
        u.activo,
        u.intentos_fallidos,
        u.bloqueado_hasta,
        u.requiere_cambio_password,
        u.password_cambiado_en,
        r.nombre AS rol
    INTO v_user
    FROM app.usuarios u
    JOIN app.roles r ON r.id_rol = u.id_rol
    WHERE u.username = p_username;

    IF NOT FOUND THEN
        SELECT fr.riesgo, fr.severidad, fr.factores INTO v_r, v_s, v_f
        FROM ai.fn_calcular_riesgo_login(p_username, p_ip, NULL, NULL, p_user_agent) AS fr;

        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'Usuario inexistente', p_ip, p_user_agent);

        PERFORM ai.fn_respuesta_defensiva_login(p_username, NULL, NULL, NULL, p_ip, p_user_agent, v_r, v_s, v_f, 'Usuario inexistente');

        RETURN QUERY SELECT false, 'DENEGADO', v_r, v_s, 'Credenciales inválidas.', NULL::uuid;
        RETURN;
    END IF;

    SELECT fr.riesgo, fr.severidad, fr.factores INTO v_r, v_s, v_f
    FROM ai.fn_calcular_riesgo_login(v_user.username, p_ip, v_user.rol, v_user.id_sucursal, p_user_agent) AS fr;

    IF v_user.activo = false THEN
        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'Usuario inactivo', p_ip, p_user_agent);
        PERFORM ai.fn_respuesta_defensiva_login(p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, v_r, v_s, v_f, 'Usuario inactivo');
        RETURN QUERY SELECT false, 'DENEGADO', v_r, v_s, 'Usuario inactivo.', NULL::uuid;
        RETURN;
    END IF;

    IF v_user.bloqueado_hasta IS NOT NULL AND v_user.bloqueado_hasta > now() THEN
        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'Usuario bloqueado temporalmente', p_ip, p_user_agent);
        PERFORM ai.fn_respuesta_defensiva_login(p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, v_r, v_s, v_f, 'Usuario bloqueado temporalmente');
        RETURN QUERY SELECT false, 'BLOQUEADO', v_r, v_s, 'Usuario bloqueado temporalmente.', NULL::uuid;
        RETURN;
    END IF;

    IF sec.ip_esta_permitida(p_ip, v_user.rol, v_user.id_sucursal) = false THEN
        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'IP no permitida o bloqueada', p_ip, p_user_agent);
        v_accion := ai.fn_respuesta_defensiva_login(p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, 95, 'CRITICA', v_f, 'IP no permitida o bloqueada');
        RETURN QUERY SELECT false, v_accion, 95::numeric, 'CRITICA', 'Acceso bloqueado por política de IP.', NULL::uuid;
        RETURN;
    END IF;

    IF sec.rol_en_horario_permitido(v_user.rol) = false THEN
        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'Fuera de horario permitido', p_ip, p_user_agent);
        v_accion := ai.fn_respuesta_defensiva_login(p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, GREATEST(v_r, 70), 'ALTA', v_f, 'Fuera de horario permitido');
        RETURN QUERY SELECT false, v_accion, GREATEST(v_r, 70), 'ALTA', 'Acceso fuera de horario permitido.', NULL::uuid;
        RETURN;
    END IF;

    IF sec.verify_password(p_password, v_user.password_hash) = false THEN
        v_max_intentos := sec.get_config_int('max_intentos_login', 5);
        v_min_bloqueo := sec.get_config_int('minutos_bloqueo_usuario', 15);

        UPDATE app.usuarios
        SET intentos_fallidos = intentos_fallidos + 1,
            bloqueado_hasta = CASE
                WHEN intentos_fallidos + 1 >= v_max_intentos THEN now() + make_interval(mins => v_min_bloqueo)
                ELSE bloqueado_hasta
            END,
            updated_at = now()
        WHERE id_usuario = v_user.id_usuario;

        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'Contraseña incorrecta', p_ip, p_user_agent);

        v_accion := ai.fn_respuesta_defensiva_login(p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, GREATEST(v_r, 40), CASE WHEN GREATEST(v_r,40) >= 65 THEN 'ALTA' ELSE 'MEDIA' END, v_f, 'Contraseña incorrecta');
        RETURN QUERY SELECT false, v_accion, GREATEST(v_r, 40), CASE WHEN GREATEST(v_r,40) >= 65 THEN 'ALTA' ELSE 'MEDIA' END, 'Credenciales inválidas.', NULL::uuid;
        RETURN;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM sec.usuario_mfa m
        WHERE m.id_usuario = v_user.id_usuario AND m.activo = true
    ) INTO v_requiere_2fa;

    IF v_requiere_2fa AND sec.verificar_mfa(v_user.id_usuario, p_codigo_2fa) = false THEN
        INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
        VALUES (p_username, false, 'Fallo o ausencia de doble factor', p_ip, p_user_agent);
        v_accion := ai.fn_respuesta_defensiva_login(p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, GREATEST(v_r, 60), 'ALTA', v_f, 'Fallo o ausencia de 2FA');
        RETURN QUERY SELECT false, 'REQUIERE_2FA', GREATEST(v_r, 60), 'ALTA', 'Se requiere código de doble factor.', NULL::uuid;
        RETURN;
    END IF;

    UPDATE app.usuarios
    SET intentos_fallidos = 0,
        bloqueado_hasta = NULL,
        last_login_at = now(),
        updated_at = now()
    WHERE id_usuario = v_user.id_usuario;

    v_sesion := sec.iniciar_contexto_peticion(v_user.id_usuario, v_user.username, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent);

    INSERT INTO audit.login_intentos(username, exito, motivo, ip, programa)
    VALUES (p_username, true, 'Login correcto con controles empresariales', p_ip, p_user_agent);

    INSERT INTO ai.riesgos_acceso(username, id_usuario, rol, id_sucursal, ip, user_agent, riesgo, severidad, factores, accion_tomada)
    VALUES (p_username, v_user.id_usuario, v_user.rol, v_user.id_sucursal, p_ip, p_user_agent, v_r, v_s, v_f, 'LOGIN_PERMITIDO');

    RETURN QUERY SELECT true, 'PERMITIDO', v_r, v_s, 'Login correcto.', v_sesion;
END;
$$;

-- Compatibilidad con tu función anterior. Para roles con 2FA activo, usa autenticar_seguro.
CREATE OR REPLACE FUNCTION app.autenticar(p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = app, sec, audit, ai, public
AS $$
DECLARE
    v_ok boolean;
BEGIN
    SELECT exito INTO v_ok
    FROM app.autenticar_seguro(p_username, p_password, inet_client_addr(), current_setting('application_name', true), NULL)
    LIMIT 1;

    RETURN COALESCE(v_ok, false);
END;
$$;


-- ============================================================
-- 15.9 BACKUPS AUDITADOS Y POLÍTICA DE RECUPERACIÓN
-- ============================================================
-- La BD registra y controla backups. La ejecución real se hace con pg_dump,
-- pgBackRest, Barman, cron, pgAgent o scripts del servidor.

CREATE TABLE ops.backup_politicas (
    id_politica        bigserial PRIMARY KEY,
    nombre             varchar(80) NOT NULL UNIQUE,
    tipo               varchar(30) NOT NULL CHECK (tipo IN ('COMPLETO','INCREMENTAL','WAL','OFFSITE','PRUEBA_RESTAURACION')),
    frecuencia         varchar(80) NOT NULL,
    hora_recomendada   time,
    retencion_dias     int NOT NULL DEFAULT 30,
    cifrado_obligatorio boolean NOT NULL DEFAULT true,
    compresion_obligatoria boolean NOT NULL DEFAULT true,
    activo             boolean NOT NULL DEFAULT true,
    descripcion        text
);

CREATE TABLE ops.backup_ejecuciones (
    id_backup          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_politica        bigint REFERENCES ops.backup_politicas(id_politica),
    tipo               varchar(30) NOT NULL CHECK (tipo IN ('COMPLETO','INCREMENTAL','WAL','OFFSITE','PRUEBA_RESTAURACION')),
    iniciado_en        timestamptz NOT NULL DEFAULT now(),
    finalizado_en      timestamptz,
    ubicacion          text NOT NULL,
    cifrado            boolean NOT NULL DEFAULT true,
    comprimido         boolean NOT NULL DEFAULT true,
    hash_sha256        text,
    tamano_bytes       bigint,
    estado             varchar(20) NOT NULL DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO','EXITOSO','FALLIDO','VERIFICADO')),
    mensaje            text,
    ejecutado_por      text NOT NULL DEFAULT COALESCE(sec.current_username(), current_user)
);

CREATE TABLE ops.backup_verificaciones (
    id_verificacion    bigserial PRIMARY KEY,
    id_backup          uuid NOT NULL REFERENCES ops.backup_ejecuciones(id_backup),
    fecha              timestamptz NOT NULL DEFAULT now(),
    verificado_por     text NOT NULL DEFAULT COALESCE(sec.current_username(), current_user),
    restauracion_exitosa boolean NOT NULL,
    mensaje            text
);

INSERT INTO ops.backup_politicas(nombre, tipo, frecuencia, hora_recomendada, retencion_dias, descripcion) VALUES
('Backup completo diario', 'COMPLETO', 'Diario', '02:00', 30, 'Copia completa cifrada y comprimida cada madrugada.'),
('Backup incremental cada 6 horas', 'INCREMENTAL', 'Cada 6 horas', '06:00', 14, 'Copia incremental para reducir pérdida de datos.'),
('Archivado WAL continuo', 'WAL', 'Continuo', NULL, 14, 'Permite recuperación punto en el tiempo.'),
('Copia externa diaria', 'OFFSITE', 'Diario', '03:00', 60, 'Copia fuera del servidor principal.'),
('Prueba de restauración semanal', 'PRUEBA_RESTAURACION', 'Semanal', '04:00', 90, 'Verifica que los backups realmente restauren.')
ON CONFLICT (nombre) DO NOTHING;

CREATE OR REPLACE FUNCTION ops.registrar_backup_inicio(
    p_tipo text,
    p_ubicacion text,
    p_id_politica bigint DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ops, sec, public
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO ops.backup_ejecuciones(id_politica, tipo, ubicacion, estado)
    VALUES (p_id_politica, p_tipo, p_ubicacion, 'EN_PROCESO')
    RETURNING id_backup INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION ops.registrar_backup_fin(
    p_id_backup uuid,
    p_exitoso boolean,
    p_hash_sha256 text DEFAULT NULL,
    p_tamano_bytes bigint DEFAULT NULL,
    p_mensaje text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ops, public
AS $$
BEGIN
    UPDATE ops.backup_ejecuciones
    SET finalizado_en = now(),
        estado = CASE WHEN p_exitoso THEN 'EXITOSO' ELSE 'FALLIDO' END,
        hash_sha256 = p_hash_sha256,
        tamano_bytes = p_tamano_bytes,
        mensaje = p_mensaje
    WHERE id_backup = p_id_backup;

    RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION ops.registrar_prueba_restauracion(
    p_id_backup uuid,
    p_exitosa boolean,
    p_mensaje text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ops, public
AS $$
BEGIN
    INSERT INTO ops.backup_verificaciones(id_backup, restauracion_exitosa, mensaje)
    VALUES (p_id_backup, p_exitosa, p_mensaje);

    IF p_exitosa THEN
        UPDATE ops.backup_ejecuciones SET estado = 'VERIFICADO' WHERE id_backup = p_id_backup;
    END IF;

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION ops.comando_backup_pg_dump(p_database text DEFAULT 'supermarket_db')
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT 'pg_dump -U postgres -d ' || quote_ident(p_database) ||
           ' -Fc | openssl enc -aes-256-cbc -salt -out /backups/' || p_database || '_$(date +%F_%H%M).backup.enc';
$$;

CREATE OR REPLACE FUNCTION ops.comando_backup_pgbackrest(p_stanza text DEFAULT 'supermarket')
RETURNS text
LANGUAGE sql
STABLE
AS $$
    SELECT 'pgbackrest --stanza=' || quote_ident(p_stanza) || ' --type=full backup';
$$;

CREATE VIEW ops.v_estado_backups AS
SELECT
    p.nombre AS politica,
    p.tipo,
    p.frecuencia,
    p.retencion_dias,
    b.id_backup,
    b.iniciado_en,
    b.finalizado_en,
    b.estado,
    b.ubicacion,
    b.hash_sha256,
    b.ejecutado_por
FROM ops.backup_politicas p
LEFT JOIN LATERAL (
    SELECT *
    FROM ops.backup_ejecuciones b
    WHERE b.id_politica = p.id_politica OR b.tipo = p.tipo
    ORDER BY b.iniciado_en DESC
    LIMIT 1
) b ON true;


-- ============================================================
-- 15.10 REPORTES IMPRIMIBLES Y AUDITADOS
-- ============================================================

CREATE TABLE rpt.reportes_generados (
    id_reporte         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha              timestamptz NOT NULL DEFAULT now(),
    tipo               varchar(80) NOT NULL,
    formato            varchar(20) NOT NULL DEFAULT 'PDF' CHECK (formato IN ('PDF','EXCEL','CSV','IMPRESION')),
    parametros         jsonb NOT NULL DEFAULT '{}'::jsonb,
    generado_por       uuid REFERENCES app.usuarios(id_usuario),
    usuario_app        text DEFAULT sec.current_username(),
    rol_app            text DEFAULT sec.current_rol(),
    id_sucursal        int DEFAULT sec.current_sucursal_id(),
    confidencial       boolean NOT NULL DEFAULT true,
    hash_reporte       text,
    observacion        text
);

CREATE OR REPLACE FUNCTION rpt.registrar_reporte(
    p_tipo text,
    p_formato text DEFAULT 'PDF',
    p_parametros jsonb DEFAULT '{}'::jsonb,
    p_confidencial boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = rpt, sec, app, public
AS $$
DECLARE
    v_id uuid;
    v_hash text;
BEGIN
    v_hash := encode(digest(COALESCE(p_tipo,'') || '|' || COALESCE(p_formato,'') || '|' || COALESCE(p_parametros::text,'') || '|' || now()::text, 'sha256'), 'hex');

    INSERT INTO rpt.reportes_generados(tipo, formato, parametros, generado_por, confidencial, hash_reporte)
    VALUES (p_tipo, p_formato, p_parametros, sec.current_user_id(), p_confidencial, v_hash)
    RETURNING id_reporte INTO v_id;

    RETURN v_id;
END;
$$;

CREATE VIEW rpt.v_reporte_ventas_diarias
WITH (security_invoker = true)
AS
SELECT
    date(v.fecha) AS fecha,
    s.nombre AS sucursal,
    count(*) AS cantidad_ventas,
    sum(v.subtotal) AS subtotal,
    sum(v.descuento) AS descuentos,
    sum(v.impuesto) AS impuestos,
    sum(v.total) AS total_vendido
FROM app.ventas v
JOIN app.sucursales s ON s.id_sucursal = v.id_sucursal
WHERE v.estado = 'COMPLETADA'
GROUP BY date(v.fecha), s.nombre;

CREATE VIEW rpt.v_reporte_inventario_critico
WITH (security_invoker = true)
AS
SELECT
    s.nombre AS sucursal,
    p.codigo_barra,
    p.nombre AS producto,
    i.stock_actual,
    i.stock_minimo,
    i.stock_maximo,
    CASE
        WHEN i.stock_actual = 0 THEN 'SIN_STOCK'
        WHEN i.stock_actual <= i.stock_minimo THEN 'CRITICO'
        WHEN i.stock_actual <= i.stock_minimo * 1.5 THEN 'BAJO'
        ELSE 'NORMAL'
    END AS estado_stock
FROM app.inventario i
JOIN app.sucursales s ON s.id_sucursal = i.id_sucursal
JOIN app.productos p ON p.id_producto = i.id_producto;

CREATE VIEW rpt.v_reporte_seguridad
AS
SELECT
    date(fecha) AS fecha,
    username,
    ip,
    count(*) FILTER (WHERE exito = true) AS logins_correctos,
    count(*) FILTER (WHERE exito = false) AS logins_fallidos,
    max(fecha) AS ultimo_intento
FROM audit.login_intentos
GROUP BY date(fecha), username, ip;

CREATE VIEW rpt.v_reporte_alertas_ia
AS
SELECT
    'SEGURIDAD' AS categoria,
    fecha,
    severidad AS nivel,
    tipo,
    descripcion,
    id_sucursal,
    id_usuario,
    id_venta,
    atendida
FROM ai.alertas_seguridad
UNION ALL
SELECT
    'NEGOCIO' AS categoria,
    fecha,
    prioridad AS nivel,
    tipo,
    descripcion,
    id_sucursal,
    NULL::uuid AS id_usuario,
    NULL::uuid AS id_venta,
    atendida
FROM ai.alertas_negocio;


-- ============================================================
-- 15.11 IA DE FRAUDE, VENTAS SOSPECHOSAS Y REPOSICIÓN INTELIGENTE
-- ============================================================

CREATE TABLE ai.riesgos_venta (
    id_riesgo          bigserial PRIMARY KEY,
    fecha              timestamptz NOT NULL DEFAULT now(),
    id_venta           uuid NOT NULL REFERENCES app.ventas(id_venta),
    id_sucursal        int REFERENCES app.sucursales(id_sucursal),
    id_cajero          uuid REFERENCES app.usuarios(id_usuario),
    riesgo             numeric(5,2) NOT NULL CHECK (riesgo BETWEEN 0 AND 100),
    severidad          varchar(20) NOT NULL CHECK (severidad IN ('BAJA','MEDIA','ALTA','CRITICA')),
    factores           jsonb NOT NULL DEFAULT '{}'::jsonb,
    recomendacion      text
);

CREATE INDEX idx_riesgos_venta_fecha ON ai.riesgos_venta(fecha DESC);
CREATE INDEX idx_riesgos_venta_id_venta ON ai.riesgos_venta(id_venta);

CREATE OR REPLACE FUNCTION ai.fn_calcular_riesgo_venta_v2(p_id_venta uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, app, public
AS $$
DECLARE
    v record;
    v_promedio numeric;
    v_anulaciones int;
    v_descuento_pct numeric;
    v_fuera_horario boolean;
    v_riesgo numeric := 0;
    v_factores jsonb;
    v_severidad text;
    v_recomendacion text;
BEGIN
    SELECT * INTO v FROM app.ventas WHERE id_venta = p_id_venta;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Venta no encontrada: %', p_id_venta;
    END IF;

    SELECT COALESCE(avg(total), 0) INTO v_promedio
    FROM app.ventas
    WHERE id_sucursal = v.id_sucursal
      AND estado = 'COMPLETADA'
      AND fecha >= now() - interval '30 days'
      AND id_venta <> p_id_venta;

    SELECT count(*) INTO v_anulaciones
    FROM app.ventas
    WHERE id_cajero = v.id_cajero
      AND estado = 'ANULADA'
      AND fecha >= now() - interval '7 days';

    v_descuento_pct := CASE WHEN v.subtotal > 0 THEN round((v.descuento / v.subtotal) * 100, 2) ELSE 0 END;
    v_fuera_horario := ((v.fecha AT TIME ZONE sec.get_config_text('timezone_negocio','America/La_Paz'))::time NOT BETWEEN '06:00'::time AND '23:00'::time);

    v_riesgo := LEAST(
        100,
        CASE WHEN v_promedio > 0 AND v.total > v_promedio * 3 THEN 35 ELSE 0 END +
        CASE WHEN v_descuento_pct >= 20 THEN 30 ELSE 0 END +
        CASE WHEN v_fuera_horario THEN 25 ELSE 0 END +
        CASE WHEN v_anulaciones >= 5 THEN 20 ELSE 0 END +
        CASE WHEN v.total >= 3000 THEN 15 ELSE 0 END
    );

    v_severidad := CASE
        WHEN v_riesgo >= 85 THEN 'CRITICA'
        WHEN v_riesgo >= 65 THEN 'ALTA'
        WHEN v_riesgo >= 35 THEN 'MEDIA'
        ELSE 'BAJA'
    END;

    v_recomendacion := CASE
        WHEN v_riesgo >= 85 THEN 'Bloquear revisión automática: requiere auditoría inmediata.'
        WHEN v_riesgo >= 65 THEN 'Solicitar revisión del gerente o auditor.'
        WHEN v_riesgo >= 35 THEN 'Monitorear comportamiento del cajero y descuentos.'
        ELSE 'Venta dentro de parámetros normales.'
    END;

    v_factores := jsonb_build_object(
        'promedio_sucursal_30d', v_promedio,
        'total_venta', v.total,
        'descuento_pct', v_descuento_pct,
        'fuera_horario', v_fuera_horario,
        'anulaciones_cajero_7d', v_anulaciones,
        'venta_mayor_3000', v.total >= 3000
    );

    INSERT INTO ai.riesgos_venta(id_venta, id_sucursal, id_cajero, riesgo, severidad, factores, recomendacion)
    VALUES (p_id_venta, v.id_sucursal, v.id_cajero, v_riesgo, v_severidad, v_factores, v_recomendacion);

    IF v_riesgo >= 65 THEN
        INSERT INTO ai.alertas_seguridad(severidad, tipo, descripcion, id_sucursal, id_usuario, id_venta)
        VALUES (
            v_severidad,
            'VENTA_SOSPECHOSA_IA',
            'IA detectó venta sospechosa con riesgo ' || v_riesgo::text || '. ' || v_recomendacion,
            v.id_sucursal,
            v.id_cajero,
            v.id_venta
        );
    END IF;

    RETURN v_riesgo;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_recomendar_reposicion_inteligente()
RETURNS TABLE(
    id_sucursal int,
    sucursal text,
    id_producto int,
    producto text,
    stock_actual numeric,
    stock_minimo numeric,
    venta_promedio_diaria numeric,
    cantidad_recomendada numeric,
    prioridad text,
    motivo text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, app, public
AS $$
BEGIN
    RETURN QUERY
    WITH ventas_30 AS (
        SELECT
            v.id_sucursal,
            d.id_producto,
            COALESCE(sum(d.cantidad) / 30.0, 0) AS promedio_diario
        FROM app.ventas v
        JOIN app.venta_detalle d ON d.id_venta = v.id_venta
        WHERE v.estado = 'COMPLETADA'
          AND v.fecha >= now() - interval '30 days'
        GROUP BY v.id_sucursal, d.id_producto
    )
    SELECT
        i.id_sucursal,
        s.nombre::text AS sucursal,
        i.id_producto,
        p.nombre::text AS producto,
        i.stock_actual,
        i.stock_minimo,
        COALESCE(v.promedio_diario, 0)::numeric(12,2) AS venta_promedio_diaria,
        GREATEST(
            0,
            CEIL((COALESCE(v.promedio_diario, 0) * 14 + i.stock_minimo) - i.stock_actual)
        )::numeric(12,2) AS cantidad_recomendada,
        CASE
            WHEN i.stock_actual = 0 THEN 'CRITICA'
            WHEN i.stock_actual <= i.stock_minimo THEN 'ALTA'
            WHEN i.stock_actual <= i.stock_minimo * 1.5 THEN 'MEDIA'
            ELSE 'BAJA'
        END::text AS prioridad,
        CASE
            WHEN i.stock_actual = 0 THEN 'Sin stock. Reposición inmediata.'
            WHEN i.stock_actual <= i.stock_minimo THEN 'Stock por debajo del mínimo.'
            WHEN COALESCE(v.promedio_diario, 0) * 7 > i.stock_actual THEN 'La demanda proyectada supera el stock semanal.'
            ELSE 'Stock estable.'
        END::text AS motivo
    FROM app.inventario i
    JOIN app.sucursales s ON s.id_sucursal = i.id_sucursal
    JOIN app.productos p ON p.id_producto = i.id_producto
    LEFT JOIN ventas_30 v ON v.id_sucursal = i.id_sucursal AND v.id_producto = i.id_producto
    WHERE i.stock_actual <= i.stock_minimo * 1.5
       OR COALESCE(v.promedio_diario, 0) * 7 > i.stock_actual
    ORDER BY prioridad DESC, cantidad_recomendada DESC;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_generar_alertas_reposicion_inteligente()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, app, public
AS $$
DECLARE
    r record;
    v_count int := 0;
BEGIN
    FOR r IN SELECT * FROM ai.fn_recomendar_reposicion_inteligente() LOOP
        INSERT INTO ai.alertas_negocio(tipo, descripcion, id_sucursal, id_producto, prioridad)
        VALUES (
            'REPOSICION_INTELIGENTE',
            'IA recomienda reponer ' || r.cantidad_recomendada || ' unidades de ' || r.producto ||
            ' en ' || r.sucursal || '. Motivo: ' || r.motivo,
            r.id_sucursal,
            r.id_producto,
            CASE WHEN r.prioridad = 'CRITICA' THEN 'ALTA' ELSE r.prioridad END
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_resumen_inteligente_ventas(p_desde date, p_hasta date)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ai, app, rpt, public
AS $$
DECLARE
    v_total numeric;
    v_ventas int;
    v_sucursal_top text;
    v_producto_top text;
    v_alertas int;
BEGIN
    SELECT COALESCE(sum(total),0), count(*)
    INTO v_total, v_ventas
    FROM app.ventas
    WHERE estado = 'COMPLETADA'
      AND fecha::date BETWEEN p_desde AND p_hasta;

    SELECT s.nombre INTO v_sucursal_top
    FROM app.ventas v
    JOIN app.sucursales s ON s.id_sucursal = v.id_sucursal
    WHERE v.estado = 'COMPLETADA'
      AND v.fecha::date BETWEEN p_desde AND p_hasta
    GROUP BY s.nombre
    ORDER BY sum(v.total) DESC
    LIMIT 1;

    SELECT p.nombre INTO v_producto_top
    FROM app.ventas v
    JOIN app.venta_detalle d ON d.id_venta = v.id_venta
    JOIN app.productos p ON p.id_producto = d.id_producto
    WHERE v.estado = 'COMPLETADA'
      AND v.fecha::date BETWEEN p_desde AND p_hasta
    GROUP BY p.nombre
    ORDER BY sum(d.cantidad) DESC
    LIMIT 1;

    SELECT count(*) INTO v_alertas
    FROM ai.alertas_seguridad
    WHERE fecha::date BETWEEN p_desde AND p_hasta
      AND atendida = false;

    RETURN 'Resumen IA: entre ' || p_desde || ' y ' || p_hasta ||
           ' se registraron ' || v_ventas || ' ventas por un total de Bs ' || COALESCE(v_total,0) ||
           '. La sucursal con mejor rendimiento fue ' || COALESCE(v_sucursal_top, 'sin datos') ||
           '. El producto más vendido fue ' || COALESCE(v_producto_top, 'sin datos') ||
           '. Alertas de seguridad pendientes: ' || v_alertas || '.';
END;
$$;


-- ============================================================
-- 15.12 TABLAS FEDERADAS: PREPARACIÓN SEGURA PARA OTRAS BD
-- ============================================================
-- No se crean servidores reales porque dependen de IP, usuario y clave.
-- Se deja el módulo preparado y documentado.

CREATE TABLE integ.fuentes_externas (
    id_fuente          bigserial PRIMARY KEY,
    nombre             varchar(100) NOT NULL UNIQUE,
    tipo               varchar(40) NOT NULL CHECK (tipo IN ('POSTGRESQL','MYSQL','SQLSERVER','ORACLE','API','OTRO')),
    host_seguro        text NOT NULL,
    base_datos         text,
    puerto             int,
    usa_ssl            boolean NOT NULL DEFAULT true,
    activa             boolean NOT NULL DEFAULT true,
    descripcion        text,
    created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE integ.sincronizaciones (
    id_sinc            bigserial PRIMARY KEY,
    id_fuente          bigint REFERENCES integ.fuentes_externas(id_fuente),
    modulo             varchar(100) NOT NULL,
    iniciado_en        timestamptz NOT NULL DEFAULT now(),
    finalizado_en      timestamptz,
    estado             varchar(20) NOT NULL DEFAULT 'EN_PROCESO' CHECK (estado IN ('EN_PROCESO','EXITOSO','FALLIDO')),
    filas_leidas       int DEFAULT 0,
    filas_insertadas   int DEFAULT 0,
    filas_actualizadas int DEFAULT 0,
    mensaje            text
);

INSERT INTO integ.fuentes_externas(nombre, tipo, host_seguro, base_datos, puerto, descripcion) VALUES
('BD Proveedores Externos', 'POSTGRESQL', 'proveedores.interno.local', 'proveedores_db', 5432, 'Ejemplo para consultar precios y stock de proveedores.'),
('BD Contabilidad', 'POSTGRESQL', 'contabilidad.interno.local', 'contabilidad_db', 5432, 'Ejemplo para enviar cierres de caja y ventas diarias.'),
('BD Sucursal Independiente', 'POSTGRESQL', 'sucursal-centro.interno.local', 'supermarket_centro', 5432, 'Ejemplo si una sucursal tuviera su propia base.')
ON CONFLICT (nombre) DO NOTHING;

CREATE OR REPLACE FUNCTION integ.plantilla_postgres_fdw(
    p_server_name text,
    p_host text,
    p_dbname text,
    p_port int DEFAULT 5432,
    p_remote_schema text DEFAULT 'public',
    p_local_schema text DEFAULT 'integ'
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN format($fmt$
-- Plantilla segura para tabla federada PostgreSQL.
-- No guardes contraseñas reales dentro del script final.
CREATE SERVER %I
FOREIGN DATA WRAPPER postgres_fdw
OPTIONS (host %L, dbname %L, port %L, sslmode 'require');

CREATE USER MAPPING FOR sm_backend
SERVER %I
OPTIONS (user 'usuario_fdw', password 'USAR_GESTOR_DE_SECRETOS');

IMPORT FOREIGN SCHEMA %I
FROM SERVER %I
INTO %I;
$fmt$, p_server_name, p_host, p_dbname, p_port::text, p_server_name, p_remote_schema, p_server_name, p_local_schema);
END;
$$;


-- ============================================================
-- 15.13 PRIVILEGIOS EMPRESARIALES
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_backup') THEN
        CREATE ROLE sm_backup LOGIN PASSWORD 'Backup123*Cambiar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_reportes') THEN
        CREATE ROLE sm_reportes LOGIN PASSWORD 'Reportes123*Cambiar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_security_admin') THEN
        CREATE ROLE sm_security_admin LOGIN PASSWORD 'Security123*Cambiar';
    END IF;
END;
$$;

REVOKE ALL ON SCHEMA ops FROM PUBLIC;
REVOKE ALL ON SCHEMA rpt FROM PUBLIC;
REVOKE ALL ON SCHEMA integ FROM PUBLIC;

GRANT USAGE ON SCHEMA ops TO sm_backup, sm_security_admin;
GRANT USAGE ON SCHEMA rpt TO sm_backend, sm_reportes, sm_readonly;
GRANT USAGE ON SCHEMA integ TO sm_security_admin;

GRANT SELECT, INSERT, UPDATE ON ops.backup_ejecuciones, ops.backup_verificaciones TO sm_backup;
GRANT SELECT ON ops.backup_politicas, ops.v_estado_backups TO sm_backup, sm_security_admin;
GRANT EXECUTE ON FUNCTION ops.registrar_backup_inicio(text, text, bigint) TO sm_backup;
GRANT EXECUTE ON FUNCTION ops.registrar_backup_fin(uuid, boolean, text, bigint, text) TO sm_backup;
GRANT EXECUTE ON FUNCTION ops.registrar_prueba_restauracion(uuid, boolean, text) TO sm_backup;
GRANT EXECUTE ON FUNCTION ops.comando_backup_pg_dump(text) TO sm_backup, sm_security_admin;
GRANT EXECUTE ON FUNCTION ops.comando_backup_pgbackrest(text) TO sm_backup, sm_security_admin;

GRANT SELECT ON rpt.v_reporte_ventas_diarias, rpt.v_reporte_inventario_critico, rpt.v_reporte_seguridad, rpt.v_reporte_alertas_ia TO sm_backend, sm_reportes, sm_readonly;
GRANT INSERT, SELECT ON rpt.reportes_generados TO sm_backend, sm_reportes;
GRANT EXECUTE ON FUNCTION rpt.registrar_reporte(text, text, jsonb, boolean) TO sm_backend, sm_reportes;

GRANT EXECUTE ON FUNCTION app.autenticar_seguro(text, text, inet, text, text) TO sm_backend;
GRANT EXECUTE ON FUNCTION app.cambiar_password(text, text, text) TO sm_backend;
GRANT EXECUTE ON FUNCTION sec.finalizar_contexto_peticion() TO sm_backend;
GRANT EXECUTE ON FUNCTION ai.fn_recomendar_reposicion_inteligente() TO sm_backend, sm_reportes;
GRANT EXECUTE ON FUNCTION ai.fn_generar_alertas_reposicion_inteligente() TO sm_backend;
GRANT EXECUTE ON FUNCTION ai.fn_resumen_inteligente_ventas(date, date) TO sm_backend, sm_reportes;
GRANT SELECT ON ai.riesgos_acceso, ai.riesgos_venta TO sm_security_admin;
GRANT SELECT ON integ.fuentes_externas, integ.sincronizaciones TO sm_security_admin;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA ops TO sm_backup, sm_security_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA rpt TO sm_backend, sm_reportes;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA integ TO sm_security_admin;


-- ============================================================
-- 15.14 CONSULTAS DE PRUEBA EMPRESARIALES
-- ============================================================
-- SET app.crypto_key = 'Supermarket_LaPaz_Clave_Demo_2026_Cambiar_En_Produccion';
--
-- Login normal de cajero:
-- SELECT * FROM app.autenticar_seguro('cajero_centro','Supermarket123*','127.0.0.1','pgAdmin',NULL);
--
-- Login de administrador con 2FA demo:
-- SELECT * FROM app.autenticar_seguro('admin','Supermarket123*','127.0.0.1','pgAdmin','123456');
--
-- Finalizar contexto al terminar una petición si usas pool:
-- SELECT sec.finalizar_contexto_peticion();
--
-- Verificar cadena de auditoría:
-- SELECT * FROM audit.v_integridad_auditoria LIMIT 20;
--
-- Registrar reporte imprimible:
-- SELECT rpt.registrar_reporte('VENTAS_DIARIAS','PDF','{"fecha":"hoy"}'::jsonb,true);
-- SELECT * FROM rpt.v_reporte_ventas_diarias;
--
-- Recomendación de reposición con IA:
-- SELECT * FROM ai.fn_recomendar_reposicion_inteligente();
-- SELECT ai.fn_generar_alertas_reposicion_inteligente();
--
-- Resumen inteligente:
-- SELECT ai.fn_resumen_inteligente_ventas(current_date - 30, current_date);
--
-- Comando recomendado para backup:
-- SELECT ops.comando_backup_pg_dump('supermarket_db');
-- SELECT * FROM ops.v_estado_backups;
--
-- Plantilla para tabla federada:
-- SELECT integ.plantilla_postgres_fdw('srv_proveedores','proveedores.interno.local','proveedores_db');
-- ============================================================


-- ============================================================
-- 16. ANEXO EMPRESARIAL AVANZADO
--     Seguridad operacional, cumplimiento, monitoreo, privacidad,
--     alta disponibilidad e IA externa avanzada.
--
-- Este anexo NO reemplaza lo anterior. Agrega controles que una
-- empresa segura normalmente complementa fuera del SQL: firewall real,
-- SSL/TLS, secretos, backups verificados, monitoreo, HA, retencion,
-- anonimización, pruebas de seguridad e integración con modelos IA.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS mon;
CREATE SCHEMA IF NOT EXISTS privacy;
CREATE SCHEMA IF NOT EXISTS qa;
CREATE SCHEMA IF NOT EXISTS gov;


-- ============================================================
-- 16.1 GOBIERNO DE SEGURIDAD Y CUMPLIMIENTO
-- ============================================================

CREATE TABLE IF NOT EXISTS gov.controles_seguridad (
    id_control          bigserial PRIMARY KEY,
    codigo              varchar(40) NOT NULL UNIQUE,
    categoria           varchar(80) NOT NULL,
    nombre              varchar(160) NOT NULL,
    descripcion         text NOT NULL,
    nivel_criticidad    varchar(20) NOT NULL CHECK (nivel_criticidad IN ('BAJO','MEDIO','ALTO','CRITICO')),
    responsable         varchar(120) NOT NULL DEFAULT 'Administrador de Seguridad',
    estado              varchar(30) NOT NULL DEFAULT 'PROPUESTO' CHECK (estado IN ('PROPUESTO','IMPLEMENTADO','EN_REVISION','NO_APLICA')),
    evidencia           text,
    updated_at          timestamptz NOT NULL DEFAULT now(),
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gov.ambientes (
    id_ambiente         serial PRIMARY KEY,
    nombre              varchar(40) NOT NULL UNIQUE CHECK (nombre IN ('DESARROLLO','PRUEBAS','PRODUCCION','RESPALDO','ANALITICA')),
    descripcion         text NOT NULL,
    permite_datos_reales boolean NOT NULL DEFAULT false,
    requiere_tls        boolean NOT NULL DEFAULT true,
    requiere_backup     boolean NOT NULL DEFAULT true,
    activo              boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gov.versiones_base_datos (
    id_version          bigserial PRIMARY KEY,
    version             varchar(30) NOT NULL UNIQUE,
    descripcion         text NOT NULL,
    aplicado_por        text DEFAULT current_user,
    hash_script         text,
    fecha_aplicacion    timestamptz NOT NULL DEFAULT now()
);

INSERT INTO gov.ambientes(nombre, descripcion, permite_datos_reales, requiere_tls, requiere_backup) VALUES
('DESARROLLO', 'Ambiente para desarrollo. No debe usar datos reales.', false, false, false),
('PRUEBAS', 'Ambiente para validación funcional y pruebas de seguridad.', false, true, true),
('PRODUCCION', 'Ambiente real operativo.', true, true, true),
('RESPALDO', 'Ambiente para restauraciones y contingencia.', true, true, true),
('ANALITICA', 'Ambiente para IA, reportes y modelos externos.', true, true, true)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO gov.controles_seguridad(codigo, categoria, nombre, descripcion, nivel_criticidad, estado, evidencia) VALUES
('SEC-001', 'Red', 'Firewall real del servidor', 'Permitir conexión a PostgreSQL únicamente desde el backend, VPN o IPs autorizadas.', 'CRITICO', 'PROPUESTO', 'Se entrega plantilla pg_hba.conf y comandos de firewall.'),
('SEC-002', 'Transporte', 'SSL/TLS obligatorio', 'Toda conexión hacia PostgreSQL debe cifrarse con TLS.', 'CRITICO', 'PROPUESTO', 'Se entrega validación de conexión SSL y plantilla postgresql.conf.'),
('SEC-003', 'Secretos', 'Gestión externa de secretos', 'Las claves reales no deben almacenarse en SQL; deben venir de variables de entorno o gestor de secretos.', 'CRITICO', 'IMPLEMENTADO', 'Se agrega registro de referencias de secretos, no valores reales.'),
('SEC-004', 'Backups', 'Backups restaurables', 'Los respaldos deben probarse periódicamente mediante restauración controlada.', 'CRITICO', 'IMPLEMENTADO', 'Se agrega bitácora de pruebas de restauración y cumplimiento.'),
('SEC-005', 'Alta disponibilidad', 'Réplica y failover', 'Se debe registrar estado de réplicas y plan de conmutación ante fallos.', 'ALTO', 'IMPLEMENTADO', 'Se agrega inventario de nodos HA y monitoreo de replicación.'),
('SEC-006', 'Privacidad', 'Retención y anonimización', 'Definir cuánto tiempo se guarda cada dato y anonimizar datos personales cuando corresponda.', 'ALTO', 'IMPLEMENTADO', 'Se agrega módulo privacy.'),
('SEC-007', 'Aplicación', 'Protección contra SQL Injection', 'El backend debe usar consultas parametrizadas y nunca concatenar SQL con entradas del usuario.', 'CRITICO', 'PROPUESTO', 'Se agregan pruebas de seguridad documentadas.'),
('AI-001', 'IA', 'Modelo externo de fraude y demanda', 'Integrar modelos externos en Python/servicio IA para puntajes, predicciones y explicaciones.', 'ALTO', 'IMPLEMENTADO', 'Se agrega registro de modelos, features, solicitudes y resultados externos.'),
('MON-001', 'Monitoreo', 'Monitoreo operativo', 'Registrar métricas, conexiones, fallos, backups y alertas críticas.', 'ALTO', 'IMPLEMENTADO', 'Se agrega esquema mon.')
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO gov.versiones_base_datos(version, descripcion, hash_script) VALUES
('2.0-ultra', 'Anexo empresarial avanzado: monitoreo, privacidad, cumplimiento, IA externa y HA.', encode(digest('supermarket-2.0-ultra', 'sha256'), 'hex'))
ON CONFLICT (version) DO NOTHING;

CREATE OR REPLACE FUNCTION gov.fn_resumen_postura_seguridad()
RETURNS TABLE(
    categoria text,
    total_controles int,
    implementados int,
    pendientes int,
    criticidad_maxima text,
    porcentaje_avance numeric
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        categoria::text,
        count(*)::int AS total_controles,
        count(*) FILTER (WHERE estado = 'IMPLEMENTADO')::int AS implementados,
        count(*) FILTER (WHERE estado <> 'IMPLEMENTADO')::int AS pendientes,
        CASE
            WHEN bool_or(nivel_criticidad = 'CRITICO') THEN 'CRITICO'
            WHEN bool_or(nivel_criticidad = 'ALTO') THEN 'ALTO'
            WHEN bool_or(nivel_criticidad = 'MEDIO') THEN 'MEDIO'
            ELSE 'BAJO'
        END AS criticidad_maxima,
        round((count(*) FILTER (WHERE estado = 'IMPLEMENTADO')::numeric / NULLIF(count(*),0)) * 100, 2) AS porcentaje_avance
    FROM gov.controles_seguridad
    GROUP BY categoria
    ORDER BY categoria;
$$;


-- ============================================================
-- 16.2 SSL/TLS, FIREWALL REAL Y PLANTILLAS DE CONFIGURACIÓN
-- ============================================================

ALTER TABLE sec.configuracion_seguridad
    ADD COLUMN IF NOT EXISTS requiere_tls boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS entorno varchar(30) NOT NULL DEFAULT 'DESARROLLO';

INSERT INTO sec.configuracion_seguridad(clave, valor, descripcion, requiere_tls, entorno) VALUES
('tls_obligatorio', 'false', 'En producción debe ser true. La validación real se refuerza con pg_hba.conf y postgresql.conf.', false, 'DESARROLLO'),
('solo_backend_conecta_bd', 'true', 'La base no debe exponerse al público; solo backend/VPN/IPs autorizadas.', false, 'DESARROLLO'),
('sql_injection_backend_parametrizado', 'true', 'El backend debe usar consultas parametrizadas.', false, 'DESARROLLO')
ON CONFLICT (clave) DO NOTHING;

CREATE OR REPLACE FUNCTION sec.conexion_ssl_activa()
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_ssl boolean;
BEGIN
    BEGIN
        SELECT s.ssl INTO v_ssl
        FROM pg_stat_ssl s
        WHERE s.pid = pg_backend_pid();
    EXCEPTION WHEN OTHERS THEN
        v_ssl := NULL;
    END;

    RETURN COALESCE(v_ssl, false);
END;
$$;

CREATE OR REPLACE FUNCTION sec.validar_conexion_empresarial(
    p_ip inet DEFAULT inet_client_addr(),
    p_rol text DEFAULT current_setting('app.rol', true)
)
RETURNS TABLE(
    control text,
    permitido boolean,
    detalle text
)
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_tls_obligatorio boolean := sec.get_config_bool('tls_obligatorio', false);
BEGIN
    RETURN QUERY SELECT 'IP_BLOQUEADA'::text,
        NOT sec.ip_esta_bloqueada(p_ip),
        CASE WHEN sec.ip_esta_bloqueada(p_ip) THEN 'La IP está bloqueada por seguridad.' ELSE 'La IP no está bloqueada.' END;

    RETURN QUERY SELECT 'IP_PERMITIDA'::text,
        sec.ip_esta_permitida(p_ip, p_rol, sec.current_sucursal_id()),
        CASE WHEN sec.ip_esta_permitida(p_ip, p_rol, sec.current_sucursal_id()) THEN 'La IP cumple la política lógica.' ELSE 'La IP no está dentro de rangos permitidos.' END;

    RETURN QUERY SELECT 'HORARIO_PERMITIDO'::text,
        sec.rol_en_horario_permitido(COALESCE(p_rol, 'SIN_ROL')),
        CASE WHEN sec.rol_en_horario_permitido(COALESCE(p_rol, 'SIN_ROL')) THEN 'El rol está dentro del horario permitido.' ELSE 'Acceso fuera de horario.' END;

    RETURN QUERY SELECT 'TLS_ACTIVO'::text,
        CASE WHEN v_tls_obligatorio THEN sec.conexion_ssl_activa() ELSE true END,
        CASE
            WHEN v_tls_obligatorio AND sec.conexion_ssl_activa() THEN 'TLS activo.'
            WHEN v_tls_obligatorio AND NOT sec.conexion_ssl_activa() THEN 'TLS obligatorio, pero la conexión no aparece cifrada.'
            ELSE 'TLS no obligatorio en este ambiente de demostración.'
        END;
END;
$$;

CREATE OR REPLACE FUNCTION ops.plantilla_pg_hba_conf_seguro(
    p_backend_cidr text DEFAULT '10.0.0.10/32',
    p_admin_cidr text DEFAULT '10.0.0.20/32'
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN format($fmt$
# pg_hba.conf recomendado para producción
# Reglas de ejemplo. Ajustar las IP reales de backend, VPN y administración.
# Primero bloquear accesos no autorizados y permitir solo SSL.

# Backend autorizado con SSL
hostssl supermarket_db sm_backend %s scram-sha-256

# Administrador por VPN/IP autorizada con SSL
hostssl supermarket_db sm_security_admin %s scram-sha-256

# Backups desde servidor de backup interno con SSL
hostssl supermarket_db sm_backup 10.0.0.30/32 scram-sha-256

# Rechazar cualquier otra conexión remota
hostnossl all all 0.0.0.0/0 reject
host all all 0.0.0.0/0 reject
$fmt$, p_backend_cidr, p_admin_cidr);
END;
$$;

CREATE OR REPLACE FUNCTION ops.plantilla_postgresql_conf_tls()
RETURNS text
LANGUAGE sql
STABLE
AS $$
SELECT $txt$
# postgresql.conf recomendado para producción
ssl = on
ssl_cert_file = 'server.crt'
ssl_key_file = 'server.key'
password_encryption = 'scram-sha-256'
log_connections = on
log_disconnections = on
log_line_prefix = '%m [%p] user=%u,db=%d,app=%a,client=%h '
log_min_duration_statement = 500
shared_preload_libraries = 'pg_stat_statements'
$txt$;
$$;

CREATE OR REPLACE FUNCTION ops.plantilla_firewall_ufw(
    p_backend_ip text DEFAULT '10.0.0.10',
    p_admin_ip text DEFAULT '10.0.0.20'
)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
    RETURN format($fmt$
# Comandos UFW de ejemplo para servidor Linux
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from %s to any port 5432 proto tcp comment 'Backend autorizado PostgreSQL'
sudo ufw allow from %s to any port 5432 proto tcp comment 'Admin por VPN/IP autorizada'
sudo ufw enable
sudo ufw status verbose
$fmt$, p_backend_ip, p_admin_ip);
END;
$$;


-- ============================================================
-- 16.3 GESTIÓN DE SECRETOS Y ROTACIÓN DE CLAVES
-- ============================================================

CREATE TABLE IF NOT EXISTS sec.secretos_referenciados (
    id_secreto          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              varchar(100) NOT NULL UNIQUE,
    proveedor           varchar(60) NOT NULL CHECK (proveedor IN ('ENV','VAULT','AWS_KMS','AZURE_KEY_VAULT','GCP_SECRET_MANAGER','ARCHIVO_SEGURO','OTRO')),
    ruta_referencia     text NOT NULL,
    descripcion         text,
    rotacion_dias       int NOT NULL DEFAULT 90 CHECK (rotacion_dias > 0),
    ultima_rotacion     timestamptz,
    proxima_rotacion    timestamptz,
    activo              boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now()
);


CREATE OR REPLACE FUNCTION sec.fn_calcular_proxima_rotacion_secreto()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.ultima_rotacion IS NOT NULL THEN
        NEW.proxima_rotacion := NEW.ultima_rotacion + (NEW.rotacion_dias * interval '1 day');
    ELSE
        NEW.proxima_rotacion := NULL;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_calcular_proxima_rotacion_secreto ON sec.secretos_referenciados;
CREATE TRIGGER trg_calcular_proxima_rotacion_secreto
BEFORE INSERT OR UPDATE OF ultima_rotacion, rotacion_dias
ON sec.secretos_referenciados
FOR EACH ROW
EXECUTE FUNCTION sec.fn_calcular_proxima_rotacion_secreto();

CREATE TABLE IF NOT EXISTS sec.rotaciones_secretos (
    id_rotacion         bigserial PRIMARY KEY,
    id_secreto          uuid NOT NULL REFERENCES sec.secretos_referenciados(id_secreto),
    fecha               timestamptz NOT NULL DEFAULT now(),
    ejecutado_por       text DEFAULT current_user,
    motivo              text NOT NULL,
    resultado           varchar(30) NOT NULL CHECK (resultado IN ('EXITOSO','FALLIDO','PENDIENTE')),
    observacion         text
);

CREATE OR REPLACE FUNCTION sec.registrar_referencia_secreto(
    p_nombre text,
    p_proveedor text,
    p_ruta_referencia text,
    p_descripcion text DEFAULT NULL,
    p_rotacion_dias int DEFAULT 90
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO sec.secretos_referenciados(nombre, proveedor, ruta_referencia, descripcion, rotacion_dias, ultima_rotacion)
    VALUES (p_nombre, p_proveedor, p_ruta_referencia, p_descripcion, p_rotacion_dias, now())
    ON CONFLICT (nombre) DO UPDATE SET
        proveedor = EXCLUDED.proveedor,
        ruta_referencia = EXCLUDED.ruta_referencia,
        descripcion = EXCLUDED.descripcion,
        rotacion_dias = EXCLUDED.rotacion_dias,
        activo = true
    RETURNING id_secreto INTO v_id;

    RETURN v_id;
END;
$$;

CREATE OR REPLACE FUNCTION sec.registrar_rotacion_secreto(
    p_nombre text,
    p_motivo text,
    p_resultado text DEFAULT 'EXITOSO',
    p_observacion text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_id uuid;
BEGIN
    SELECT id_secreto INTO v_id
    FROM sec.secretos_referenciados
    WHERE nombre = p_nombre AND activo = true;

    IF v_id IS NULL THEN
        RAISE EXCEPTION 'No existe secreto activo con nombre %', p_nombre;
    END IF;

    INSERT INTO sec.rotaciones_secretos(id_secreto, motivo, resultado, observacion)
    VALUES (v_id, p_motivo, p_resultado, p_observacion);

    IF p_resultado = 'EXITOSO' THEN
        UPDATE sec.secretos_referenciados
        SET ultima_rotacion = now()
        WHERE id_secreto = v_id;
    END IF;
END;
$$;

CREATE OR REPLACE VIEW sec.v_secretos_por_rotar AS
SELECT
    nombre,
    proveedor,
    ruta_referencia,
    rotacion_dias,
    ultima_rotacion,
    proxima_rotacion,
    CASE
        WHEN proxima_rotacion IS NULL THEN 'SIN_ROTACION'
        WHEN proxima_rotacion <= now() THEN 'VENCIDO'
        WHEN proxima_rotacion <= now() + interval '15 days' THEN 'POR_VENCER'
        ELSE 'VIGENTE'
    END AS estado_rotacion
FROM sec.secretos_referenciados
WHERE activo = true;

SELECT sec.registrar_referencia_secreto('APP_CRYPTO_KEY', 'ENV', 'SUPERMARKET_APP_CRYPTO_KEY', 'Clave usada por pgcrypto. No guardar valor en SQL.', 60)
WHERE NOT EXISTS (SELECT 1 FROM sec.secretos_referenciados WHERE nombre = 'APP_CRYPTO_KEY');

SELECT sec.registrar_referencia_secreto('DB_PASSWORD_BACKEND', 'ENV', 'SUPERMARKET_DB_PASSWORD', 'Contraseña del usuario técnico del backend.', 90)
WHERE NOT EXISTS (SELECT 1 FROM sec.secretos_referenciados WHERE nombre = 'DB_PASSWORD_BACKEND');


-- ============================================================
-- 16.4 BACKUPS REALES, RETENCIÓN Y RESTAURACIÓN VERIFICADA
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.destinos_backup (
    id_destino          serial PRIMARY KEY,
    nombre              varchar(100) NOT NULL UNIQUE,
    tipo                varchar(40) NOT NULL CHECK (tipo IN ('LOCAL','NAS','S3','GCS','AZURE_BLOB','SERVIDOR_REMOTO','OTRO')),
    ruta_referencia     text NOT NULL,
    cifrado_obligatorio boolean NOT NULL DEFAULT true,
    inmutable           boolean NOT NULL DEFAULT false,
    activo              boolean NOT NULL DEFAULT true,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.politicas_retencion_backup (
    id_politica         serial PRIMARY KEY,
    nombre              varchar(80) NOT NULL UNIQUE,
    tipo_backup         varchar(30) NOT NULL CHECK (tipo_backup IN ('COMPLETO','INCREMENTAL','WAL','PRUEBA_RESTAURACION')),
    conservar_dias      int NOT NULL CHECK (conservar_dias > 0),
    minimo_copias       int NOT NULL DEFAULT 1 CHECK (minimo_copias > 0),
    descripcion         text,
    activo              boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS ops.pruebas_restauracion_empresarial (
    id_prueba           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_backup           uuid REFERENCES ops.backup_ejecuciones(id_backup),
    ambiente_destino    varchar(40) NOT NULL DEFAULT 'RESPALDO',
    fecha_inicio        timestamptz NOT NULL DEFAULT now(),
    fecha_fin           timestamptz,
    exitoso             boolean,
    rpo_minutos         int,
    rto_minutos         int,
    verificacion_hash   text,
    observacion         text,
    probado_por         text DEFAULT current_user
);

INSERT INTO ops.destinos_backup(nombre, tipo, ruta_referencia, cifrado_obligatorio, inmutable) VALUES
('Backup local cifrado', 'LOCAL', '/backups/supermarket', true, false),
('Copia externa inmutable', 'SERVIDOR_REMOTO', 'backup-secundario.interno:/vault/supermarket', true, true)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO ops.politicas_retencion_backup(nombre, tipo_backup, conservar_dias, minimo_copias, descripcion) VALUES
('Diario completo', 'COMPLETO', 30, 7, 'Mantener al menos 7 copias completas recientes.'),
('Incremental 6 horas', 'INCREMENTAL', 14, 20, 'Backups incrementales para reducir pérdida de datos.'),
('Archivado WAL', 'WAL', 30, 1, 'Permite recuperación a punto exacto en el tiempo.'),
('Prueba mensual', 'PRUEBA_RESTAURACION', 180, 1, 'Evidencia de que los backups restauran correctamente.')
ON CONFLICT (nombre) DO NOTHING;

CREATE OR REPLACE FUNCTION ops.plan_backup_empresarial()
RETURNS TABLE(
    componente text,
    frecuencia text,
    herramienta text,
    comando_referencial text,
    objetivo text
)
LANGUAGE sql
STABLE
AS $$
    SELECT 'Backup completo'::text, 'Diario 02:00'::text, 'pgBackRest'::text,
           ops.comando_backup_pgbackrest('supermarket')::text,
           'Recuperación total de la base.'::text
    UNION ALL
    SELECT 'Backup lógico adicional', 'Diario 03:00', 'pg_dump',
           ops.comando_backup_pg_dump('supermarket_db'),
           'Copia portable para restauración lógica.'
    UNION ALL
    SELECT 'WAL archiving', 'Continuo', 'PostgreSQL archive_mode',
           'archive_mode=on; archive_command=''''pgbackrest --stanza=supermarket archive-push %p''''',
           'Recuperación a punto exacto en el tiempo.'
    UNION ALL
    SELECT 'Prueba restauración', 'Mensual', 'Servidor de respaldo',
           'Restaurar último backup en ambiente RESPALDO y ejecutar validaciones.',
           'Demostrar que el backup no está corrupto.';
$$;

CREATE OR REPLACE VIEW ops.v_cumplimiento_backup_empresarial AS
SELECT
    p.nombre AS politica,
    p.tipo_backup,
    p.conservar_dias,
    p.minimo_copias,
    count(b.id_backup) FILTER (WHERE b.iniciado_en >= now() - make_interval(days => p.conservar_dias)) AS copias_en_retencion,
    CASE
        WHEN count(b.id_backup) FILTER (WHERE b.iniciado_en >= now() - make_interval(days => p.conservar_dias)) >= p.minimo_copias THEN 'CUMPLE'
        ELSE 'NO_CUMPLE'
    END AS estado
FROM ops.politicas_retencion_backup p
LEFT JOIN ops.backup_ejecuciones b
       ON b.tipo = p.tipo_backup
      AND b.estado IN ('EXITOSO','VERIFICADO')
GROUP BY p.id_politica, p.nombre, p.tipo_backup, p.conservar_dias, p.minimo_copias;

CREATE OR REPLACE FUNCTION ops.registrar_prueba_restauracion_empresarial(
    p_id_backup uuid,
    p_exitoso boolean,
    p_rpo_minutos int,
    p_rto_minutos int,
    p_verificacion_hash text DEFAULT NULL,
    p_observacion text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO ops.pruebas_restauracion_empresarial(
        id_backup, fecha_fin, exitoso, rpo_minutos, rto_minutos, verificacion_hash, observacion
    ) VALUES (
        p_id_backup, now(), p_exitoso, p_rpo_minutos, p_rto_minutos, p_verificacion_hash, p_observacion
    ) RETURNING id_prueba INTO v_id;

    RETURN v_id;
END;
$$;


-- ============================================================
-- 16.5 ALTA DISPONIBILIDAD, RÉPLICAS Y FAILOVER
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.ha_nodos (
    id_nodo             serial PRIMARY KEY,
    nombre              varchar(100) NOT NULL UNIQUE,
    tipo                varchar(30) NOT NULL CHECK (tipo IN ('PRIMARIO','REPLICA','BACKUP','ANALITICA')),
    host_referencia     text NOT NULL,
    puerto              int NOT NULL DEFAULT 5432,
    prioridad_failover  int NOT NULL DEFAULT 100,
    activo              boolean NOT NULL DEFAULT true,
    descripcion         text,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ops.estado_replicacion (
    id_estado           bigserial PRIMARY KEY,
    id_nodo             int NOT NULL REFERENCES ops.ha_nodos(id_nodo),
    fecha               timestamptz NOT NULL DEFAULT now(),
    estado              varchar(30) NOT NULL CHECK (estado IN ('OK','RETRASO','CAIDO','DESCONOCIDO')),
    lag_segundos        int,
    wal_lsn             text,
    observacion         text
);

INSERT INTO ops.ha_nodos(nombre, tipo, host_referencia, prioridad_failover, descripcion) VALUES
('postgres-primary', 'PRIMARIO', 'postgres-primary.interno.local', 1, 'Servidor principal de producción.'),
('postgres-replica-1', 'REPLICA', 'postgres-replica-1.interno.local', 2, 'Réplica de lectura y contingencia.'),
('postgres-backup', 'BACKUP', 'postgres-backup.interno.local', 3, 'Servidor de backups y pruebas de restauración.')
ON CONFLICT (nombre) DO NOTHING;

CREATE OR REPLACE FUNCTION ops.registrar_estado_replicacion(
    p_nombre_nodo text,
    p_estado text,
    p_lag_segundos int DEFAULT NULL,
    p_wal_lsn text DEFAULT NULL,
    p_observacion text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_id int;
BEGIN
    SELECT id_nodo INTO v_id FROM ops.ha_nodos WHERE nombre = p_nombre_nodo;
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'Nodo HA no registrado: %', p_nombre_nodo;
    END IF;

    INSERT INTO ops.estado_replicacion(id_nodo, estado, lag_segundos, wal_lsn, observacion)
    VALUES (v_id, p_estado, p_lag_segundos, p_wal_lsn, p_observacion);
END;
$$;

CREATE OR REPLACE VIEW ops.v_estado_ha_actual AS
SELECT DISTINCT ON (n.id_nodo)
    n.nombre,
    n.tipo,
    n.host_referencia,
    n.prioridad_failover,
    e.fecha AS ultima_revision,
    COALESCE(e.estado, 'DESCONOCIDO') AS estado,
    e.lag_segundos,
    CASE
        WHEN e.estado = 'OK' AND COALESCE(e.lag_segundos,0) <= 60 THEN 'SALUDABLE'
        WHEN e.estado = 'OK' AND COALESCE(e.lag_segundos,0) > 60 THEN 'REVISAR_RETRASO'
        WHEN e.estado IS NULL THEN 'SIN_DATOS'
        ELSE 'CRITICO'
    END AS evaluacion
FROM ops.ha_nodos n
LEFT JOIN ops.estado_replicacion e ON e.id_nodo = n.id_nodo
WHERE n.activo = true
ORDER BY n.id_nodo, e.fecha DESC NULLS LAST;

CREATE OR REPLACE FUNCTION ops.plantilla_replicacion_postgresql()
RETURNS text
LANGUAGE sql
STABLE
AS $$
SELECT $txt$
# Plantilla conceptual de alta disponibilidad PostgreSQL
# 1. Activar WAL adecuado en el primario:
wal_level = replica
max_wal_senders = 10
hot_standby = on
archive_mode = on

# 2. Crear usuario de replicación con privilegio REPLICATION.
# 3. Crear réplica con pg_basebackup o herramienta HA.
# 4. Monitorear lag de replicación.
# 5. Definir procedimiento de failover controlado.
$txt$;
$$;


-- ============================================================
-- 16.6 MONITOREO OPERATIVO Y ALERTAS EN TIEMPO REAL
-- ============================================================

CREATE TABLE IF NOT EXISTS mon.metricas_sistema (
    id_metrica          bigserial PRIMARY KEY,
    fecha               timestamptz NOT NULL DEFAULT now(),
    nombre              varchar(100) NOT NULL,
    valor_numeric       numeric(18,4),
    valor_texto         text,
    unidad              varchar(30),
    severidad           varchar(20) NOT NULL DEFAULT 'INFO' CHECK (severidad IN ('INFO','BAJA','MEDIA','ALTA','CRITICA')),
    detalle             jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS mon.umbral_alertas (
    id_umbral           serial PRIMARY KEY,
    nombre_metrica      varchar(100) NOT NULL UNIQUE,
    operador            varchar(10) NOT NULL CHECK (operador IN ('>','>=','<','<=','=','<>')),
    valor_umbral        numeric(18,4) NOT NULL,
    severidad           varchar(20) NOT NULL CHECK (severidad IN ('BAJA','MEDIA','ALTA','CRITICA')),
    descripcion         text NOT NULL,
    activo              boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS mon.alertas_operacionales (
    id_alerta           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha               timestamptz NOT NULL DEFAULT now(),
    tipo                varchar(80) NOT NULL,
    severidad           varchar(20) NOT NULL CHECK (severidad IN ('BAJA','MEDIA','ALTA','CRITICA')),
    mensaje             text NOT NULL,
    detalle             jsonb NOT NULL DEFAULT '{}'::jsonb,
    estado              varchar(30) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA','EN_REVISION','CERRADA')),
    atendido_por        text,
    atendido_at         timestamptz
);

INSERT INTO mon.umbral_alertas(nombre_metrica, operador, valor_umbral, severidad, descripcion) VALUES
('conexiones_activas', '>=', 80, 'ALTA', 'Demasiadas conexiones activas. Revisar pool o ataques.'),
('deadlocks', '>', 0, 'ALTA', 'Deadlocks detectados en la base.'),
('ratio_cache_hit', '<', 95, 'MEDIA', 'Baja eficiencia de cache.'),
('logins_fallidos_1h', '>=', 10, 'CRITICA', 'Posible fuerza bruta o ataque de credenciales.'),
('ips_bloqueadas_24h', '>=', 5, 'ALTA', 'Múltiples IPs bloqueadas recientemente.')
ON CONFLICT (nombre_metrica) DO NOTHING;

CREATE OR REPLACE FUNCTION mon.fn_insertar_metrica(
    p_nombre text,
    p_valor numeric,
    p_unidad text DEFAULT NULL,
    p_severidad text DEFAULT 'INFO',
    p_detalle jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    INSERT INTO mon.metricas_sistema(nombre, valor_numeric, unidad, severidad, detalle)
    VALUES (p_nombre, p_valor, p_unidad, p_severidad, COALESCE(p_detalle, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION mon.fn_capturar_metricas_basicas()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_db oid;
    v_conexiones numeric;
    v_deadlocks numeric;
    v_cache_hit numeric;
    v_logins_fallidos numeric;
    v_ips_bloqueadas numeric;
BEGIN
    SELECT oid INTO v_db FROM pg_database WHERE datname = current_database();

    SELECT count(*)::numeric INTO v_conexiones
    FROM pg_stat_activity
    WHERE datname = current_database();

    SELECT deadlocks::numeric INTO v_deadlocks
    FROM pg_stat_database
    WHERE datid = v_db;

    SELECT CASE WHEN (blks_hit + blks_read) = 0 THEN 100
                ELSE round((blks_hit::numeric / NULLIF(blks_hit + blks_read,0)) * 100, 2)
           END
    INTO v_cache_hit
    FROM pg_stat_database
    WHERE datid = v_db;

    SELECT count(*)::numeric INTO v_logins_fallidos
    FROM audit.login_intentos
    WHERE exito = false AND fecha >= now() - interval '1 hour';

    SELECT count(*)::numeric INTO v_ips_bloqueadas
    FROM sec.ip_bloqueadas
    WHERE bloqueada_desde >= now() - interval '24 hours';

    PERFORM mon.fn_insertar_metrica('conexiones_activas', COALESCE(v_conexiones,0), 'conexiones');
    PERFORM mon.fn_insertar_metrica('deadlocks', COALESCE(v_deadlocks,0), 'eventos');
    PERFORM mon.fn_insertar_metrica('ratio_cache_hit', COALESCE(v_cache_hit,100), '%');
    PERFORM mon.fn_insertar_metrica('logins_fallidos_1h', COALESCE(v_logins_fallidos,0), 'intentos');
    PERFORM mon.fn_insertar_metrica('ips_bloqueadas_24h', COALESCE(v_ips_bloqueadas,0), 'ips');
END;
$$;

CREATE OR REPLACE FUNCTION mon.fn_evaluar_alertas_operacionales()
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    r record;
    v_disparar boolean;
    v_total int := 0;
BEGIN
    FOR r IN
        SELECT DISTINCT ON (u.id_umbral)
            u.id_umbral,
            u.nombre_metrica,
            u.operador,
            u.valor_umbral,
            u.severidad,
            u.descripcion,
            m.valor_numeric,
            m.fecha
        FROM mon.umbral_alertas u
        JOIN mon.metricas_sistema m ON m.nombre = u.nombre_metrica
        WHERE u.activo = true
        ORDER BY u.id_umbral, m.fecha DESC
    LOOP
        v_disparar := CASE r.operador
            WHEN '>' THEN r.valor_numeric > r.valor_umbral
            WHEN '>=' THEN r.valor_numeric >= r.valor_umbral
            WHEN '<' THEN r.valor_numeric < r.valor_umbral
            WHEN '<=' THEN r.valor_numeric <= r.valor_umbral
            WHEN '=' THEN r.valor_numeric = r.valor_umbral
            WHEN '<>' THEN r.valor_numeric <> r.valor_umbral
            ELSE false
        END;

        IF v_disparar THEN
            INSERT INTO mon.alertas_operacionales(tipo, severidad, mensaje, detalle)
            VALUES (
                r.nombre_metrica,
                r.severidad,
                r.descripcion,
                jsonb_build_object('valor', r.valor_numeric, 'umbral', r.valor_umbral, 'operador', r.operador, 'fecha_metrica', r.fecha)
            );
            v_total := v_total + 1;
        END IF;
    END LOOP;

    RETURN v_total;
END;
$$;

CREATE OR REPLACE VIEW mon.v_dashboard_seguridad_operativa AS
SELECT
    'ALERTAS_OPERACIONALES_ABIERTAS' AS indicador,
    count(*)::numeric AS valor,
    'alertas' AS unidad,
    max(fecha) AS actualizado
FROM mon.alertas_operacionales
WHERE estado <> 'CERRADA'
UNION ALL
SELECT 'ALERTAS_IA_PENDIENTES', count(*)::numeric, 'alertas', max(fecha)
FROM ai.alertas_seguridad
WHERE atendida = false
UNION ALL
SELECT 'IPS_BLOQUEADAS_ACTIVAS', count(*)::numeric, 'ips', max(bloqueada_desde)
FROM sec.ip_bloqueadas
WHERE activa = true AND (bloqueada_hasta IS NULL OR bloqueada_hasta > now())
UNION ALL
SELECT 'BACKUPS_NO_CUMPLEN', count(*)::numeric, 'politicas', now()
FROM ops.v_cumplimiento_backup_empresarial
WHERE estado = 'NO_CUMPLE';


-- ============================================================
-- 16.7 PRIVACIDAD, RETENCIÓN Y ANONIMIZACIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS privacy.politicas_retencion_datos (
    id_politica         serial PRIMARY KEY,
    esquema             text NOT NULL,
    tabla               text NOT NULL,
    tipo_dato           varchar(80) NOT NULL,
    conservar_dias      int NOT NULL CHECK (conservar_dias > 0),
    accion              varchar(30) NOT NULL CHECK (accion IN ('CONSERVAR','ANONIMIZAR','ELIMINAR_LOGICO','ARCHIVAR')),
    descripcion         text NOT NULL,
    activo              boolean NOT NULL DEFAULT true,
    UNIQUE (esquema, tabla, tipo_dato)
);

CREATE TABLE IF NOT EXISTS privacy.solicitudes_privacidad (
    id_solicitud        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente          uuid REFERENCES app.clientes(id_cliente),
    tipo                varchar(40) NOT NULL CHECK (tipo IN ('ACCESO','RECTIFICACION','ANONIMIZACION','ELIMINACION_LOGICA','OPOSICION')),
    estado              varchar(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_REVISION','APROBADA','RECHAZADA','EJECUTADA')),
    motivo              text,
    solicitado_por      text DEFAULT current_user,
    fecha_solicitud     timestamptz NOT NULL DEFAULT now(),
    fecha_resolucion    timestamptz,
    resolucion          text
);

CREATE TABLE IF NOT EXISTS privacy.anonimizaciones (
    id_anonimizacion    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_cliente          uuid,
    fecha               timestamptz NOT NULL DEFAULT now(),
    ejecutado_por       text DEFAULT current_user,
    motivo              text NOT NULL,
    hash_cliente        text NOT NULL,
    observacion         text
);

INSERT INTO privacy.politicas_retencion_datos(esquema, tabla, tipo_dato, conservar_dias, accion, descripcion) VALUES
('app', 'ventas', 'VENTAS_COMERCIALES', 1825, 'CONSERVAR', 'Conservar ventas por 5 años para fines contables.'),
('audit', 'eventos', 'AUDITORIA_SEGURIDAD', 1825, 'CONSERVAR', 'Conservar auditoría de seguridad por 5 años.'),
('audit', 'login_intentos', 'LOGINS', 365, 'ARCHIVAR', 'Conservar intentos de login por 1 año.'),
('app', 'clientes', 'DATOS_PERSONALES', 1095, 'ANONIMIZAR', 'Anonimizar clientes inactivos luego de 3 años sin compras.'),
('ai', 'alertas_seguridad', 'ALERTAS_IA', 730, 'ARCHIVAR', 'Conservar alertas IA por 2 años.')
ON CONFLICT (esquema, tabla, tipo_dato) DO NOTHING;

CREATE OR REPLACE FUNCTION privacy.fn_anonimizar_cliente(
    p_id_cliente uuid,
    p_motivo text DEFAULT 'Anonimización por política de privacidad'
)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    v_hash text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM app.clientes WHERE id_cliente = p_id_cliente) THEN
        RETURN false;
    END IF;

    v_hash := encode(digest(p_id_cliente::text || ':' || now()::text, 'sha256'), 'hex');

    UPDATE app.clientes
    SET nombres = 'Cliente',
        apellidos = 'Anonimizado-' || substring(p_id_cliente::text, 1, 8),
        ci_enc = NULL,
        email_enc = NULL,
        telefono_enc = NULL,
        activo = false,
        updated_at = now()
    WHERE id_cliente = p_id_cliente;

    INSERT INTO privacy.anonimizaciones(id_cliente, motivo, hash_cliente, observacion)
    VALUES (p_id_cliente, p_motivo, v_hash, 'Datos personales reemplazados por identificador anónimo.');

    RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION privacy.fn_evaluar_clientes_para_anonimizar(p_fecha_corte date DEFAULT current_date - 1095)
RETURNS TABLE(
    id_cliente uuid,
    cliente text,
    ultima_compra timestamptz,
    recomendacion text
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        c.id_cliente,
        (c.nombres || ' ' || c.apellidos)::text AS cliente,
        max(v.fecha) AS ultima_compra,
        CASE
            WHEN max(v.fecha) IS NULL THEN 'SIN_COMPRAS_REGISTRADAS'
            WHEN max(v.fecha)::date < p_fecha_corte THEN 'ANONIMIZAR'
            ELSE 'CONSERVAR'
        END AS recomendacion
    FROM app.clientes c
    LEFT JOIN app.ventas v ON v.id_cliente = c.id_cliente
    WHERE c.activo = true
    GROUP BY c.id_cliente, c.nombres, c.apellidos
    HAVING max(v.fecha) IS NULL OR max(v.fecha)::date < p_fecha_corte;
$$;

CREATE OR REPLACE VIEW privacy.v_matriz_retencion AS
SELECT
    esquema,
    tabla,
    tipo_dato,
    conservar_dias,
    accion,
    descripcion,
    activo
FROM privacy.politicas_retencion_datos
ORDER BY esquema, tabla, tipo_dato;


-- ============================================================
-- 16.8 PRUEBAS DE SEGURIDAD Y VALIDACIÓN DEL DISEÑO
-- ============================================================

CREATE TABLE IF NOT EXISTS qa.pruebas_seguridad (
    id_prueba           serial PRIMARY KEY,
    codigo              varchar(40) NOT NULL UNIQUE,
    categoria           varchar(80) NOT NULL,
    nombre              varchar(160) NOT NULL,
    descripcion         text NOT NULL,
    resultado_esperado  text NOT NULL,
    criticidad          varchar(20) NOT NULL CHECK (criticidad IN ('BAJA','MEDIA','ALTA','CRITICA')),
    activo              boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS qa.ejecuciones_pruebas (
    id_ejecucion        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_prueba           int NOT NULL REFERENCES qa.pruebas_seguridad(id_prueba),
    fecha               timestamptz NOT NULL DEFAULT now(),
    ejecutado_por       text DEFAULT current_user,
    resultado           varchar(30) NOT NULL CHECK (resultado IN ('APROBADA','FALLIDA','NO_EJECUTADA','NO_APLICA')),
    evidencia           text,
    observacion         text
);

INSERT INTO qa.pruebas_seguridad(codigo, categoria, nombre, descripcion, resultado_esperado, criticidad) VALUES
('QA-SEC-001', 'Autenticación', 'Bloqueo por intentos fallidos', 'Intentar contraseña incorrecta repetidas veces.', 'Usuario o IP bloqueado y evento registrado.', 'CRITICA'),
('QA-SEC-002', 'Autorización', 'Aislamiento por sucursal', 'Usuario de una sucursal intenta ver datos de otra.', 'La política RLS impide el acceso.', 'CRITICA'),
('QA-SEC-003', 'Horario', 'Acceso fuera de horario', 'Cajero intenta iniciar sesión fuera del horario permitido.', 'Acceso denegado y auditado.', 'ALTA'),
('QA-SEC-004', 'Auditoría', 'Integridad de auditoría', 'Verificar cadena de hash de eventos.', 'La función de verificación retorna integridad correcta.', 'CRITICA'),
('QA-SEC-005', 'Backups', 'Restauración comprobada', 'Restaurar backup en ambiente RESPALDO.', 'Restauración exitosa con RPO/RTO registrados.', 'CRITICA'),
('QA-SEC-006', 'SQL Injection', 'Consultas parametrizadas', 'Probar entradas con caracteres maliciosos desde backend.', 'El backend no concatena SQL y no expone información.', 'CRITICA'),
('QA-SEC-007', 'IA Seguridad', 'Detección de intrusión', 'Generar múltiples fallos de login desde una IP.', 'IA clasifica riesgo alto/crítico y activa defensa.', 'ALTA'),
('QA-SEC-008', 'Privacidad', 'Anonimización controlada', 'Anonimizar cliente inactivo.', 'Datos sensibles se eliminan o reemplazan y queda evidencia.', 'ALTA')
ON CONFLICT (codigo) DO NOTHING;

CREATE OR REPLACE FUNCTION qa.registrar_resultado_prueba(
    p_codigo text,
    p_resultado text,
    p_evidencia text DEFAULT NULL,
    p_observacion text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_id int;
    v_exec uuid;
BEGIN
    SELECT id_prueba INTO v_id FROM qa.pruebas_seguridad WHERE codigo = p_codigo AND activo = true;
    IF v_id IS NULL THEN
        RAISE EXCEPTION 'No existe prueba activa con código %', p_codigo;
    END IF;

    INSERT INTO qa.ejecuciones_pruebas(id_prueba, resultado, evidencia, observacion)
    VALUES (v_id, p_resultado, p_evidencia, p_observacion)
    RETURNING id_ejecucion INTO v_exec;

    RETURN v_exec;
END;
$$;

CREATE OR REPLACE VIEW qa.v_estado_pruebas_seguridad AS
SELECT DISTINCT ON (p.id_prueba)
    p.codigo,
    p.categoria,
    p.nombre,
    p.criticidad,
    e.fecha AS ultima_ejecucion,
    COALESCE(e.resultado, 'NO_EJECUTADA') AS ultimo_resultado,
    e.evidencia,
    e.observacion
FROM qa.pruebas_seguridad p
LEFT JOIN qa.ejecuciones_pruebas e ON e.id_prueba = p.id_prueba
WHERE p.activo = true
ORDER BY p.id_prueba, e.fecha DESC NULLS LAST;


-- ============================================================
-- 16.9 IA AVANZADA: FEATURE STORE, MODELOS EXTERNOS Y EXPLICABILIDAD
-- ============================================================

CREATE TABLE IF NOT EXISTS ai.modelos_ia (
    id_modelo           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre              varchar(120) NOT NULL UNIQUE,
    tipo                varchar(50) NOT NULL CHECK (tipo IN ('FRAUDE_VENTAS','ACCESO_ANOMALO','DEMANDA','REPOSICION','CHATBOT_GERENCIAL','SEGMENTACION_CLIENTES','OTRO')),
    version             varchar(30) NOT NULL DEFAULT '1.0',
    proveedor           varchar(60) NOT NULL DEFAULT 'SQL_RULES' CHECK (proveedor IN ('SQL_RULES','PYTHON_SKLEARN','PYTHON_XGBOOST','PROPHET','LLM','SERVICIO_EXTERNO','OTRO')),
    endpoint_referencia text,
    descripcion         text NOT NULL,
    activo              boolean NOT NULL DEFAULT true,
    umbral_bajo         numeric(5,2) NOT NULL DEFAULT 30,
    umbral_medio        numeric(5,2) NOT NULL DEFAULT 60,
    umbral_alto         numeric(5,2) NOT NULL DEFAULT 80,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai.entrenamientos_modelo (
    id_entrenamiento    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_modelo           uuid NOT NULL REFERENCES ai.modelos_ia(id_modelo),
    fecha_inicio        timestamptz NOT NULL DEFAULT now(),
    fecha_fin           timestamptz,
    dataset_desde       date,
    dataset_hasta       date,
    metricas            jsonb NOT NULL DEFAULT '{}'::jsonb,
    estado              varchar(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_PROCESO','EXITOSO','FALLIDO')),
    observacion         text
);

CREATE TABLE IF NOT EXISTS ai.features_venta (
    id_venta            uuid PRIMARY KEY REFERENCES app.ventas(id_venta) ON DELETE CASCADE,
    id_sucursal         int NOT NULL,
    id_cajero           uuid NOT NULL,
    fecha               timestamptz NOT NULL,
    hora                int NOT NULL,
    dia_semana          int NOT NULL,
    total               numeric(12,2) NOT NULL,
    descuento_pct       numeric(8,4) NOT NULL DEFAULT 0,
    cantidad_items      int NOT NULL DEFAULT 0,
    promedio_sucursal   numeric(12,2),
    desviacion_sucursal numeric(12,2),
    zscore_total        numeric(12,4),
    fuera_horario       boolean NOT NULL DEFAULT false,
    features_json       jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai.predicciones_modelo (
    id_prediccion       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_modelo           uuid REFERENCES ai.modelos_ia(id_modelo),
    entidad_tipo        varchar(60) NOT NULL,
    entidad_id          text NOT NULL,
    fecha               timestamptz NOT NULL DEFAULT now(),
    score               numeric(6,2) NOT NULL CHECK (score BETWEEN 0 AND 100),
    nivel               varchar(20) NOT NULL CHECK (nivel IN ('BAJO','MEDIO','ALTO','CRITICO')),
    explicacion         jsonb NOT NULL DEFAULT '{}'::jsonb,
    accion_recomendada  text,
    estado              varchar(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','REVISADO','DESCARTADO','CONFIRMADO'))
);

CREATE TABLE IF NOT EXISTS ai.feedback_predicciones (
    id_feedback         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_prediccion       uuid NOT NULL REFERENCES ai.predicciones_modelo(id_prediccion) ON DELETE CASCADE,
    fecha               timestamptz NOT NULL DEFAULT now(),
    revisado_por        text DEFAULT current_user,
    etiqueta_real       varchar(30) NOT NULL CHECK (etiqueta_real IN ('FALSO_POSITIVO','VERDADERO_POSITIVO','FALSO_NEGATIVO','NORMAL','DESCONOCIDO')),
    comentario          text
);

CREATE TABLE IF NOT EXISTS ai.solicitudes_modelo_externo (
    id_solicitud        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_modelo           uuid REFERENCES ai.modelos_ia(id_modelo),
    fecha               timestamptz NOT NULL DEFAULT now(),
    entidad_tipo        varchar(60) NOT NULL,
    entidad_id          text NOT NULL,
    payload             jsonb NOT NULL,
    estado              varchar(30) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','ENVIADO','RESPONDIDO','FALLIDO')),
    observacion         text
);

CREATE TABLE IF NOT EXISTS ai.resultados_modelo_externo (
    id_resultado        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    id_solicitud        uuid NOT NULL REFERENCES ai.solicitudes_modelo_externo(id_solicitud) ON DELETE CASCADE,
    fecha               timestamptz NOT NULL DEFAULT now(),
    respuesta           jsonb NOT NULL,
    score               numeric(6,2),
    nivel               varchar(20) CHECK (nivel IN ('BAJO','MEDIO','ALTO','CRITICO')),
    explicacion         jsonb NOT NULL DEFAULT '{}'::jsonb
);

INSERT INTO ai.modelos_ia(nombre, tipo, version, proveedor, endpoint_referencia, descripcion, umbral_bajo, umbral_medio, umbral_alto) VALUES
('SQL Risk Engine - Ventas', 'FRAUDE_VENTAS', '2.0', 'SQL_RULES', NULL, 'Motor de reglas explicable para detectar ventas anómalas.', 30, 60, 80),
('External Fraud Model', 'FRAUDE_VENTAS', '1.0', 'PYTHON_XGBOOST', 'https://ia-interna.local/fraud-score', 'Modelo externo sugerido para puntaje de fraude de ventas.', 30, 60, 85),
('External Demand Forecast', 'DEMANDA', '1.0', 'PROPHET', 'https://ia-interna.local/demand-forecast', 'Modelo externo sugerido para predicción de demanda por sucursal y producto.', 30, 60, 80),
('SQL Login Anomaly Engine', 'ACCESO_ANOMALO', '2.0', 'SQL_RULES', NULL, 'Motor explicable para intentos de acceso sospechosos.', 30, 60, 80),
('Gerencial Assistant', 'CHATBOT_GERENCIAL', '1.0', 'LLM', 'https://ia-interna.local/assistant', 'Asistente gerencial conectado a reportes seguros, sin exponer datos sensibles.', 30, 60, 80)
ON CONFLICT (nombre) DO NOTHING;

CREATE OR REPLACE FUNCTION ai.fn_extraer_features_ventas(
    p_desde date DEFAULT current_date - 30,
    p_hasta date DEFAULT current_date
)
RETURNS int
LANGUAGE plpgsql
AS $$
DECLARE
    v_total int;
BEGIN
    WITH ventas_agregadas AS (
        SELECT
            v.id_venta,
            v.id_sucursal,
            v.id_cajero,
            v.fecha,
            extract(hour from v.fecha)::int AS hora,
            extract(isodow from v.fecha)::int AS dia_semana,
            v.total,
            CASE WHEN v.subtotal > 0 THEN round((v.descuento / v.subtotal) * 100, 4) ELSE 0 END AS descuento_pct,
            count(d.id_detalle)::int AS cantidad_items
        FROM app.ventas v
        LEFT JOIN app.venta_detalle d ON d.id_venta = v.id_venta
        WHERE v.fecha::date BETWEEN p_desde AND p_hasta
        GROUP BY v.id_venta, v.id_sucursal, v.id_cajero, v.fecha, v.total, v.subtotal, v.descuento
    ), stats AS (
        SELECT
            id_sucursal,
            avg(total)::numeric(12,2) AS promedio,
            stddev_pop(total)::numeric(12,2) AS desviacion
        FROM app.ventas
        WHERE fecha::date BETWEEN (p_desde - 30) AND p_hasta
        GROUP BY id_sucursal
    )
    INSERT INTO ai.features_venta(
        id_venta, id_sucursal, id_cajero, fecha, hora, dia_semana, total,
        descuento_pct, cantidad_items, promedio_sucursal, desviacion_sucursal,
        zscore_total, fuera_horario, features_json
    )
    SELECT
        va.id_venta,
        va.id_sucursal,
        va.id_cajero,
        va.fecha,
        va.hora,
        va.dia_semana,
        va.total,
        va.descuento_pct,
        va.cantidad_items,
        s.promedio,
        s.desviacion,
        CASE WHEN COALESCE(s.desviacion,0) = 0 THEN 0 ELSE round((va.total - s.promedio) / s.desviacion, 4) END AS zscore_total,
        (va.hora < 6 OR va.hora > 23) AS fuera_horario,
        jsonb_build_object(
            'hora', va.hora,
            'dia_semana', va.dia_semana,
            'total', va.total,
            'descuento_pct', va.descuento_pct,
            'cantidad_items', va.cantidad_items,
            'promedio_sucursal', s.promedio,
            'zscore_total', CASE WHEN COALESCE(s.desviacion,0) = 0 THEN 0 ELSE round((va.total - s.promedio) / s.desviacion, 4) END,
            'fuera_horario', (va.hora < 6 OR va.hora > 23)
        )
    FROM ventas_agregadas va
    LEFT JOIN stats s ON s.id_sucursal = va.id_sucursal
    ON CONFLICT (id_venta) DO UPDATE SET
        fecha = EXCLUDED.fecha,
        hora = EXCLUDED.hora,
        dia_semana = EXCLUDED.dia_semana,
        total = EXCLUDED.total,
        descuento_pct = EXCLUDED.descuento_pct,
        cantidad_items = EXCLUDED.cantidad_items,
        promedio_sucursal = EXCLUDED.promedio_sucursal,
        desviacion_sucursal = EXCLUDED.desviacion_sucursal,
        zscore_total = EXCLUDED.zscore_total,
        fuera_horario = EXCLUDED.fuera_horario,
        features_json = EXCLUDED.features_json,
        created_at = now();

    GET DIAGNOSTICS v_total = ROW_COUNT;
    RETURN v_total;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_scoring_fraude_avanzado(p_id_venta uuid)
RETURNS TABLE(
    score numeric,
    nivel text,
    explicacion jsonb,
    accion_recomendada text
)
LANGUAGE plpgsql
AS $$
DECLARE
    f ai.features_venta%ROWTYPE;
    v_score numeric := 0;
    v_exp jsonb := '{}'::jsonb;
BEGIN
    SELECT * INTO f FROM ai.features_venta WHERE id_venta = p_id_venta;

    IF NOT FOUND THEN
        PERFORM ai.fn_extraer_features_ventas(current_date - 60, current_date);
        SELECT * INTO f FROM ai.features_venta WHERE id_venta = p_id_venta;
    END IF;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No existen features para la venta %', p_id_venta;
    END IF;

    IF f.zscore_total >= 3 THEN
        v_score := v_score + 35;
        v_exp := v_exp || jsonb_build_object('monto_anomalo', 'Total muy superior al promedio de la sucursal');
    ELSIF f.zscore_total >= 2 THEN
        v_score := v_score + 20;
        v_exp := v_exp || jsonb_build_object('monto_alto', 'Total superior al comportamiento habitual');
    END IF;

    IF f.descuento_pct >= 30 THEN
        v_score := v_score + 35;
        v_exp := v_exp || jsonb_build_object('descuento_critico', f.descuento_pct);
    ELSIF f.descuento_pct >= 20 THEN
        v_score := v_score + 25;
        v_exp := v_exp || jsonb_build_object('descuento_alto', f.descuento_pct);
    ELSIF f.descuento_pct >= 10 THEN
        v_score := v_score + 10;
        v_exp := v_exp || jsonb_build_object('descuento_moderado', f.descuento_pct);
    END IF;

    IF f.fuera_horario THEN
        v_score := v_score + 20;
        v_exp := v_exp || jsonb_build_object('fuera_horario', true);
    END IF;

    IF f.cantidad_items >= 20 THEN
        v_score := v_score + 10;
        v_exp := v_exp || jsonb_build_object('muchos_items', f.cantidad_items);
    END IF;

    v_score := LEAST(100, v_score);

    RETURN QUERY SELECT
        v_score,
        CASE
            WHEN v_score >= 85 THEN 'CRITICO'
            WHEN v_score >= 70 THEN 'ALTO'
            WHEN v_score >= 40 THEN 'MEDIO'
            ELSE 'BAJO'
        END::text,
        v_exp || jsonb_build_object('features', f.features_json),
        CASE
            WHEN v_score >= 85 THEN 'Bloquear revisión de la venta y notificar auditoría.'
            WHEN v_score >= 70 THEN 'Solicitar revisión del gerente o auditor.'
            WHEN v_score >= 40 THEN 'Marcar para revisión preventiva.'
            ELSE 'Sin acción inmediata.'
        END::text;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_registrar_prediccion_fraude_avanzado(p_id_venta uuid)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_modelo uuid;
    v_score numeric;
    v_nivel text;
    v_exp jsonb;
    v_accion text;
    v_pred uuid;
BEGIN
    SELECT id_modelo INTO v_modelo FROM ai.modelos_ia WHERE nombre = 'SQL Risk Engine - Ventas';

    SELECT s.score, s.nivel, s.explicacion, s.accion_recomendada
    INTO v_score, v_nivel, v_exp, v_accion
    FROM ai.fn_scoring_fraude_avanzado(p_id_venta) s;

    INSERT INTO ai.predicciones_modelo(id_modelo, entidad_tipo, entidad_id, score, nivel, explicacion, accion_recomendada)
    VALUES (v_modelo, 'VENTA', p_id_venta::text, v_score, v_nivel, v_exp, v_accion)
    RETURNING id_prediccion INTO v_pred;

    IF v_nivel IN ('ALTO','CRITICO') THEN
        INSERT INTO ai.alertas_seguridad(tipo, severidad, descripcion, id_venta)
        VALUES (
            'FRAUDE_VENTA_IA_AVANZADA',
            CASE WHEN v_nivel = 'CRITICO' THEN 'CRITICA' ELSE v_nivel END,
            'IA avanzada detectó una venta con riesgo de fraude. Detalle=' ||
            jsonb_build_object('score', v_score, 'explicacion', v_exp, 'accion', v_accion)::text,
            p_id_venta
        );
    END IF;

    RETURN v_pred;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_solicitar_modelo_externo(
    p_nombre_modelo text,
    p_entidad_tipo text,
    p_entidad_id text,
    p_payload jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_modelo uuid;
    v_solicitud uuid;
BEGIN
    SELECT id_modelo INTO v_modelo
    FROM ai.modelos_ia
    WHERE nombre = p_nombre_modelo AND activo = true;

    IF v_modelo IS NULL THEN
        RAISE EXCEPTION 'Modelo IA no encontrado o inactivo: %', p_nombre_modelo;
    END IF;

    INSERT INTO ai.solicitudes_modelo_externo(id_modelo, entidad_tipo, entidad_id, payload)
    VALUES (v_modelo, p_entidad_tipo, p_entidad_id, p_payload)
    RETURNING id_solicitud INTO v_solicitud;

    RETURN v_solicitud;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_registrar_respuesta_modelo_externo(
    p_id_solicitud uuid,
    p_respuesta jsonb,
    p_score numeric DEFAULT NULL,
    p_nivel text DEFAULT NULL,
    p_explicacion jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
    v_resultado uuid;
BEGIN
    INSERT INTO ai.resultados_modelo_externo(id_solicitud, respuesta, score, nivel, explicacion)
    VALUES (p_id_solicitud, p_respuesta, p_score, p_nivel, COALESCE(p_explicacion, '{}'::jsonb))
    RETURNING id_resultado INTO v_resultado;

    UPDATE ai.solicitudes_modelo_externo
    SET estado = 'RESPONDIDO'
    WHERE id_solicitud = p_id_solicitud;

    RETURN v_resultado;
END;
$$;

CREATE OR REPLACE FUNCTION ai.fn_chatbot_gerencial_resumen(p_desde date DEFAULT current_date - 7, p_hasta date DEFAULT current_date)
RETURNS text
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_total numeric;
    v_ventas int;
    v_sucursal text;
    v_producto text;
    v_alertas int;
    v_fraudes int;
BEGIN
    SELECT COALESCE(sum(total),0), count(*)
    INTO v_total, v_ventas
    FROM app.ventas
    WHERE estado = 'COMPLETADA' AND fecha::date BETWEEN p_desde AND p_hasta;

    SELECT s.nombre INTO v_sucursal
    FROM app.ventas v
    JOIN app.sucursales s ON s.id_sucursal = v.id_sucursal
    WHERE v.estado = 'COMPLETADA' AND v.fecha::date BETWEEN p_desde AND p_hasta
    GROUP BY s.nombre
    ORDER BY sum(v.total) DESC
    LIMIT 1;

    SELECT p.nombre INTO v_producto
    FROM app.venta_detalle d
    JOIN app.ventas v ON v.id_venta = d.id_venta
    JOIN app.productos p ON p.id_producto = d.id_producto
    WHERE v.estado = 'COMPLETADA' AND v.fecha::date BETWEEN p_desde AND p_hasta
    GROUP BY p.nombre
    ORDER BY sum(d.cantidad) DESC
    LIMIT 1;

    SELECT count(*) INTO v_alertas
    FROM ai.alertas_seguridad
    WHERE fecha::date BETWEEN p_desde AND p_hasta AND atendida = false;

    SELECT count(*) INTO v_fraudes
    FROM ai.predicciones_modelo
    WHERE fecha::date BETWEEN p_desde AND p_hasta
      AND entidad_tipo = 'VENTA'
      AND nivel IN ('ALTO','CRITICO');

    RETURN format(
        'Resumen IA gerencial del %s al %s: ventas completadas %s, total Bs %s. Sucursal destacada: %s. Producto más vendido: %s. Alertas de seguridad pendientes: %s. Ventas con riesgo alto/crítico: %s.',
        p_desde, p_hasta, v_ventas, COALESCE(v_total,0), COALESCE(v_sucursal,'Sin datos'), COALESCE(v_producto,'Sin datos'), v_alertas, v_fraudes
    );
END;
$$;

CREATE OR REPLACE VIEW ai.v_panel_ia_avanzada AS
SELECT
    m.nombre AS modelo,
    m.tipo,
    m.version,
    m.proveedor,
    count(p.id_prediccion) AS total_predicciones,
    count(p.id_prediccion) FILTER (WHERE p.nivel IN ('ALTO','CRITICO')) AS predicciones_altas,
    max(p.fecha) AS ultima_prediccion
FROM ai.modelos_ia m
LEFT JOIN ai.predicciones_modelo p ON p.id_modelo = m.id_modelo
GROUP BY m.id_modelo, m.nombre, m.tipo, m.version, m.proveedor
ORDER BY m.tipo, m.nombre;


-- ============================================================
-- 16.10 REPORTES EMPRESARIALES ADICIONALES
-- ============================================================

CREATE OR REPLACE VIEW rpt.v_reporte_cumplimiento_seguridad AS
SELECT
    c.categoria,
    c.codigo,
    c.nombre,
    c.nivel_criticidad,
    c.estado,
    c.responsable,
    c.evidencia,
    c.updated_at
FROM gov.controles_seguridad c
ORDER BY
    CASE c.nivel_criticidad WHEN 'CRITICO' THEN 1 WHEN 'ALTO' THEN 2 WHEN 'MEDIO' THEN 3 ELSE 4 END,
    c.categoria,
    c.codigo;

CREATE OR REPLACE VIEW rpt.v_reporte_privacidad_retencion AS
SELECT
    esquema,
    tabla,
    tipo_dato,
    conservar_dias,
    accion,
    descripcion
FROM privacy.politicas_retencion_datos
WHERE activo = true
ORDER BY esquema, tabla;

CREATE OR REPLACE VIEW rpt.v_reporte_monitoreo_seguridad AS
SELECT
    indicador,
    valor,
    unidad,
    actualizado
FROM mon.v_dashboard_seguridad_operativa;

CREATE OR REPLACE VIEW rpt.v_reporte_ha_backups AS
SELECT
    'HA' AS seccion,
    nombre AS elemento,
    estado::text AS estado,
    evaluacion::text AS detalle,
    ultima_revision AS fecha
FROM ops.v_estado_ha_actual
UNION ALL
SELECT
    'BACKUP' AS seccion,
    politica AS elemento,
    estado,
    ('copias_en_retencion=' || copias_en_retencion)::text AS detalle,
    now() AS fecha
FROM ops.v_cumplimiento_backup_empresarial;


-- ============================================================
-- 16.11 PRIVILEGIOS DEL ANEXO
-- ============================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_monitoring') THEN
        CREATE ROLE sm_monitoring LOGIN PASSWORD 'Monitoring123*Cambiar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_privacy') THEN
        CREATE ROLE sm_privacy LOGIN PASSWORD 'Privacy123*Cambiar';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'sm_ai_service') THEN
        CREATE ROLE sm_ai_service LOGIN PASSWORD 'AIService123*Cambiar';
    END IF;
END;
$$;

REVOKE ALL ON SCHEMA mon FROM PUBLIC;
REVOKE ALL ON SCHEMA privacy FROM PUBLIC;
REVOKE ALL ON SCHEMA qa FROM PUBLIC;
REVOKE ALL ON SCHEMA gov FROM PUBLIC;

GRANT USAGE ON SCHEMA mon TO sm_monitoring, sm_security_admin;
GRANT USAGE ON SCHEMA privacy TO sm_privacy, sm_security_admin;
GRANT USAGE ON SCHEMA qa TO sm_security_admin;
GRANT USAGE ON SCHEMA gov TO sm_security_admin, sm_reportes;

GRANT SELECT, INSERT ON mon.metricas_sistema, mon.alertas_operacionales TO sm_monitoring, sm_security_admin;
GRANT SELECT ON mon.umbral_alertas, mon.v_dashboard_seguridad_operativa TO sm_monitoring, sm_security_admin;
GRANT EXECUTE ON FUNCTION mon.fn_capturar_metricas_basicas() TO sm_monitoring, sm_security_admin;
GRANT EXECUTE ON FUNCTION mon.fn_evaluar_alertas_operacionales() TO sm_monitoring, sm_security_admin;

GRANT SELECT ON privacy.v_matriz_retencion, privacy.politicas_retencion_datos TO sm_privacy, sm_security_admin, sm_reportes;
GRANT SELECT, INSERT, UPDATE ON privacy.solicitudes_privacidad TO sm_privacy, sm_security_admin;
GRANT SELECT, INSERT ON privacy.anonimizaciones TO sm_privacy, sm_security_admin;
GRANT EXECUTE ON FUNCTION privacy.fn_anonimizar_cliente(uuid, text) TO sm_privacy, sm_security_admin;
GRANT EXECUTE ON FUNCTION privacy.fn_evaluar_clientes_para_anonimizar(date) TO sm_privacy, sm_security_admin;

GRANT SELECT ON gov.controles_seguridad, gov.ambientes, gov.versiones_base_datos TO sm_security_admin, sm_reportes;
GRANT EXECUTE ON FUNCTION gov.fn_resumen_postura_seguridad() TO sm_security_admin, sm_reportes;

GRANT SELECT, INSERT ON qa.ejecuciones_pruebas TO sm_security_admin;
GRANT SELECT ON qa.pruebas_seguridad, qa.v_estado_pruebas_seguridad TO sm_security_admin, sm_reportes;
GRANT EXECUTE ON FUNCTION qa.registrar_resultado_prueba(text, text, text, text) TO sm_security_admin;

GRANT SELECT, INSERT, UPDATE ON ai.modelos_ia, ai.entrenamientos_modelo, ai.solicitudes_modelo_externo, ai.resultados_modelo_externo TO sm_ai_service, sm_security_admin;
GRANT SELECT, INSERT, UPDATE ON ai.features_venta, ai.predicciones_modelo, ai.feedback_predicciones TO sm_ai_service, sm_security_admin;
GRANT SELECT ON ai.v_panel_ia_avanzada TO sm_ai_service, sm_security_admin, sm_reportes;
GRANT EXECUTE ON FUNCTION ai.fn_extraer_features_ventas(date, date) TO sm_ai_service, sm_security_admin;
GRANT EXECUTE ON FUNCTION ai.fn_registrar_prediccion_fraude_avanzado(uuid) TO sm_ai_service, sm_security_admin;
GRANT EXECUTE ON FUNCTION ai.fn_solicitar_modelo_externo(text, text, text, jsonb) TO sm_ai_service, sm_security_admin;
GRANT EXECUTE ON FUNCTION ai.fn_registrar_respuesta_modelo_externo(uuid, jsonb, numeric, text, jsonb) TO sm_ai_service, sm_security_admin;
GRANT EXECUTE ON FUNCTION ai.fn_chatbot_gerencial_resumen(date, date) TO sm_backend, sm_reportes, sm_ai_service;

GRANT SELECT ON rpt.v_reporte_cumplimiento_seguridad, rpt.v_reporte_privacidad_retencion, rpt.v_reporte_monitoreo_seguridad, rpt.v_reporte_ha_backups TO sm_reportes, sm_security_admin;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mon TO sm_monitoring, sm_security_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA privacy TO sm_privacy, sm_security_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA qa TO sm_security_admin;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA gov TO sm_security_admin, sm_reportes;


-- ============================================================
-- 16.12 CONSULTAS DE PRUEBA DEL ANEXO
-- ============================================================
-- Evaluar postura general:
-- SELECT * FROM gov.fn_resumen_postura_seguridad();
--
-- Ver plantillas reales de seguridad del servidor:
-- SELECT ops.plantilla_pg_hba_conf_seguro('10.0.0.10/32','10.0.0.20/32');
-- SELECT ops.plantilla_postgresql_conf_tls();
-- SELECT ops.plantilla_firewall_ufw('10.0.0.10','10.0.0.20');
--
-- Validar conexión actual:
-- SELECT * FROM sec.validar_conexion_empresarial('127.0.0.1','ADMIN');
--
-- Monitoreo:
-- SELECT mon.fn_capturar_metricas_basicas();
-- SELECT mon.fn_evaluar_alertas_operacionales();
-- SELECT * FROM mon.v_dashboard_seguridad_operativa;
--
-- Backups y HA:
-- SELECT * FROM ops.plan_backup_empresarial();
-- SELECT * FROM ops.v_cumplimiento_backup_empresarial;
-- SELECT * FROM ops.v_estado_ha_actual;
--
-- Privacidad:
-- SELECT * FROM privacy.v_matriz_retencion;
-- SELECT * FROM privacy.fn_evaluar_clientes_para_anonimizar();
--
-- Pruebas de seguridad:
-- SELECT * FROM qa.v_estado_pruebas_seguridad;
-- SELECT qa.registrar_resultado_prueba('QA-SEC-004','APROBADA','SELECT * FROM audit.v_integridad_auditoria','Cadena verificada');
--
-- IA avanzada:
-- SELECT ai.fn_extraer_features_ventas(current_date - 30, current_date);
-- SELECT * FROM ai.v_panel_ia_avanzada;
-- SELECT ai.fn_chatbot_gerencial_resumen(current_date - 7, current_date);
-- ============================================================


-- ============================================================
-- FIN DEL SCRIPT ULTRA PROFESIONAL
-- ============================================================


-- codigo para el apartado de pedidos virtuales

CREATE TABLE IF NOT EXISTS app.pedidos_virtuales (
    id_pedido uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo varchar(40) UNIQUE NOT NULL,
    cliente text NOT NULL,
    telefono_ci text NOT NULL,
    sucursal text NOT NULL,
    estado varchar(20) NOT NULL DEFAULT 'PENDIENTE',
    total_estimado numeric(12,2) NOT NULL DEFAULT 0,
    items jsonb NOT NULL DEFAULT '[]'::jsonb,
    fecha_creacion timestamptz NOT NULL DEFAULT now(),
    fecha_confirmacion timestamptz,
    id_venta uuid,
    observacion text,

    CONSTRAINT chk_pedidos_virtuales_estado
    CHECK (estado IN ('PENDIENTE', 'CONFIRMADO', 'CANCELADO', 'VENCIDO'))
);

CREATE INDEX IF NOT EXISTS idx_pedidos_virtuales_codigo
ON app.pedidos_virtuales(codigo);

CREATE INDEX IF NOT EXISTS idx_pedidos_virtuales_estado
ON app.pedidos_virtuales(estado);

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
    observacion
FROM app.pedidos_virtuales
ORDER BY fecha_creacion DESC;










-- =====================================================
-- PARCHE: FIREWALL LÓGICO LOCALHOST + LIMPIEZA DE BLOQUEOS
-- Corrige sec.ip_esta_permitida usando <<= en lugar de <<
-- y desbloquea admin/127.0.0.1 para continuar pruebas.
-- =====================================================

CREATE OR REPLACE FUNCTION sec.ip_esta_permitida(
    p_ip inet,
    p_rol text DEFAULT NULL,
    p_id_sucursal int DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    v_firewall boolean;
    v_existen_reglas boolean;
BEGIN
    v_firewall := sec.get_config_bool('firewall_logico_activo', true);

    IF v_firewall = false THEN
        RETURN true;
    END IF;

    IF p_ip IS NULL THEN
        RETURN true;
    END IF;

    IF sec.ip_esta_bloqueada(p_ip) THEN
        RETURN false;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM sec.ip_permitidas r
        WHERE r.activa = true
          AND (r.rol IS NULL OR r.rol = p_rol)
          AND (r.id_sucursal IS NULL OR r.id_sucursal = p_id_sucursal)
    ) INTO v_existen_reglas;

    IF v_existen_reglas = false THEN
        RETURN true;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM sec.ip_permitidas r
        WHERE r.activa = true
          AND p_ip <<= r.red
          AND (r.rol IS NULL OR r.rol = p_rol)
          AND (r.id_sucursal IS NULL OR r.id_sucursal = p_id_sucursal)
    );
END;
$$;

-- Limpiar bloqueo temporal generado durante las pruebas del localhost.
UPDATE sec.ip_bloqueadas
SET activa = false
WHERE ip = '127.0.0.1'::inet;

-- Limpiar bloqueo temporal del usuario admin generado durante pruebas previas.
UPDATE app.usuarios
SET intentos_fallidos = 0,
    bloqueado_hasta = NULL,
    updated_at = now()
WHERE username = 'admin';

-- Pruebas rápidas del parche.
SELECT sec.ip_esta_permitida('127.0.0.1'::inet, 'ADMIN', NULL) AS ip_local_permitida;
SELECT sec.rol_en_horario_permitido('ADMIN') AS admin_en_horario_permitido;




-- ============================================================
-- MIGRACION: BACKUPS AUTOMATICOS CONFIGURABLES
-- Proyecto: Supermarket / ProyectoBD
-- Uso: opcional. El backend tambien crea esta tabla automaticamente.
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.backup_configuracion_automatica (
    id_configuracion smallint PRIMARY KEY DEFAULT 1 CHECK (id_configuracion = 1),
    activo boolean NOT NULL DEFAULT true,
    frecuencia_horas int NOT NULL DEFAULT 24 CHECK (frecuencia_horas IN (1,4,7,9,12,24)),
    ultima_ejecucion timestamptz,
    proxima_ejecucion timestamptz,
    estado_ultima_ejecucion varchar(20) NOT NULL DEFAULT 'SIN_EJECUCION'
      CHECK (estado_ultima_ejecucion IN ('SIN_EJECUCION','PROGRAMADO','EN_PROCESO','EXITOSO','FALLIDO','DESACTIVADO')),
    ultimo_id_backup uuid REFERENCES ops.backup_ejecuciones(id_backup),
    ultimo_archivo text,
    ultimo_mensaje text,
    actualizado_por text NOT NULL DEFAULT current_user,
    updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO ops.backup_configuracion_automatica(
    id_configuracion,
    activo,
    frecuencia_horas,
    proxima_ejecucion,
    estado_ultima_ejecucion,
    actualizado_por
) VALUES (
    1,
    true,
    24,
    now() + interval '24 hours',
    'PROGRAMADO',
    'SISTEMA'
)
ON CONFLICT (id_configuracion) DO NOTHING;

UPDATE ops.backup_configuracion_automatica
SET proxima_ejecucion = now() + (frecuencia_horas * interval '1 hour'),
    estado_ultima_ejecucion = 'PROGRAMADO',
    updated_at = now()
WHERE id_configuracion = 1
  AND activo = true
  AND proxima_ejecucion IS NULL;

SELECT * FROM ops.backup_configuracion_automatica;
