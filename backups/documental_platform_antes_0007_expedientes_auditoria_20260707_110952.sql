--
-- PostgreSQL database dump
--

\restrict 9SomXKZPmJX5XcobfdnlLMa6kRtP1YfqegmDN4KQE9VvyBYc7uW6XCr9K6HTvBD

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Debian 16.14-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: auditoria; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auditoria;


ALTER SCHEMA auditoria OWNER TO postgres;

--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- Name: caja_chica; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA caja_chica;


ALTER SCHEMA caja_chica OWNER TO postgres;

--
-- Name: core; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA core;


ALTER SCHEMA core OWNER TO postgres;

--
-- Name: documentos; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA documentos;


ALTER SCHEMA documentos OWNER TO postgres;

--
-- Name: proyectos; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA proyectos;


ALTER SCHEMA proyectos OWNER TO postgres;

--
-- Name: requerimientos; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA requerimientos;


ALTER SCHEMA requerimientos OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: perfiles; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.perfiles (
    id integer NOT NULL,
    sistema_id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE auth.perfiles OWNER TO postgres;

--
-- Name: perfiles_id_seq; Type: SEQUENCE; Schema: auth; Owner: postgres
--

CREATE SEQUENCE auth.perfiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.perfiles_id_seq OWNER TO postgres;

--
-- Name: perfiles_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: postgres
--

ALTER SEQUENCE auth.perfiles_id_seq OWNED BY auth.perfiles.id;


--
-- Name: sistemas; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.sistemas (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(120) NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying
);


ALTER TABLE auth.sistemas OWNER TO postgres;

--
-- Name: TABLE sistemas; Type: COMMENT; Schema: auth; Owner: postgres
--

COMMENT ON TABLE auth.sistemas IS 'LEGACY: reemplazada por core.sistemas. No usar para nuevos desarrollos.';


--
-- Name: sistemas_id_seq; Type: SEQUENCE; Schema: auth; Owner: postgres
--

CREATE SEQUENCE auth.sistemas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.sistemas_id_seq OWNER TO postgres;

--
-- Name: sistemas_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: postgres
--

ALTER SEQUENCE auth.sistemas_id_seq OWNED BY auth.sistemas.id;


--
-- Name: usuario_accesos; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.usuario_accesos (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    sistema_id integer NOT NULL,
    empresa_codigo character varying(50),
    perfil character varying(50) NOT NULL,
    permisos jsonb DEFAULT '[]'::jsonb,
    estado character varying(20) DEFAULT 'activo'::character varying,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE auth.usuario_accesos OWNER TO postgres;

--
-- Name: TABLE usuario_accesos; Type: COMMENT; Schema: auth; Owner: postgres
--

COMMENT ON TABLE auth.usuario_accesos IS 'LEGACY: reemplazada por auth.usuario_workspaces. No usar para nuevos desarrollos.';


--
-- Name: usuario_accesos_id_seq; Type: SEQUENCE; Schema: auth; Owner: postgres
--

CREATE SEQUENCE auth.usuario_accesos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.usuario_accesos_id_seq OWNER TO postgres;

--
-- Name: usuario_accesos_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: postgres
--

ALTER SEQUENCE auth.usuario_accesos_id_seq OWNED BY auth.usuario_accesos.id;


--
-- Name: usuario_workspaces; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.usuario_workspaces (
    id integer NOT NULL,
    usuario_id integer NOT NULL,
    empresa_codigo character varying(50) NOT NULL,
    cliente_destino_id integer,
    sistema_id integer NOT NULL,
    perfil_id integer NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    es_favorito boolean DEFAULT false NOT NULL,
    ultimo_uso_en timestamp without time zone,
    vigencia_desde date,
    vigencia_hasta date,
    permission_version integer DEFAULT 1 NOT NULL,
    permisos jsonb DEFAULT '{"menus": [], "actions": []}'::jsonb NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE auth.usuario_workspaces OWNER TO postgres;

--
-- Name: usuario_workspaces_id_seq; Type: SEQUENCE; Schema: auth; Owner: postgres
--

CREATE SEQUENCE auth.usuario_workspaces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.usuario_workspaces_id_seq OWNER TO postgres;

--
-- Name: usuario_workspaces_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: postgres
--

ALTER SEQUENCE auth.usuario_workspaces_id_seq OWNED BY auth.usuario_workspaces.id;


--
-- Name: usuarios; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.usuarios (
    id integer NOT NULL,
    nombres character varying(120) NOT NULL,
    apellidos character varying(120),
    email character varying(180) NOT NULL,
    password_hash text NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE auth.usuarios OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: auth; Owner: postgres
--

CREATE SEQUENCE auth.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE auth.usuarios_id_seq OWNER TO postgres;

--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: postgres
--

ALTER SEQUENCE auth.usuarios_id_seq OWNED BY auth.usuarios.id;


--
-- Name: auditoria_eventos; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.auditoria_eventos (
    id bigint NOT NULL,
    workspace_id integer,
    session_context_id uuid,
    request_id uuid,
    usuario_id integer,
    empresa_codigo character varying(50),
    sistema_codigo character varying(50),
    perfil_codigo character varying(50),
    modulo character varying(80),
    entidad character varying(120),
    entidad_id character varying(120),
    accion character varying(80) NOT NULL,
    descripcion text,
    antes jsonb,
    despues jsonb,
    ip character varying(80),
    user_agent text,
    creado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE core.auditoria_eventos OWNER TO postgres;

--
-- Name: auditoria_eventos_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

CREATE SEQUENCE core.auditoria_eventos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.auditoria_eventos_id_seq OWNER TO postgres;

--
-- Name: auditoria_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: postgres
--

ALTER SEQUENCE core.auditoria_eventos_id_seq OWNED BY core.auditoria_eventos.id;


--
-- Name: bancos; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.bancos (
    id integer NOT NULL,
    codigo character varying(30) NOT NULL,
    nombre character varying(100) NOT NULL,
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE core.bancos OWNER TO postgres;

--
-- Name: bancos_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

CREATE SEQUENCE core.bancos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.bancos_id_seq OWNER TO postgres;

--
-- Name: bancos_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: postgres
--

ALTER SEQUENCE core.bancos_id_seq OWNED BY core.bancos.id;


--
-- Name: clientes_destino_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

CREATE SEQUENCE core.clientes_destino_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.clientes_destino_id_seq OWNER TO postgres;

--
-- Name: clientes_destino; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.clientes_destino (
    id integer DEFAULT nextval('core.clientes_destino_id_seq'::regclass) NOT NULL,
    nombre_oficial character varying(250),
    abreviatura character varying(50),
    ruc character varying(20),
    ruta_windows text,
    descripcion text,
    estado boolean,
    creado_en timestamp without time zone,
    actualizado_en timestamp without time zone,
    dia_cierre_contable integer DEFAULT 11,
    dias_gracia_regularizacion integer DEFAULT 0
);


ALTER TABLE core.clientes_destino OWNER TO postgres;

--
-- Name: monedas; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.monedas (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(50) NOT NULL,
    simbolo character varying(10),
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


ALTER TABLE core.monedas OWNER TO postgres;

--
-- Name: monedas_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

CREATE SEQUENCE core.monedas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.monedas_id_seq OWNER TO postgres;

--
-- Name: monedas_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: postgres
--

ALTER SEQUENCE core.monedas_id_seq OWNED BY core.monedas.id;


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

CREATE SEQUENCE core.proveedores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.proveedores_id_seq OWNER TO postgres;

--
-- Name: proveedores; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.proveedores (
    id integer DEFAULT nextval('core.proveedores_id_seq'::regclass) NOT NULL,
    ruc character varying(11),
    razon_social character varying(250),
    direccion text,
    tipo_persona character varying(20) DEFAULT 'JURIDICA'::character varying,
    creado_en timestamp without time zone,
    actualizado_en timestamp without time zone
);


ALTER TABLE core.proveedores OWNER TO postgres;

--
-- Name: schema_migrations; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.schema_migrations (
    version character varying(50) NOT NULL,
    descripcion text,
    checksum text,
    ejecutado_en timestamp without time zone DEFAULT now() NOT NULL,
    ejecutado_por character varying(120) DEFAULT CURRENT_USER NOT NULL
);


ALTER TABLE core.schema_migrations OWNER TO postgres;

--
-- Name: sistemas; Type: TABLE; Schema: core; Owner: postgres
--

CREATE TABLE core.sistemas (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(120) NOT NULL,
    descripcion text,
    estado character varying(20) DEFAULT 'activo'::character varying NOT NULL,
    orden integer DEFAULT 0 NOT NULL,
    creado_en timestamp without time zone DEFAULT now() NOT NULL,
    actualizado_en timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE core.sistemas OWNER TO postgres;

--
-- Name: sistemas_id_seq; Type: SEQUENCE; Schema: core; Owner: postgres
--

CREATE SEQUENCE core.sistemas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE core.sistemas_id_seq OWNER TO postgres;

--
-- Name: sistemas_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: postgres
--

ALTER SEQUENCE core.sistemas_id_seq OWNED BY core.sistemas.id;


--
-- Name: asientos_documentales; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.asientos_documentales (
    id integer NOT NULL,
    cliente_abreviatura character varying(30),
    anio integer,
    mes integer,
    asiento_interno character varying(20),
    asiento_starsoft character varying(50),
    fuente_asiento character varying(30),
    estado character varying(50) DEFAULT 'activo'::character varying,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.asientos_documentales OWNER TO postgres;

--
-- Name: asientos_documentales_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.asientos_documentales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.asientos_documentales_id_seq OWNER TO postgres;

--
-- Name: asientos_documentales_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.asientos_documentales_id_seq OWNED BY documentos.asientos_documentales.id;


--
-- Name: asientos_documentos; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.asientos_documentos (
    id integer NOT NULL,
    asiento_id integer,
    documento_id integer,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.asientos_documentos OWNER TO postgres;

--
-- Name: asientos_documentos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.asientos_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.asientos_documentos_id_seq OWNER TO postgres;

--
-- Name: asientos_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.asientos_documentos_id_seq OWNED BY documentos.asientos_documentos.id;


--
-- Name: cierres_contables; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.cierres_contables (
    id bigint NOT NULL,
    empresa_codigo character varying(20) NOT NULL,
    anio integer NOT NULL,
    mes integer NOT NULL,
    estado character varying(30) DEFAULT 'abierto'::character varying,
    cerrado_por integer,
    cerrado_en timestamp without time zone,
    observacion text,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.cierres_contables OWNER TO postgres;

--
-- Name: cierres_contables_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.cierres_contables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.cierres_contables_id_seq OWNER TO postgres;

--
-- Name: cierres_contables_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.cierres_contables_id_seq OWNED BY documentos.cierres_contables.id;


--
-- Name: documento_alertas; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documento_alertas (
    id bigint NOT NULL,
    documento_id integer,
    tipo_alerta character varying(50) NOT NULL,
    estado character varying(30) DEFAULT 'activa'::character varying,
    mensaje text,
    creado_en timestamp without time zone DEFAULT now(),
    resuelto_en timestamp without time zone
);


ALTER TABLE documentos.documento_alertas OWNER TO postgres;

--
-- Name: documento_alertas_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documento_alertas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documento_alertas_id_seq OWNER TO postgres;

--
-- Name: documento_alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documento_alertas_id_seq OWNED BY documentos.documento_alertas.id;


--
-- Name: documento_eventos; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documento_eventos (
    id bigint NOT NULL,
    documento_id bigint,
    archivo_id bigint,
    tipo_evento character varying(80) NOT NULL,
    entidad_tipo character varying(80),
    entidad_id bigint,
    expediente_id bigint,
    descripcion text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    usuario_id bigint,
    origen character varying(50) DEFAULT 'sistema'::character varying NOT NULL,
    request_id uuid,
    correlation_id uuid,
    evento_version integer DEFAULT 1 NOT NULL,
    creado_en timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE documentos.documento_eventos OWNER TO postgres;

--
-- Name: documento_eventos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documento_eventos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documento_eventos_id_seq OWNER TO postgres;

--
-- Name: documento_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documento_eventos_id_seq OWNED BY documentos.documento_eventos.id;


--
-- Name: documento_relaciones; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documento_relaciones (
    id bigint NOT NULL,
    documento_origen_id integer NOT NULL,
    documento_destino_id integer NOT NULL,
    tipo_relacion character varying(50) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documento_relaciones OWNER TO postgres;

--
-- Name: documento_relaciones_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documento_relaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documento_relaciones_id_seq OWNER TO postgres;

--
-- Name: documento_relaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documento_relaciones_id_seq OWNED BY documentos.documento_relaciones.id;


--
-- Name: documentos; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos (
    id integer NOT NULL,
    cliente_abreviatura character varying(30) NOT NULL,
    anio integer,
    mes integer,
    tipo_documental character varying(30) NOT NULL,
    ruc_emisor character varying(20),
    razon_social_emisor text,
    serie character varying(30),
    numero character varying(50),
    clave_documental character varying(300),
    estado character varying(50) DEFAULT 'activo'::character varying,
    creado_en timestamp without time zone DEFAULT now(),
    fecha_emision date,
    moneda character varying(50),
    monto_total numeric(14,2),
    metadata jsonb DEFAULT '{}'::jsonb,
    periodo_anio integer,
    periodo_mes integer,
    alerta_contable character varying(50),
    observacion_contable text,
    actualizado_en timestamp without time zone DEFAULT now(),
    validado_en timestamp without time zone,
    validado_por integer
);


ALTER TABLE documentos.documentos OWNER TO postgres;

--
-- Name: documentos_archivos; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_archivos (
    id integer NOT NULL,
    documento_id integer,
    nombre_archivo text NOT NULL,
    ruta_archivo text NOT NULL,
    hash_sha256 character varying(64),
    tipo_version character varying(50),
    area_origen character varying(50),
    estado character varying(50) DEFAULT 'activo'::character varying,
    creado_en timestamp without time zone DEFAULT now(),
    origen_archivo character varying(50),
    observacion text,
    metadata jsonb DEFAULT '{}'::jsonb,
    storage_provider character varying(30),
    storage_bucket text,
    storage_key text,
    public_url text,
    version integer,
    es_version_actual boolean DEFAULT true
);


ALTER TABLE documentos.documentos_archivos OWNER TO postgres;

--
-- Name: documentos_archivos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documentos_archivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documentos_archivos_id_seq OWNER TO postgres;

--
-- Name: documentos_archivos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documentos_archivos_id_seq OWNED BY documentos.documentos_archivos.id;


--
-- Name: documentos_factura; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_factura (
    documento_id integer NOT NULL,
    ruc_emisor character varying(20),
    razon_social_emisor text,
    serie character varying(30),
    numero character varying(50),
    fecha_emision date,
    moneda character varying(20),
    total numeric(14,2),
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_factura OWNER TO postgres;

--
-- Name: documentos_guia_remision; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_guia_remision (
    documento_id integer NOT NULL,
    ruc_emisor character varying(20),
    razon_social_emisor text,
    serie character varying(30),
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_guia_remision OWNER TO postgres;

--
-- Name: documentos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documentos_id_seq OWNER TO postgres;

--
-- Name: documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documentos_id_seq OWNED BY documentos.documentos.id;


--
-- Name: documentos_nota_ingreso; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_nota_ingreso (
    documento_id integer NOT NULL,
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_nota_ingreso OWNER TO postgres;

--
-- Name: documentos_oc; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_oc (
    documento_id integer NOT NULL,
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_oc OWNER TO postgres;

--
-- Name: documentos_origenes; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_origenes (
    id integer NOT NULL,
    documento_id integer,
    tabla_origen character varying(50) NOT NULL,
    registro_origen_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_origenes OWNER TO postgres;

--
-- Name: documentos_origenes_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documentos_origenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documentos_origenes_id_seq OWNER TO postgres;

--
-- Name: documentos_origenes_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documentos_origenes_id_seq OWNED BY documentos.documentos_origenes.id;


--
-- Name: documentos_os; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_os (
    documento_id integer NOT NULL,
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_os OWNER TO postgres;

--
-- Name: documentos_otro; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_otro (
    documento_id integer NOT NULL,
    descripcion text,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_otro OWNER TO postgres;

--
-- Name: documentos_pago_detraccion; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_pago_detraccion (
    documento_id integer NOT NULL,
    ruc_emisor character varying(20),
    serie character varying(30),
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now(),
    banco_abreviatura character varying(30),
    codigo_operacion character varying(100)
);


ALTER TABLE documentos.documentos_pago_detraccion OWNER TO postgres;

--
-- Name: documentos_pago_transferencia; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_pago_transferencia (
    documento_id integer NOT NULL,
    banco_abreviatura character varying(30),
    codigo_operacion character varying(100),
    creado_en timestamp without time zone DEFAULT now(),
    monto numeric(14,2),
    fecha_operacion date
);


ALTER TABLE documentos.documentos_pago_transferencia OWNER TO postgres;

--
-- Name: documentos_recibo_honorario; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.documentos_recibo_honorario (
    id integer NOT NULL,
    documento_id integer NOT NULL,
    serie character varying(20),
    numero character varying(50),
    ruc_emisor character varying(20),
    razon_social_emisor text,
    fecha_emision date,
    moneda character varying(50),
    descripcion_servicio text,
    monto_total numeric(14,2),
    retencion numeric(14,2),
    monto_neto numeric(14,2),
    observaciones text,
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.documentos_recibo_honorario OWNER TO postgres;

--
-- Name: documentos_recibo_honorario_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.documentos_recibo_honorario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.documentos_recibo_honorario_id_seq OWNER TO postgres;

--
-- Name: documentos_recibo_honorario_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.documentos_recibo_honorario_id_seq OWNED BY documentos.documentos_recibo_honorario.id;


--
-- Name: expediente_documentos; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.expediente_documentos (
    expediente_id bigint NOT NULL,
    documento_id integer NOT NULL,
    tipo_relacion character varying(50),
    creado_en timestamp without time zone DEFAULT now(),
    es_principal boolean DEFAULT false,
    orden integer DEFAULT 0
);


ALTER TABLE documentos.expediente_documentos OWNER TO postgres;

--
-- Name: expedientes; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.expedientes (
    id bigint NOT NULL,
    empresa_codigo character varying(20) NOT NULL,
    descripcion text,
    estado character varying(30) DEFAULT 'abierto'::character varying,
    metadata jsonb DEFAULT '{}'::jsonb,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now(),
    codigo_expediente character varying(50),
    cliente_destino_id integer NOT NULL
);


ALTER TABLE documentos.expedientes OWNER TO postgres;

--
-- Name: expedientes_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.expedientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.expedientes_id_seq OWNER TO postgres;

--
-- Name: expedientes_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.expedientes_id_seq OWNED BY documentos.expedientes.id;


--
-- Name: grupo_documentos; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.grupo_documentos (
    id integer NOT NULL,
    grupo_id integer,
    documento_id integer,
    tipo_relacion character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


ALTER TABLE documentos.grupo_documentos OWNER TO postgres;

--
-- Name: grupo_documentos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.grupo_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.grupo_documentos_id_seq OWNER TO postgres;

--
-- Name: grupo_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.grupo_documentos_id_seq OWNED BY documentos.grupo_documentos.id;


--
-- Name: grupos_documentales; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.grupos_documentales (
    id integer NOT NULL,
    cliente_destino_id integer,
    asiento_contable character varying(20),
    clave_grupo character varying(200),
    tipo_grupo character varying(50),
    orden_compra character varying(50),
    estado character varying(50) DEFAULT 'pendiente'::character varying,
    creado_en timestamp without time zone DEFAULT now(),
    actualizado_en timestamp without time zone DEFAULT now(),
    asiento_id integer,
    cliente_abreviatura character varying(30),
    anio integer,
    mes integer,
    orden_servicio character varying(50),
    area_origen character varying(50),
    origen_grupo character varying(50),
    metadata jsonb DEFAULT '{}'::jsonb,
    origen_migracion character varying(50) DEFAULT 'legacy_mvp'::character varying
);


ALTER TABLE documentos.grupos_documentales OWNER TO postgres;

--
-- Name: grupos_documentales_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.grupos_documentales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.grupos_documentales_id_seq OWNER TO postgres;

--
-- Name: grupos_documentales_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.grupos_documentales_id_seq OWNED BY documentos.grupos_documentales.id;


--
-- Name: ocr_resultados; Type: TABLE; Schema: documentos; Owner: postgres
--

CREATE TABLE documentos.ocr_resultados (
    id integer NOT NULL,
    archivo_id integer,
    documento_id integer,
    tipo_propuesto character varying(30),
    estado character varying(50) DEFAULT 'pendiente_validacion'::character varying,
    confidence numeric(5,2),
    clave_documental character varying(300),
    metadata jsonb DEFAULT '{}'::jsonb,
    creado_en timestamp without time zone DEFAULT now(),
    validado_en timestamp without time zone,
    validado_por integer,
    vinculado_en timestamp without time zone,
    expediente_id bigint
);


ALTER TABLE documentos.ocr_resultados OWNER TO postgres;

--
-- Name: ocr_resultados_id_seq; Type: SEQUENCE; Schema: documentos; Owner: postgres
--

CREATE SEQUENCE documentos.ocr_resultados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE documentos.ocr_resultados_id_seq OWNER TO postgres;

--
-- Name: ocr_resultados_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: postgres
--

ALTER SEQUENCE documentos.ocr_resultados_id_seq OWNED BY documentos.ocr_resultados.id;


--
-- Name: perfiles id; Type: DEFAULT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.perfiles ALTER COLUMN id SET DEFAULT nextval('auth.perfiles_id_seq'::regclass);


--
-- Name: sistemas id; Type: DEFAULT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.sistemas ALTER COLUMN id SET DEFAULT nextval('auth.sistemas_id_seq'::regclass);


--
-- Name: usuario_accesos id; Type: DEFAULT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_accesos ALTER COLUMN id SET DEFAULT nextval('auth.usuario_accesos_id_seq'::regclass);


--
-- Name: usuario_workspaces id; Type: DEFAULT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_workspaces ALTER COLUMN id SET DEFAULT nextval('auth.usuario_workspaces_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuarios ALTER COLUMN id SET DEFAULT nextval('auth.usuarios_id_seq'::regclass);


--
-- Name: auditoria_eventos id; Type: DEFAULT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.auditoria_eventos ALTER COLUMN id SET DEFAULT nextval('core.auditoria_eventos_id_seq'::regclass);


--
-- Name: bancos id; Type: DEFAULT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.bancos ALTER COLUMN id SET DEFAULT nextval('core.bancos_id_seq'::regclass);


--
-- Name: monedas id; Type: DEFAULT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.monedas ALTER COLUMN id SET DEFAULT nextval('core.monedas_id_seq'::regclass);


--
-- Name: sistemas id; Type: DEFAULT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.sistemas ALTER COLUMN id SET DEFAULT nextval('core.sistemas_id_seq'::regclass);


--
-- Name: asientos_documentales id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentales ALTER COLUMN id SET DEFAULT nextval('documentos.asientos_documentales_id_seq'::regclass);


--
-- Name: asientos_documentos id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentos ALTER COLUMN id SET DEFAULT nextval('documentos.asientos_documentos_id_seq'::regclass);


--
-- Name: cierres_contables id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.cierres_contables ALTER COLUMN id SET DEFAULT nextval('documentos.cierres_contables_id_seq'::regclass);


--
-- Name: documento_alertas id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_alertas ALTER COLUMN id SET DEFAULT nextval('documentos.documento_alertas_id_seq'::regclass);


--
-- Name: documento_eventos id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_eventos ALTER COLUMN id SET DEFAULT nextval('documentos.documento_eventos_id_seq'::regclass);


--
-- Name: documento_relaciones id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_relaciones ALTER COLUMN id SET DEFAULT nextval('documentos.documento_relaciones_id_seq'::regclass);


--
-- Name: documentos id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_id_seq'::regclass);


--
-- Name: documentos_archivos id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_archivos ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_archivos_id_seq'::regclass);


--
-- Name: documentos_origenes id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_origenes ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_origenes_id_seq'::regclass);


--
-- Name: documentos_recibo_honorario id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_recibo_honorario ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_recibo_honorario_id_seq'::regclass);


--
-- Name: expedientes id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.expedientes ALTER COLUMN id SET DEFAULT nextval('documentos.expedientes_id_seq'::regclass);


--
-- Name: grupo_documentos id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupo_documentos ALTER COLUMN id SET DEFAULT nextval('documentos.grupo_documentos_id_seq'::regclass);


--
-- Name: grupos_documentales id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupos_documentales ALTER COLUMN id SET DEFAULT nextval('documentos.grupos_documentales_id_seq'::regclass);


--
-- Name: ocr_resultados id; Type: DEFAULT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.ocr_resultados ALTER COLUMN id SET DEFAULT nextval('documentos.ocr_resultados_id_seq'::regclass);


--
-- Data for Name: perfiles; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.perfiles (id, sistema_id, codigo, nombre, descripcion, estado, creado_en, actualizado_en) FROM stdin;
1	1	admin	Administrador	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
2	1	compras	Compras	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
3	1	almacen	Almacén	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
4	1	finanzas	Finanzas	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
5	1	contabilidad	Contabilidad	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
6	1	rrhh	RRHH	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
7	1	consulta	Consulta	\N	activo	2026-06-28 03:17:26.158964	2026-06-28 03:17:26.158964
\.


--
-- Data for Name: sistemas; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.sistemas (id, codigo, nombre, estado) FROM stdin;
1	documentos	Gestión Documental	activo
2	requerimientos	Rendición de Requerimientos	activo
3	caja_chica	Rendición de Caja Chica	activo
4	proyectos	Gestión de Proyectos	activo
5	finanzas	Finanzas	activo
6	logistica	Logística	activo
7	compras	Compras	activo
\.


--
-- Data for Name: usuario_accesos; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.usuario_accesos (id, usuario_id, sistema_id, empresa_codigo, perfil, permisos, estado, creado_en) FROM stdin;
1	1	1	BBTI	admin	["documentos.ver", "documentos.subir", "documentos.validar", "documentos.vincular_oc", "documentos.vincular_os", "documentos.eliminar", "proyectos.ver", "caja_chica.ver", "requerimientos.ver", "finanzas.ver", "logistica.ver", "compras.ver"]	activo	2026-06-02 20:29:10.399247
2	2	1	BBTI	almacen	["documentos.ver", "documentos.subir", "documentos.validar", "almacen.ver"]	activo	2026-07-06 23:27:31.014103
3	3	1	BBTI	contabilidad	["documentos.ver", "revision_contable.ver", "alertas.crear", "alertas.resolver"]	activo	2026-07-06 23:27:31.014103
4	4	1	BBTI	compras	["documentos.ver", "documentos.subir", "documentos.validar", "compras.ver"]	activo	2026-07-06 23:27:31.014103
5	5	1	BBTI	finanzas	["documentos.ver", "documentos.subir", "documentos.validar", "finanzas.ver"]	activo	2026-07-06 23:27:31.014103
\.


--
-- Data for Name: usuario_workspaces; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.usuario_workspaces (id, usuario_id, empresa_codigo, cliente_destino_id, sistema_id, perfil_id, estado, es_favorito, ultimo_uso_en, vigencia_desde, vigencia_hasta, permission_version, permisos, creado_en, actualizado_en) FROM stdin;
2	1	BBTI	2	1	5	activo	f	2026-06-29 15:41:40.042125	2026-06-29	\N	1	{"menus": ["documentos", "revision_contable"], "actions": ["alertas.crear", "alertas.resolver"]}	2026-06-29 00:58:20.933702	2026-07-07 14:11:33.946127
1	1	BBTI	2	1	1	activo	t	2026-07-07 14:11:33.949458	\N	\N	1	{"menus": ["documentos", "compras", "almacen", "finanzas", "revision_contable", "alertas", "proyectos", "caja_chica", "requerimientos"], "actions": ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar", "alertas.crear", "alertas.resolver"]}	2026-06-28 03:17:26.212754	2026-07-07 14:11:33.949458
3	2	BBTI	2	1	3	activo	t	2026-07-07 13:47:16.951978	\N	\N	1	{"menus": ["almacen"], "actions": ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar"]}	2026-07-06 23:30:57.254717	2026-07-07 13:47:16.951978
6	5	BBTI	2	1	4	activo	t	2026-07-07 13:48:59.151855	\N	\N	1	{"menus": ["finanzas"], "actions": ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar"]}	2026-07-06 23:30:57.254717	2026-07-07 13:48:59.151855
4	4	BBTI	2	1	2	activo	t	2026-07-07 15:09:44.043911	\N	\N	1	{"menus": ["compras"], "actions": ["documentos.subir", "documentos.validar", "documentos.editar_ocr", "documentos.confirmar_ocr", "documentos.rechazar_ocr", "documentos.vincular_expediente", "ocr.confirmar", "ocr.rechazar"]}	2026-07-06 23:30:57.254717	2026-07-07 15:09:44.043911
5	3	BBTI	2	1	5	activo	t	2026-07-07 15:26:09.608807	\N	\N	1	{"menus": ["revision_contable", "alertas"], "actions": ["documentos.ver", "revision_contable.ver", "alertas.crear", "alertas.resolver"]}	2026-07-06 23:30:57.254717	2026-07-07 15:26:09.608807
\.


--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: auth; Owner: postgres
--

COPY auth.usuarios (id, nombres, apellidos, email, password_hash, estado, creado_en, actualizado_en) FROM stdin;
2	Almacén	Demo	almacen@documental.local	$2b$12$t5p.Z8QPRUWdr9EpZpThR.DPnU9iFGo2d6/e.ctM.oJRm3bM9upSS	activo	2026-07-06 23:27:31.014103	2026-07-07 13:47:16.921283
5	Finanzas	Demo	finanzas@documental.local	$2b$12$t5p.Z8QPRUWdr9EpZpThR.DPnU9iFGo2d6/e.ctM.oJRm3bM9upSS	activo	2026-07-06 23:27:31.014103	2026-07-07 13:48:59.121162
1	Administrador	Sistema	admin@documental.local	$2b$12$t5p.Z8QPRUWdr9EpZpThR.DPnU9iFGo2d6/e.ctM.oJRm3bM9upSS	activo	2026-06-02 20:28:46.902483	2026-07-07 14:11:33.919322
4	Compras	Demo	compras@documental.local	$2b$12$t5p.Z8QPRUWdr9EpZpThR.DPnU9iFGo2d6/e.ctM.oJRm3bM9upSS	activo	2026-07-06 23:27:31.014103	2026-07-07 15:09:44.021659
3	Contabilidad	Demo	contabilidad@documental.local	$2b$12$t5p.Z8QPRUWdr9EpZpThR.DPnU9iFGo2d6/e.ctM.oJRm3bM9upSS	activo	2026-07-06 23:27:31.014103	2026-07-07 15:26:09.553665
\.


--
-- Data for Name: auditoria_eventos; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.auditoria_eventos (id, workspace_id, session_context_id, request_id, usuario_id, empresa_codigo, sistema_codigo, perfil_codigo, modulo, entidad, entidad_id, accion, descripcion, antes, despues, ip, user_agent, creado_en) FROM stdin;
1	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-28 03:25:51.12854
2	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 03:27:18.822641
3	1	cb677763-e837-4716-9cf7-908220c680aa	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 03:27:54.715781
4	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-28 03:29:56.874979
5	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 03:29:56.894256
6	1	6f5e5340-a7c8-49a4-a1f1-a91392fe06fd	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 03:29:56.920201
7	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-28 17:59:20.370911
8	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 17:59:20.393863
9	1	9d9bfbf7-1b06-4292-8b69-e6f07e4a459c	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 17:59:20.420279
10	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-28 18:17:47.364489
11	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:35:38.270059
12	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:35:38.287156
13	1	b17de496-3961-4e53-8235-6fd5e2e60408	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 18:35:46.51114
14	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:37:13.193173
15	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:37:13.203268
16	1	753f1848-44b7-4939-b07d-d40a584af27f	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 18:37:18.117444
17	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:37:27.751007
18	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:37:27.787043
19	1	983e03ba-6d9b-493b-9388-5db92ea07b76	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 18:37:35.602706
20	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-28 18:38:33.370521
21	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:38:33.38329
22	1	c7ab0782-b078-4e9e-bc43-501225111927	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-28 18:38:33.39756
23	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:38:39.189649
24	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-28 18:38:39.200453
25	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 00:43:18.969558
26	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 00:44:14.222564
27	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 00:46:58.816089
28	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 01:52:37.082492
29	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 01:52:37.106906
30	2	c5958209-087f-473e-96a9-0a4cf61c465d	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 01:56:40.817231
31	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 01:57:08.103174
32	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:02:25.051647
33	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:03:18.393009
34	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 02:06:16.092997
35	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:06:16.114074
36	2	69b11f30-683c-4212-841e-ed129baa49ac	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:06:24.27566
37	2	cee2dfd5-5da5-4bdd-bc84-85515db15a59	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:06:34.657293
38	2	c4e16e07-dbec-439d-9465-e7b31b1f12fd	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:06:59.499068
39	2	65bd7c88-2cdd-4ea6-97fb-0dc8750252e9	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:07:08.79316
40	2	31c37f59-d5b4-43e0-8c3a-964563a3ba5d	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:07:15.813176
41	2	6609cfac-be3d-411d-a111-92a3241d56cf	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:07:28.340571
42	2	6ad44198-4d2d-43c1-8b44-9f9676f0c85a	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:07:42.00561
43	2	bd0f58f0-acd9-4462-a1cf-fc86a7fd628a	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:10:07.928603
44	2	846c5d61-4b7e-4dd5-9a39-f3c372e04cf6	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:10:36.181468
45	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:11:38.969686
46	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 02:16:32.516225
47	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:16:32.529686
48	1	eb2f5dd3-8ef2-4d06-8b35-61ce65385777	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-29 02:16:32.550509
49	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 02:21:30.850796
50	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:21:30.864781
51	1	ff233ba8-3b73-4d75-97e3-6a598028513c	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-29 02:21:30.882204
52	2	b9827fa0-aed0-43e0-9742-0f26e69ff619	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 02:30:46.22715
53	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:33:56.804841
54	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 02:33:56.822605
55	1	166c75af-65ca-46b7-9a13-d03628b3a533	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-29 02:33:59.732981
56	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 03:11:15.986293
57	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 03:16:16.773645
58	2	79a457f9-1581-4f50-b81a-c355bbe6cd60	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 03:16:16.821889
59	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 03:32:00.729161
60	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 03:34:40.548623
61	1	f38f557b-0a45-4b5d-ae7d-0f2b1deb246e	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-29 03:34:40.570466
62	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 15:39:45.824298
63	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 15:40:21.595507
64	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-29 15:40:21.614392
65	1	b4a48189-88f8-4bcf-96da-5da75087d983	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-29 15:40:21.646513
66	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 15:41:40.02509
67	2	5a1ef1ea-4075-4b8a-af6d-8f08f6ece466	\N	1	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	2	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-06-29 15:41:40.044131
68	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 15:42:24.281942
69	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 15:43:23.759999
70	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-29 15:44:16.10113
71	1	ac145b4f-5415-49e2-89eb-7fa60b28b3f5	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-29 15:44:23.137229
72	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-30 17:17:33.467498
73	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-06-30 17:17:44.031975
74	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-06-30 17:17:44.059169
75	1	c027932f-27e7-44e4-ad65-513dbbeaa5a7	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-06-30 17:17:44.116976
76	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_FAIL	Contraseña inválida	\N	\N	\N	\N	2026-07-06 17:08:26.047358
77	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_FAIL	Contraseña inválida	\N	\N	\N	\N	2026-07-06 17:08:36.467542
78	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:13:17.132902
79	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:23:32.041796
80	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:32:11.178675
81	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-06 17:32:11.203784
82	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:35:28.308227
83	1	d8fcc284-70ab-4f89-b263-fe716b75bcf4	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:35:28.333237
84	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:37:06.592451
85	1	4d51c671-1ea4-48cd-b08e-d16dfff39697	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:37:06.616278
86	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:41:12.18911
87	1	afda1ee5-85f3-4382-81c1-454a628aa616	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:41:12.210633
88	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:44:47.724055
89	1	ee68ebfb-a05c-4b62-9a15-979572a3feaf	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:44:47.748785
90	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:45:13.707741
91	1	ca6c9b94-fcfd-42d6-89d5-23b369fed43d	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:45:13.727999
92	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:48:59.770773
93	1	1be90996-e358-447a-9c4c-ddb9463f0732	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:48:59.7904
94	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 17:55:39.911212
95	1	82799b05-5ec1-4e07-b91a-869842f19c23	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 17:55:39.946663
96	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 18:15:00.320242
97	1	ed4e7be3-7991-49b9-a788-acd1b2e625c7	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 18:15:00.348638
98	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 18:19:11.015418
99	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-06 18:19:11.032961
100	1	87dc8d46-0e5f-430c-ae6e-cd8a5729febe	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 18:19:11.058519
101	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 19:03:52.324114
102	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-06 19:03:52.33761
103	1	ee8c5927-a151-4692-8443-6d2f47ac3266	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 19:03:52.35807
104	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 19:24:16.702813
105	1	cd06e111-6c3e-43d5-a956-a09fb3894168	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 19:24:16.724949
106	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 19:30:47.42442
107	1	e1b285ef-e115-420c-878e-fbdf502dc99b	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 19:30:47.446374
108	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 19:41:10.148126
109	1	bf75e9b3-b4bb-4c91-8ddc-1439a42743ad	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 19:41:10.170761
110	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 19:48:56.118088
111	1	61ca086e-e075-4d8c-a076-93c756d9af18	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 19:48:56.141753
112	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-06 22:02:36.618364
113	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 22:12:52.706991
114	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-06 22:12:52.724714
115	1	fb92f50c-c8c9-494c-90ab-738e499425f1	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-06 22:12:52.754453
116	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 23:39:38.657695
117	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 23:39:45.958411
118	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 23:39:54.070396
119	4	d5613b0b-968c-4a1f-b62d-f9c7565c7a27	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-06 23:39:54.123793
120	\N	\N	\N	2	\N	\N	\N	auth	auth.usuarios	2	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 23:41:06.516167
121	3	37f52d9e-657f-4e46-8b69-185f108164fd	\N	2	BBTI	DOCUMENTAL	almacen	auth	auth.usuario_workspaces	3	SELECT_WORKSPACE	Workspace seleccionado: BBTI · almacen	\N	\N	\N	\N	2026-07-06 23:41:06.565316
122	\N	\N	\N	3	\N	\N	\N	auth	auth.usuarios	3	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 23:41:12.247955
123	5	5afbd24e-0f5c-434c-a31c-cf34c1942829	\N	3	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	5	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-07-06 23:41:12.268453
124	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-06 23:41:17.02305
125	6	5b6b9e10-1260-4ac4-80ce-95d79fe1303b	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-06 23:41:17.087534
126	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:34:47.822335
127	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:34:47.872387
128	4	bdc3eb74-824e-488a-a4d4-40a31355ef86	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 02:34:47.909206
129	\N	\N	\N	2	\N	\N	\N	auth	auth.usuarios	2	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:39:04.136198
130	\N	\N	\N	2	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:39:04.147189
131	3	5a6b5a36-70ee-4362-b96e-a3fce2def440	\N	2	BBTI	DOCUMENTAL	almacen	auth	auth.usuario_workspaces	3	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · almacen	\N	\N	\N	\N	2026-07-07 02:39:04.163002
132	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_FAIL	Contraseña inválida	\N	\N	\N	\N	2026-07-07 02:41:57.0561
133	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:42:03.95118
134	\N	\N	\N	5	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:42:03.962315
135	6	e1bd1f9c-e7b1-4df2-bac2-5d8f75edda4e	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-07 02:42:03.978702
136	\N	\N	\N	\N	\N	\N	\N	auth	auth.usuarios	\N	LOGIN_FAIL	Intento de login fallido para contablidad@documental.local	\N	\N	\N	\N	2026-07-07 02:45:07.683962
137	\N	\N	\N	3	\N	\N	\N	auth	auth.usuarios	3	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:45:27.267865
138	\N	\N	\N	3	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:45:27.282559
139	5	51c7f18e-eae5-4578-819d-df65b64fca24	\N	3	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	5	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-07-07 02:45:27.299822
140	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_FAIL	Contraseña inválida	\N	\N	\N	\N	2026-07-07 02:48:33.026588
141	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:48:45.565952
142	\N	\N	\N	5	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:48:45.60634
143	6	048f5d13-60d6-4f7f-aedc-ca6d25225213	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-07 02:48:45.632729
144	\N	\N	\N	2	\N	\N	\N	auth	auth.usuarios	2	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:49:20.51512
145	\N	\N	\N	2	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:49:20.526158
146	3	a834dd72-5beb-4e0b-a62a-313bfdd6ac7c	\N	2	BBTI	DOCUMENTAL	almacen	auth	auth.usuario_workspaces	3	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · almacen	\N	\N	\N	\N	2026-07-07 02:49:20.542771
147	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_FAIL	Contraseña inválida	\N	\N	\N	\N	2026-07-07 02:50:37.599487
148	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 02:50:44.255966
149	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 02:50:44.267602
150	4	04327dd7-3c0a-4405-b55e-f7902578bdf0	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 02:50:44.282246
151	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:02:49.332873
152	\N	\N	\N	5	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:02:49.344031
153	6	49429d8a-b5e6-465a-9c92-bc0ff8bbbce5	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-07 03:02:49.361013
154	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:05:20.572397
155	\N	\N	\N	5	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:05:20.582998
156	6	3dea687c-4ab6-4845-a690-7882a34b9e69	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-07 03:05:20.597613
157	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:19:08.053294
158	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:19:08.068734
159	4	d3aebb60-d80f-4c39-b4b4-4f3ed588b4af	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:19:08.091429
160	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:21:30.783527
161	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:21:30.807697
162	4	1b9b8579-de24-471c-ae25-8676e6fd84f0	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:21:30.842464
163	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:27:02.20871
164	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:27:02.223619
165	4	38ec36c2-7d11-421d-8bb8-b8a98d8da597	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:27:02.241114
166	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:35:32.941467
167	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:35:32.955474
168	4	3d887cf6-9e68-4af3-afcd-1e884ef51df2	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:35:32.981197
169	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:46:15.282272
170	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:46:15.307543
171	4	5ef4497e-929b-486c-858c-4690f4b5500c	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:46:15.325089
172	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:47:56.770287
173	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:47:56.786443
174	4	ae897879-d768-46d2-9ffb-a993b8e63f79	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:47:56.805687
175	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:57:36.89169
176	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:57:36.90431
177	4	a4426ce5-57f3-4252-abb2-c5239b0f5ee9	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:57:36.923352
178	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 03:58:09.947783
179	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 03:58:10.15783
180	4	a5ab5621-5182-41a3-a738-c6df9bc0eb63	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 03:58:10.207069
181	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 04:09:19.796009
182	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 04:17:16.640973
183	4	2295bb68-0895-42bd-966d-2b30db5a1fd2	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 04:17:16.69429
184	\N	\N	\N	2	\N	\N	\N	auth	auth.usuarios	2	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 04:45:43.599187
185	\N	\N	\N	2	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 04:45:43.611882
186	3	a05bba88-4c98-4861-aaec-e4c33cbf25cd	\N	2	BBTI	DOCUMENTAL	almacen	auth	auth.usuario_workspaces	3	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · almacen	\N	\N	\N	\N	2026-07-07 04:45:43.629059
187	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 04:46:11.883923
188	\N	\N	\N	5	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 04:46:11.89499
189	6	3a4282b9-0a23-4037-ad43-3f47e9bc3e06	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-07 04:46:11.91011
190	\N	\N	\N	3	\N	\N	\N	auth	auth.usuarios	3	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 04:46:50.389439
191	\N	\N	\N	3	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 04:46:50.400691
192	5	02d7a56d-9d4b-4ee8-9f2a-c39ed64776fa	\N	3	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	5	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-07-07 04:46:50.417992
193	\N	\N	\N	3	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 04:48:16.808664
194	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 13:32:54.423703
195	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 13:32:54.438427
196	1	09022300-592a-4ee4-8ad2-2ba9d1ad8c5c	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-07 13:32:54.456759
197	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 13:44:48.06466
198	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 13:44:48.082816
199	4	3061d541-62f8-4b63-87a2-8789e4d56b58	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 13:44:48.124565
200	\N	\N	\N	2	\N	\N	\N	auth	auth.usuarios	2	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 13:47:16.923954
201	\N	\N	\N	2	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 13:47:16.935477
202	3	33741d8f-7631-4026-9921-ef87dd9ae1d8	\N	2	BBTI	DOCUMENTAL	almacen	auth	auth.usuario_workspaces	3	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · almacen	\N	\N	\N	\N	2026-07-07 13:47:16.953777
203	\N	\N	\N	5	\N	\N	\N	auth	auth.usuarios	5	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 13:48:59.123324
204	\N	\N	\N	5	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 13:48:59.134525
205	6	a42dfa7e-fbd4-4643-8ff1-14d3d7774b22	\N	5	BBTI	DOCUMENTAL	finanzas	auth	auth.usuario_workspaces	6	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · finanzas	\N	\N	\N	\N	2026-07-07 13:48:59.153377
206	\N	\N	\N	\N	\N	\N	\N	auth	auth.usuarios	\N	LOGIN_FAIL	Intento de login fallido para contablidad@documental.local	\N	\N	\N	\N	2026-07-07 13:50:06.717993
207	\N	\N	\N	\N	\N	\N	\N	auth	auth.usuarios	\N	LOGIN_FAIL	Intento de login fallido para contablidad@documental.local	\N	\N	\N	\N	2026-07-07 13:50:16.052931
208	\N	\N	\N	3	\N	\N	\N	auth	auth.usuarios	3	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 13:50:33.33264
209	\N	\N	\N	3	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 13:50:33.34443
210	5	d168f42c-d208-421d-91b4-7c5fac64e6e0	\N	3	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	5	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-07-07 13:50:33.35971
211	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 13:54:46.32012
212	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 13:54:46.330971
213	4	96e5f0ac-eaae-4bd7-a23c-5c3eff30f16e	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 13:54:46.347732
214	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 14:05:03.179785
215	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 14:07:23.896233
216	1	da2c1048-e1ae-45a9-a887-990e49f8d1b9	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-07 14:08:12.972609
217	1	da2c1048-e1ae-45a9-a887-990e49f8d1b9	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuarios	\N	ADMIN_LIST_USUARIOS	Consulta administrativa de usuarios	\N	\N	\N	\N	2026-07-07 14:08:55.575963
218	1	da2c1048-e1ae-45a9-a887-990e49f8d1b9	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.perfiles	\N	ADMIN_LIST_PERFILES	Consulta administrativa de perfiles	\N	\N	\N	\N	2026-07-07 14:09:02.97749
219	1	da2c1048-e1ae-45a9-a887-990e49f8d1b9	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	\N	ADMIN_LIST_WORKSPACES	Consulta administrativa de workspaces	\N	\N	\N	\N	2026-07-07 14:09:08.726157
220	\N	\N	\N	4	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 14:11:20.574311
221	\N	\N	\N	1	\N	\N	\N	auth	auth.usuarios	1	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 14:11:33.921697
222	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 14:11:33.933213
223	1	e20cb853-7047-455f-a3e3-25801128601e	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	1	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · admin	\N	\N	\N	\N	2026-07-07 14:11:33.95132
224	1	e20cb853-7047-455f-a3e3-25801128601e	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuario_workspaces	\N	ADMIN_LIST_WORKSPACES	Consulta administrativa de workspaces	\N	\N	\N	\N	2026-07-07 14:11:37.354085
225	1	e20cb853-7047-455f-a3e3-25801128601e	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.perfiles	\N	ADMIN_LIST_PERFILES	Consulta administrativa de perfiles	\N	\N	\N	\N	2026-07-07 14:11:37.381143
226	1	e20cb853-7047-455f-a3e3-25801128601e	\N	1	BBTI	DOCUMENTAL	admin	auth	auth.usuarios	\N	ADMIN_LIST_USUARIOS	Consulta administrativa de usuarios	\N	\N	\N	\N	2026-07-07 14:11:37.381385
227	\N	\N	\N	3	\N	\N	\N	auth	auth.usuarios	3	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 15:02:17.925212
228	5	0a7d50f4-261e-4efe-83c5-3f559ba3f40e	\N	3	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	5	SELECT_WORKSPACE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-07-07 15:02:27.211694
229	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 15:08:32.848057
230	4	b841e36c-4033-4d2d-a718-6fb5ec497e55	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 15:08:32.871228
231	\N	\N	\N	4	\N	\N	\N	auth	auth.usuarios	4	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 15:09:44.024079
232	4	8e19bff5-23d7-4605-a713-d0b619bf962a	\N	4	BBTI	DOCUMENTAL	compras	auth	auth.usuario_workspaces	4	SELECT_WORKSPACE	Workspace seleccionado: BBTI · compras	\N	\N	\N	\N	2026-07-07 15:09:44.045793
233	\N	\N	\N	1	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 15:25:17.655573
234	\N	\N	\N	\N	\N	\N	\N	auth	auth.usuarios	\N	LOGIN_FAIL	Intento de login fallido para contablidad@documental.local	\N	\N	\N	\N	2026-07-07 15:25:58.107367
235	\N	\N	\N	3	\N	\N	\N	auth	auth.usuarios	3	LOGIN_OK	Login correcto	\N	\N	\N	\N	2026-07-07 15:26:09.559188
236	\N	\N	\N	3	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 15:26:09.574526
237	5	91ac7993-2cde-4e74-a4cd-d4830d71ec06	\N	3	BBTI	DOCUMENTAL	contabilidad	auth	auth.usuario_workspaces	5	SELECT_WORKSPACE_FAVORITE	Workspace seleccionado: BBTI · contabilidad	\N	\N	\N	\N	2026-07-07 15:26:09.613552
238	\N	\N	\N	3	\N	\N	\N	auth	auth.usuario_workspaces	\N	GET_WORKSPACES	Consulta de espacios de trabajo disponibles	\N	\N	\N	\N	2026-07-07 15:45:30.816447
\.


--
-- Data for Name: bancos; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.bancos (id, codigo, nombre, activo, orden, creado_en, actualizado_en) FROM stdin;
1	BANCO_NACION	BANCO DE LA NACION	t	1	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
2	INTERBANK	INTERBANK	t	2	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
3	BCP	BCP	t	3	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
4	BBVA	BBVA	t	4	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
5	SCOTIABANK	SCOTIABANK	t	5	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
6	YAPE	YAPE	t	6	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
7	PLIN	PLIN	t	7	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
8	OTRO	OTRO	t	99	2026-06-26 23:25:05.800266	2026-06-26 23:25:05.800266
\.


--
-- Data for Name: clientes_destino; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.clientes_destino (id, nombre_oficial, abreviatura, ruc, ruta_windows, descripcion, estado, creado_en, actualizado_en, dia_cierre_contable, dias_gracia_regularizacion) FROM stdin;
1	BB TECNOLOGIA INDUSTRIAL S.A.C.	BBTEC	20299922821	\\\\servidor\\documentos\\BB TECNOLOGIA INDUSTRIAL SAC	Empresa destino	t	2026-05-04 12:22:32.986575	2026-05-04 12:22:32.986575	11	0
3	CONSORCIO CIMA ENERGY	CIMA	20613521004	\\\\servidor\\documentos\\CONSORCIO CIMA ENERGY	Consorcio	t	2026-05-04 12:22:32.986575	2026-05-04 12:22:32.986575	11	0
4	CONSORCIO ILUMINACION TARMA 2025	TARMA	20614307197	\\\\servidor\\documentos\\CONSORCIO ILUMINACION TARMA 2025	Consorcio	t	2026-05-04 12:22:32.986575	2026-05-04 12:22:32.986575	11	0
5	CONSORCIO HUANCAVELICA	HUANCA	20612122416	\\\\servidor\\documentos\\CONSORCIO HUANCAVELICA	Consorcio	t	2026-05-04 12:22:32.986575	2026-05-04 12:22:32.986575	11	0
6	Consorcio Kimbiri	KIMBIRI	20609856140	KIMBIRI	CONSORCIO	t	2026-05-04 13:26:13.185296	2026-05-04 13:26:13.185296	11	0
2	BBTI S.A.C.	BBTI	20565747356	\\\\servidor\\documentos\\BBTI SAC	Empresa destino	t	2026-05-04 12:22:32.986575	2026-05-04 12:22:32.986575	11	0
\.


--
-- Data for Name: monedas; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.monedas (id, codigo, nombre, simbolo, activo, orden) FROM stdin;
1	PEN	SOLES	S/	t	1
2	USD	DOLARES AMERICANOS	US$	t	2
\.


--
-- Data for Name: proveedores; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.proveedores (id, ruc, razon_social, direccion, tipo_persona, creado_en, actualizado_en) FROM stdin;
17	10036439098	CALDERON DE PADILLA JULIA	A.H. ANDRES AVELINO CACERES MZ	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
18	10036936903	VELASQUEZ TAVARA JOSE ARMANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
19	10038856052	MOSCOL SAAVEDRA GENARO EMILIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
20	10040336732	RODLAN QUISPE EFRAIN ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
21	10046223743	QUELCAHUANCA CONDORI JOSE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
22	10046467278	CERRATO PACHECO LEANDRA LEONAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
23	10047488937	CARI FLORES LEONOR CORINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
24	10056436010	BERRU HUAMAN DAVID LARRAIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
25	10061253080	INGA CASTAÑEDA FLAVIANA DEMETR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
26	10061845980	PEREZ ROCA FIGUEROA ALICIA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
27	10061884969	GARCIA SARMIENTO VALENTIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
28	10062007601	HUAMAN HUARANCCA TRINIDAD	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
29	10062372791	HUAMANI SULCA FERNANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
30	10062511295	ORE GOMEZ ANA MARIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
31	10063078463	VALVERDE CISNEROS JOSE EMILIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
32	10063228716	OTINIANO SAAVEDRA MANUEL ALBER	CALLE HUASCAR N°236-240 TRUJIL	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
33	10064689342	VICUÑA GARCIA JULIO HILARIO		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
34	10066025948	OCAÑA HINOSTROZA CLEMENTE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
35	10066099925	BUENO COSAR LUIS ALBERTO		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
36	10067550230	GALVEZ TRONCOS ADA PEREGRINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
37	10068013858	SANCHEZ ESTRADA WILDER JOHN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
38	10068270117	VARGAS CARRILLO VICTOR ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
39	10070869999	SOLIS GUILLEN MANUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
40	10071481510	MARCHENA ESPINOZA FRANCILES MA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
41	10071541342	ALLAUCA CANDIA ARTURO ROMUALDO		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
42	10072315028	MELENDEZ PAREDES ISABEL LUZMIL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
43	10072544116	GOMEZ AGUILAR EDGAR MARTIN	JR. SIMON BOLIVAR NRO. 319 URB	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
44	10072596329	RAMIREZ SANTOS JORGE FERNANDO	JR. HUAROCHIRI 546 C.C. PLAZA 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
45	10072609251	INFANTE MONTENEGRO HARRINSON	CAL SAN MARTIN SEC PACASMAYO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
46	10073155491	WONG TABOADA JULIO CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
47	10073808168	LIZANA BAEZ MARTINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
48	10073971638	GUERRA TURIN DE EGOAVIL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
49	10074055422	MACOLLUNCO CONOPUMA JORGE ARTU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
50	10074860007	VALVERDE GONZALES JOSE ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
51	10075011011	LOPEZ PALOMINO MARKOS WILFREDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
52	10076019750	ROSALES CASTILLO VIRGILIO ANTE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
53	10076248473	LORA CASTAÑEDA JORGE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
54	10077512174	FERNANDEZ GALLEGOS WILFREDO EM	VILLA MARIA DEL TRIUNFO - CC L	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
55	10077910251	GALVEZ SUCCAR MANUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
56	10078195393	RAMIREZ PINEDO JAIRO	MZA. W LOTE 11 URB. ANTONIA MO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
57	10078757979	PONGO SONCO NATALIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
58	10078922481	QUISPE ALLCCA JUANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
59	10078943748	ESPINOZA PURILLA MARINO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
60	10079651023	SHIKINA HIGA ALICIA NATALIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
61	10080369455	OSCCO TAIPE VICTOR	JIRON PARURO 1288 INT. 5 LIMA 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
62	10080688003	RAMIREZ FIGUEROA MARIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
63	10081349482	BENVENUTO MURGUIA MARIO GINO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
64	10081512081	VARGAS MENDOZA KARIN PATRICIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
65	10081515633	CONDORI CONDORI ALICIA GLADYS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
66	10081596587	RODRIGUEZ PONCE ZENON CIRILO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
67	10081780795	URTEAGA CALDERON JOSE ALCIDES	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
68	10082707242	MARTINEZ GUTARRA SERAFIN CORNE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
69	10082829488	ECHEVARRIA PECHE LUIS ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
70	10083403646	HOYOS NARRO MELIDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
71	10084033109	OYOLO ATOCCSA BEATRIZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
72	10084342764	JOÑO MUNIVE IRMA CATALINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
73	10084548176	GARCIA ECHEGARAY DAVID ROLANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
74	10084677995	VIDAL MERCEDES LEONOR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
75	10085057311	CHUNG JULCA JUAN CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
76	10085196745	BOY JARAMILLO SEGUNDO PABLO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
77	10085610541	CARBAJAL VILCACHAGUA MARIA DOR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
78	10086418288	ABAD ARMESTAR PEDRO		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
79	10086929878	PARRAGA CHUQUILLANQUI CARLOS M	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
80	10087375850	ESPEJO LAZO ROCIO MANUELA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
81	10088977225	CCAYACC ANAYA SIMEON JACINTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
82	10089566156	ROSALES RIVERA JULIO ANGEL	AV. LIMA 2121 P.J. PETA  JOSE 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
83	10089718215	LEON ALEGRIA PUBLIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
84	10089968599	ROJAS YGNACIO GLADYS FLORENCIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
85	10089976109	LARA QUINTANILLA JUSTA	AV VEINTI SEIS DE NOVIEMBRE 80	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
86	10090750190	LARREA POBLETE AUGUSTO FRANDZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
87	10090882665	HERRERA ROSAS DE CHAVEZ MELEND	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
88	10091988114	JANAMPA LUCAS DAVID JESUS	OSCAR R. BENAVIDES 720 LIMA CE	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
89	10093326445	CHAVEZ HERRERA TENUAIDA	AV PERU 3834 S.M.P	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
90	10093895768	HERRERA CARRERA CARLOS ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
91	10094103148	ASPILCUETA TERRAZAS CESAR GUST	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
92	10094104756	CAVERO ROJAS LUIS FREDDY		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
93	10094447998	BENDEZU AGUILAR OWALDE EDILBER		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
94	10094450409	DEL VILLAR PRADO MANUEL	AV JOSE CARLOS MARIATEGUI 2587	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
95	10094643568	RODRIGUEZ ASNATE SIMPLICIO VAL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
96	10094652761	CHINCHILLA LEON KENNY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
97	10095012537	GALARRETA CASTILLO VERONICA RU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
98	10095194066	HILARIO RAMOS ADAN CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
99	10095770679	CANRE BAYTON CESAR CRISOSTOMO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
100	10096134873	RAMOS PUSARI JUANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
101	10096342824	CHAVEZ RODRIGUEZ ORLANDO TEOFE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
102	10096890104	RODRIGUEZ DAMIAN MARCO ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
103	10097017064	CALIXTO CASTRO YENNY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
104	10097076486	PUMA VARGAS MARIA DEL CARMEN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
105	10097218302	ROSPIGLIOSI CATAÑO WILDORO JUA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
106	10097250052	LOZADA FLORES CARLOS ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
107	10097320964	CASTILLO ORTIZ ITALO WALTER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
108	10097454847	LOLI CORDOVA GIL SIMON	--	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
109	10097815874	MENDEZ HUAMANI CIPRIAN SANTOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
110	10097956524	OREGON MARTINEZ ALICIA LIZET	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
111	10098032750	CANCHARI QUICAÑO JAIME ROBERTO		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
112	10098346789	FLORES ZAMBRANO ESCOLASTICA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
113	10098516340	CRUZ PUENTE GLORIA VENANCIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
114	10098888735	VASQUEZ JARA BRUNO FELICIANO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
115	10098920400	LUNA GARCIA FERFIN MILLER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
116	10099019552	HERMOZA REQUENA JUSTO ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
117	10099079989	BENITEZ LASTRA JUAN CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
118	10099526314	SHIMOMURA SALAZAR JOSE CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
119	10099532918	CAMPOS LAUPA KARIN VIOLETA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
120	10099700349	RODRIGUEZ RAMOS RUDY REYNALDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
121	10099734014	CASTILLO ORTIZ RUSBER CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
122	10099780156	CHIRA CABRERA MIRTHA CRISTINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
123	10099851371	PIMINCHUMO GOMEZ NORA CRISTINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
124	10100808019	IBARRA SALCEDO NANCY ELIZABETH	JR. PACHITEA NRO 399 - LIMA - 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
125	10100876219	CONDE PEREZ LUIS ENRIQUE	AV. LIMA PARADERO 9 #1606 P.J.	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
126	10100880739	LOPEZ RUIZ SETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
127	10100903836	CAYANI CHOQUE RAUL JESUS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
128	10100974725	LUQUE LUQUE TEOFILO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
129	10100979905	CASTRO INGA ROSA ELENA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
130	10101239361	CALSINA APAZA BEATRIZ JULIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
131	10101245476	BERROCAL MEDINA MIGUEL ALFREDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
132	10101281081	HUAMAN CALANCHE GABRIELA LUISA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
133	10101300965	CHOQUEHUANCA GARCIA CARLOS ALF	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
134	10101477806	TEJADA RODRIGUEZ FRANCISCO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
135	10101775009	CAMASCA HUAMAN LUIS ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
136	10101823852	RODRIGUEZ RAMOS HOMERO EDUARDO	W47 BAR 2 SECTOR 2 ASOC PACHAC	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
137	10101971967	CASTILLO FUNG GISELLA ELIZABET	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
138	10102722031	MEJIA CASTILLO ARTURO FRANCISC	JR RAMON CARCAMO 565 INT 105 L	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
139	10102793507	VARGAS VILLAR JULIA ELENA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
140	10102863670	CLEMENTE YARASCA MIGUEL ANGEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
141	10103074202	SANTILLANA BENITES MARIA MONIC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
142	10103164503	CORRALES MANRIQUE GLADYS ESTHE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
143	10103246089	VILLAVERDE CAMPUSANO ARMANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
144	10103498789	JANAMPA RIMAC YESENIA ROSA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
145	10104044587	SANDOVAL SANDOVAL MARISOL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
146	10104065932	PINO ESTRADA PATRICIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
147	10104277301	ROJAS NARVAEZ SUSANA MARCELA	AV. GUILLERMO DANSEY 330 TDA 3	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
148	10104284537	HUAYTA  ASENCIO CARLOS RAYDO		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
149	10104719941	BANDA GONZALEZ FRANCISCO RAFAE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
150	10105045196	TABOADA RAMIREZ PAULINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
151	10105275787	LLANTOY HERAS ROSA ELIZABETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
152	10105285111	VILCHEZ SOTOMAYOR MERCI OLINDA	JR. INTI RAYMI 241 SAN GABRIEL	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
153	10105820319	CANALES SOLIS ALFREDO	AV. MARISCAL OSCAR R. BENAVIDE	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
154	10106064160	CANTORAL RAMIREZ ROGER ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
155	10106235118	QUISPE BERNAL ANGEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
156	10106464982	MEZA QUISPE ROSA LUZ	CAL. HUAYNA CAPAC 201 ALT PARA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
157	10106474104	MIRANDA GAMARRA LUIS ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
158	10106605756	GONZALES CHOQUE WILBERT	AV. ARGENTINA 639 INT. D146 LI	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
159	10106680227	BURNES MEDINA LEYVE YNOCENTE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
160	10106963261	JANAMPA ORE GLORIA SATURNINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
161	10107413117	ESQUIVEL POMA RUTH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
162	10107414814	ROJAS PINTADO ENRIQUE ANTONIO	PJ. LA LIBERTAD NRO. 168 URB. 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
163	10107789354	CONCEPCION SOTELO MELCHOR SERG	AV ARGENTINA 575 PSJE. E PSTO 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
164	10108043453	JESUS JESUS ROXANA PATRICIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
165	10108761828	MARMOLEJO VELASQUEZ ABRAHAN AN		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
166	10154297796	SILVA MARCELINO EDGAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
167	10156918658	COLLAZOS VERDE DORIS AURORA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
168	10156940408	COLLAZOS VERDE ELIO GILMER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
169	10157012008	ROSALES REYES HERNAN AUGUSTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
170	10157401101	GIRON ANDRADE GLADIS NANCY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
171	10159690402	FRANCISCO MENA DE PACHECO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
172	10167534789	QUISPE SANDOVAL LUZ IRIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
173	10168004210	RICO PARRA MARIA GLADIS	AV ARGENTINA 279 C.C.NICOLINI 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
174	10175770343	CASTILLO ROQUE ESMIDIA DEL PIL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
175	10179397094	AVALOS PAREDES BETTY GLADYS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
176	10179889311	VASQUEZ CALDERON ELVIRA MARIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
177	10180332079	VILLANUEVA VILLANUEVA MARIELA 	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
178	10180845882	UNTOL PRIETO ANGELA BERANIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
179	10180932343	VASQUEZ CASPITA DEYSI FLOR	JR OBREGOSO NRO 280 CENTRO HIS	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
180	10181238262	ALMEIDA BRICEÑO JOSE FELICIANO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
181	10181873383	MINAYA PONTE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
182	10181938825	GONZALEZ CHICLAYO MIRIAM DEL	AV JOSE MARIA - TRUJILLO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
183	10182104201	VALERA CARDENAS MARIA MARLENY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
184	10182105177	RODRIGUEZ ACEVEDO JACK JOE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
185	10182114702	MONTERO SANCHEZ ISABEL VICTORI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
186	10182126964	ARGOMEDO BRIONES MARTHA CECILI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
187	10191836028	JUSTINIANO YENGLE ARNALDO SEGU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
188	10191892629	CHUQUIVIGEL OCAS SUSANA MARIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
189	10192239325	ESCOBAR PAIRAZAMAN EVER GUIDO	ADOLFO NRO 59 - PACASMAYO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
190	10192277162	VILLANUEVA MENDO ANGELMIRA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
191	10192291670	ESTEVES PAIRAZAMAN ALEJANDRO S	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
192	10192294067	VALQUI GARCIA MIGUEL ASUNCION	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
193	10192297031	GRAU LAGOS ANTOLIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
194	10192309455	GONZALEZ BENITES JOBA MARCELA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
195	10192313151	HERRERA AYAY PEDRO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
196	10192315501	LEON LEON VICTORIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
197	10192317571	CANCINO HERNANDEZ SEGUNDO JOSE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
198	10192322591	GARCIA MENDIZABAL CESAR AUGUST	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
199	10192326538	MELENDEZ SÁNCHEZ SONIA MARLY	PACASMAYO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
200	10192342738	MOSTACERO ZARATE FREDY WILSON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
201	10192352016	TIRADO DE ARROYO SARA LUZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
202	10192357433	BECERRA ZAMORA JOSE AMADEO	CAL SILVA SANTISTEBAN 174 - PA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
203	10192368338	SANCHEZ ALARCON MARIA ANTONIA	AV. E. VALENZUELA 631A PACASMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
204	10192380397	RAMIREZ HERNANDEZ JAIME ANTONI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
205	10192387081	RODRIGUEZ HUAMAN HENRY HERNAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
206	10192388576	LLANCA MENDOZA ADELAIDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
207	10192391143	VASQUEZ ESTEVES DE PIZARRO SIL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
208	10192528611	ESPINOZA SANCHEZ ELDA CHARITO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
209	10192531891	LEON HERNANDEZ JAIME CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
210	10192543351	CORNEJO CAPUÑAY DE TIRADO PATR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
211	10192568728	DIAZ CORTEZ EDILBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
212	10194311864	CORREA TRUJILLO IRMA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
213	10195716124	GARCIA SEGURA FORTUNA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
214	10198361751	CANTORIN CAMAYO VIRGILIO EDGAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
215	10199252025	TANTAVILCA CHUQUILLANQUI JOSUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
216	10199440832	QUISPE ORTIZ ROCIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
217	10199681341	INGA SANTIVAÑEZ FREDDY MANUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
218	10199915288	ILIZARBE BENDEZU DOMINGA TERES	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
219	10199932077	BAZAN TORRES BLADIMIR OBDULIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
220	10199975892	VALLADARES BRAVO CESAR FERNAND	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
221	10200202606	CANTORIN CAMAYO ELIZABETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
222	10200542156	ELIZARBE BENDEZU MARTHA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
223	10200688797	CAMARENA LIMACO LILIAN JEANETT	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
224	10200727482	MEZA MEZA FAVIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
225	10205623855	HUAMAN SALCEDO ROSA ABELINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
226	10205630878	TAPIA GARAY MARIA ELENA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
227	10207232853	GONZALES ANCIETA CLARIZA MAGDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
228	10210659124	BELLEZA YLLANES ERICK MIGUEL		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
229	10210667470	SUCESION INDIVISA BLANCO RICRA	AV. FRANCISCO PAULA OTER NRO. 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
230	10210674611	FERNANDEZ ARELLANO AIDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
231	10210706327	HUACCHO SAMANIEGO RONALD RODOL	JR JUNIN TARMA - TARMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
232	10210713021	LEONARDO MEDINA GILBER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
233	10210735386	CRUZ MARCELO JOSE ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
234	10210761107	SALCEDO MORENO ELVIRA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
235	10210768829	VARGAS GOYAS TEODORO LORENZO	TARMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
236	10210848261	ABANTO ROMERO VICTOR HUGO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
237	10210872685	ZAVALA RAMIREZ JOSE DONALDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
238	10210873193	CAPCHA VILCHEZ JOSE ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
239	10210957249	PATRICIO HURTADO NELIDA FLORIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
240	10211009662	GOMEZ DE VENTURO NELLY SULPLIC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
241	10211013848	TORREJON APOLINARIO DE LAURA	JR. FRANCISCO DE MARINI 257	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
242	10211019528	SOTO LEYVA ABELARDO FRANCISCO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
243	10211021557	ALANIA ROSALES VERONICA ALEJAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
244	10211024327	PAREDES BALDEON ELSA JUANA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
245	10211101402	VILCHEZ QUINTO DE SUCUYTANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
246	10211167357	ADAMA GARRIDO DE CURISINCHE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
247	10211205089	GAMARRA VALENCIA CESAR AUGUSTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
248	10211224326	PACAHUALA MONTES CONSUELO LUCY	JR. MOQUEGUA 350 1/2 CUADRA ME	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
249	10211254811	ANGLAS TORRES ROSSANA GIOVANNA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
250	10211257976	ARIAS PALACIOS JULIA MARGOT	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
251	10211285911	ZEVALLOS HINOSTROZA IVAN RONAL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
252	10211301037	CASO CORONEL ADELA	JR. AMAZONAS 729 ALT DE JR. HU	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
253	10211342361	VILLAGARAY COCA CRISTINA SONIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
254	10211347657	HURTADO CASO FREDDY MELITON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
255	10211352618	CASTILLO CAÑARI IRAIDA MILAGRO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
256	10211373739	BARJA ESPINOZA EFRAIN DAVID	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
257	10211381308	ANCO GÜERE MIGUEL ANGEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
258	10211395228	ZEVALLOS HINOSTROZA SAYET PERC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
259	10211396313	ROMERO NOLASCO MARIA LUISA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
260	10211398901	CORDOVA ALTEZ ADAN ABEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
261	10211401538	LEON MENDOZA VERONICA CAROL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
262	10212406215	LLACZA CHURAMPI NELVA LISIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
263	10212433476	CORONEL CASTAÑEDA VICTOR RAUL		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
264	10212647174	CANO FIERRO DANNY ISAAC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
265	10212680074	ANCIETA HUAYNATE VICTOR RAUL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
266	10212715081	MEDRANO ROMERO JESUS GERMAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
267	10212898894	COLONIO VELIZ VIOLETA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
268	10212992777	FLORES SALCEDO CARLOS RAUL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
269	10218696452	TTITO VASQUEZ MIGUEL ANGEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
270	10226729327	AQUINO TARAZONA ALEJANDRO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
271	10230128397	SUAREZ PEVES LIBNI ENAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
272	10236924331	REYES MONTES LUIS TOMAS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
273	10239420201	SANTIAGO BARBOZA SERGIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
274	10246830008	CAHUASCANCO QUISPE ELENA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
275	10254450397	ACOSTA MOYA CARLOS MANUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
276	10255631271	TOLEDO ROSALES NILDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
277	10257437871	PAYHUANCA CHUQUI RODOLFO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
278	10257471409	ESPINOZA VASSALLO JOSE CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
279	10257532467	LOPEZ LIÑAN SILVIA ELIZABETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
280	10257830476	CUEVA DIAZ ANGEL  ANDRES		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
281	10258415367	ROJAS CARBAJAL EDUARDA LIDIA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
282	10258428418	REYES CANALES SONIA MARIBEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
283	10258592986	PORTUGAL VALDIVIEZO RICHARD TO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
284	10258664821	CALDAS CHAFLOQUE VICTOR MARIÑO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
285	10266002934	MALCA CHAVEZ VALENTIN		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
286	10267074050	MOSQUEIRA SERVAN JULIO FERNAND	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
287	10271677206	CHAVARRY DE ROJAS NANCY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
288	10272522869	LOZANO VELA WILSON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
289	10295157688	CARPIO BANDA ANDREA CONCEPCION	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
290	10296590326	OPORTO SOTO DANTE GONZALO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
291	10297323615	CACHI PARICAHUA JAIME HELBER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
292	10320452452	LEON GALAN NARCISO QUINTIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
293	10335889229	AQUINO HUAMANJULCA NELIDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
294	10400053800	VELIZ AGUILAR MARISOL ROSA	PACHACAMAC MZA W LOTE 39	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
295	10400198891	SALINAS MARTINEZ AZUCENA ASTRI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
296	10401788561	ORE SUAREZ WILBER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
297	10402357946	CAJACHAGUA MENDOZA EDITH MARGA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
298	10403213255	TANTACHUCO CHUQUIPOMA HEBERTH 	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
299	10403609281	INCISO PARRA ALFREDO FELIX	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
300	10403789904	LUNA QUISPE JUAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
301	10404001014	MENDOZA CHEPE JULIO CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
302	10404112631	TENORIO OLIVERA JULIO CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
303	10404581355	LIGAS NINA SONIA RUTH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
304	10405304797	AYALA MENA ALEXANDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
305	10405551590	GONZALES MENDOZA ANA CECILIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
306	10405559671	AVALOS GARCIA JOSE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
307	10405862731	RAMOS MORALES HECTOR JESUS	JR. TALARA 153 URB JOSE GALVEZ	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
308	10405982931	QUISPE PILLCO RUTH NOEMI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
309	10406214317	CHAMBA ALBERCA JOSE ALEXANDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
310	10406313111	COSTILLA GUANILO LUIS ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
311	10406350466	GARIBAY AYALA JUSTINA RUFINA	--	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
312	10406735104	DELGADO LLANA EUGENIO EMILIANO	coop.  cocharcas mz p lt 24  v	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
313	10406806052	PANTALEON SERRANO ADOLFO GUIME	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
314	10407179914	LUQUE MAMANI ELIZABETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
315	10407513750	PERRIGGO BURGA ESTHER DENIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
316	10407547735	CHAVEZ ANASTACIO FELICIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
317	10407570001	ARISPE ROBLES AMERICA YENNY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
318	10407614394	ABURTO GALLEGOS MARIO MIGUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
319	10407629162	LLANTOY CCOA YULIXS	AV. FORESTALES A.V. INMACULADA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
320	10407639702	ROSALES ROSALES MILTON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
321	10407907677	HUAMANI HUAMANI RAUL ALBERTO	CALLE LIMA 211 JOSE GALVEZ	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
322	10407914061	RODAS QUIROZ RAFAEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
323	10407955116	ZAMORA ACOSTA DONNY EDUARDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
324	10408016792	LEANDRO CABRERA GIOVANNI EDDY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
325	10408417932	SEGURA CAMAYOC JOHAN DANI	MZA. U-6 LOTE 01 APV. PROFAM L	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
326	10408505009	ALQUIZAR LEYVA JOSE AUGUSTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
327	10408748629	LLAJARUNA MONTES EDWIN GONZALO	AV CESAR VALLEJO 728 - URB PAL	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
328	10408798391	TUESTA VASQUEZ TANIA RUBI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
329	10408894358	CRUZ ESPINOZA FRANK JOEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
330	10409354977	VILLAFUERTE PUYEN MARIO ROBERT	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
331	10409380498	PAUYAC HUARACA DE VEGA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
332	10409630036	VILCA IÑO ESTEFANIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
333	10409717239	CRUZ ROMERO CARMEN ROSA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
334	10410343008	TAPARA FLORES MARIELA MERCEDES	JR PARURO 133 URB BARRIOS ALTO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
335	10410583343	CANTARO DIAZ ROY ROGER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
336	10410750355	VILLAFUERTE INGA EDGAR MANUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
337	10410895060	BARRIENTOS ARROYO LUISA MAGALI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
338	10411127741	AYLAS MENDOZA HENRY DAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
339	10411127881	REYES ROJAS ELIDIA BETHY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
340	10411183284	SIMPE GOMEZ HERLINDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
341	10411617586	LOPEZ RICALDI JOSE CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
342	10411921455	GONZALES ORTIZ SOLEDAD	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
343	10411991402	BARRERA SOBENES RITA LIZBETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
344	10412355526	PACHA MOROCCO EFRAIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
345	10412425648	GOMEZ LIMA MARITZA LOURDES	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
346	10412453099	PALACIOS QUISPIALAYA MONICA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
347	10412631205	DIOSES CHAPOÑAN JUAN ERNESTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
348	10412820482	ANCIETA MARIN VICTOR MARTIN		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
349	10413138359	MENDOZA VEGA MIRIAM	MZ A LT 12 URB SANTO DOMINGO E	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
350	10413620380	YUCRA HUANCA MARISABEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
351	10413970224	QUISPE PUCHOC ELADIO BERNABE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
352	10414143411	VELASQUEZ HUALLANCA RAUL EDUAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
353	10415118193	GALLARDO TELLO ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
354	10415181065	PIZARRO CONDORI MAGALI ELIZABE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
355	10415585981	RAMIREZ GARCIA JUAN ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
356	10415977404	PEREZ BARZOLA ROGER EVER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
357	10415992721	CONCHE HUAMAN HANS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
358	10416019474	SILVA JORGE JUAN ESDRAS	--	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
359	10416023315	AGUIRRE PABLO INES JOHANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
360	10416033876	MALQUI CHAGUA BEATRIZ ROSARIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
361	10416070968	CARDENAS HUAMANI EDSON MICHEL		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
362	10416093674	OSORIO TORRES VALENTINA HORTEN	AV GUILLERMO DANSEY 444 PSJE 3	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
363	10416161963	CARPIO SILVA BLANCA LIZBETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
364	10416195710	PEÑA ESPEJO MILTON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
365	10416209206	LEON CALDERON ERASMO MICHEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
366	10417103380	QUISPE CONDOR AMERICO FELIPE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
367	10417214033	SANTIAGO BUENO WILDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
368	10417359643	MUÑIZ VIVAR MONICA MILAGROS	AV INCA GARCILAZO DE LA VEGA 1	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
369	10417450900	TAPULLIMA SALDAÑA RANGER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
370	10417491002	MORILLOS BANCES SANTOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
371	10417591180	VARILLAS AYON WILMER YIMY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
372	10417609658	SANCHEZ CASTAÑEDA GLADYS ESTHE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
373	10417712530	CHAHUAYA HUAMANI LUIS ALEJANDR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
374	10418446019	QUISPE QUISPE JESUS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
375	10418614868	MUÑOZ RIOS SAMUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
376	10419248342	GALVEZ ROJAS CLAUDIA REBECA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
377	10419257058	PAICO CARLOS CELESTINO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
378	10419505205	LAZO HOYOS NELIDA VANESSA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
379	10419778708	GALARZA LAQUISE JESUS MARINO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
380	10419903502	CHOLAN MOSTACERO CRISTINA JANE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
381	10420355756	CARDENAS FLORES MICHAEL RONAL		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
382	10420683524	GUEVARA POMPA CARMEN ROSA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
383	10420691713	FERNANDEZ SEGURA EDGAR MATEO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
384	10420904555	ROMERO SALCEDO DENIS MARXLENI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
385	10421151097	COBA VIGO CARLOS ENRIQUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
386	10421761502	PAREDES MARCELO EDWIN RICHARD	AV ARGENTINA 575	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
387	10421796268	PAREDES HILARIO JAVIER WILLIAM	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
388	10421895151	DIAZ RODRIGUEZ HAYMEE VERONICA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
389	10422030986	SALAZAR LLACZA RICHARD RAUL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
390	10422428041	LOPE CHOQUE HERBERTH WILLIAM	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
391	10422485304	MALLQUI RAMIREZ CESAR ENRIQUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
392	10422886244	ARPASI SALAS ENRIQUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
393	10423023827	OSORIO PONCE JOEL YIMI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
394	10423133681	HUAMANI AMACHI ESTHER HILDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
395	10423626467	PORTOCARRERO JABO SANTOS RAFAE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
396	10423993681	DELGADO CONDOR DANIEL	AV ARGENTINA 215	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
397	10424165790	MINAYA CASAS GARY FIORELLA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
398	10424166541	MACAZANA FLORES HEBERTH ZACARI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
399	10424385471	HOYOS CASTRO LLULIANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
400	10424387334	LEON FRANCISCO ANGEL OBLITAS	AV. VIRGEN DEL CARMEN URB. SAN	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
401	10424414960	MARTINEZ HUAMAN HUGO ANGEL		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
402	10424505787	QUIÑONES ENRIQUEZ FLOR DE MARI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
403	10425283290	RAMIREZ JAIME MARTIN GUILLERMO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
404	10425314802	ROCIO DEL PILAR ORTIZ REATEGUI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
405	10426178210	TRUJILLO GUABLOCHO FLOR AMAUTA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
406	10426632638	ZAVALA SALDAÑA ANDIA KARINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
407	10427244496	BERROCAL CRUZ JOHAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
408	10427305673	LEQUERICA UTRILLA CLAUDIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
409	10427428988	GOMEZ HUACSO ALEXANDER SAUL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
410	10427493194	VASQUEZ ROMERO ELMER ROLAN	LURIN	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
411	10427513144	HINOSTROZA CANO DINA ALICIA	AV. MANUEL A. ODRIA 3.5 CC TAR	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
412	10427744103	ARANDA ARAUJO ALEXANDER EDUAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
413	10427831600	VASQUEZ CUSCO ISABEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
414	10427952083	PRIETO BECERRA YANINA JULIANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
415	10427957646	TICONA VILCA JULIO RICHARD	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
416	10428016004	VASQUEZ HUAMAN LUIS HERNAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
417	10429268104	ZEVALLO CHIOK ROGER		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
418	10429470167	TERAN VELASQUEZ ROSA JOHARY	CAL. LOS TULIPANES URB. EL POR	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
419	10429602594	INCA RAMIREZ JUVENAL	AV PACHACUTEC PARQUE INDUSTRIA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
420	10429682687	OSCCO MAMANI GROVER LUDY		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
421	10430526630	CHAVEZ AVALOS DILMER HENRY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
422	10430765359	VASQUEZ ALIAGA MOISES ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
423	10430994986	MARCOS TAIPE YESENIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
424	10431266135	SANTOS RODRIGUEZ WINDO ALEX	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
425	10431734864	COTRINA BAZAN CARMELA ALEJANDR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
426	10431739955	PERALTA HACHATA JULIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
427	10431911651	FLORES CURO ANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
428	10432453460	CHUQUIPIONDO COMETIVOS SULMIRA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
429	10432730765	TICONA TAPIA YONY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
430	10432814101	LIRA CALATAYUD FRANCO VALENTIN	CALLE PIZARRO 224 INT 107 AREQ	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
431	10433176940	INGA VILCHEZ RICARDO JIMMY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
432	10433562025	MOGOLLON HERRERA JORGE ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
433	10433581127	ÑAHUIS MONAGO GIOVANNA IVANNA	AV ARGENTINA 639 INT E011 CC L	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
434	10434326635	PARODI ZARATE ARTURO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
435	10434394401	ESTRADA ESPINOZA JONATHAN GABR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
436	10434463616	IDIAQUEZ ARICOCHE JORGE ALBERT	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
437	10434498843	CORREA CANSECO DAVID	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
438	10434901559	RODRIGUEZ CASTAÑEDA SONIA RAQU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
439	10435409020	PALACIOS CHIPANA FLORA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
440	10435417634	MUNDACA RUFASTO MICAELA KELLY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
441	10435437244	SOLANO AYALA JOSE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
442	10435533936	OSORIO JANAMPA HEBER JESUS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
443	10436118151	CRISOLOGO CARLOS ANDREA SOLEDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
444	10436364267	ORTEGA RAMIREZ JUAN PABLO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
445	10436442926	PALACIOS ESPINOZA ROMINA GLADI	LIMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
446	10436667022	GARCIA GOMEZ DANIEL ENRIQUE	AV LAS PALMAS MZ A LT. 3A JOSE	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
447	10437150171	ADAMA HUAMAN SUSAN MILAGROS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
448	10437232909	ARRIARAN ESCRIBA MIGUEL ANGEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
449	10437784391	SANDOVAL SANDOVAL JULIO CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
450	10438642035	ALFARO OLAYA LUZ LUZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
451	10438757517	ANTONIO POMA JHIMMY ORE		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
452	10438794048	BECERRA YANTAS ANGEL	AV. MANUEL A. ODRIA N°1497 - J	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
453	10438806356	NINA TURPO GUINA JULIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
454	10438850339	LOPEZ PANDURO ANGELA ROCIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
455	10439629911	GARCIA VASQUEZ ROSARIO DEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
456	10439762913	GARGUREVICH VARAS ANTONIO FRAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
457	10439801871	RUIZ RAMIREZ GONZALO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
458	10439850626	RODRIGUEZ ZEGARRA EVA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
459	10440069164	ICHPAS PALMARES TEODOSIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
460	10440069903	CRISTOBAL PALPA JHENNY LAURA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
461	10440113660	RODRIGUEZ TIRADO SEGUNDO FELIP	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
462	10441288587	SAUÑE MELGAR GLORIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
463	10441371352	DIAZ ASTO MARY LUZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
464	10441463559	ARONI MENDOZA ABRAHAN SAMUEL	JR. TALARÁ 254 GALVEZ VMT P.J.	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
465	10441490548	CAMERO NAHUE JUAN CARLOS		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
466	10441978168	JIMENEZ VALDIVIEZO FLOR DE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
467	10442343450	LLAUCA HUAMANI GODOY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
468	10442366671	USCAMAITA VELARDE JANETT MILAG	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
469	10442466403	CHANCAHUAÑA AVALOS ALEXANDER P	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
470	10442911075	ZAMATA HANCCO MATEO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
471	10443779642	VILELA ARCHE BILLY JACSON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
472	10444026028	CCORI HUAMAN GUSTAVO ANDRES	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
473	10444591442	RODRIGUEZ PEREZ LISSET NOELIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
474	10445673213	LAZARO SANCHO GUIDO OSMAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
475	10446363102	DIAZ CASIMIRO KATTY GIOVANNA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
476	10446752346	HUACHHUACO ORTEGA JONATHAN NOE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
477	10446758093	AQUINO QUIROZ VANESSA DIOLIVET	AV. LIMA 2101 URB JOSE GALVEZ 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
478	10446818801	CHIQUE JUCULACA VANESA VERONIC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
479	10447220186	SANCHEZ BOZA JOSE OSCAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
480	10447516786	CARBONEL CHEIN YASSER AHMED	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
481	10447816500	ATENCIO MAMANI DIEGO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
482	10447854568	RICALDI CAÑARI ROGER BONIFACIO	AV ARGENTINA 397 C.C. LA BELLO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
483	10448196777	CARRION CARDENAS CESAR ENRIQUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
484	10448435453	LEONARDO SALAZAR DAVID PAUL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
485	10448448792	HUANCA ROSADO JOSE ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
486	10448863714	QUIQUIA BETETA MIRIAM ROCIO	JR. PABLO BERMUDEZ 169 A 1/2 C	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
487	10449028932	CHERO VALDIVIA ELOY BALTAZAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
488	10449205109	CONDEÑA HUAMANI YACQUELINE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
489	10449502774	LOPEZ RIVERA LUIS ALBERTO	JR. AYACUCHO 364 SEC. TARMA - 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
490	10450209720	MACHUCA AZURSA GLADYS BETTY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
491	10450233256	URETA HUAMALI TORIBIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
492	10450598637	OGOSI CUSICAHUA ROSA LILIANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
493	10450623178	MORAN FUERTES ROBINSON JACKSON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
494	10450690274	HUARACA BBTIFIN2 TITO SAMUEL		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
495	10451378096	SILVA PIÑAS LAURA DANIELA	URB. LA PALMA GRANDE MZA.E LOT	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
496	10451430845	ROJAS CRUZATE JUNNIOR JORGE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
497	10452516107	CARDENAS ROMERO VILMA	AV. BOLIVAR 148 URB.LIMA CERCA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
498	10453840706	MAYORGA AREVALO MARIA ESTHER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
499	10454287601	ASALDE DELGADO JUAN CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
500	10454328863	SANTIAGO LLAGUENTA JORGE JIMMY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
501	10454358860	TORALVA ERRIBARREN DE MARTINEZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
502	10455034910	GALVEZ ROJAS KAREM JANET	JR. TALARA N°248 A.H. JOSE GAL	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
503	10455160516	ALONSO ABRIGO ROBERTO NAZARIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
504	10455458515	TACO FLORES ANDRES JUSTINO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
505	10456172046	CUEVA BECERRA MIRIAM DEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
506	10457028801	LETONA HUAMAN JOSE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
507	10457078370	SOSA ANAHUA LUIS ENRIQUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
508	10457471870	SANDOVAL DAMIAN ANDREA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
509	10457682650	TURPO ALATA EDWIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
510	10457804194	ALIAGA MUÑOZ ELIZABETH EMILIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
511	10458148398	ZABALA GONZALES ANTONIA VILMA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
512	10458746724	PARRA QUISPE FIDEL FERNANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
513	10459010497	BARRIENTOS HUAMANI MARIA RITA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
514	10459336155	BARRENECHEA SERNA YESABELLA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
515	10459824303	ATACHAGUA ESPINOZA NOE DAVID	AV MANUEL ODRIA S/N TARMA - JU	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
516	10460921975	BARRANTES BARRANTES ABRAM	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
517	10461305569	CAJAHUANCA CONDOR JANETH LILIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
518	10461581515	PARDO NARVAEZ DIEGO ARMANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
519	10461642298	DAÑINO ZEVALLOS CRISTIAN JOEL	AV.CENTRAL MZ W LT 52 3ERA ETA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
520	10461699745	GAMONAL GAVIDIA DILMER	AV ARGENTINA 327	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
521	10461795418	HERNANDEZ RAFFO ELIZABETH LORE		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
522	10461876311	RAMIREZ GARCIA JHONNY ALEXANDE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
523	10461924196	TORRES HUAMAN JULIO CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
524	10462108392	ZUASNABAR FLORES RUTH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
525	10462267423	IQUE FLORES FRIEDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
526	10462349535	GOMEZ HUAYNATE EDWIN JESUS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
527	10462901998	SAAVEDRA JULON DANNY RUTH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
528	10463293240	ANGELES NOLAZCO NATHALY CLARIT	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
529	10463442695	SULCA PADILLA MARIA LUISA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
530	10464361575	ZAVALA PAITA CINTHYA ROXANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
531	10465176241	ALARCON MEDINA JACQUELINE	MZA. D-14 LOTE. 20 A.H.BOCANEG	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
532	10465707416	RAMOS LLASCCANOA EDITH SABY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
533	10466519311	SEDANO ESPINOZA KENNY BRUCE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
534	10466584857	RODRIGUEZ SURICHAQUI JHIN CARI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
535	10466727526	HUAMAN SAMANEZ JAVIER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
536	10468111336	DURAND MEJIA NATALIA BEATRIZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
537	10468793941	VERA MACAVILCA ROSA MARIA	GUILLERMO DANSEY 413 LIMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
538	10468886184	TURPO MAMANI JAEL MAYCOL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
539	10469083727	MACHACA NAVENTA RENZO JUNIOR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
540	10469202149	CHUNG SANCHEZ KENJI ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
541	10469210001	CHIHUALA QUEZADA HEYSIN CRISTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
542	10470342906	ALLCCA CCORAHUA DANY HENRY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
543	10470588182	HUAMAN ROJAS GABY KARINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
544	10471481888	CORDOVA PALACIOS ANTHONY DEYVI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
546	10472512230	TARAZONA CARRERA MELISSA ANAIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
547	10472938539	ASTOYAURI CONTRERAS JUAN CARLO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
548	10473079157	GONZALES CUCHUPOMA RAMIRO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
549	10473251839	CUEVA SANCHEZ MARCO ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
550	10473486721	OLGUIN BRAVO KELLY ADRIANA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
551	10473966587	ALEGRIA FLORES MILAGROS LIZBET	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
552	10474067764	HILARIO SOTO EDINSON ELITANIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
553	10474147059	RUIZ ZAPATA ROBERT ANDRES	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
554	10474155027	COARITA SANDOVAL MARIBEL ROSME	AV. AVIACION 415 URB SAN PABLO	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
555	10474170026	HUAYHUA ROMERO JHENNY MARIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
556	10475104485	PORTAL SALAS RICHARD JHONY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
557	10475254819	VILLANUEVA MARCELO ANDRE GIANF	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
558	10475564532	CALDAS RIVERA ILMER ROBERTH	AV. HUAROCHIRI N° 536 PJE A TD	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
559	10475607100	SANTOLALLA GONZALES SARALU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
560	10476116673	RODRIGUEZ TUANAMA ROSIE CONSUE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
561	10476292633	PACHECO HERNANI JENIFFER DORIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
562	10476863142	VALERA COTRINA LUIS MARTIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
563	10477290707	COTRINA TUCTO JAQUELINE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
564	10477436230	DIAZ AREVALO MIGUEL ANGEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
565	10477849887	GAMBOA HUAYHUA GIANNINA EVA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
566	10478020576	MAMANI ARIAS GLADYS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
567	10478923053	SILVA PIÑAS LUCERO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
568	10479540930	CARRASCO VERGARAY ERIKA KAREN	AV ARGENTINA 327 CC BELLOTA PS	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
569	10479925521	PARIATON PAZ ELIAS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
570	10480717959	BENDEZU CRISPIN EDSON ABEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
571	10481630776	PEREZ OSORIO LINCOL RONY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
572	10481719653	FLORES CIELOS LILIANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
573	10481984462	VARGAS BONIFAZ YALITZA HILENNE		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
574	10481984641	FLORES ZEVALLOS DAIS IVONE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
575	10482559838	SILVA PEREZ ITALO RICHARD	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
576	10483277216	LUCERO BAZAN BELINDA YOSSELYN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
577	10483834379	RAMOS CASTRO ALBERT JORGUINIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
578	10484185226	RODRIGUEZ TIRADO LINDA CELESTE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
579	10484312325	MORENO BAILON JAIME WILDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
580	10485272459	SOLIS URIBE JAVIER JASHIT	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
581	10486409512	PEREZ VENTURA WILIAN OBED	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
582	10486729592	TAZZA CAMAYO KEVIN JORSH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
583	10487068441	URURI VARGAS VICTORIA ROSALIND	JIRON PARURO 1094 INTERIOR 109	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
584	10487271689	LUICHO LEGUIA GEORGE ANDERSON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
585	10489044574	MEDINA FERNANDEZ YALU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
586	10614625771	MUCHA CABANILLAS ISSA	JR AZANGARO 1075 LIMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
587	10628534743	SOTOMAYOR ARROYO MARTIN DANIEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
588	10700220155	LOPE CHOQUE OSCAR NILTON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
589	10700653167	ALVAREZ MOLLO MELISSA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
590	10700668351	MURILLO JUAREZ CLAUDIA JIMENA	JR. MALECON RIMAC NRO. 3178 UR	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
591	10701627895	URCIA BENALCAZAR CARMEN ROSA	GRAN CHIMU NRO. 647 LA LIBERTA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
592	10701711233	GUARDIS CARDENAS NAJHELY TAIS	VILLA EL SALVADOR - BARRIO 2 U	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
593	10701762393	ROJAS ZAPATA CESAR LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
594	10701822922	MONTORO PUENTE PATRICIA JANETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
595	10701939960	LUYCHO GUERRA ROSSANA JACKELIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
596	10702253212	POMA HUACHIHUACO ERICK CHARLY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
597	10702265172	MALMA ADAMA ANGEL GABRIEL	JR. SAN JUAN 472 MEDIA CUADRA 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
598	10702265903	ACHIRCANA SOTELO MICHAEL JORDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
599	10702351460	RODRIGUEZ LEYVA ABIGAIL LILIAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
600	10702351478	ARAUJO GARCIA ROSMERY GIOVANNA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
601	10702452088	MANDUJANO SOLANO WILLIAMS ARNO	JR. TACNA SN BAR. BUENA VISTA 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
602	10702621602	PAURO TACCA JULIO CESAR	VILLA MARIA DEL TRIUNFO - LIMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
603	10702965212	TENORIO VILLANUEVA SHEILA LISE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
604	10703199149	PACHECO DIAZ MAX ALEJANDRO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
605	10703379384	RODRIGUEZ MANTARI KRISTELL DEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
606	10703602431	MAMANI CARIAPAZA ABEL GONZALO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
607	10703948851	AQUINO VILCA JERALDINE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
608	10704045561	VENTOCILLA VASQUEZ DAVID DANIE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
609	10704305961	SEGUIL LOPEZ JEANPIERRE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
610	10705689283	ALARCON SIMON HERBY CARLOS	AV MANUEK A. ODRIA 1065 - TARM	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
611	10705698592	BECERRA YANTAS CESAR JUNIOR	JUNIN - TARMA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
612	10706280028	MENDEZ ALIAGA DIEGO FRANCO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
613	10707521495	CARBONEL SEMINARIO HAMIR FIESS	PACASMAYO -	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
614	10707779476	CORDOVA YOVERA CINTHYA LIZETH	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
615	10708771754	POLO MOZO HOSWER BENJAMIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
616	10708820704	COSME RUPAY LUZMILA LIZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
617	10709025070	JARAMILLO RIVERA EBER ELIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
618	10710697863	TICLLA HUAMAN YOVER ALEXANDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
619	10710854675	MORE VILCHEZ JORGE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
620	10713433956	ALVAREZ VALENCIA MANUEL ENRIQU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
621	10713510616	ALVAREZ TENA PAULA CECILIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
622	10716253631	BAZAN CANTORIN BLADIMIR STEVEN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
623	10717073245	PUENTE NAVARRO CESAR IVAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
624	10717185558	SERRANO SALINAS GIANCARLO JOSE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
625	10718483846	TABRAJ OSORIO MARITZA MARCELIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
626	10720074007	ROJAS QUIJADA YESSICA MIRELLA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
627	10720111590	DE LA CRUZ PEREZ	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
628	10720175521	BARZOLA AUCAYAURI GRACIANY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
629	10721264578	HUAYNACCERO LOPE TATIANA MILAG	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
630	10721483954	DURAN  CABANILLAS DERLY  NOELY		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
631	10721527374	CRUZ BECERRA ELMER EUCLIDES	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
632	10723587684	ASTUPIÑAN LEON DARWIN DAYER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
633	10724690977	PAZ VERA MAURO JONATHAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
634	10726115899	CAJACHAGUA MENDOZA DEIVE ANDY	JR 9 DE DICIEMBRE 133 C.C. DE 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
635	10726572572	SIMON ESPINOZA ABEL OMAR	VENTANILLA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
636	10726808142	INFANTES CORTEZ RAMIRO ELIAS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
637	10727084652	ALCALDE VASQUEZ VIVIANA ESTEFA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
638	10727881650	PALLI TURPO EFRAIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
639	10728036899	MOGOLLON BACA FRANK KEVIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
640	10728470998	MEDRANO SOTO RODY JUNIOR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
641	10729034652	SALAZAR AREVALO CRISTIAN ANDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
642	10730190161	SUAREZ CEPEDA FRANK ERICKSON	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
643	10731053575	CARRASCO REYNAGA JUAN CARLOS	Av. 27 de Diciembre 867, Villa	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
644	10731429761	PURIS ARROYO MAYER CRISTHIAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
645	10733236065	RODRIGUEZ SOLANO DEYVI ROSINAL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
646	10734163169	CORZO GARCIA KARIN XIOMARA	LOS OLIVOS	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
647	10735030880	RAMIREZ BALDEON CESAR OSHIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
648	10735691720	ROÑA VASQUEZ LUIS ARMANDO	PIURA - PIURA	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
649	10735861781	CERNA BECERRA ANA LISSET	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
650	10736101331	DURAND NEYRA IRRAEL ESAU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
651	10736730800	VILCHEZ RAMOS JHIMY JAIR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
652	10737198516	PEREZ CHAVEZ ROGELIA NATIVIDAD	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
653	10738883271	VELIZ CHAVEZ CRIS JANINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
654	10739770314	RAMOS ROSADO JHONNY OMAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
655	10741339175	SANCHEZ IRARICA GABRIELA ALESS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
656	10741582410	SILVA ANCAJIMA JORGE RONALDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
657	10743742465	ALBERCA DOMADOR IRIS MILAGROS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
658	10744938657	ALCANTARA PEREZ JESUS ORLANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
659	10745013827	PEREZ VASQUEZ CESAR ALEXIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
660	10745456869	FLORES ODICIO JARVER BRADY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
661	10747264673	PALOMINO ORTEGA ROSALINDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
662	10747474341	RAMIREZ PALMA VALERIA ELISA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
663	10749182585	ESPINO AQUIJE JONATHAN DANIEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
664	10749281265	MORALES BAZAN RICHARD JOEL	CALLE LADISLAO ESPINAR 56	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
665	10750612305	FARROMEQUE CRUZ JORDAN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
666	10751824012	SUCLUPE HUANILA YOSELY DORELY	AV GUILLERMO DANSEY 444 PSJE. 	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
667	10751854183	EGOAVIL COLONIO JUAN FRANCISCO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
668	10751855031	HUERTA CASTRO CARLOS DANIEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
669	10753526540	LOPE PEREZ ERICK ALEXANDER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
670	10754301185	SUCLUPE INOÑAN LUIS ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
671	10754804934	REYES RUIZ DUGY HOUSER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
672	10757393021	QUISPE MONTES HUGO RENATO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
673	10757522123	ALVAREZ HUALLPA KARINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
674	10758226943	DE LA CRUZ ROJAS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
675	10758336293	HUAMAN MORON ANDREA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
676	10759452238	VARA SANTA CRUZ REYNERIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
677	10760902590	UCEDA CAICEDO BRANCO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
678	10760989385	GUZMAN BERMUDEZ CARMEN ROSA		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
679	10762436090	TOUZET MALAGA DANIEL HECTOR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
680	10762647929	TAQUIRI HINOSTROZA TARORETH JU	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
681	10763391308	PAUCAR RIVERO DIEGO ARMANDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
682	10763413646	CESPEDES RAMOS ESTIVEN DENILSO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
683	10764727881	SANCHEZ ZORRILLA JOHAN ALBERTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
684	10766538695	JAMANCA FABIAN GABY IRENE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
685	10766858410	GONZALES PEREZ WILY LIDOMAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
686	10767522881	LEGUIA DAMIANO WILFREDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
687	10767602052	CAPARACHIN INGARUCA JORDAN JOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
688	10767815170	CHIROQUE ZAPATA LUIS AUGUSTO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
689	10767858545	SAAVEDRA RUFASTO HENRRY ANTONY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
690	10767914771	PALOMINO ALANIA GIANPOL ORLAND	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
691	10768566521	RAMIREZ TORRES GEAN CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
692	10771837323	RAMOS HUAQUIPACO KEVIN	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
693	10772791611	PANIAGUA ALEJANDRO ANTHONY AND	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
694	10774370655	PAITAMPOMA HUAYCAÑE MARTHA ELY	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
695	10775996868	ADRIANZEN ENCISO KATHERINE AUR	AV ARGENTINA 639 CENTRO COMERC	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
696	10776599871	QUISPE CCOLQQUE JORGE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
697	10777050872	VENTURA BONIFACIO YASMI DANINA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
698	10778034757	MISARI RODRIGUEZ MARIA ANGELIC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
699	10780131816	MEZA GARRIDO ALFREDO JEANPIERE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
700	10783782800	BARZOLA APAZA ADREANE SOLANGE	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
701	10789701852	CANCHANYA VARGAS PAMELA JUANA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
702	10800224778	SANDOVAL NUÑEZ JORGE CARLOS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
703	10800703218	GERONIMO VARGAS RAUL JILVER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
704	10800866265	ESCATE SOTELO JULIO CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
705	10800892185	TIRADO PONCE PATRICIA VERONICA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
706	10800946188	INFANTE TORRES MARIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
707	10802131700	VASQUEZ HUAMAN REINER SAMUEL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
708	10802306852	CALLE  CUTIPA CARLOS VALENTIN		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
709	10803700406	TICONA ANAHUA TITO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
710	10804081351	PALACIOS ROJAS JESUS ANTONIO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
711	10804262119	LEGUIA DAMIANO WILVER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
712	10804442460	RIVAS YAMUNAQUE JOSE LUIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
713	10806129327	MEDINA SAAVEDRA MANUEL HUMBERT		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
714	10806333196	IZURRAGA ARNESQUITO GILMER		NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
715	10806502672	AVALOS ROMUCHO MARCO ANTONIO	AV GUILLERMO DANSEY 425 INT BB	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
716	10806515219	BARAZORDA URRUTIA GARFIELD FRE	PROL. HUAMANGA NRO 1116 - VICT	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
717	10811708386	CORREA OLIMAR ALEC	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
718	15422922579	HUAMANI NINA BELTRAN	JR. SEBASTIAN BARRANCA  NRO 17	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
719	15453660653	FONSECA TOCTO ALBERTO	JR. CAJAMARCA 828 C.P. TEMBLAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
720	15603483089	VILLAVICENCIO LOPEZ LUIS JACIN	AV. DEFENSORES DEL MORRO 1615 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
721	15603827462	SALOM REYES LESVIMAR ALEJANDRA	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
722	15606779906	LOZADA CONTRERAS JOHANA KATHER	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
723	15607691522	BENITEZ PEREZ GLENDER EDUARDO	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
724	15608799343	ALFONZO MORAO JESUS ENRIQUE		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
725	15611754962	CHEN SHENGQIANG	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
726	17102862554	CALERO VALDIVIEZO CARLOS ALBER	AV BOLOGNESI 447 PIURA PIURA P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
727	20100004080	FESEPSA S.A	AV. ELMER FAUCETT T NRO. 390 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
728	20100016681	IMPORTACIONES HIRAOKA S.A.C.	AV. ABANCAY NRO. 594 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
729	20100017491	INTEGRATEL PERÚ S.A.A.	JR. DOMINGO MARTINEZ LUJAN NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
730	20100019940	CONSTRUCCIONES ELECTROMECANICA	AV. ARGENTINA NRO. 1515 Z.I. -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
731	20100020361	COMERCIAL DEL ACERO S.A.C. EN 	AV. ARGENTINA NRO. 2051 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
732	20100030595	BANCO DE LA NACION	AV. JAVIER PRADO ESTE NRO. 249	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
733	20100032458	GRIFOSA S.A.C.	JR. MONTERREY NRO. 373 DPTO. 7	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
734	20100032881	ABA SINGER & CIA. S.A.C.	CAL. MONTE ROSA NRO. 240 DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
735	20100038146	CONTINENTAL S.A.C.	CAL.RENEE DESCARTES NRO. 114 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
736	20100041520	EXIMPORT DISTRIBUIDORES DEL PE	AV. ARGENTINA NRO. 1710 (ALT A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
737	20100041953	RIMAC SEGUROS Y REASEGUROS	CAL.EL PARQUE NRO. 149 INT. PI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
738	20100043140	SCOTIABANK PERU SAA	AV. CANAVAL Y MOREYRA NRO. 522	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
739	20100043573	MURDOCH SISTEMAS S A	JR. CUZCO NRO. 492 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
740	20100047137	UNION YCHICAWA S A	JR. JUNIN NRO. 774 URB. BARRIO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
741	20100047218	BANCO DE CREDITO DEL PERU	CAL. CENTENARIO NRO. 156 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
742	20100049181	TAI LOY S.A.	JR. MARIANO ODICIO NRO. 153 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
743	20100049857	COLD IMPORT S A	AV. ANGAMOS OESTE NRO. 686 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
744	20100053455	BANCO INTERNACIONAL DEL PERU-I	AV. CARLOS VILLARAN NRO. 140 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
745	20100054001	M. ELECTRO S.A.	CAL. VICTOR REYNEL NRO. 797 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
746	20100055318	MANUFACTURAS ELECTRICAS S A	AV. OSCAR R BENAVIDES NRO. 121	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
747	20100056128	AUDAX S A	PJ. ATLANTIDA NRO. 110 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
748	20100066867	MSA DEL PERU S.A.C.	CAL. LOS TELARES NRO. 139 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
749	20100070970	SUPERMERCADOS PERUANOS SOCIEDA	CAL. MORELLI NRO. 181 INT. P-2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
750	20100073308	ELECTROLUX DEL PERU S.A.	CAL.PEDRO A. VENTURO NRO. 312 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
751	20100073723	CORPORACION PERUANA DE PRODUCT	AV. CESAR VALLEJO NRO. 1851 --	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
752	20100075858	GRIFO SAN IGNACIO S.A.C.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
753	20100080932	YOHERSA YOSHIMOTO HERMANOS S.A	AV. AV MEXICO NRO. 1830 URB. U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
754	20100084172	PROMOTORES ELECTRICOS S A	AV. NICOLAS ARRIOLA NRO. 899 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
755	20100105862	BANCO PICHINCHA	AV. RICARDO PALMA NRO. 278 RES	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
756	20100111838	GRIFOS ESPINOZA S A	AV. JAVIER PRADO ESTE NRO. 651	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2575	10239735296	DELGADO CANALES VICTOR	\N	NATURAL	2026-05-19 18:20:39.790396	2026-05-19 18:20:39.790396
757	20100115663	PANDERO S.A. EAFC	AV. DOS DE MAYO NRO. 382 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
758	20100123330	DELOSI S.A.	AV. JAVIER PRADO OESTE NRO. 16	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
759	20100128056	SAGA FALABELLA S A	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
760	20100130204	BANCO BBVA PERU	AV. REP DE PANAMA NRO. 3055 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
761	20100136580	URBANIZADORA JARDIN S A	AV. LAS BEGONIAS NRO. 415 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
762	20100137390	UNION ANDINA DE CEMENTOS S.A.A	AV. ATOCONGO NRO. 2440 URB. JO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
763	20100152356	SERV AGUA POTAB Y ALCANT DE LI	---- AUTOP.RAMIRO PRIALE NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
764	20100165687	FCA NAC DE ACUMULADORES ETNA S	AV. EL PACIFICO NRO. 501 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
765	20100167892	SERVI GRIFOS S A	CAR. PANAMERICANA SUR KM. 14 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
766	20100172543	MOVITECNICA S A	CAL.ELÍAS AGUIRRE NRO. 605 DPT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
767	20100211115	FAB DE CHOCOLATES LA IBERICA S	AV. JUAN VIDAURRAZAGA MENCHACA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
768	20100218551	POSTES AREQUIPA S.A.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
769	20100227461	TRANSPORTES CRUZ DEL SUR S.A.C	AV. FRANCISCO BOLOGNESI NRO. 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
770	20100241022	ACEROS COMERCIALES S C R L	VIA. VARIANTE DE UCHUMAYO KM. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
771	20100244714	TECNIFAJAS S.A.	AV. ARGENTINA NRO. 3006 URB. I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
772	20100246172	CEYESA INGENIERIA ELECTRICA S.	AV. ENRIQUE MEIGGS NRO. 255 Z.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
773	20100263425	ELECTRO CARBON S.A.C.	JR. NAPO NRO. 361 URB. CHACRA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
774	20100276322	EMPRESA METAL MECANICA S A EME	CAL. SECCION 08 NRO. S/N. URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
775	20100291551	SEIN S.R.L.	CAL. CARLOS PEDEMONTE NRO. 129	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
776	20100296439	IGARDI HERRAMIENTAS S.A.	AV. JAVIER PRADO ESTE NRO. 113	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
777	20100302005	FAMETAL S.A.	JR. ANTONIO BAZO NRO. 1528 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
778	20100402727	UNITRADE S.A.C.	AV. NESTOR GAMBETTA NRO. 8651 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
779	20100406986	DISTRIBUIDORA PERFECTION S.A.C	CAL. MARCHAND NRO. 129 RES. SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
780	20100675961	COMERCIAL E INDUSTRIAL BRANFIS	MZA. O LOTE. 1B COO. LAS VERTI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
781	20100686814	OLVA COURIER S.A.C	AV. GRAL.ALVAREZ DE ARENALES N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
782	20100725658	CERRADURAS NACIONALES S.A.C.	CAR. PANAMERICANA SUR -SUBLT 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
783	20101036813	BANCO INTERAMERICANO DE FINANZ		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
784	20101120792	LOGYTEC S.A.	CAL. CL. ISIDORO SUAREZ NRO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
785	20101128777	DHL EXPRESS PERÚ S.A.C.	CAL.1 MZA. A LOTE. 6 (HABILITA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
786	20101214771	RESTAURANTE RECEPCIONES CHEPIT	AV. GERMAN AGUIRRE NRO. 982 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
787	20101231195	REPRESENTACIONES INTERNACIONAL	AV. PERU NRO. 3954 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
788	20101253164	LUIS RAPUZZI ALBERTIS S.A.C.	CAR. PANAMERICANA SUR NUEVA KM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
789	20101259448	COOPERATIVA DE SERVICIOS MULTI	JR. PACHACUTEC NRO. 2052 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
790	20101266819	CAMARA DE COMERCIO DE LIMA	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
791	20101267467	ASOCIACION PERUANO JAPONESA	AV. GREGORIO ESCOBEDO NRO. 803	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
792	20101281371	DUN & BRADSTREET S.A.C.	AV. VICTOR ANDRES BELAUNDE NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
793	20101341616	GERMANIA AUTOMOTRIZ S.A.C.	AV. ANGAMOS ESTE NRO. 1869 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
794	20101345107	MIGUEL ANGEL CONTRATISTAS GENE	JR. VASARI NRO. 188 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
795	20101351921	COMPAÑIA ELECTRO ANDINA S.A.C.	CAL. EL HIERRO NRO. 162 URB. I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
796	20101387101	CIME INGENIEROS S R L	CAL. GAMMA NRO. 180 URB. PQUE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
797	20101400990	MANUFACTURAS INDUSTRIALES MEND	CAL.OMICRON NRO. 105 URB. PARQ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
798	20101484212	REFRIGERACION RENZO S A	AV. O.R.BENAVIDES (COLONIAL) N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
799	20101635873	SIM CONTRATISTAS GENERALES E.I	PJ. CRUZ DEL SUR MZA. K1 LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
800	20101639275	IPESA S.A.C.	AV. NICOLAS AYLLON NRO. 2241 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
801	20101643621	LA LIGURIA S A	AV. AV ARICA NRO. 281 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
802	20101904874	MAMBRINO S.A.C.	AV. FELIPE PARDO Y ALIAGA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
803	20102120061	L T R ELECTRONICA S A	JR. DANTE NRO. 708 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
804	20102211457	ACEROS INDUSTRIALES ACRIMSA S.	JR. MCAL LUZURRIAGA NRO. 533 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
805	20102427891	TURISMO CIVA S.A.C.	JR. SANCHO DE RIVERA NRO. 1184	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
806	20102708394	ELECTRONOROESTE S.A	CAL. CALLAO NRO. 875 PIURA - P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
807	20102827059	INGENIERIA TECNICA EIRL	JR. MOQUEGUA NRO. 770 PIURA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
808	20102881347	CAJA MUNICIP.AHORRO Y CREDITO 	---- PLAZA DE ARMAS NRO. 138 -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
809	20102931387	GRIFO VIGMA SRL	PRO. AV. SANCHEZ CERRO KM. 05 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
810	20103365628	DISTRIBUCIONES OLANO S.A.C.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
811	20103626448	EMPRESA DE TRANSPORTES CHICLAY	AV. JOSE LEONARDO ORTIZ NRO. 0	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
812	20106620106	COLEGIO DE CONTADORES PUBLICOS	AV. GENERAL ANDRES DE SANTA CR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
813	20106897914	ENTEL PERU S.A.	AV. REPUBLICA DE COLOMBIA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
814	20107717651	TECNICA INDUSTRIAL LOLI SAC	AV. COLONIAL NRO. 1933 URB. TR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
815	20108605392	ZAMTSU CORPORACION SRL	JR. ENRIQUE BARRON NRO. 1065 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
816	20108725614	FABRICANTES Y CONSTRUCTORES S.	AV. INDUSTRIAL NRO. 3360 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
817	20108730294	MAYORSA S.A.	AV. EL POLO NRO. 670 DPTO. 803	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
818	20109068498	CESCE PERU S.A. COMPAÑIA DE SE	AV. VICTOR ANDRES BELAUNDE NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
819	20109072177	CENCOSUD RETAIL PERU S.A.	CAL.AUGUSTO ANGULO NRO. 130 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
820	20109284786	ANEGADA S.A.C.	AV. JAVIER PRADO ESTE NRO. 311	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
821	20109453057	ECOLOGIA Y TECNOLOGIA AMBIENTA	AV. PETIT THOUARS NRO. 4957 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
822	20109980855	GRIFO DENNIS S.A.C.	AV. DEL PINAR NRO. 180 INT. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
823	20110108223	GRILL TABARIS S.A.	JR. RUFINO TORRICO NRO. 799 LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
825	20110964928	SCHARFF INTERNATIONAL COURIER 	CAL.LOS CEDROS NRO. 143 FND. B	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
826	20111451592	RED CIENTIFICA PERUANA	JR. GONZALES PRADA NRO. 585 LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
827	20111629758	K Y T SOCIEDAD ANONIMA CERRADA	AV. PERU NRO. 3207 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
828	20111740438	SONEPAR PERU S.A.C.	AV. REPUBLICA DE PANAMÁ NRO. 3	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
829	20112273922	TIENDAS DEL MEJORAMIENTO DEL H	AV. ANGAMOS ESTE NRO. 1805 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
830	20112401351	INVERSIONES E INDUSTRIAS MIRFE	JR. HEFESTOS NRO. 135 URB. OLI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
831	20113196531	RPS VENTAS Y REPRESENTACIONES 	JR. RAMON CASTILLA NRO. 450 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
832	20113233835	REPUESTOS GUTIERREZ HNOS S.R.L	AV. PERU NRO. 3892 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
833	20114111342	AMERICA EXPRESS S.A.	AV. 28 DE JULIO NRO. 1192 ----	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
834	20114931811	DISTRIB.Y REPRESENTACIONES S.A	CAL. LOS GAVILANES NRO. 150 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
835	20119223173	EMP.DE SERV.TURISTICOS COPACAB	CAL.ARIAS Y ARAGUEZ NRO. 370 T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
836	20120507711	EMPE TRANSP SALAZAR EIRL ETRAN	AV. MARISCAL CASTILLA NRO. 161	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
837	20120576365	ESTAC.DE SERV.VILLA RICA DE OR	AV. MARISCAL CASTILLA NRO. 331	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
838	20121797314	CONSEGESA S.A.	JR. ARICA NRO. 290 URB. LA MER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
839	20122486100	PROMOTORA KAUKI SR LTDA	JR. COTABAMBAS NRO. 338 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
840	20123812477	GALDIAZ S.A.C.	JR. PUNO NRO. 638 URB. BARRIOS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
841	20125356517	COMPUTADORAS Y TELECOMUNICACIO	JR. LARRABURE Y UNANUE NRO. 17	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
842	20125379304	EMP DE TRANS NUESTRA SEÑORA DE	AV. 28 DE JULIO NRO. 1581 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
843	20126115793	COMERCIAL CELA E.I.R.LTDA	AV. SOTO BERMEO NRO. 320 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
844	20127765279	COESTI S.A.	AV. CIRCUNVALACION DEL CLUB G 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
845	20127780154	REPUESTOS UNIVERSO SRL	AV. EDUARDO DE HABICH NRO. 276	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
846	20129646099	ELECTROCENTRO S.A.	JR. AMAZONAS NRO. 641 URB. CER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2613	20612122416	CONSORCIO HUANCAVELICA	\N	JURIDICA	2026-06-24 14:29:13.000606	2026-06-24 14:29:13.000606
847	20131023414	MINIST.DE TRABAJO Y PROMOCION 	AV. SALAVERRY NRO. 655 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
848	20131044179	TECNIMPORT S.A.	CAL.LAS VIOLETAS NRO. 350 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
849	20131257750	SEGURO SOCIAL DE SALUD	AV. DOMINGO CUETO NRO. 120 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
850	20131312955	SUPERINTENDENCIA NACIONAL DE A	AV. GARCILASO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
851	20131369558	MUNICIPALIDAD PROVINCIAL DEL C	JR. PAZ SOLDAN NRO. 252	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
852	20131370998	MINISTERIO DE EDUCACION	CAL. DEL COMERCIO NRO. 193 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
853	20131376503	SERVIC NAC DE ADIESTRAM EN TRA	AV. ALFREDO MENDIOLA NRO. 3520	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
854	20131719559	DEPOSITO PAKATNAMU S.A.C	AV. AUGUSTO B. LEGUIA NRO. 105	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
855	20132272418	INTERNACIONAL DE TRANSPORTE TU	AV. TUPAC AMARU NRO. 1198 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
856	20133605291	EMPRESA DE TRANSPORTES AVE FEN	AV. TUPAC AMARU NRO. 185 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
857	20133840533	INDECOPI	CAL.DE LA PROSA NRO. 104 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
858	20133860992	FIJEDA EIRL	JR. PUNO NRO. 638 LIMA - LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
859	20134092263	EMPRESA GRUPO QUINTO S.A.	AV. UNIVERSITARIA MZA. LL LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
860	20135414931	EMPRESA DE TRANSPORTE TURISTIC	JR. MANUEL CISNEROS NRO. 492 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
861	20137976171	WELLCO PERUANA S.A.	JR. CONCHUCOS NRO. 510 OTR. BA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
862	20139543301	FORMAS METALICAS S.A. FOMETSA	AV. ARGENTINA NRO. 915 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
863	20140441083	TIRE SOL S.A.C.	JR. MCAL. JOSE DE LA MAR NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
864	20140537781	AISLA PERU S.A.C.	JR. RECUAY NRO. 962 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
865	20141151968	SYZ COMINSA S.R.L.	JR. HUANTAR NRO. 272 URB. CHAC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
866	20141189850	CONECTA RETAIL S.A.	AV. LUIS GONZALES NRO. 1315 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
867	20145038384	AQA QUIMICA SOCIEDAD ANONIMA	AV. GENERAL GARZON NRO. 2210 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
868	20145913544	SERVICIO DE PARQUES DE LIMA SE	AV. LOS PARQUES NRO. 251 FND. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
869	20147720492	LABORATORIOS ROE S.A	CAL. ESTADOS UNIDOS NRO. 741 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
870	20148092282	UNIVERSIDAD NACIONAL MAYOR DE 	CAL.GERMAN AMEZAGA NRO. 375 OT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
871	20153430366	RQF ELECTRO SERVICE S.A.C.	JR. JORGE CHAVEZ NRO. 155 (ALT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
872	20155945860	PONTIFICIA UNIVERSIDAD CATOLIC	AV. UNIVERSITARIA NRO. 1801 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
873	20160404796	INVERSIONES Y COMERCIALIZACION	AV. JAVIER PRADO ESTE NRO. 488	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
874	20168217723	COMERCIALIZADORA INDUSTRIAL LA	AV. LA MOLINA NRO. 448 URB. EL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
875	20171344264	REGION JUNIN SALUD TARMA	AV. PACHECO NRO. 362 JUNIN - T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
876	20175642341	ESTACION DE SERVICIOS SAN JOSE	AV. GRAU NRO. 1602 PIURA - PIU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
877	20184784476	GRIVAR S.A.	AV. DEFENSORES DE LIMA NRO. 63	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
878	20184861217	COLEGIO DE INGENIEROS DEL PERU	AV. J. BALTA NRO. 581 LAMBAYEQ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
879	20193696920	MAQUINARIAS JAAM S.A.	JR. LAMPA NRO. 990 URB. CERCAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
880	20196437194	SERVICENTRO JOSE GALVEZ S.A.	AV. LIMA NRO. 1455 URB. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
881	20200162723	ELECTROMECANICA EL DETALLE SRL	AV. PACHACUTEC MZA. G1 LOTE. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
882	20201298327	EMPRESA DE TRANSPORTES DORA EI	AV. SANCHEZ CERRO NRO. 1387 (F	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
883	20202380621	MAPFRE PERU COMPAÑIA DE SEGURO	AV. 28 DE JULIO NRO. 873 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
884	20203530073	SERVICENTRO SAN HILARION S.A.	AV. FLORES DE PRIMAVERA NRO. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
885	20208427173	DATA LOCK E I R L	AV. INCA GARCILAZO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2609	10431606653	CRISTHIAN ORLANDO LOPEZ TALLEDO	\N	NATURAL	2026-05-25 17:58:33.472779	2026-05-25 17:58:33.472779
886	20208921020	INDUSTRIAS BRIANTEA S.R.L.	JR. HELIO NRO. 5743 URB. INDUS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
887	20210975862	OPERACIONES Y SERVICIOS GENERA	AV. CAMINOS DEL INCA MZA. N LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
888	20211606798	ALEJANDRO MELGAREJO COLOR E I 	JR. QUILCA NRO. 535 URB. PERU 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
889	20211614545	UNIVERSIDAD PERUANA DE CIENCIA	AV. ALONSO DE MOLINA NRO. 1611	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
890	20212334554	EQUIPOS Y HERRAMIENTAS S.A.C.	AV. JAVIER PRADO ESTE NRO. 112	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
891	20216185197	REPUESTOS LADERA EMPRESA INDIV	AV. FCO DE PAULA OTERO NRO. 43	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
892	20221084684	REDONDOS S A	AV. LOS CONQUISTADORES NRO. 11	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
893	20221429924	NEGOCIOS ANTON SRL	----TIENDAS NRO. 28 INT. 29 CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
894	20224206071	ARTE ANDINO SRLTDA	CAR. CENTRAL NRO. 2310 C.P.M. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
895	20228051854	COLEG DE INGENIER DEL PERU CON	CAL. LOS NARDOS NRO. 141 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
896	20228985237	ESTACION DE SERVICIOS SAN JOSE	CAL. MANUEL ALMENARA NRO. 115 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
897	20250122323	APLICACIONES DE INGENIERIA Y C	AV. REPUBLICA DE COLOMBIA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
898	20251549835	ELECTRO ENCHUFE SOCIEDAD ANONI	AV. BENAVIDES MRCAL OSCAR R. N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
899	20255390288	SISTEMA 10 S.A.C.	AV. SAN BORJA SUR NRO. 754 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
900	20255391179	COSTOS S.A.C	AV. SAN BORJA SUR NRO. 754 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
901	20256498422	CISTRONIX PERU S.A.C.	AV. VÍA DE EVITAMIENTO NRO. 16	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
902	20257914365	SERGESSA INGENIEROS S.R.L.	AV. GENERAL HOYOS RUBIO NRO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
903	20261951950	INDUSTRIA ALIMENTARIA EL GRAN 	AV. LOS DOMINICOS NRO. 490 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
904	20263635869	EDUARDO LUIS FERNANDO SOCIEDAD	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
905	20264234906	AMERICATEL PERU S.A.	AV. CANAVAL Y MOREYRA NRO. 480	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
906	20266352337	PRODUCTOS TISSUE DEL PERU S.A.	AV. SANTA ROSA NRO. 550 URB. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
907	20266391154	AUTO BOUTIQUE ML. E.I.R.L.	AV. TOMAS MARSANO NRO. 1142 BA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
908	20267073580	SUPERINT. NAC. DE LOS REGISTRO	AV. PRIMAVERA NRO. 1878 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
909	20267390631	B & L ASOCIADOS SOCIEDAD ANONI	JR. SAN MARTIN NRO. 472 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
910	20268214527	SIGELEC S.A.C.	AV. OSCAR R. BENAVIDES NRO. 52	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
911	20269315688	DISTRIBUIDORA MESAJIL HNOS S.A	AV. REPUBLICA DE COLOMBIA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
912	20269520699	HERTS SERVICIOS INTEGRALES S.A	AV. DEL PARQUE NORTE NRO. 336 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
913	20269985900	PLUZ ENERGÍA PERÚ S.A.A.	CAL. CESAR LOPEZ ROJAS NRO. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
914	20273361325	EXPRESO SAN ROMAN S.A.C.	AV. KENNEDY NRO. 1708 URB. 200	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
915	20280820025	ESTUDIO CONTABLE Y S.M. CHUQUI	JR. PASCO NRO. 464 JUNÍN - TAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
916	20286155074	TRANSVIZA INTERNACIONAL SOC DE	AV. CIRCUNVALACION NORTE NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
917	20293331066	PRECISION PERU S.A.	VIA EXPRESA LUIS FERNAN B NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
918	20293389811	INVERSIONES BOREAL S.A.	AV. ARAMBURUANDRES NRO. 904 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
919	20296217213	TECNOLOGIA INDUSTRIAL MERCANTI	CAL. EL ROSARIO NRO. 685 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
920	20298736820	INVERSIONES UCHIYAMA SOCIEDAD 	AV. LA MAR NRO. 2382 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
921	20299922821	BB TECNOLOGIA INDUSTRIAL S.A.C	CAL.6 MZA. DLOTE. 15INT. 2PIS 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
922	20300925970	FERRETERIA & AGREGADOS CONTRER	---- D.A CARRION NRO. 934 A.H.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
923	20301734574	CONVERTIDORA DEL PACIFICO E.I.	CAL. CAMILO DONGO Y DONGO NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
924	20303180720	SIEMENS ENERGY SOCIEDAD ANONIM	AV. DOMINGO ORUE NRO. 971 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
925	20305853641	ALIAGA & BALUIS S.A.C.	AV. PEDRO JOSE MIOTA NRO. 883 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
926	20306637305	REPRESENTACIONES MARTIN S.A.C	PQ. INDUSTRIAL NRO. K-2 INT. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
927	20307214386	INDUSTRIAS MANRIQUE S.A.C.	CAL.LOS TORNOS NRO. 259 URB. E	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
928	20308429521	COMERCIAL CAPILLO SCRL	AV. NICOLAS DUENAS NRO. 1074 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
929	20308556124	HM INVERSIONES Y SERVICIOS S.A	AV. CANTO GRANDE NRO. 401 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
930	20312239117	AQP EXPRESS CARGO S.A.C.	CAL.AERONAVES NRO. 220 URB. FU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
931	20314958901	TURISMO NEGREIROS S.A.	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
932	20318171701	J.CH.COMERCIAL S.A.	AV. TOMAS MARSANO NRO. 900 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
933	20321656057	SOBA SERVICIOS GENERALES E.I.R	MZA. 11 LOTE 08 ---- LIBERACIO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
934	20326229921	N.H. E.I.R. LTDA.	JR. AMAZONAS NRO. 618 CAJAMARC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
935	20328327849	EMPRESA DE TRANSPORTES SUR-QUE	NRO. -- INT. 17 TERMINAL TERRE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
936	20329790682	CLASS COMPLEMENTS SAC	AV. JOSE A. LARCO NRO. 580 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
937	20332970411	PACIFICO COMPAÑIA DE SEGUROS Y	AV. JUAN DE ARONA NRO. 830 OTR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
938	20335757697	WO SOCIEDAD ANONIMA	AV. GUILLERMO PRESCOTT NRO. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
939	20337511172	SERVIS PIURA S.A.	AV. 28 DE JULIO NRO. 1178 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
940	20337564373	TIENDAS POR DEPARTAMENTO RIPLE	AV. LAS BEGONIAS NRO. 545 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
941	20337682066	INDUSTRIAS DEL ZINC SA	CAL. OMICRON NRO. 105 URB. PAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
942	20337787755	BRAMMERTZ INGENIEROS S.A.	AV. JOSE PARDO NRO. 182 INT. 9	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
943	20341257167	GLOBALTEC S.A.C.	JR. NIQUEL NRO. 240 URB. INDUS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
944	20341841357	LATAM AIRLINES PERU S.A.	CAL. ARICA NRO. 628 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
945	20342440143	LUCE MEDIC S.A.	JR. JOSE DE RIVADENEYRA NRO. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
946	20343081368	SERVICENTRO SANTA CECILIA S.A.	AV. BOLIVAR NRO. 499 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
947	20343877294	DIN AUTOMATIZACION S.A.C.	AV. AURELIO GARCIA Y GARCIA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
948	20343883936	ESTACION DE SERVICIO NIAGARA S	JR. ELVIRA GARCIA Y GARCIA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
949	20347100316	ADIDAS PERU S.A.C	AV. 28 DE JULIO NRO. 1011 INT.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
950	20348687191	WURTH PERU S.A.C.	AV. LOS INGENIEROS NRO. 142 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
951	20349319331	PROCESOS DE SOLDADURAS ESP.Y S	CAL.LAS FLORES NRO. 205 (.) LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
952	20352931323	GRIFO TOBI EIRL		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
953	20354216028	YMYS ELECTRONICS S.A.	CAL. SINCHI ROCA NRO. 329 LA L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
954	20358941363	TRANSPORTES TURISMO IMPERIAL S	AV. NICOLAS AYLLON NRO. 1352 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
955	20363863711	ACEROS CORPORATIVOS S.A. CERRA	AV. IGNACIO MERINO NRO. 2134 D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
956	20370146994	CORPORACION ACEROS AREQUIPA S.	CAR. PANAMERICANA SUR NRO. 241	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
957	20370508659	GRIFO J.H.P. E.I.R.LTDA.	AV. AVIACION NRO. 9 AREQUIPA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
958	20372931214	A-1 PREMIUM E.I.R.L.	CAL. MANUEL M DE GUIRIOR NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
959	20373008533	SAEG PERU S.A.	AV. JAVIER PRADO ESTE NRO. 476	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
960	20376303811	DOE RUN PERU S.R.L. EN LIQUIDA	AV. CAMINO REAL NRO. 456 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
961	20378157138	SHALOM EXPRESS S.A.C.	CAL.ANTONIO RAYMONDI NRO. 117 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
962	20378890161	RASH PERU S.A.C.	AV. SALAVERRY NRO. 3310 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
963	20380976952	INGENIERIA FERRETERA INDUSTRIA	AV. JUAN PABLO II NRO. 228 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
964	20381499627	LLANTA SAN MARTIN S.R.LTDA.	AV. ALFREDO MENDIOLA NRO. 3710	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
965	20382567855	ENTERPRISE SOLUTIONS S.A.	CAL. TIAHUANACO NRO. 146 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
966	20382748566	INTERSEGURO COMPAÑIA DE SEGURO	AV. JAVIER PRADO ESTE NRO. 492	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
967	20383086702	MANTENIMIENTO Y SUPERVISION S.	AV. LIMA NRO. S/N INT. T8,9 CA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
968	20384121838	PROVEJEC S.A.C.	CAL. LOS TALLADORES NRO. 446 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
969	20385817836	DHL EXPRESS ADUANAS PERU S.A.C	CAL. 1 MZA. A LOTE. 06 U. IND 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
970	20386489263	INVERSIONES REIXA S.A.C.	JR. BARTOLOME HERRERA NRO. 858	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
971	20386659959	DUCASSE COMERCIAL S.A.	AV. ROOSEVELT - ANTES REPUBLI 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
972	20387152327	TINSA S.A.C.	AV. VICTOR A. BELAUNDE NRO. 14	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
973	20388853752	MULTI TOP S.A.C.	AV. IQUITOS NRO. 619 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
974	20390900407	MAGIC TECHNOLOGIES E.I.R.L.	AV. ARENALES NRO. 659 (ALT.BAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
975	20391062057	INSTITUTO DE SEGURIDAD MINERA	AV. CANADA NRO. 1221 URB. SANT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
976	20392461630	SERVICIOS Y SOLUCIONES ELECTRO	JR. ICA NRO. 3154 INT. PI2 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
977	20392616269	GRUPO MIRAYA SOCIEDAD ANONIMA 	AV. HUAROCHIRI NRO. 536 INT. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
978	20392810821	M & M OBRAS Y PROYECTOS ESPECI	----CHICLAYO MZA. 2-I LOTE. 40	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
979	20392819291	OCEAN SPA S.A.C.	AV. LA MARINA NRO. 2465 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
980	20392845888	INVERSIONES R. ARROYO SOCIEDAD	AV. LIMA NRO. 1095 URB. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
981	20392959115	INVERSIONES ROSA MARIA E.I.R.L	AV. GUILLERMO DANSEY NRO. 530 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
982	20393153351	JVM E.I.R.L.	JR. TACNA NRO. 727 UCAYALI - C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
983	20393864886	HIPERMERCADOS TOTTUS ORIENTE S	AV. CENTENARIO NRO. 2086 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
984	20395012445	ESTACION DE SERVICIOS PECOLINE	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
985	20396186641	APOSTOL SANTIAGO EL MAYOR EIRL	----CONDOMINIO SAN FRANCISCO M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
986	20396466768	HUEMURA SOCIEDAD ANONIMA CERRA	AV. ESPAÑA NRO. 2419 INT. 201 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
987	20397205828	JC CONST Y MANT EN GNRAL SRL	JR. DANIEL CARRION NRO. 65 LA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
988	20402098164	CORPORACION DE MULTISERVICIOS 	AV. ADOLFO VIENRICH NRO. S/N J	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
989	20402312859	NEGOCIACIONES CVQ EIRL	CAR. CENTRAL KM. 164 JUNIN - Y	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
990	20406520511	ELECTRONIC MIHABA CORPORATION 	JR. PASCUAL SACO OLIVEROS NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
991	20408147523	GRIFO BARRANCA VIP S.A.C.	CAR. PANAMERICANA NORTE KM. 19	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
992	20411022413	GRAN RESTAURANT EL ZARCO S.R.L	JR. DEL BATAN NRO. 170 CAJAMAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
993	20411366856	TRANSPORTES Y SERVICIOS INCA A	CAL.CUMBE MAYO NRO. 142 BAR. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
994	20414668713	ESTACION DE SERVICIOS AVIACION	AV. AVIACION NRO. 2680 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
995	20414675761	FERRIER S.A.	JR. PIETRO TORRIGIANO NRO. 166	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
996	20415721677	CIA CAMPORSAL S.A.	AV. GUILLERMO DANSEY NRO. 471 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
997	20417752979	CORPORACION GEAMAR S.A.C.	AV. CARLOS IZAGUIRRE MZ D LT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
998	20418140551	ALBIS SOCIEDAD ANONIMA CERRADA	CAL. VICTOR ALZAMORA NRO. 147 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
999	20418639513	ELECTRO VOLT INGENIEROS S.A	CAL.J MZA. E2 LOTE. 9 Z.I. CIU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1000	20418896915	MAPFRE PERU COMPAÑIA DE SEGURO	AV. 28 DE JULIO NRO. 873 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1001	20419387658	CEMENTOS PACASMAYO S.A.A.	CAL.LA COLONIA NRO. 150 URB.EL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1002	20419754154	RADIO SYSTEMS S.A.	CAL.MANUEL FUENTES NRO. 339 LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1003	20422096605	UNION PAK DEL PERU S.A.	JR. FLORA TRISTAN NRO. 310 (OF	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1004	20426838924	TURISMO OXABUSS E.I.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1005	20428543875	DERK S.A.C.	CAL. LAS PALOMAS NRO. 225 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1006	20430578805	BECTEK CONTRATISTAS S.A.C.	MZA. A LOTE 2 URB. LOS PORTALE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1007	20430907043	KEY CLUB S.A.	CAL.LOS ZORZALES NRO. 144 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1008	20431080002	S.G NATCLAR S.A.C	CAL. LOS COLIBRIES NRO. 104 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1009	20432168213	INVERSIONES HOUSE CHICKEN S.A.	AV. MARISCAL LUIS ORBEGOSO NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1010	20432420834	IMPORTADORA Y DISTRIBUIDORA DE	AV. RAMON CARCAMO NRO. 506 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1011	20432930875	PROY.REPAR.ELECTRO.INDUST.INGE	CAL.SAN AURELIO MZA. 1 H LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1012	20433172371	GRUPO CARLITOS SOCIEDAD ANONIM	CAL. HUAROCHIRI NRO. 649 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1013	20433661495	CORP.DE VIDRIOS Y ALUMINIOS CO	PROLONG.LUNA PIZARRO NRO. 1581	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1014	20434327611	SUPERTEC S.A.C.	CAL.RICARDO FLORES NRO. 358 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1015	20438637380	TURISMO DIAS S.A.	AV. NICOLAS DE PIEROLA NRO. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1016	20438760238	CONSORCIO FERRETERO DIEZ SOC.C	CAL. LADISLAO ESPINAR NRO. 146	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1017	20438791621	DISTRIBUIDORA PINTEL SAC	AV. CESAR VALLEJO NRO. 271 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1018	20438933272	TRANSPORTES LINEA S.A.	AV. DANIEL A.CARRION NRO. 140 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1019	20439382075	VICA SOCIEDAD ANONIMA CERRADA	AV. CESAR VALLEJO NRO. 722 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1020	20440232451	SAGAL SAC	JR. LADISLAO ESPINAR NRO. 13 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1021	20440267590	EFICIENCIA EN SISTEMAS ESPECIA	CAL.JOSE ORBEGOSO MZA. E LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1022	20440330381	L.C.F. DISTRIBUCIONES Y SERVIC	CAL.LOS CONDORES MZA. D LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1023	20440332839	EMPRESA DE TRANSPORTES LOS AND	PJ. HOSPITAL NRO. 109 LA LIBER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1024	20440491473	SEGURIDAD Y SERVICIOS MULTIPLE	MZA. E3 LOTE. C3 INT. PH1 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1025	20443509128	EMP.TRANSP.PASJ. VIRGEN DE LA 	AV. VIENRICH NRO. 664 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1026	20443848178	EMPRESA DE TRANSPORTES TICLLAS	AV. FERROCARRIL NRO. 1590 JUNI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1027	20444654008	MULTISERVICIOS DON PEPE E.I.R.	JR. CALLAO NRO. 541 JUNIN - TA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1028	20444870711	INVERSIONES LOS ANGELES E.I.R.	AV. MANUEL A ODRIA NRO. 582 JU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1029	20445788679	RESTAURANT TURISTICO Y CEVICHE	MZA. F LOTE. 23 P.J. VILLA MAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1030	20447823838	AMERICA CEL PERU SOCIEDAD COME	JR. MARIANO E. NUÑEZ NRO. 301 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1031	20448375952	INVERSIONES & MULTISERVICIOS S	JR. UNION NRO. 113 CERCADO PUN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1032	20448661378	SAN JOSE DISTRIBUCIONES GENERA	JR. SAN ROMAN NRO. 156 CERCADO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1033	20448661459	SERVICIOS NUESTRA SEÑORA DEL C	JR. SAN ROMAN NRO. 158 CERCADO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1034	20449239394	EVOLUTION CAR SERVICE EIRL	AV. NICOLAS ARRIOLA NRO. 2291 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1035	20449248202	SIDERAL E.I.R.L.	MZA. A LOTE. 12 TERMINAL DE CA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1036	20449386265	CENTRO MEDICO ESTRELLA DE JERU	MZA. 3 LOTE 05 URB. VILLA MARI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1037	20449422083	ANDY DISTRIBUCIONES E.I.R.L.	JR. ZEPITA NRO. S/N MOQUEGUA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1038	20450207978	INMOBILIARIA ALTAVISTA E.I.R.L	JR. SINCHI ROCA NRO. 263 SAN M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1039	20451651839	EMPRESA TRANSPORTE Y SERVICIOS	CAL. 9 MZA. M LOTE 14 ---- ASO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1040	20451669291	LEPSAC ELECTRICA PERUANA S.A.C	AV. AREQUIPA NRO. 1388 INT. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1041	20451759109	BRANNEL ELECTRIC SRL	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1042	20451791762	MINACEROS S.A.C.	AV. VICTOR SARRIA ARZUBIAGA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1043	20451826817	ISA INDUSTRIAL S.A.C	CAL. MANUEL SUAREZ NRO. 378 LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1044	20451835999	CIAN Y MAGENTA SOCIEDAD ANONIM	AV. BOLIVIA NRO. 148 INT. 2007	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1045	20452669740	SERVICENTRO ORDESUR S.A.C.	CAR. PANAMERICANA SUR KM. 196 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1046	20453639968	ESTACION DE SERVICIOS CRYSMAR 	CAL. SAN MARTIN MZA. 10 LOTE 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1047	20453744168	GOBIERNO REGIONAL CAJAMARCA	JR. SANTA TERESA DE JOURNET NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1048	20453957749	LA NUEVA PALOMINO SRL.	CAL.LEONCIO PRADO NRO. 122 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1049	20454655274	NEGOCIACIONES RODRIGUEZ  E.I.R	CAL. CONSUELO N° 619   BLOCK E	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1050	20455021040	SERVICIOS MEDICOS GLOBALES SOC	MZA. G LOTE. 15 URB. PEDRO DIE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1051	20455256357	INTEGRASAT SOLUCIONES CENTER S	CAL.AMBROSIO VUCETICH NRO. 130	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1052	20455720991	NEGOCIACIONES VIRGEN DE COPACA	CAL. CONSUELO NRO. 619 DPTO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1053	20455823880	PULSO CORPORACION MEDICA SOCIE	AV. JAVIER PRADO ESTE NRO. 293	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1054	20457948060	XIN XING S.A.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1055	20458378747	AERO GAS DEL NORTE SOCIEDAD AN	CAL. LOS CALIBRADORES MZA. 01 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1056	20458940887	TITANIC REPRESENTACIONES Y SER	CAL. JOSEFINA SANCHEZ NRO. 121	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1057	20459084968	GRIFO ESCORPIO SRL	AV. TOMAS VALLE NRO. S/N CALLA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1058	20459481967	COROIMPORT S.A.C.	AV. LUIS GALVANI MZA. M LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1059	20459980963	SOLIDEZ EMPRESARIAL S.A.	AV. CAMINO REAL NRO. 1050 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1060	20462384433	COMERCIAL. DIMAFER IMPORT EXPO	AV. JORGE BASADRE NRO. 143 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1061	20463059064	MAGNUS IMPERIAL S.R.L.	AV. UNIVERSITARIA NRO. 883 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1062	20463136409	SCORPIO GROUP S.A	JR. HUANTA NRO. 1272 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1063	20466319431	ELECTRONICA INDUSTRIAL DEL SUR	JR. PARURO NRO. 1349 INT. 4 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1064	20466776336	CENTRO CERAMICO LAS FLORES SAC	AV. REPUBLICA DE PANAMA NRO. 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1065	20467534026	AMERICA MOVIL PERU S.A.C.	AV. NICOLAS ARRIOLA NRO. 480 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1066	20468095301	GRAMSA DISTRIBUIDORA S.A.C.	PJ. ASTURIAS NRO. 162 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1067	20470059738	ENERGIA PERUANA S.A.C.	CAR. ANTIGUA PANAMERICANA SUR 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1068	20475120001	BEST SECURITY DEL PERU S.A.C.	JR. RODOLFO BELTRAN NRO. 134 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1069	20475363834	M & M RODAMIENTOS ESPECIALES E	JR. RAMON CARCAMO NRO. 539 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1070	20477167307	TUNESA EXPRES S.A.C.	AV. PROLONG.CESAR VALLEJO NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1071	20477293515	CONSTRUCTORA & SG CUBA S.A.C.	AV. JUAN PABLO II MZA. B LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1072	20477297774	PATRICK CORPORATION & SERVICIO	JR. JOSE BALTA NRO. 414 (EN PA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1073	20477348433	COMDEPA S.R.L	MZA. Ñ LOTE. 02 A.H. LAS PALME	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1074	20477676104	TRANSPORTES SANPAZ E.I.R.L.	CAL. LAS DIAMELAS MZA. A´ LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1075	20477727884	BODEGA Y RESTAURANT LA ROSA NA	AV. ENRIQUE VALENZUELA NRO. 67	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1076	20478102217	TYM INGENIEROS E.I.R.L.	MZA. I-15 LOTE. 5-A C.P MCAL C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1077	20478145960	TEST & CONTROL S.A.C.	AV. SIMON BOLIVAR NRO. 1619 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1078	20479901067	ESTACION DE SERVICIOS NECOLI E	AV. RAMON CASTILLA NRO. 1443 -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1079	20480099215	LUBRICANTES EL REY EIRL	AV. FERNANDO BELAUNDE NRO. 108	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1080	20480214502	TRANSPORTES HERNANDEZ S.A.C.	MZA. 38 LOTE 4A P.J. CHOSICA D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1081	20480951434	LA CASA DEL RETEN EIRL	AV. CESAR VALLEJO NRO. 826 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1082	20480998660	EL RODAJITO S.A.C.	AV. UNION NRO. 1596 URB. ANDRE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1083	20481017719	SEICEN EIRL	JR. LADISLAO ESPINAR NRO. 277 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1084	20481047383	DISTRIBUIDORA BEKARI EIRL	JR. COLON NRO. 203 ---- CERCAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1085	20481064555	AGRICOLA SAN JOSE E.I.R.L.	AV. E. GONZALES CACEDA NRO. 13	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1086	20481102821	LA ESPIGA EIRL	JR. HUASCAR NRO. 30 CERCADO LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1087	20481107629	CATERING MAGPE SAC	CAL. LOS BRILLANTES - ETAPA I 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1088	20481163880	RERMIR SERVICIOS GENERALES S.R	CAL.GRAU NRO. 410 CERCADO LA L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1089	20481397287	SERVIGUER S.A.C.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1090	20481415447	CHIFA TAYPA EIRL	CAL.LIMA NRO. 41 CALLE LIMA LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1091	20481473722	VULCANIZADORA FRANCO EIRL	MZA. H LOTE 29 A.H. EL MILAGRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1092	20481550221	JH & C EMPRESA INDIVIDUAL DE R	AV. 28 DE JULIO NRO. 120 ---- 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1093	20481559015	INVERSIONES CARMELITA EIRL	AV. 28 DE JULIO NRO. SN SEC. C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1094	20481582858	CHICKEN CHICKEN E.I.R.L.	AV. EXEQUIEL GONZALEZ CACEDA N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1095	20481602476	SYG SAC	NRO. 780 CALLE SAN PEDRO(2 PIS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1096	20481694818	LA CASA DEL PERNO SRL	AV. PROLG. UNION NRO. 1987 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1097	20481698562	CHICKEN A LA BRASA E.I.R.L.	JR. LEONCIO PRADO NRO. 40 A CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1098	20481712735	SERVICIOS GENERALES VARNASA SR	CAR.PANAMERICANA MZA. 7 LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1099	20481828792	EMPRESA DE TRANSPORTES TURISMO	AV. AVIACION NRO. S/N INT. 06 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1100	20481892024	FERRETERIA INDUSTRIAL KOU S.A.	AV. CESAR VALLEJO NRO. 839 ARA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1101	20481945322	MORALES - INGENIERO E.I.R.L	JR. SAN MARTIN NRO. 430 LA LIB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1102	20481952027	COMERCIALIZADORA MICHEL S.A.C.	CAL.JOAQUIN OLMEDO NRO. 222 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1103	20482035311	PETROCENTRO LOS SAUCES S.A.C.	AV. PACASMAYO NRO. 705 A.H. LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1104	20482200029	JOMELSA SOCIEDAD ANONIMA CERRA	CAL. VICENTE RAZURI NRO. 339 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1105	20482373128	INVERSIONES & SERVICIOS MULTIP	CAL.01 NRO. 340 A.H. SANTA CEC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1106	20482374281	ALMACENES MARU E.I.R.L	JR. LADISLAO ESPINAR NRO. 17 -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1107	20482374442	CENTRO DE ANALISIS E INVESTIGA	JR. CALLAO NRO. 44 ---- SECTOR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1108	20482614931	BG ELECTRICISTAS INDUSTRIALES 	JR. UNION NRO. 349 BARR. LA IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1109	20482629297	LUBRICENTRO MI GERARDO S.R.L.	AV. E. GONZALEZ CACEDA NRO. 59	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1110	20482662821	HOTEL LIBERTAD S.A.C.	CAL.LEONCIO PRADO NRO. 1 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1111	20482765808	SPIRALL COMPUTER S.A.C	CAL.ADOLFO KING NRO. 54 LA LIB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1112	20483439459	DISTRIBUID.PAPELERA EL OVALO E	AV. GRAU NRO. 495 ---- CENTRO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1113	20483765682	UNIVERSAL SOCIEDAD ANONIMA CER	AV. GRAU NRO. 237 PIURA - PIUR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1114	20484026662	FUMIGACIONES DEL NORTE Y NEGOC	CAL. MONTEVIDEO MZA. 30 LOTE 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1115	20484096369	M & W REPRESENTACIONES SOCIEDA	AV. BOLOGNESI NRO. 384 (COSTAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1116	20484115177	'ARTEX-PERU' EMPRESA INDIVIDUA	CAL.CABO BLANCO NRO. 345 DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1117	20484116734	REPUESTOS Y EMPAQUETADURAS MEM	AV. BOLOGNESI NRO. 410 PIURA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1118	20484170607	COPYCAD SCORPIO SOCIEDAD COMER	---- ESQ.LORETO-HUANUCO NRO. 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1119	20484209741	NEGOCIOS ELENA E.I.R.L	JR. BLAS DE ATIENZA MZA. 208 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1120	20485808583	INVERPAN LA MODERNA SCRL	JR. LOS MINERALES NRO. 407 SEC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1121	20485978829	PUBLICIDAD Y SERVICIOS MULTIPL	JR. HUANUCO NRO. 109 JUNÍN - T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1122	20485979477	TURISMO ZL EXPRESS E.I.R.L.	JR. VIRGEN DE CHAPI NRO. 141 S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1123	20486135272	ESTACION DE SERVICIOS BELLAVIS	CAR. CENTRAL KM. 7 BELLAVISTA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1124	20486255766	INGENIEROS FAVAL CONSULTORES S	JR. SANTA CLORINDA NRO. 1037 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1125	20486356449	TEXAS CITY CONSORCIO S.C.R.L.	AV. MANUEL A. PINTO NRO. 257 J	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1126	20486508303	EMPRESA DE TRANSPORTES MODA S.	CAL. LAS LILAS NRO. 210 JUNIN 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1127	20486588498	FERRETERIA MARANATHA EIRL	JR. MOQUEGUA NRO. 562 JUNÍN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1128	20486681510	MULTISERVICIOS ANDERSON EMPRES	AV. MANUEL A. ODRIA NRO. S/N -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1129	20486696622	SERVICENTROS FYF SEÑOR DE MURU	AV. MANUEL A ODRIA NRO. 1650 -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1130	20486704820	MULTISERVICIOS SEñOR DE QUINUA	AV. JUAN SANTOS ATAHUALPA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1131	20486765454	A C INVERSIONES INTERNACIONALE	CAL. MADRE DE DIOS NRO. 278 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1132	20486766183	NEUMATICOS ALVINO EMPRESA INDI	AV. JOSE GALVEZ NRO. 1196 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1133	20486941287	CONSULTORES Y CONSTRUCTORES  K	JR. ATAHUALPA NRO. 397 JUNIN -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1134	20487244008	SERVICIOS BEPANEL EMPRESA INDI	AV. FRANCISCO DE PAULA OTERO N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1135	20487267393	PAPELERA FIJUL EIRL	JR. AMAZONAS NRO. 243 JUNÍN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1136	20487281621	INVERSIONES Y SERVICIOS ANCIMA	NRO. 279 PFLUCKER (A 3 CUADRAS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1137	20487753654	REPUESTOS Y FRENOS BRAVO S.A.C	CAL. MOTUPE NRO. 102 URB. SAN 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1138	20490243128	S&P CONTRATISTAS GENERALES SOC	CAL. CHACHACOMAYO MZA. A LOTE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1139	20490251902	SIERRA SERVICIOS INDUSTRIALES 	CAR. PANAMERICANA SUR KM. 29.5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1140	20491152371	GRIFO EL SALVADOR SOCIEDAD COM	MZA. 2-LL LOTE. 11 PUERTO ROSA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1141	20491553791	UNIDAD EJECUTORA PROGRAMAS REG	JR. EDUARDO RODRIGUEZ URRUNAG 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1142	20491707853	INSERGET S.R.L.	AV. TAHUANTINSUYO  A-11-C-C-1 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1143	20491864797	CONSORCIO MATERIALES NASCA S.A	AV. LIMA NRO. 2210 A.H. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1144	20491993171	JV & J INVERSIONES S.A.C.	AV. LURIGANCHO NRO. 636 URB. A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1145	20492064298	MANIOPERU SAC	AV. GUILLERMO DANSEY NRO. 660 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1146	20492092313	MAKRO SUPERMAYORISTA S.A.	AV. JORGE CHAVEZ NRO. 1218 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1147	20492302491	RITOCH ELECTRIC IMPORT & EXPOR	AV. AV COLONIAL NRO. 212 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1148	20492513866	IEC CONTRATISTAS GENERALES S.A	AV. LA MARINA NRO. 3285 INT. 3	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1149	20492578305	G & N GRIFOS SOCIEDAD ANONIMA 	AV. JAVIER PRADO ESTE NRO. 591	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1150	20492639452	ELECTRON E.I.R.L.	JR. PARURO NRO. 1357 DPTO. 163	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1151	20492664996	REPUESTOS OLEOCAR SOCIEDAD ANO	AV. VENEZUELA NRO. 1609 URB. C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1152	20492709507	GLOBAL ELECTRONICS PERU S.A.C.	JR. CAMINO REAL NRO. 1801 INT.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1153	20492857794	ELECTROMECANICA SATURNIA E.I.R	MZA. F LOTE 2-3 A.V. LOS HUERT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1154	20493002636	STARSOFT S.A.C.	AV. ELMER FAUCETT NRO. 169 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1155	20493020618	TIENDAS PERUANAS SA	AV. AVIACION NRO. 2405 URB. SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1156	20495602142	V Y R PILANCONES SAC	JR. ANGAMOS NRO. 739 BARRIO CH	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1157	20495683983	SERVICIOS GASTRONOMICOS S.A.C.	JR. GUILLERMO URRELO NRO. 849 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1158	20496514140	ELECTRONICA GONZALES E.I.R.L	CAL.PIZARRO NRO. 335 URB. CERC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1159	20498188584	GOMESUR S.R.L.	AV. LIMA NRO. 506 URB. CERCADO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1160	20498189637	AREQUIPA EXPRESO MARVISUR EIRL	CAL.GARCI CARBAJAL NRO. 511 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1161	20498873457	COMERCIAL INDUSTRIAL LA TORRE 	AV. PROLG.PERU MZA. G37 LOTE 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1162	20499591927	ESTACION DE SERV.CORAZON DE JE	AV. PROCERES DE LA INDEPEN. NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1163	20500095645	SERVICENTROS CELESTE S.A.	AV. QUILCA MZA. E LOTE. 29 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1164	20500242966	AJUSTE PERFECTO S.A.C.	CAL. OMICRON NRO. 340 URB. PAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1165	20501483193	IMPORTACIONES OGA S.A.C.	AV. CANADA NRO. 259 URB. BALCO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1166	20501483517	PARSALUD	AV. JAVIER PRADO OESTE NRO. 21	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1167	20501493156	J & V MULTIUTILES PUNTO COM. S	JR. CAMANA NRO. 1103 CERCADO D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1168	20501683109	CONSORCIO KINZUKO SAC	MZA. J LOTE. 19 URB. BRISAS DE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1169	20501837424	CASTEM EIRL(CAPACITACION Y SER	CAL. SAN FRANCISCO MZA. G LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1170	20502018648	LH ELECTRO-COMPONENTES S.A.	JR. ENRIQUE BARRON NRO. 869 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1171	20502028520	SOS SERVICE S.A.C.	AV. ELMER FAUCETT NRO. 395 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1172	20502113390	FERRETERIA Y MALLAS ABRUS E.I.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1173	20502122461	GESTION Y SISTEMAS DE CALIDAD 	JR. FULGENCIO VALDEZ NRO. 222 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1174	20502132343	INVESUX SRL	AV. ALFREDO MENDIOLA NRO. 5155	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1175	20502257987	CORPORACION VEGA S.A.C.	JR. BELAUNDE OESTE NRO. 198 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1176	20502329724	INDUSTRIALES QUIñONES SOCIEDAD	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1177	20502618751	INVERSIONES JOSELYN Y ALVARO E	AV. PERU NRO. 4213 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1178	20502794648	ESTACION DE SERVICIOS MIRWAL S	AV. MIGUEL IGLESIAS MZA. E LOT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1179	20503258901	MAQUINARIA NACIONAL S.A. PERU	AV. CRISTOBAL DE PERALTA NORT 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1180	20503362121	H Y HE CONTRATISTAS GENERALES 	CAL. HERNANDO DE LUQUE NRO. 16	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1181	20503475244	POLICLINO MARIA MISIONERA E.I.	JR. UCAYALI NRO. 130 (ALTURA P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1182	20503503639	PROYECTO ESPECIAL DE INFRAESTR	JR. ZORRITOS NRO. 1203 LIMA CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1183	20503629900	AUTO RINO SOCIEDAD ANONIMA CER	JR. ANTONIO RAYMONDI NRO. 339 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1184	20503840121	REPSOL COMERCIAL SAC	AV. VICTOR ANDRES BELAUNDE NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1185	20504035728	A & P COMPUTER SERVICES E.I.R.	JR. PUNO NRO. 324 A.H. JOSE GA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1186	20504197469	NEGOCIACIONES SANTA CRUZ S.A.C	AV. JAVIER PRADO ESTE NRO. 630	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1187	20504680623	CORPORACION BAGUETERA S.A.C.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1188	20504809090	KINGAS S.A.C.	OTR.PARCELA E KM. 9.8 MZA. A1 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1189	20504967329	DRAF PERU SOCIEDAD COMERCIAL D	JR. TEJADITA NRO. 330 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1190	20504980694	INVERSIONES EL NISSEI S.A.	JR. AYACUCHO NRO. 820 URB. BAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1191	20505172419	SAFARI IMPORT S.A.C	JR. CANGALLO NRO. 439 (COSTADO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1192	20505365217	EMPRESA DE TRANSPORTES Y TURIS	AV. HUAROCHIRI MZA. G2 LOTE. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1193	20505377142	NORVIAL S.A.	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1194	20505703554	GOBIERNO REGIONAL DEL CALLAO	AV. ELMER FAUCETT NRO. 3970 (F	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1195	20505732571	ABANTO BROS E.I.R.L.	JR. LA CONVENCION NRO. 195 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1196	20506005133	SOLDAMUNDO PERU SOCIEDAD ANONI	AV. LUIS BRAILE NRO. 1225 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1197	20506064814	FIERRO & ACERO CENTER S.A.C.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1198	20506103224	TRANSPORTES MANSILLA S.R.L. - 	CAL.18 MZA. B19 LOTE. 17 ASOC 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2479	10407412945	PIMENTEL SINTI JEANETTE	\N	NATURAL	2026-05-18 15:37:17.0955	2026-05-18 15:37:17.0955
1199	20506151547	ENERGIGAS S.A.C.	AV. SANTO TORIBIO NRO. 173 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1200	20506241881	ASOCIACION UNACEM	AV. ATOCONGO NRO. 3020 CAMPAME	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1201	20506250871	INDUSTRIAS MEGAVISION E.I.R.L.	AV. ALFREDO MENDIOLA NRO. 4622	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1202	20506416435	VIDALAB E.I.R.L	AV. SAN DIEGO DE ALCALA MZA. M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1203	20506436037	A & J INSTALACIONES S.R.L.	Av. Primavera Nro. 607 Dpto. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1204	20506568707	B.C. BEARING PERU S.R.L.	AV. INDUSTRIAL LOTE. 18 URB. L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1205	20506717044	MEMORY KINGS PERU S.A.C.	AV. SANTA CRUZ NRO. 330 URB. C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1206	20506741263	PERU COPIAS E.I.R.L.	AV. AVIACION NRO. 2999 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1207	20507257403	INSTRUMENTS LAB SAC	PJ. PASAJE COLONIAL NRO. 800 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1208	20507340131	SCALE INTERNATIONAL SERVICE S.	MZA. O LOTE. 2 ASOC.SR.D LOS M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1209	20507426281	REPUESTOS JESUS IMPORT SOCIEDA	AV. PERU NRO. 3908 URB. PERU (	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1210	20507634479	EDENRED PERU S.A.	AV. JAVIER PRADO ESTE NRO. 444	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1212	20507850091	GESTION DE SERVICIOS AMBIENTAL	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1213	20507852549	SODEXO PASS PERU S.A.C.	JR. MORELLI NRO. 110 DPTO. 701	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1214	20507913785	GRUPO HUAYTA WANKA S.A.C.	AV. JAVIER PRADO ESTE NRO. 140	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1215	20507926844	CHEM TOOLS SAC	JR. NEON NRO. 5645 URB. INDUST	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1216	20507943340	A.B.IMPORTACIONES INDUSTRIALES	CAL.AUGUSTO DURAND NRO. 2174 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1217	20508043997	NUNJAR SERVICIOS ELECTRICOS E.	JR. ALICIA ALARCON NRO. 407 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1218	20508179031	CONTROL Y TECNOLOGIA S.A.C.	AV. AURELIO GARCIA Y GARCIA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1219	20508196475	PETROCENTRO YULIA S.A.C.	AV. DE LA MARINA NRO. 2789 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1220	20508237171	CARBOMET SOCIEDAD ANONIMA CERR	AV. GUILLERMO DANSEY NRO. 879 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1221	20508312998	PROVEEDOR INDUSTRIAL FERRETERO	AV. GUILLERMO DANSEY NRO. 530 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1222	20508565934	HIPERMERCADOS TOTTUS S.A	AV. ANGAMOS ESTE NRO. 1805 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1223	20508740281	ELECTRONICA TOYAMA S.A.C.	AV. VICTOR SARRIA ARZUBIAGA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1224	20508782013	VILLAS OQUENDO S.A.	301 URB. OCHARAN LIMA - LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1225	20508896701	APOLLOS MARKET SAC.	AV. PROLG IQUITOS/LOS MIRTOS N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1226	20508931621	INVERITAS GLOBAL HOLDINGS PERU	AV. LA ENCALADA NRO. 1257 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1227	20509165701	RECUBRIMIENTOS METALICOS SOLIT	MZA. R LOTE 04 URB. P. VIV.VIR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1228	20509182974	EKONO DRYWALL SAC	AV. REPUBLICA DE PANAMA NRO. 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1229	20509379841	J & F MOTORS SOCIEDAD ANONIMA 	AV. LOS LAURELES LOTE. 4 C.P. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1230	20509460532	LIDERCON PERU SOCIEDAD ANONIMA	CAR. PANAMERICANA SUR KM. 21.5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1231	20509510149	SISTEMA METROPOLITANO DE LA SO	JR. CARLOS CONCHA NRO. 155 (AL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1232	20509550361	LENMEX CORPORATION S.A.C.	AV. LAS CASUARINAS MZA. B LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1233	20509654141	KAPEK INTERNACIONAL S.A.C	CAL.LAS ROSAS NRO. 314 URB. SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1234	20509667129	PARRILLADAS PERUANAS SOCIEDAD 	CAL. JOSE NEYRA NRO. 283 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1235	20509670855	IMPORTACION Y COMERCIALIZACION	AV. ARGENTINA NRO. 1680 INT. 3	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1236	20509971626	THERMOTEK INGENIEROS EMPRESA I	AV. MARISCAL ANTONIO JOSE DE N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1237	20509978710	INVERSIONES GALLA S.A.C.	AV. SAN JOSE NRO. 410 URB. SAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1238	20510049226	MSL DEL PERU SAC	PQ. MANUEL GONZALES PRADA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1239	20510077190	POSTES ESCARSA SOCIEDAD ANONIM	MZA. C LOTE. 10 FND. TAMBO ING	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1240	20510165561	INTRIAL S.A.C.	AV. TOMAS MARSANO NRO. 3951 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1241	20510303467	ACRILICOS SATELITE SRL	AV. LOS EUCALIPTOS LOTE 3-A UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1242	20510339496	ASOCIACION CIVIL JORGE DINTILH	PZA. FRANCIA NRO. 231 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1243	20510413301	ABC INGENIEROS SAC	CAL. MANUEL ASENCIO SEGURA MZA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1244	20510413483	OBRITEC S.A.C.	JR. LOS ALMENDROS NRO. 295 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1245	20510530951	C & C COMPUTER SERVICE S.A.C.	AV. BOLIVIA NRO. 148 INT. 607 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1246	20510616678	GOLDEN ENTERPRISE S.A.C	JR. HUANTA NRO. 1272 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1247	20510673710	IMPLEMENTOS PERU S.A.C.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1248	20510675097	JLI METROLOGY SOCIEDAD ANONIMA	JR. GENERAL FELIPE VARELA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1249	20510684592	FABRIMSA SRL	MZA. 002 LOTE 24 URB. LA HACIE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1250	20510782179	PERFECT IMPRESIONES SOCIEDAD A	AV. DE LOS HEROES NRO. 595 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1251	20510930895	CIA RODAMIENTOS YOHEL S.R.L	JR. MIGUEL ZAMORA NRO. 195 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1252	20510957581	SERVICENTRO SHALOM SAC	AV. EL DERBY NRO. 254 INT. 704	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1253	20511047570	INDUSTRIAS NOVOFIBRAS S.A.C. -	CAL. LOS FORJADORES MZA. G1 LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1254	20511151989	NEO DIGITAL S.A.C.	AV. PETIT THOUARS NRO. 5356 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1255	20511235066	VILLA CHICKEN SAC	AV. DOÑA ROSA NRO. 144 URB. LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1256	20511315337	I.R. ELECTRONIC´S E.I.R.L.	JR. PARURO NRO. 1401 INT. 122S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1257	20511315922	REAL PLAZA S.R.L.	AV. PUNTA DEL ESTE NRO. 2403 (	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1258	20511393648	INTER ANDEAN TRADING SAC	JR. CASTROVIRREYNA NRO. 174 LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1259	20511465061	CONCESIONARIA VIAL DEL PERU S.	AV. JAVIER PRADO ESTE NRO. 410	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1260	20511576726	TECTRONICA S.A.C.	JR. LOS TITANES MZA. O-1 LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1261	20511591105	GRUPO MIGUELITO S.R.L.	AV. SAN JUAN NRO. 1289 URB. CI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1262	20511603049	MILAGRITOS J. G. E.I.R.L.	AV. ARGENTINA NRO. 3093 INT. 0	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1263	20511647259	INSTITUTO PACIFICO SOCIEDAD AN	JR. CASTROVIRREYNA NRO. 224 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1264	20511728411	INVERSIONES NIFLOMAJEKID SOCIE	CAL.RAFAEL HOYOS NRO. 116 ASOC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1266	20511957959	INDUSTRIA METAL ELECTRIC LUREN	CAL. 16 MZA. I LOTE. 12 ASC. D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1267	20511978794	GAS STATION AR SOCIEDAD ANONIM	AV. UNIVERSITARIA NORTE NRO. 9	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1268	20511995028	TERPEL PERU S.A.C.	AV. JORGE BASADRE GROHMANN NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1269	20512002090	MIFARMA S.A.C.	CAL. VICTOR ALZAMORA NRO. 147 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1270	20512051970	DIANA IMPORT E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1271	20512307443	ESTUDIO BECERRA HERNANDEZ ABOG	CAL.LAS AGUILAS NRO. 145 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1272	20512308253	ESTACION SANTA RITA S.A.C.	AV. CANTA CALLAO NRO. S/N LOS 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1273	20512528458	SHALOM EMPRESARIAL S.A.C.	JR. ANTONIO RAYMONDI NRO. 113 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1274	20512531751	KVR3 SOCIEDAD ANONIMA CERRADA 	AV. NICOLAS AYLLON NRO. 2355 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1275	20512550976	AYON INGENIEROS S.A.C.	PJ. 1 DE MAYO NRO. 149 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1276	20512561587	REPRESENTACIONES ABRACEN S.A.C	CAL. UNO MZA. A LOTE 20 URB. R	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1277	20512580611	CORPORACION MERY SRL	JR. HUANCAVELICA NRO. 1300 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1278	20512609458	SALUS LABORIS S.A.C.	AV. JAVIER PRADO ESTE NRO. 248	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1279	20512656375	M Y W AIR COLD PERU SOCIEDAD A	CAL. JUANA ALARCO DE DAMMERT M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1280	20512684824	MULTISERVICIOS SAN LORENZO S.A	AV. QUILCA NRO. 324 URB. AEREO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1281	20512932151	SPARTAN CHEMICAL PERU S.A.C.	CAL. CORPAC NRO. 311 INT. 3-A 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1282	20513014121	REPRESENTACIONES JAVI S.A.C.	AV. UNION COLONIZADORES MZA. ?	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1283	20513068485	FERROSE IMPORT EXPORT S.A.C	AV. ALFONSO UGARTE NRO. 327 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1284	20513074370	BANCO GNB PERU S.A.	CAL. LAS BEGONIAS NRO. 415 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1285	20513171065	PJ LOGISTIC S.A.C.	CAL. CROMO MZA. B LOTE 14-A UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1286	20513192810	P & D INVESTMENT SAC	AV. SAN JOSE NRO. 615 URB. SAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1287	20513275944	EXCETEL SOCIEDAD ANONIMA CERRA	AV. GUILLERMO DANSEY NRO. 330 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1288	20513297328	ITS BUSINESS SOCIEDAD ANONIMA 	JR. COYLLUR NRO. 280 URB. ZARA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1289	20513612371	MARPATECH SAC	AV. LUIS ALDANA URB. SANTA CAT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1290	20513707089	MONTACARGAS ANGEL S.A.C.	CAL. CALLE 4 MZA. N LOTE 8 ---	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1291	20514020575	R & H INDUSTRIAL ROJAS S.A.C.	AV. ARGENTINA NRO. 301 C.C.LA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1292	20514020907	CENTRO COMERCIAL PLAZA NORTE S	AV. SIETE NRO. 229 URB. RINCON	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1293	20514229377	PUBLICENTER PERU S.A.	AV. ALFREDO BENAVIDES NRO. 347	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1294	20514364665	DISTRIMAX SOCIEDAD ANONIMA CER	CAL. LOS CALDEROS NRO. 247 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1295	20514392871	REPRESENTACIONES E INVERSIONES	----SECTOR 2 NRO. S/N INT. 2 G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1296	20514575879	L Y L INDUSTRIAS S.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1297	20514584789	COMPAÑIA NACIONAL DE CHOCOLATE	AV. MAQUINARIAS NRO. 2360 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1298	20514653187	YOSSI TOURS E.I.R.L.	CAL.12 DE JULIO NRO. 209 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1299	20514683256	JAKE CONTRATISTAS GENERALES SO	CAL.MORROPON NRO. 285 P.J. CES	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1300	20514753483	CORPORACION PROMATISA SOCIEDAD	JR. BAMBAS NRO. 451 DPTO. 201 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1301	20514807591	LIDERTEC S.A.C.	CAL.LA MILLA NRO. 218 INT. 4 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1302	20514941212	IMPORT & EXPORT EL TRIUNFO SER	AV. OSCAR R. BENAVIDES NRO. 52	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1303	20514953148	ACECORP INGENIEROS SOCIEDAD AN	MZA. G LOTE 19 ---- A. V. LAS 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1304	20514955434	N & B ELECTRICIDAD INDUSTRIAL 	CAL. 1 MZA. F LOTE 33 URB. ALA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1305	20515109766	ADVANCED METROLOGY S.A.C.	JR. TNTE ARISTIDES DEL CARPIO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1306	20515177923	HALCON VIAJES EXPRESS SOCIEDAD	MZA. H LOTE. 26 URB. LOS CLAVE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1307	20515346113	CORPORACION BOTICAS PERU S.A.C	JR. BALTAZAR GRADOS NRO. 794 (	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1308	20515659324	TURISMO INTERNACIONAL PALOMINO	CAL. IGNACIO COSSIO NRO. 1420 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1309	20515724754	TAPIOLES SAC	AV. PROCERES LA INDEPENDENCIA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1310	20515734555	ACEROS E INDUSTRIAS NAVALES Y 	AV. SARRIA ARZUBIAGA VICTOR NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1311	20515807021	FORWARD SPORT S.R.L.	AV. ABANCAY NRO. 386 INT. 118 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1312	20515999770	CORPORACION CAMAJEA S.A.C.	AV. CANTA CALLAO ESQ NARANJAL 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1313	20516056755	ACCESORIOS REYCEL SRL	AV. ARGENTINA NRO. 5954 CALLAO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1314	20516258111	JURELIZA BIENES Y SERVICIOS S.	CAL.JOSE BAZZOCHI NRO. 361 DPT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1315	20516351081	COMERCIO Y NEGOCIOS POR OBRAS 	JR. PACASMAYO NRO. 425 ---- TA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1316	20516403650	CORPORACION COMATPE SAC	AV. GERARDO UNGER NRO. 5385 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1317	20516446626	REPRESENTACIONES GUERRA SOCIED	JR. PACHITEA NRO. 373 (FTE AL 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1318	20516649578	JAIME OLIVER S.A.C.	CAR.PANAMERICANA SUR NUEVA KM.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1319	20516714817	AQUI ES EIRL	AV. PERU NRO. 3852 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1320	20516752239	BLV INDUSTRIAL SOCIEDAD COMERC	JR. LAMPA NRO. 1021 INT. 178 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1321	20516899761	TRANSPORTES JENNSA SOCIEDAD CO	CAR. CENTRAL KM. 11 URB. SAN J	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1322	20516950031	REPRESENTACIONES COMERCIALES S	AV. LIMA NRO. 2290 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1323	20517182673	MAPFRE PERU S.A. ENTIDAD PREST	AV. 28 DE JULIO NRO. 873 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1324	20517411613	GRUPO FAMEZA S.A.C.	MZA. A1 LOTE. 6 GRU. RESIDENCI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1325	20517439623	LAYHER PERU S.A.C.	AV. LOS EUCALIPTOS LOTE. REF U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1326	20517496341	FARMATELIS S.A.C.	JR. TRUJILLO 253 MZA. 36 LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1327	20517607941	SKY AIRLINE PERU	AV. MANUEL OLGUIN NRO. 325 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1328	20517660249	SEGURIDAD INDUSTRIAL GABIC E.I	AV. GUILLERMO DANSEY NRO. 510 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1329	20517668657	RD RENTAL SOCIEDAD ANONIMA CER	CAL.2 MZA. C LOTE. 06 URB. IND	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2610	10725490009	RODRIGO ORLANDO QUISPE MOLINA	\N	NATURAL	2026-05-25 18:27:56.581547	2026-05-25 18:27:56.581547
1330	20517700640	SIROCO HOLDINGS SAC	AV. VICTOR ANDRES BELAUNDE NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1331	20517705951	PERI - PERUANA SAC	AV. LOS LIBERTADORES NRO. 155 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1332	20517738612	EGMT S.A.	CAL. ASCOPE NRO. 395 INT. 1 --	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1333	20517754499	DIRECCION GENERAL DE ELECTRIFI	AV. LAS ARTES SUR NRO. 260 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1334	20517767396	ESCOH SOCIEDAD ANONIMA CERRADA	AV. ALFREDO BENAVIDES NRO. 155	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1335	20517894070	FERRO IMPORT EIRL	AV. ARGENTINA NRO. 215 INT. 7 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1336	20518153278	PREFABRICADOS ANDINOS PERU S.A	AV. ATOCONGO NRO. 2440 URB. JO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1337	20518202406	UYUSTOOLS PERU LIMITADA SOCIED	JR. JUAN DEL MAR Y BERNEDO NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1338	20518419219	CONSORCIO PERUANO DE LLANTAS S	AV. AVIACION NRO. 4685 RES. HI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1339	20518679121	CORPORACION SERCOPLUS S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1340	20518714563	ELECTROSOL INGENIEROS SOCIEDAD	AV. LOS OLMOS NRO. 499 URB. CA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1341	20518778707	J VEGA IMPORT S.A.C.	AV. MANCO CAPAC NRO. 178 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1342	20518792360	LOY SING S.A.C.	AV. JAVIER PRADO OESTE NRO. 16	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1343	20518968239	HC ASOCIADOS S.A.C.	AV. GARCILASO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1344	20519008981	EUROFLEX PERU S.A.C.	CAL. SALVADOR CARMONA NRO. 192	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1345	20519022461	CONSORCIO ELECTRICO INDUSTRIAL	JR. BAMBAS NRO. 416 RES. CERCA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1346	20519224683	MUNDO CONSTRUCTOR S.A.C.	CAL. LOS EBANISTAS MZA. I1 LOT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1347	20519225221	NANSEI SAC	AV. PERU NRO. 3645 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1348	20519719224	S.G.MIRIAN SRL	MZA. A LOTE 19 A.H. PROMUVI II	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1349	20519752515	GOBIERNO REGIONAL DE TACNA	AV. GREGORIO ALBARRACIN NRO. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1350	20520012428	DISTRIB.GENER.SEÑOR DE LOS MIL	CAL.BILLINGHURST NRO. 664 TACN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1351	20520567136	TRANSPORTES Y SERVICIOS BUSPAR	PJ. HUANCAYO NRO. 123 ASC. MER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1352	20520614312	INVERSIONES PLUS_P S.A.C.	MZA. G LOTE 07 APV. LAS GARDEN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1353	20520683985	POLIPLAST PERU S.R.L.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1354	20520874144	MULTILINEA EN MANIOBRAS SOCIED	JR. VILLON GARCIA,PRESBITERO N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1355	20520929658	AUTOPISTA DEL NORTE S.A.C.	AV. 28 DE JULIO NRO. 150 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1356	20521016893	INVERSIONES VERCELLI DEL PERU 	AV. GUILLERMO DANSEY NRO. 678 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1357	20521094851	DATA SWISS S.R.L. - DSWISS S.R	JR. RIMAC NRO. 621 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1358	20521206242	GRUPO LECCA S.A.C.	AV. GUILLERMO DANSEY NRO. 354 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1359	20521277697	LEC SERVICIOS GENERALES S.A.C.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1360	20521291339	A & S SOLUCIONES INTEGRALES SO	AV. BOLIVIA NRO. 865 URB. BRE?	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1361	20521542943	CONCESION VALLE DEL ZAÑA S.A.	AV. EMILIO CAVENECIA NRO. 151 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1362	20521701090	OFFICE PLAZA S.A.C.	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1363	20521714744	E & F IMPORT S.R.L.	JR. PUNO NRO. 650 INT. 209 CEN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1364	20521833247	CRISANGEL S.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1365	20521850923	GLOBAL SKY  SOCIEDAD ANONIMA C	AV. DE LOS PROCERES NRO. 537 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1366	20522452654	CHEMICAL RUBBER COMPANY S.A.C.	JR. LAS EMPRESA NRO. 146 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1367	20522544001	GRUPO FORTE S.A.C.	AV. ALEXANDER FLEMING NRO. 412	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1368	20522545741	GRUPO PANAMUNDO S.A.C.	JR. DANTE NRO. 618 URB. CERCAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1369	20522547957	CONCESIONARIA VIAL DEL SOL S.A	PJ. HUAURA NRO. 198 URB. SANTA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1370	20522642194	GRUAS ARLIN S.A.C.	MZA. D13 LOTE 31 ---- ASOC.VIV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1371	20522718786	PLACA MASS E.I.R.L.	CAL. 8 MZA. I LOTE 10 ---- APV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1372	20522928918	FILCORSA LIMP E.I.R.L.	AV. MARISCAL OSCAR R. BENAVID 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1373	20522950689	INGENIERIA APLICADA DEL ORIENT	AV. REPUBLICA DE CHILE NRO. 47	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1374	20523035674	INVERSIONES BARLOVENTO E.I.R.L	AV. COSTANERA NRO. 2352 URB. M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1375	20523099648	EMBRAGUES Y REPUESTOS BENVENUT	GARCIA NARANJO NRO. 295 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1376	20523161548	CONCORSA SAC		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1377	20523621212	LIMA EXPRESA S.A.C.	AV. EL DERBY NRO. 250 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1378	20523719298	ENERGIA Y LABORATORIOS S.A.C. 	JR. LOS PALMITOS NRO. 127 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1379	20524148651	INVERSIONES FEPECA S.A.C.	CULTURA PERUANA MODERNA MZA. A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1380	20524196205	ACEROS IMPORT SOCIEDAD ANONIMA	CAL. JAVIER HERAUD MZA. M LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1381	20524280419	GRUPO ALMONACID S.A.C	AV. PROCERES MZA. NN2 LOTE. 5 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1382	20524388376	C & E GRIFOS S.A.C.	AV. UNIVERSITARIA CDR. 52 MZA.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1383	20524777780	PERT INGENIEROS ASOCIADOS S.A.	JR. YANAC NRO. 206 DPTO. 201 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1384	20524846005	COMEXPORT PERU E.I.R.L.	AV. RAMON CARCAMO NRO. 565 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1385	20524893691	SERVICIOS GENERALES BUSINESS T	JR. JUAN GONZALO ROSE NRO. 140	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1386	20524903670	CORPORACION RAIMSA  S.A.C.	MZA. C3 LOTE 09 ---- ASOC.ALAM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1387	20524904480	IMPORTADORA INDUSTRIAL GALLEGO	JR. NICOLAS DE PIEROLA NRO. 14	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1388	20524941172	V.A.F. CCOÑAS SOCIEDAD ANONIMA	AV. PERU NRO. 4124 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1389	20525091491	AEROPOST NETWORK SOCIEDAD ANON	CAL.PADRE URRACA NRO. 276 INT.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1390	20525092896	REMARTEX S.R.L.	----HIPOLITO UNANUE NRO. 1687 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1391	20525107915	MOTORLINK SOCIEDAD ANONIMA CER	CAL. RICARDO ANGULO RAMIREZ NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1392	20525138985	EXPERIAN PERU S.A.C	AV. ENRIQUE CANAVAL Y MOREYRA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1393	20525323961	MATIZADOS DE PINTURAS Y FERRET	JR. BLAZ DE ATIENZA - TIENDA N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1394	20525543570	CENTRO DE ASESORIA Y CAPACITAC	AV. RAMON CASTILLA NRO. 182 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1395	20525579922	PROVEEDOR DE MATERIALES DIVERS	AV. LOS ALGARROBOS MZA. F LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1396	20525954014	RESTAURANT DEL NORTE SOCIEDAD 		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1397	20525988261	FERRETERIA JAIMITO E.I.R.L.	---- TIENDA 25 MZA. S-N LOTE S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1398	20526057687	HOSTAL ORO VERDE S.R.L.	MZA. D LOTE. 12 URB. 04 DE ENE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1399	20526182155	CHIFA WING LUNG E.I.R.L.	AV. GRAU NRO. 1718 URB. MAGIST	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1400	20527147612	GOBIERNO REGIONAL CUSCO	AV. TOMASA TTITO CONDEMAYTA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1401	20528395300	PROENERGY AMAZON S.A.C.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1402	20529361522	SERVICIOS VENTAS & OBRAS E.I.R	EDIFICIO NRO. 16 DPTO. 302 FON	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1403	20529418737	A & M OBRAS CIVILES Y SERVICIO	JR. DOS DE MAYO NRO. 570 DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1404	20529515180	SECURITY CENTER A&M SRL	JR. JUAN BEATO MASÍAS NRO. 620	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1405	20529808799	FERRETERIA Y MATERIALES CASTIL	MZA. D LOTE. 17 URB. MICAELA B	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1406	20530056326	GRUPO CLAVIJO S.A.C.	CAL. LORETO NRO. 338 INT. 1 PI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1407	20530081517	NEGOCIOS E INVERSIONES LUC  E.	AV. LORETO NORTE NRO. 162 BAR.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1408	20530682197	ESTACION DE SERVICIOS GRIFO SA	AV. UNIVERSITARIA SN-1-3 MZA. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1409	20531353154	CESAM S.A.C.	JR. JUAN VARGAS NRO. 668 SAN M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1410	20532342164	LIBRERIA DISTRIBUIDORA YESSY E	AV. J.BASADRE GROHOMAN NRO. 16	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1411	20532446296	DIPRO PLAST S.A.C.	AV. SAN FELIPE NRO. 647 DPTO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1412	20532561044	MSCOM E.I.R.L.	AV. CORONEL MENDOZA NRO. 1945 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1413	20532629706	LOS NORTEÑITOS S.R.L.	MZA. 13 LOTE 04 A.H. PMV IV NU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1414	20532631191	FERRETERIA OBRAS C Y J S.R.L.	MZA. G LOTE 1 A.H. J.C. MARIAT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1415	20532814511	G & T ELECTRIC CONTRATISTAS SO	CAL.LAS DALIAS MZA. A2 LOTE. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1416	20532840431	ISO CONTRATISTAS S.A.C.	MZA. 54 LOTE 25 A.H. PROGRAMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1417	20532895503	EMPRESA DE SERVICIOS MULTIPLES	JR. MOLLENDO NRO. 191 MOQUEGUA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1418	20532941033	REPRESENTACIONES SANDRO ALEXAN	MZA. 14 LOTE 26 A.H. NUEVA VIC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1419	20532958602	ILUMINACIONES ANITA EMPRESA IN	AV. JORGE BASADRE GROHMAN NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1420	20533073370	INVERSIONES FERRETERA  ROSAS E	MZA. J LOTE 23 URB. AMAUTA MOQ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1421	20533097635	MADERERA SAN JOSE Y DERIVADOS 	MZA. E LOTE 23 A.H. CIUDAD PES	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1422	20533189246	REPRESENTACIONES COMERCIALES E	MZA. 70 LOTE 3 A.H. VISTA ALEG	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1423	20533223878	MARVISOL ILO E.I.R.L.	MZA. 61 LOTE 6 URB. LUIS E VAL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1424	20533675779	CORPORACION MEGACONSTRUCTORES 	JR. LOS PINOS MZA. 2 LOTE. 5 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1425	20534172304	LK COMBUSTIBLES S.A.C.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1426	20534202068	EMPRESA DE TRANSPORTES UNION T	JR. G. SANTILLANA NRO. 976 AYA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1427	20534562609	DRAKOS S.A.C.	PJ. CACERES NRO. 150 AYACUCHO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1428	20535752690	MALLAS AGRO S.A.C	JR. OCTAVIO BERNAL NRO. 138 (E	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1429	20535813401	PERNOS PAZ & DISTRIBUCIONES SA	AV. ARGENTINA NRO. 215 INT. AE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1430	20535826995	RESTAURANT GOURMET MISKI CHALL	AV. TOMAS VALLE NRO. 3531 PROV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1431	20535848450	NIRVANA COMPANY SERVICE S.A.C.	AV. DE LOS HEROES NRO. 900 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1432	20536053621	ESTACIONES DE SERVICIO GASOLIN	AV. ABEL B DU PETIT THOUARS NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1433	20536165186	CORPORACION FARMACLINICA SOCIE	JR. BUENAVENTURA AGUIRRE NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1434	20536459414	DECOR HOUSE ROJAS SOCIEDAD ANO	AV. ARGENTINA NRO. 215 INT. AN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1435	20536557858	HOMECENTERS PERUANOS S.A.	AV. AVIACION NRO. 2405 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1436	20536583263	CONSULTORIOS OFTALMOLOGICOS DE	AV. PERU NRO. 3428 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1437	20536811401	FLORES TIJERO CONSULTORES SOCI	AV. JORGE BASADRE NRO. 1186 (P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1438	20536973215	GRUPO CAHEMA S.A.C.	AV. ANGAMOS ESTE NRO. 2130 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1439	20537038790	KABEL GROUP S.A.C.	MLC. RIMAC NRO. 2686 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1440	20537142775	FASTER INGENIEROS S.A.C. - FAS	JR. FERROCARRIL MZA. 162A LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1441	20537320207	OXIWELD SAC	AV. GUILLERMO DANSEY NRO. 455 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1442	20537321190	DIMERC PERU S.A.C.	AV. ANDRES AVELINO CACERES NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1443	20537354365	JHOLU MAGIC S.A.C	AV. LA MARINA NRO. 1602 INT. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1444	20537464543	DEVIANDES S.A.C.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1445	20537583470	LJM METALES S.A.C.	AV. CAMINO REAL NRO. 111 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1446	20537778998	IMPORTACIONES MEDALI S.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1447	20537845008	MENA NEGOCIOS E INVERSIONES E.	AV. PERU NRO. 1882 URB. PERU (	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1448	20537901277	CORPORACION PYX S.A.C. - CORP 	AV. ANGELICA GAMARRA NRO. 1361	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1449	20537995581	INVERSIONES M5 SAC		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1450	20538010996	CONSORCIO ELECTRICAL GROUP PER	CAL. 6 MZA. K LOTE. A URB. LAS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1451	20538070387	TRANSVISIONPERU E.I.R.L.	MZA. B LOTE 2 SEC. 6 GRUPO 11 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1452	20538270041	PANELEK CONTRATISTAS GENERALES	CAL. MADRE DE DIOS NRO. 214 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1453	20538271366	CORPORACION COINSA S.A.C.	CAL. GERMAN SCHREIBER NRO. 184	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1454	20538295893	COMERCIAL MULTISERVICIOS BEJAR	MZA. A LOTE. 26 COO. VIV SANTA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1455	20538337138	INREVA GROUP SOCIEDAD ANONIMA 	AV. GUILLERMO DANSEY NRO. 481 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1456	20538512584	IMVERSIONES ARWATURO S.R.L.	CAL. LOS ALMENDROS NRO. 265 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1457	20538549071	OMEGA POWER S.A.C.	AV. ELMER FAUCETT NRO. 2293 CA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1458	20538715264	ENERGYSA CORPORATION S.A.C.	CAL. CALLE 14 MZA. D1 LOTE. 04	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1459	20538736776	CENTRO DEL FRIO COMERCIAL EMPR	CAL. ISAAC RECAVARREN NRO. 183	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1460	20538837963	ZAMDOR PERU E.I.R.L.	CAL. CIRO ALEGRIA NRO. 622 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1461	20539248597	DACERFING CONTRATISTAS GENERAL	CAL.NUEVA ARICA NRO. 157 P.J. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1462	20539485611	CONSORCIO LIDER DEL SUR S.A.C.	MZA. F LOTE 14 APV. ASOC DE VI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1463	20539762983	DANIEL MOVILES S.A.C.	AV. VICTOR LARCO HERRERA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1464	20539922930	PERNOS Y TUERCAS RAZSAL E.I.R.	CAL. ENRIQUE VALENZUELA NRO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1465	20539925017	CORPORACION MEDICA DE SERVICIO	AV. MANUEL VERA ENRIQUEZ NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1466	20539931254	ONIVEP CONTRATISTAS GENERALES 	MZA. 4 LOTE 7 URB. SOL DE LAS 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1467	20539945638	EMPRESA NEGOCIOS & TRANSPORTES	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1468	20539973925	100% GAS CIEN POR CIENTO PERUA	JR. SILVA SANTISTEBAN NRO. 213	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1469	20540718688	COMPAÑIA T&C S.R.L.	AV. ARTEMIO MOLINA NRO. 644 IC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1470	20541464264	EMP DE MANTENIMIENTO MONTAJES 	JR. JUNIN NRO. S/N ---- CPM CO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1471	20543027112	TECNOMARKET PERU S.A.C	AV. GARCILASO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1472	20543332349	INVERSIONES TURISTICAS QUIPAYU	MZA. Y LOTE. 29 P.J. VIRGEN DE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1473	20543423905	SERVICIO MULTIPLE LLACZA HNOS.	AV. ISABEL LA CATOLICA NRO. 15	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1474	20543728927	TECNOLOGIA INDUSTRIAL PERUANA 	AV. LOS FRUTALES NRO. 486 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1475	20543777201	NEGOCIACIONES CHIPRE S.A.C.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1476	20543797571	GROUP OSORIO E.I.R.L.	AV. ARGENTINA NRO. 215 INT. AV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1477	20543819213	REPUESTERA C & R E.I.R.L	AV. ALFREDO MENDIOLA NRO. 4474	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1478	20543928691	MACROTECNICA SERVICIOS GENERAL	AV. GUILLERMO DANSEY NRO. 449 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1479	20543984176	SANTA LUCIA INDUSTRIA GRAFICA 	LOTE. 8 GRU. 10 SECTOR 2 MERCA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1480	20544248091	ANCAMES TECH S.A.C.	CAL. CONFUCIO NRO. 145 DPTO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1481	20544305230	INVERSIONES GKS SOCIEDAD ANONI	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1482	20544340221	FERRENAVAL SAC	AV. GMO DANSEY NRO. 354 INT. A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1483	20544449312	CERTIFICACIONES Y CALIBRACIONE	CAL. GABRIELA MISTRAL NRO. 216	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1484	20544525515	JOISA ELECTRONICS S.A.C. - JOI	JR. PARURO NRO. 1349 INT. 26 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1485	20544547756	DESPEGAR.COM PERU SAC	AV. RICARDO RIVERA NAVARRETE N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1486	20544764340	GESTORES MEDICOS SOCIEDAD ANON	JR. NARCISO DE LA COLINA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1487	20545068568	MATIZADO CINTHYA E.I.R.L.	AV. ARGENTINA NRO. 215 INT. N-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1488	20545135184	WESCO ANIXTER PERU S.A.C.	AV. TINGO MARIA 311 BREÑA LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1489	20545223636	GPM CENTRAL DE COMPRAS Y SERVI	---- MORRO SOLAR NRO. 380 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1490	20545610672	G Y S CONTROL INDUSTRIAL SOCIE	CAL. LOS GERANIOS NRO. 486 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1491	20545680531	LIBRERIAS HUERTAS S.R.L	JR. SAN MARTIN NRO. 599 P.J. J	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1492	20545688191	BMI IMPORT S.A.C	AV. ARGENTINA NRO. 477 INT. 14	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1493	20545784158	AGUKI COMBUSTIBLES LIQUIDOS S.	AV. ELMER FAUCETT NRO. 5482 CA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1494	20545886741	ACEROS Y METALES BOCANEGRA S.A	AV. AV.PERU NRO. 4848 CALLAO -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1495	20546034951	MAVEGSA DRYWALL S.A.C.	AV. REPUBLICA DE PANAMA NRO. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1496	20546153372	GLOBAL PERLA´S CAR S.A.C.	JR. UNION NRO. 166 COO. 27 DE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1497	20546160581	PRODIFER S.A.C.	AV. ARGENTINA NRO. 339 INT. T 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1498	20546193757	INGENIERIA MECANICA Y DISEÑO S	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1499	20546236740	GCZ S.A.C.	AV. FELIPE PARDO Y ALIAGA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1500	20546453503	EMPRESA DE TRANSPORTES ARY SOC	AV. CAMINO DE AMANCAES NRO. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1501	20546470696	GLOBAL INVERTIS E.I.R.L.	MZA. B LOTE. 2 ASOC VIV. OJIHU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1502	20546476384	INVERSIONES GENERALES GIADA E.	AV. MARISCAL OSCAR R. BENAVID 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1503	20546746942	S.R. SOLUCIONES S.A.C.	AV. AV. MANCO CAPAC NRO. 708 P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1504	20546957137	INVERSIONES CAMILA H&C E.I.R.L	JR. HUAROCHIRI NRO. 518 INT. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1505	20547011954	CENTROGAS IQUITOS S.A.C.	AV. IQUITOS NRO. 983 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1506	20547013493	GASOLINERA CHAUPIN S.A.C.	----PUERTO ETEN NRO. 245 DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1507	20547019424	LAB FRAY S.A.C	JR. PIURA NRO. 119 DPTO. 201 C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1508	20547111665	IMARK SOLUCIONES INTEGRALES S.	CAL.EL CONDADO NRO. 238 URB. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1509	20547391501	EMPRESA DIGITAL PERUANA S.A.C.	AV. ALFREDO BENAVIDES NRO. 194	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1510	20547438583	UPS ADUANAS PERU S.A.C.	AV. ELMER FAUCETT NRO. 2823 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1511	20547794703	ENERTRONIC INGENIERIA S.A.C.	CAL. LAS BUGANVILIAS MZA. C LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1512	20547799845	CONSORCIO GRIFOS DEL PERU SOCI	AV. EL DERBY NRO. 254 DPTO. 70	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1513	20547839065	SER CONSULTING SOCIEDAD ANONIM	CAL. LAS MAGNOLIAS NRO. 150 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1514	20547878397	LIMPDEXA E.I.R.L.	CAL.R BENTIN NRO. 679 (ALT. DE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1515	20547892039	TIZIANNI PERU SOCIEDAD ANONIMA	AV. VALLES DEL SUR NRO. 397 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1516	20547897341	SDA COMPANY S.A.C.	CAL. 62 MZA. 82 LOTE. 35 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1517	20547935889	ELECTRONICA J. ARROYO E.I.R.L.	AV. ARGENTINA NRO. 344 INT. J1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1518	20548129223	FERRETERIA ELECTRONICS ROQUE E	AV. SAN MARTIN DE PORRES OEST 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1519	20548143641	SEGURIDAD INDUSTRIAL YASEBA EM	AV. JOSE GALVEZ NRO. 1970 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1520	20548170967	FERREMAX PERU E.I.R.L.	MZA. N1 LOTE. 8 PARQUE INDUSTR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1521	20548221626	MAGNATECH S.A.C.	CAL.MARIANO MELGAR NRO. 194 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1522	20548252777	A & E SUMINISTROS S.A.C.	AV. INCA GARCILAZO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1523	20548342849	IMPORTACIONES JHENS CAR SOCIED	AV. LOS ALISOS NRO. 283 URB. N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1524	20548388750	P & L IMPORTACIONES INDUSTRIAL	JR. HUANCAVELICA NRO. 1196 MAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1525	20548407991	GRUPO COINP S.A.C.	CAL. ALEMANIA NRO. 2242 URB. C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1526	20548469679	CONSORCIO ICA SOCIEDAD ANONIMA	AV. EL DERBY NRO. 254 DPTO. 70	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1527	20548527113	DERCOCENTER S.A.C.	AV. EL POLO NRO. 1117 URB. LA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1528	20548562377	INVERSIONES MG HUAROCHIRI S.A.	AV. JAVIER PRADO ESTE NRO. 419	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1529	20548788774	PARQUEOS UNIDOS S.A.C.	AV. PRIMAVERA NRO. 607 INT. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1530	20548938415	ALCA COMPANY S.A.C.	JR. 10 DE DICIEMBRE NRO. 171 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1531	20549289712	AMICO INGENIEROS S.A.C.	AV. MIGUEL GRAU NRO. 1266 PROV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1532	20549623639	FOOD INVESTMENTS S.A.C	AV. LOS JARDINES OESTE NRO. 35	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1533	20549698051	TECNOVIA PERU S.A.C.	AV. CARRETERA CENTRAL NRO. 111	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1534	20549749659	INVERSIONES LEOPLAST E.I.R.L.	AV. GUILLERMO DANSEY NRO. 411 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1535	20549903836	ANDES OUTDOORS S.A.C.	JR. BENIGNO CORNEJO NRO. 485 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1536	20550006465	KOBY INVERSIONES S.A.C.	AV. GARCILAZO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1537	20550024447	R & M PORTATILES SOCIEDAD ANON	AV. GARCILAZO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1538	20550033519	CONCESIONARIA PERUANA DE VIAS-	AV. 28 DE JULIO NRO. 757 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1539	20550092361	CORPORACION ADUANERA KALLPA S.	AV. ELMER FAUCETT NRO. 1764 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1540	20550120594	AUTOMATIZACION & CONTR GENERAL	AV. COLONIAL NRO. 212 INT. 114	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1541	20550314950	J.W. OLIVER S.A.C.	CAR. PANAMERICANA SUR NUEVA KM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1542	20550372640	RUTAS DE LIMA S.A.C.	CAR.PANAMERICANA SUR KM. 19.65	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1543	20550496373	GELATO NATURA S.A.C.	AV. DE LAS ARTES NORTE NRO. 38	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1544	20550557348	GRIFO CONTROL S.A.C.	AV. ZARUMILLA NRO. 810 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1545	20550612110	CONSORCIO INKA	CAL.6 MZA. D LOTE. 13 URB.IND 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1546	20550741351	J & S INDUSTRIAL JEANPIERO S.A	AV. ARGENTINA NRO. 327 ---- C.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1547	20550744024	CONSORCIO UNION FERRETERA S.A.	AV. PROLONGACION SAENZ PEÑA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1548	20550856507	INFINITEC STORE S.A.C	AV. INCA GARCILAZODE LA VEGA N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1549	20551093035	EFACT S.A.C.	AV. JAVIER PRADO ESTE NRO. 560	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1550	20551333281	AUTOMOTRIZ GAVITUR S.A.C.	CAL. CIRO ALEGRIA NRO. 136 SEC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1551	20551477283	TRANSPORTES DESTINOS GLOBALES 	MZA. Q LOTE. 20 FLOR DE LAS MA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1552	20551775381	QUALITY & SAFETY ENGINEERING S	CAL.CESAR VALLEJO NRO. 578 A.H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1553	20551778135	ACSA CORP S.A.C.	JR. BAMBAS NRO. 451 INT. 200 C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1554	20551789331	RONGGAN ZENG SOCIEDAD ANONIMA 	AV. LAS CAMELIAS NRO. 657 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1555	20551789927	COMPANY ELECTRIC SEGURITY S.A.	AV. MARISCAL OSCAR R. BENAVIDE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1556	20551801137	SUATRANS PERU SOCIEDAD ANONIMA	AV. PASEO DE LA REPÚBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1557	20551812252	TRAC TOOLS S.A.C.	AV. GUILLERMO DANSEY NRO. 787 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1558	20552228198	ARCHITECTURAL CIRCLE S.A.C.	AV. UNIVERSITARIA NRO. 4845 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1559	20552232462	CORPORACION XINDE SOCIEDAD ANO	JR. PARURO NRO. 1107 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1560	20552472421	E & M RUEDAS Y GARRUCHAS S.R.L	AV. ARGENTINA NRO. 639 INT. BO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1561	20552472773	CONCRETO & POZO A TIERRA S.A.C	MZA. E LOTE. 4 C.P. LAS PIEDRI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1562	20552495048	B & S TECH E.I.R.L.	AV. PETIT THOUARS NRO. 2663 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1563	20552504641	WIN EMPRESAS S.A.C.	AV. JOSE GALVEZ BARRENECHEA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1564	20552680619	SMART SOLUTIONS PERU S.A.C	MZA. F1 LOTE. 1 URB. PACHACAMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1565	20552958676	S & M SERVICIOS DE SALUD SOCIE	CAL.21 NRO. 170 URB. CARABAYLL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1566	20553014841	TU PARQUEO SOCIEDAD ANONIMA CE	JR. PEDRO RUIZ GALLO NRO. 244 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1567	20553026858	ELECTRONETWORK E.I.R.L.	AV. GARCILAZO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1568	20553157529	GRUPO QUANTUM S.A.C.	AV. GIUSEPPE GARIBALDI NRO. 21	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1569	20553266905	GLOBAL RUBBER CORPORATION S.A.	AV. MARISCAL OSCAR R. BENAVID 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1570	20553311111	MS ELECTRONICA S.A.C.	CAL.CALLE 19 MZA. D2 LOTE. 11 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1571	20553365393	GAMA PRINT MULTISERVICIOS E.I.	AV. GERMÁN AMÉZAGA NRO. 330 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1572	20553510661	LLAMA.PE S.A.	CAL. LIBERTAD NRO. 176 INT. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1573	20553681121	J & J INVERCOM E.I.R.L.	CAL. GALDEANO MZA. 35 LOTE 8 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1574	20553713936	ELECTRO COMERCIAL IMPORT  J & 	JR. PARURO NRO. 1341 INT. 101 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1575	20553902313	DIPROSOL PERU S.A.C	AV. ALEJANDRO VELASCO ASTETE N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1576	20553926841	DISTRIBUIDORA ARNOL & ALEXIS E	AV. HUANCAVELICA NRO. 1196 ---	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1577	20554045937	GRUPO MEGABUS S.A.C. - MEGAGRU	JR. MARISCAL JOSE LUIS DE ORB 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1578	20554095012	J & N GROUP INSTALL WORLD S.A.	VIA. 1ERA ETAPA MZA. D13 LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1579	20554123911	TECHPOINT PERU CORP S.A.C.	CAL. RICARDO FLORES NRO. 348 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1580	20554134875	DICOELSA S.A.C	AV. MARISCAL OSCAR R. BENAVID 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1581	20554220950	UNIFERR SOCIEDAD ANONIMA CERRA	MZA. F-02 LOTE 42 SEC. FRATERN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1582	20554277633	INTELSAC S.A.C.	JR. LOS SILICIOS NRO. 5542 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1583	20554536167	REDICE INGENIEROS S.A.C.	JR. PICHINCHA NRO. 469 LIMA- L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2611	10411006161	ALY PETRONILA DAVALOS MERCADO	\N	NATURAL	2026-05-25 18:31:33.7722	2026-05-25 18:31:33.7722
1584	20554765271	B & M ARTICULOS PROMOCIONALES 	AV. ABANCAY NRO. 841 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1585	20554928596	C & S POLINARIO S.A.C.	MZA. H LOTE 12 APV. SANTA ROSA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1586	20555040599	ELECTRONICA OLIVER EIRL	AV. GUILLERMO DANSEY NRO. 481 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1587	20555095229	ALLINBUS S.A.C.	JR. ANTONIO RAIMONDI NRO. 125 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1588	20555113731	MEDICINA EMPRESARIAL DE PREVEN	AV. JOSE FAUSTINO SANCHEZ CAR 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1589	20555126124	INVERSIONES RUHAN S.A.C.	MZA. W LOTE. 4 ASOC. SOL DE SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1590	20555129816	ESTUDIO JALVO SOCIEDAD ANONIMA	AV. RICARDO PALMA NRO. 341 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1591	20555359650	SOLUCIONES EMPRESARIALES ENDAF	PJ. MANUEL TOVAR NRO. 181 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1592	20555549513	ACEROS AMIN S.A.C. -  ACERAMIN	AV. PERU NRO. 3006 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1593	20555734418	TECNOLOGIA & SERVICIOS PIZARRO	AV. GUILLERMO DANSEY NRO. 411 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1594	20555781254	COMERCIAL INTERNATIONAL CARONI	----GERMAN SCHEREIBER NRO. 299	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1595	20555788003	EMPRESA DE TRANSPORTES Y CONST	MZA. D LOTE. 9 A.V. PROPIETARI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1596	20555855983	ELECTROMECANICA EDEM S.A.C.	SECTOR 6 MZA. B LOTE. 13 GRU. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1597	20555875828	CONSORCIO SALUD LIMA SUR	AV. MIGUEL IGLESIAS NRO. 997 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1598	20555901179	MOVIL BUS S.A.C	AV. MATERIALES NRO. 2215 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1599	20555948485	GRUPO FLK S.A.C.	AV. EJERCITO NRO. 506 INT. 302	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1600	20555954884	EXPRESO EL ALTIPLANO S.R.L.	JR. HIPOLITO UNANUE NRO. 682 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1601	20555958014	S & M HOME COMPUTER S.A.C.	AV. INCA GARCILAZO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1602	20556141640	E & G ELECTRONICA INVERSIONES 	AV. ARGENTINA NRO. 344 DPTO. J	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1603	20556150631	PROFESIONALES ORIENTADOS AL SE	JR. SAN MARTIN DE PORRES MZA. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1604	20556216089	CORFID CORPORACION FIDUCIARIA 	CAL.MONTE ROSA NRO. 256 INT. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2484	10433887862	CARRION MEDINA CESAR NOE	\N	NATURAL	2026-05-18 15:37:23.391393	2026-05-18 15:37:23.391393
1605	20556219185	KONEXXUS GROUP S.A.C.	AV. GUARDIA CIVIL NRO. 718 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1606	20556393614	DISERGISA IMPORT E.I.R.L.	AV. ALFREDO MENDIOLA NRO. 901 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1607	20556884511	MULTISERVI & ASESORIA A & MG S	MZA. E LOTE. 34 A.V. LOS CEDRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1608	20556901466	C & I OSITO S.A.C.	AV. ARGENTINA NRO. 215 INT. BE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1609	20556909106	ADEMINSA-GROUP OF COMPANIES TR	CAL.CERRO AZUL NRO. 479 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1610	20557030191	GRUPO DAN PARDO S.A.	CAL.PACASMAYO NRO. 215 INT. 11	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1611	20557150171	CGS ANDAMIAJE & PUNTALES S.A.C	MZA. A LOTE. 8 URB. VICENTELO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1612	20557198882	MASS BUSINESS S.A.C.	JR. CUTERVO NRO. 1818 DPTO. L5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1613	20557212893	INDUMETAL HOPER CRISAN S.A.C.	AV. GUILLERMO DANSEY NRO. 411 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1614	20557644416	CONCESIONARIA VIAL SIERRA NORT	CAL.CORONEL ANDRES REYES NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1615	20557697536	TC & S TECHNOLOGY AND ACCESSOR	JR. INAMBARI NRO. 739 INT. 207	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1616	20557700341	TORTAS Y BOCADITOS R & S E.I.R	AV. PERU NRO. 2655 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1617	20557706896	FULL CLEAN R & G S.A.C.	AV. ARGENTINA NRO. 215 INT. R2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1618	20557811924	VOTORANTIM INTERNACIONAL CSC S	JR. CARPACCIO NRO. 250 INT. 30	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1619	20557911121	SMC CORPORATION PERU S.A.C.	AV. ARGENTINA NRO. 2078 (ALTUR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1620	20557985167	AMERSA S.A.C.	AV. LOS PINOS MZA. U1 LOTE. 4 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1621	20559504239	EMPRESA DE SERVICIOS M & RG GE	AV. 28 DE JULIO NRO. 114 C.H. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1622	20559597733	INVERSIONES AGROINDUSTRIALES V	CAR.PANAMERICANA NORTE NRO. 70	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1623	20559698416	MORIKEL CONTRATISTAS GENERALES	JR. CALLAO NRO. 0109 SEC. CERC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1624	20559800717	ROLANDO ENRIQUE CARBONEL GUTIE	AV. ANTONIO RAYMONDI NRO. 124 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1625	20559850498	PROVEACORP SAC	JR. ADOLFO KING NRO. 8 SEC. CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1626	20559876535	SERVICIOS GENERALES HUASICHIC 	MZA. A LOTE. 19 URB. ANDRES RA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1627	20559962881	GRIFO EL CAMPANARIO E.I.R.L.	CAR. PANAMERICANA  NORTE KM. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1628	20559976246	MADERERA LA PALMA S.R.L.	AV. ENRIQUE VALENZUELA NRO. 68	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1629	20559990150	GRUPO FERRETERO EL HALCON E.I.	JR. GARCILAZO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1630	20560043270	DIEZ ASES EXPRESS S.A.C.	AV. NICOLAS DE PIEROLA NRO. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1631	20560176156	GRAFICORT SERVICIOS GRAFICOS S	JR. SILVA SANTISTEBAN NRO. 330	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1632	20560209852	MARIANA INVERSIONES Y SERVICIO	CAL. LADISLAO ESPINAR NRO. 177	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1633	20562672045	MARY CHICK CORPORATION E.I.R.L	AV. GUILLERMO DANSEY NRO. 918 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1634	20562697897	CORPORACION ELECTRO INDUSTRIAL	JR. JORGE CHAVEZ NRO. 130 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1635	20562706802	ROBERT & CIA SOCIEDAD ANONIMA 	AV. ARGENTINA NRO. 215 ---- PJ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1636	20562783114	LIDER GRASS PERU E.I.R.L.	JR. JORGE CHÁVEZ NRO. 977 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1637	20562867997	PERNOS POLIMETALES E.I.R.L.	CAL. ASCOPE NRO. 451 INT. D-8 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1638	20562883411	CORPORACION ALACHE S.A.C.	JR. BULGARIA MZA. E LOTE 09 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1639	20563050765	L.H. SALAVERRY SOCIEDAD ANONIM	AV. GRAL. FELIPE SALAVERRY NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1640	20563106736	CARNES POZUZO SOCIEDAD ANONIMA	JR. CUZCO NRO. 425 INT. 604 (A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1641	20563293587	IMPORT EXPORT PACKING PERU S.A	CAL. JULIO C. TELLO NRO. 265 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1642	20563398923	GALVANIZADOS MECANICOS S.A.C. 	CAL. LOS ALAMOS MZA. J LOTE 12	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1643	20563423031	JAMES INTERNATIONAL E.I.R.L.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1644	20563529378	TIENDAS TAMBO S.A.C.	AV. JAVIER PRADO ESTE NRO. 621	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1645	20563733731	CORPORACION OTOÑO SOCIEDAD ANO	AV. ANGELICA GAMARRA NRO. 848 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1646	20564048217	GRIFO GASOIL SOCIEDAD ANONIMA 	CAR. CUSCO-OROPESA- KM. 20 FND	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1647	20565239521	JVL SOLUTIONS S.A.C.	AV. OSCAR R. BENAVIDES NRO. 78	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1648	20565345983	COMPUPAL PERU S.A.C.	AV. INCA GARCILAZO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1649	20565349890	ESCOBAR & CARPIO ELECTRONICS S	JR. PARURO NRO. 1359 INT. 168 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1650	20565506154	DISTRIBUIDORA GRIFO S.A.C	AV. ARGENTINA NRO. 327 INT. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1651	20565520149	ALTERNATIVA DEL PERÚ S.A.C.	AV. LIMA NRO. 2454 URB. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1652	20565583493	CAMPO SONORO DEL PERU S.A.C.	AV. GENERAL CESAR CANEVARO NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1653	20565643496	GLOBAL FUEL SOCIEDAD ANONIMA	AV. REPUBLICA DE PANAMA NRO. 3	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1654	20565723171	MC SUMINISTROS INDUSTRIALES S.	CAL. DOS MZA. J LOTE. 2 URB. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1655	20565747356	BBTI S.A.C.	CAL. 6 MZA. D LOTE 13 URB. IND	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1656	20565749138	ELECTRONICA C.A. EIRL	AV. ARGENTINA NRO. 344 INT. L-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1657	20565782267	REPRESENTACIONES YES MEDICAL P	AV. EMANCIPACION 569-579 NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1658	20565816269	CENTINELA SISTEMAS DE SEGURIDA	AV. ESTADOS UNIDOS NRO. 114 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1659	20565818717	ELECTRODOMESTICOS.COM E.I.R.L	AV. ABANCAY NRO. 951 INT. 129S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1660	20565826817	COMRCIALIZADORA & DISTRIBUIDOR	AV. ARGENTINA NRO. 327 INT. P9	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1661	20566243840	TECNIFLOOR S.A.C.	JR. GRANADA NRO. 385 DPTO. 301	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1662	20566255775	DISTRIBUIDORA ZELOFEJAD S.A.C.	JR. ANDAHUAYLAS NRO. 877 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1663	20566374511	FERRETERA APU S.A.C.	AV. GUILLERMO DANSEY NRO. 458 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1664	20566388732	VILLAMANUELITO PARAISO INN S.A		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1665	20566426171	CEVICHERIA PUERTO DE CHALA S.A	AV. DANIEL ALCIDES CARRION MZA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1666	20568045361	CONSORCIO GRUPO E&ROBERTO SI-U	JR. HUARAZ NRO. 474 JUNIN - TA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1667	20568074972	SERVICIOS MULTIPLES LANDEO SOC	JR. ALTO PERU NRO. S/N ---- AN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1668	20568111410	DEVAZA EXPRESS EMPRESA INDIVID	PJ. LAS DELICIAS NRO. S/N JUNI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1669	20568239301	DIKARS SCRL	AV. CASTILLA NRO. 118 JUNÍN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1670	20568342811	GRUPO C & D BREADT MODERN S.R.	JR. MANTARO NRO. 696 URB. CERC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1671	20568428294	TRANSPORTES Y TURISMO MIBUS SO	PRO. MARISCAL CACERES NRO. 152	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1672	20568440821	SERVICIOS J.J.I.L. E.I.R.L.	JR. HUANUCO NRO. 992 JUNIN - T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1673	20568502443	KLM GROUP S.A.C.	CAR. CENTRAL NRO. 2336 BARRIO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1674	20568566336	GRUPO FERRETERO Y MATIZADOS PE	AV. TUPAC AMARU NRO. 237 JUNIN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1675	20568587767	INACONS S.R.L.	CAL. LAS CASUARINAS NRO. 106 -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1676	20568635915	GRUPO CLEMER S.A.C.	AV. CELESTINO MANCHEGO MUÑOZ N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1677	20568745770	M & R GENERAL SERVICES S.A.C.	PJ. MARIATEGUI NRO. 129 (ALT D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1678	20568871562	CORPORACION FERRETERA MARANATH	JR. JAUJA NRO. 366 ---- SEC. T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1679	20569073279	DENLU EMPRESA INDIVIDUAL DE RE	AV. VIENRICH NRO. 488 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1680	20569206929	TECNOLOGIA EN PROYECTOS DE ING	AV. HORACIO URTEAGA NRO. 502 D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1681	20571157005	CONSTRUCTORA ALFA & BETA S.A.C	CAL. MEMBRILLOS NRO. 180 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1682	20573328168	EMPRESA COMUNAL SOCIO EMPRESAR	JR. TACNA NRO. 015 OTR. PUEBLO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1683	20573803818	SANTA CRUZ CORPORATION S.A.C.	AV. JAVIER PRADO ESTE NRO. 275	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1684	20573856938	INSTRUINGENIERIA S.A.C.	Cal. Lorenzo Astrana Nro. 280	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1685	20573927118	INVERSIONES TURISMO PERALTA S.	JR. TARAPACA NRO. 244 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1686	20600010329	COMPAÑIA DE RESTAURANTES Y ALI	CAL. PROLONGACION GAMARRA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1687	20600011007	ESTACION DE SERVICIOS GAMARRA 	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1688	20600026896	CORPORACION ELCOM E.I.R.L.	JR. AZANGARO NRO. 946 INT. 145	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1689	20600032535	EMPRESA CONSULTING SAFETY TEAM	PJ. AYANCOCHA NRO. 250 (ENTRE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1690	20600046153	PEX PERU SOCIEDAD ANONIMA CERR	AV. EL DERBY NRO. 250 URB. EL 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1691	20600050851	NEUMATIC IMPORT LEONEL E.I.R.L	AV. ARGENTINA NRO. 523 INT. A3	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1692	20600068645	JDT NEGOCIOS & COMERCIO SOCIED	CAL. 09 MZA. X LOTE 27 APV. SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1693	20600073681	ELECTRIC  SOLUTIONS & SUPPORT 	JR. PERENE NRO. 164 JUNÍN - TA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1694	20600080297	PROLAMINET ARTESANIA EN MADERA	MZA. E LOTE. 13 ALAN GARCIA LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1695	20600094671	VILCA´S INGENIERIA Y SERVICIOS	AV. MARAÑON MZA. F9 LOTE 15 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1696	20600108272	ROM OUTSOURCING S.A.C.	AV. PERSHING NRO. 465 INT. 201	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1697	20600110081	MASSO PERU E.I.R.L.	JR. VEGA GARCIA NRO. 3022 (ALT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1698	20600110633	SOLITEC INSTRUMENTOS DE MEDICI	NRO. -- ---- CENTRO COMERCIAL 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1699	20600114299	ARTEUS COMP S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1700	20600115554	GRUPO XAUXA GOLD S.A.C.	JR. BALTA NRO. 710 (CERCA A LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1701	20600122097	FABRICACION Y CONTROL DE MAQUI	JR. AZANGARO NRO. 1011 CERCADO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1702	20600155475	ENGLOBADOS E.I.R.L.	JR. AYACUCHO NRO. 738 INT. 123	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1703	20600185811	COMERCIAL ROSALES REYES SAC	AV. PROCERES DE LA INDEPENDENC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1704	20600211618	INVERSIONES BURNES E.I.R.L.	AV. ARGENTINA NRO. 327 INT. 11	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1705	20600223748	CORPORACION NORCACI S.A.C.	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1706	20600230914	HYDRABOX PERU EMPRESA INDIVIDU	AV. ARGENTINA NRO. 523 C.C ACO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1707	20600255259	LOS REYES CSG E.I.R.L.	MZA. 03 LOTE 09-B A.H. SAN PED	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1708	20600264916	L & T TECHNOLOGYA SOCIEDAD ANO	JR. BAMBAS NRO. 407 URB. LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1709	20600283015	INSTITUTO NACIONAL DE CALIDAD 	CAL.LAS CAMELIAS NRO. 817 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1710	20600285719	TEKTRON SOLUTIONS PERU E.I.R.L	JR. UNION - LA INTENDENCIA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1711	20600296818	REAL INSUGRAF E.I.R.L.	AV. ALFONSO UGARTE NRO. 252 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1712	20600297148	CONDUVEX S.A.C.	AV. MARISCAL LA MAR NRO. 638 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1713	20600315545	INNOVA ESJ GROUP S.A.C.	AV. CASCANUECES MZA. D LOTE. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1714	20600325818	ALTEC SOLUCIONES INFORMATICAS 	CAL. LEONARDO DA VINCI NRO. 24	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1715	20600343026	CENTRO DE SALUD OCUPACIONAL DE	MZA. C LOTE 5 URB. SAN FELIPE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1716	20600406176	COMPU MARKET.PE E.I.R.L.	AV. JOSE PARDO NRO. 138 OTR. C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1717	20600420926	CORPORACION Y LOGISTICA M. J. 	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1718	20600428935	E & R INVERSIONES MALCA E.I.R.	AV. ARGENTINA PASAJE 19 NRO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1719	20600429354	AUTOMAQ CORPORATION S.A.C.	AV. GUILLERMO DANSEY NRO. 330 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1720	20600431758	S & P CORPORACION INDUSTRIAL S	JR. BAMBAS NRO. 411 INT. 204 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1721	20600438752	CODMEM S.R.L.	AV. ARGENTINA NRO. 327 INT. 7-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1722	20600442211	CONSORCIO ACHIYAKU	JR. AGRICULTURA NRO. 584 JUNIN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1723	20600444531	I.T.V. CAMBRIDGE S.A.C.	CAL. MIGUEL DASSO NRO. 160 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1724	20600449967	EQUIPOS Y PRODUCTOS ELECTRICOS	CAL. LAS FRESAS NRO. 1080 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1725	20600455380	VITAL PRIME SOCIEDAD ANONIMA C	CAL. LUIS F.DEL SOLAR NRO. 469	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1726	20600458559	INVERSIONES REYSIL E.I.R.L.	AV. EVITAMIENTO NORTE NRO. 475	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1727	20600484185	FERBRISA INVERSIONES S.R.L.	AV. ARGENTINA NRO. 339 INT. T 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1728	20600490801	CURAFARMA LAB S.A.C.	MZA. A2 LOTE. 44 INT. 1 URB. L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1729	20600491416	IMPORTADORA JORDAN S.A.C.	AV. ARGENTINA NRO. 215 INT. 17	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1730	20600517148	GRUPO SAN SEBASTIAN & EDM S.A.	JR. SALAVERRY NRO. 222 PUEBLO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1731	20600543459	INDUSTRIA PANIFICADORA DEL SUR	CAR. ANTG. PANAMERICANA SUR KM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1732	20600561406	YONG HONG S.A.C.	AV. PERU NRO. 4160 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1733	20600581237	AFJ - EFICIENCIA TECNOLOGICA E	CAL.MANUEL DUATO MZA. B LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1734	20600583957	MANIOCENTER E.I.R.L.	AV. GUILLERMO DANSEY NRO. 497 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1735	20600584431	CORPORACION DISTRIBUIDORA DE C	AV. CAPAC YUPANQUI MZA. B LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1736	20600590058	GOIMSA S.A.C.	AV. IQUITOS NRO. 240 LIMA - LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1737	20600591135	MONTAGE AV TECHNOLOGY E.I.R.L.	MZA. E LOTE. 2 URB. VILLA ELBA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1738	20600596943	MEGAMALLAS PERU SOCIEDAD ANONI	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2487	10278336129	ARANDA ABARCA ANTONIO	\N	NATURAL	2026-05-18 15:37:27.030822	2026-05-18 15:37:27.030822
1739	20600615221	GRUMACON S.A.C.	----VIÑA PICASSO NRO. 360 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1740	20600626567	ZINC POWER S.A.	AV. CENTRAL MZA. 42 LOTE C URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1741	20600643461	TRANSPORTES Y NEGOCIOS MELOVID	CAL.LA PAZ MZA. 3 LOTE. 17 A.H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1742	20600648617	VIDRIERIA MILAGROS TACNA E.I.R	AV. PINTO NRO. 807 . (FRENTE A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1743	20600666119	FARMACIA IMPERIO DEL SOL SOCIE	MZA. C1 LOTE. 7B URB. LARAPA G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1744	20600667140	GLOBAL ELECTRIC & SOLAR PANEL'	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1745	20600669011	PROELEN S.A.C.	JR. UNION NRO. 412 BARR. ARANJ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1746	20600689321	BERNACHEA IMPORT S.A.C.	AV. GUILLERMO DANSEY NRO. 828 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1747	20600694589	ANDAMIOS FUERTE S.A.C.	PJ. VENUS MZA. Z LOTE 1 P.J. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1748	20600722531	LIMA TOOLS S.A.C.	AV. TOMASAL NRO. 695 DPTO. REF	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1749	20600748123	JDG CONTADORES & CONSULTORES E	JR. ANDAHUAYLAS NRO. 370 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1750	20600766202	CORPORACION VIAL AMERICA S.A.C	PJ. CENEPA NRO. 160 OTR. CERCA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1751	20600781708	SERVICIOS EMPRESARIALES DE CER	----CAMINO REAL NRO. 355 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1752	20600805801	LUAL PERU S.R.L.	AV. LAS PONCIANAS DE OQUENDO M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1753	20600826574	FULLEN INTERNATIONAL PERU S.A.	AV. TACNA NRO. 535 INT. 86 CER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1754	20600828291	TREVO S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1755	20600851307	NAZ INGENIERIA ELECTRICA SOCIE	JR. FRANCISCO DE ORELLANA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1756	20600859278	REPUESTOS VOLUME UNO EIRL	AV. ARGENTINA NRO. 460 INT. I5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1757	20600859855	INVERSIONES FESHDI S.A.C.	AV. LIMA MZA. 22 LOTE. 3 PJ JO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1758	20600887859	GRUPO DEWILL S.A.C.	AV. GUILLERMO DANSEY NRO. 595 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1759	20600891996	MUELLES Y REPUESTOS LOS AMIGOS	AV. CANTA CALLAO MZA. C LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1760	20600893166	SANGUCHERIA EL MAMUT E.I.R.L.	CAL.MERCADERES NRO. 111 AREQUI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1761	20600895258	COBALDI EMPRESARIAL E.I.R.L	AV. LUNA PIZARRO NRO. 230 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1762	20600905156	FERRE INVERSIONES V & L S.A.C.	AV. ARGENTINA NRO. 215 INT. AR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1763	20600906381	TEAM TECHNOLOGY S.A.C.	AV. INCA GARCILAZO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1764	20600913663	WIRELESS REYES S.A.C.	JR. PARURO NRO. 1322 INT. 127 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1765	20600921364	SANAR STAFF SALUD S.A.C.	JR. BOLOGNESI NRO. 646 INT. A 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1766	20600926072	SERVICIOS GENERALES Y SOLUCION	CAL. LEONCIO PRADO MZA. P LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1767	20600931394	INVERSIONES PAITITI S.R.L.	NRO. . URB. GHERSI MOQUEGUA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1768	20600945298	BLINDER PERU S.A.C.	AV. AREQUIPA NRO. 1345 INT. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1769	20600984170	METALLKRAFT E.I.R.L.	AV. VELASCO ASTETE NRO. 1080 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1770	20601014034	JM SAFETY PERU S.A.C.	MZA. A2 LOTE 6 URB. ALTO DE LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1771	20601041643	IMPORTACIONES COELVA S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1772	20601045045	CONSORCIO AACV S.A.C.	AV. GUARDIA CIVIL NRO. 366 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1773	20601048877	DISTRIBUCIONES FLORCAL E.I.R.L	AV. ARGENTINA NRO. 215 ---- C.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1774	20601056896	COMERCIAL SILAEC E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1775	20601062420	ALC ENERGY S.A.C.	AV. LOS PINOS MZA. E LOTE. 17-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1776	20601082188	FERRETERIA INDUSTRIAL RODRIGUE	JR. MIGUEL ZAMORA NRO. 189 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1777	20601111781	SANTOFA E.I.R.L.	JR. VULCANO MZA. C LOTE. 10 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1778	20601117836	TAWSON INVERSIONES S.A.C.	AV. BOULEVARD DE SURCO NRO. 24	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1779	20601124336	XAUXA CORP E.I.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1780	20601131138	CREACIONES VILLATUR PERU E.I.R	CAL.SIN NOMBRE MZA. 93 LOTE. 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1781	20601135893	W & J TOOLS AND SERVICE S.A.C.	CAL. TIAHUANACO NRO. 529 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1782	20601137276	CORPORACION G Y M CARBAJAL S.R	MZA. D LOTE. 6-B URB. CANTO BE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1783	20601141532	GRUPO KOLOREA S.A.C.	AV. MRCAL OSCAR BENAVIDES NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1784	20601153964	MTK & SJT SERVICES E.I.R.L.	MZA. QE LOTE 22 URB. SANTA MAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1785	20601156831	TECNILOG E.I.R.L.	AV. SANTA ROSA MZA. E LOTE. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1786	20601166641	IST CONSTRUCTORES CONSULTORES 	CAL.SAN SEBASTIAN NRO. 1596 SE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1787	20601172284	GROUP GESTION MEDICA S.A.C.	MZA. M LOTE. 3 URB. PARQUE IND	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1788	20601177286	CONEX SOLUCIONES TECNOLOGICAS 	JR. SAN FELIPE NRO. 1101 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1789	20601186170	REPRESENTACIONES E INVERSIONES	LOTE. 8 SEC. 2 GRUPO 10 (LOCAL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1790	20601207304	COMERCIAL TAPIA IMPORT S.A.C.	JR. MIGUEL ZAMORA NRO. 156 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1791	20601216648	CONSORCIO SOL DEL NORTE	JR. M. FRANCO NRO. 934 (COSTAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1792	20601240492	AJE COMPANY SCRL	AV. GUILLERMO DANSEY NRO. 494 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1793	20601248647	ANDET S.A.C.	AV. DEL PINAR NRO. 180 INT. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1794	20601283744	A & P FABRICACIONES E INSTALAC	CAL.CAJAMARCA NRO. S/N SEC. CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1795	20601289645	H BUENOS INVERSIONES S.A.C.	JR. UCAYALI NRO. 156 JUNIN - T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1796	20601341299	BARBOZA GRUPO E.I.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1797	20601342481	TEAM TOKIO TUNING E.I.R.L.	CAL. TENIENTE FERRER  324 - A 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1798	20601355419	WARFIX PERU S.A.C.	AV. ESPAÑA NRO. 2227 INT. 22 C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1799	20601355761	LIDERMAN SERVICIOS S.A.C.	AV. DEFENSORES DEL MORRO DEMO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1800	20601387094	AMARU STORE EMPRESA INDIVIDUAL	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1801	20601408300	PERUVIAN FOOD SALINAS EMPRESA 	AV. ARANCOTA NRO. S/N (DENTRO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1802	20601408661	CORPORACION CARRASCO FLORES S.	AV. AGRICULTURA NRO. 851 P.J. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1803	20601415861	INVERSIONES VIRGEN INMACULADA 	AV. CANTA CALLAO MZA. A LOTE 3	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1804	20601419280	ESCALERAS Y MANIOBRAS S.A.C	JR. HUAROCHIRI NRO. 532 C. C. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1805	20601420288	TALLANES PACKERS S.A.C.	CAR. PANAMERICANA NORTE KM. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1806	20601427011	INGENIERO FABRICANTE E.I.R.L.	CAL. CAPIHUES MZA. J LOTE 7-C 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1807	20601432197	ASOCIACION PERUANA DE EMPRESAS	CAL. TEJADA NRO. 235 URB. TEJA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1808	20601451175	MULTISERVICIOS BALDEON & JUNIN	AV. LA PLATA NRO. 11 URB. CIUD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1809	20601453046	CONSORCIO CORPORATIVO MAR Y CI	AV. ARGENTINA NRO. 301 INT. 01	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1810	20601465354	INVERSIONES Y CONSULTORIA EYZ 	JR. CHANCHAMAYO NRO. 552 ---- 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1811	20601487285	OCHMON S.A.C.	JR. LOS TORNOS NRO. 145 Z.I. N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1812	20601494150	MAGA TECH E.I.R.L.	CAL. TUPAC YUPANQUI NRO. 137 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1813	20601503051	INVESTMENTS  EF & AS S.A.C.	AV. LOS ALAMOS MZA. F LOTE 12 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1814	20601506751	RESTAURANT CEVICHERIA PAPO'S S	JR. EL CHACO NRO. 2631 URB. PE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1815	20601508258	CORPORACION DECORANDES QUICHO 	MZA. P LOTE. 1A ASC. ANGELES D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1816	20601515483	CIA. IMP. & EXP. ALDER S.R.L.	CAL. LOS ROSALES NRO. 121 A.H.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1817	20601515963	GRUPO AL KOSTO E.I.R.L.	AV. INDUSTRIAL NRO. 234 SEC. G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1818	20601523354	PUNTO GRAFICO SOLUCIONES IMPRE	AV. SANTIAGO DE SURCO NRO. 439	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1819	20601535298	INNOVACION DIGITAL S.A.C.	CAL. SEVILLA NRO. 320 URB. MAC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1820	20601537185	INVERSIONES YARUSI E.I.R.L.	JR. LIMA NRO. 555 INT. C SEC. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1821	20601553431	PYMATEK AUTOMATION S.R.L.	JR. CABANA NRO. 273 URB. MERCU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1822	20601566584	GPRINTER PERU S.A.C.	JR. PARURO NRO. 1100 URB. BARR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1823	20601594391	CONCRETOS Y AGREGADOS LUIS ADA	CAR.A SAN PABLO NRO. SN CAS. Y	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1824	20601595801	GRUPO FERRETERO ROSALES S.A.C.	JR. AMAZONAS NRO. 517 (S711360	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1825	20601596335	COMERCIALIZADORA LISTER SOCIED	CAL. EL CARMEN NRO. 675 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1826	20601627656	QUIMICOS RAYOS S.A.C.	PACASMAYO NRO. 147 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1827	20601643902	CORPORACION INDUSTRIAL RONNY S	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1828	20601655889	INVERSIONES  J  &  A  7  DE EN	MZA. D LOTE. 6 URB. FILADELFIA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1829	20601656281	AC SUMINISTROS Y SERVICIOS S.A	AV. LOS CONDORES NRO. 485 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1830	20601691532	O&R SERVICIOS GENERALES S.A.C.	MZA. Q8 LOTE. 23 CONJ. HAB. MA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1831	20601706424	JRM RACING E.I.R.L.	MZA. C6 LOTE. 15 CONDEVILLA LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1832	20601714214	EMPRESA DE TRANSPORTES RIMAC N	LUNA PIZARRO NRO. 254 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1833	20601730856	SHS OCUPACIONAL CONSULTORES S.	CAL.JOSE ANTONIO ENCINAS NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1834	20601737494	VIDRIERIA JOSUE E.I.R.L.	AV. PERU NRO. 3035 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1835	20601745136	PERU EN TI ALIMENTOS Y SERVICI	AV. LOS ALARIFES NRO. 1014 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1836	20601751659	DJ HNOS E.I.R.L.	CAL. 2 DE MAYO NRO. 422 MOQUEG	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1837	20601758688	SOUTHCARGO PERU S.A.C.	AV. CALLE UGARTE Y MOSCOSO NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1838	20601760780	MALLAS TEJIDAS & SOLDADAS VILL	AV. ARGENTINA NRO. 327 PJE.6 S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1839	20601773270	COMPAÑIA ELECTRICA ABNAR E.I.R	MZA. G LOTE. 3 URB. LOS HUERTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1840	20601797021	DISTRIBUIDORA Y SERVICIOS MAPE	CAL.BARRANCO NRO. 157 URB. ING	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1841	20601824826	CABLEX S.A.C.	JR. LOS ZAFIROS NRO. 2058 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1842	20601844916	QUE TAL COMPRA DEL PERU S.A.C.	CAL.CHICLAYO NRO. 562 URB. LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1843	20601849411	T Y N SERVICIOS E.I.R.L.	JR. ZORRITOS NRO. 859 DPTO. 50	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1844	20601854415	PASSO CONSULTING EIRL	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1845	20601857295	TRANSPORTES Y SERVICIOS MELARI	JR. SAN LORENZO NRO. 330 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1846	20601863899	INDUSTRIAS FIBERJAS ELECTRIC S	CAL. C MZA. V1 LOTE 5 A.H. SAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1847	20601890683	SISTEMAV S.A.C.	CAL. SIMON BOLIVAR NRO. 270 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1848	20601892937	ARTICULOS SELECTOS Y NOVEDOSOS	JR. LA PUNTUALIDAD NRO. 7921 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1849	20601896614	TERRAMOVIL PERU S.A.C.	CAL. COMANDANTE JUAN GUILLERMO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1850	20601908191	OBCORP SAC	ROCA Y BOLOGNA NRO. 251 DPTO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1851	20601910218	MOTOR SPORT SERVICIOS GENERALE	JR. REYNA FARGE NRO. 434 BAR. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1852	20601912750	TRANSPORTES GENERALES J & F S.	MZA. D LOTE. 1-2 APV. MONTE AZ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1853	20601913578	EXORIAM E.I.R.L.	CAL. JOHANES VERMER NRO. 169 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1854	20601921279	IMPORTADORA CH & H E.I.R.L.	JR. RAMON CARCAMO NRO. 565 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1855	20601930855	SAS CONSULTORES Y ASESORES S.A		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1856	20601941474	NIQUEN SPORT S.A.C.	AV. ABANCAY NRO. 306 INT. 109 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1857	20601942888	NEGOCIACIONES MARTAB S.A.C.	MZA. E-05 LOTE 04 C.P. LOS HUE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1858	20601958482	DISTRIBUIDORA PALACIO DE JESUS	CAL. FRANCISCO ALVARIÑO NRO. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1859	20601962439	DISTRIBUIDORA M & C MARKOS S.R	AV. LOS HEROES NRO. 509 INT. 0	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1860	20601968607	FERROVOZ IMPORT S.A.C.	MZA. G LOTE. 01 A.H. LOS ALAMO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1861	20601984548	DISTRE INNOVADORES ELECTRICOS 	AV. GUILLERMO DANSEY NRO. 405 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1862	20602002226	GRANDLAC S.A.C.	----BOLIVAR MZA. L LOTE. 2 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1863	20602003869	HIDRONEUMATICOS DEL PERU S.A.C	JR. MIGUEL ZAMORA NRO. 171 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1864	20602039979	REIMPORT J & A E.I.R.L.	JR. SAENZ PEÑA NRO. 148 LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1865	20602047572	SOLUCIONES ALTERNATIVAS INTELI	JR. PARURO NRO. 1349 INT. 50 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1866	20602076211	QUANTUM CALIBRACIONES S.A.C.	CAL. PABLO DE OLAVIDE NRO. 110	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1867	20602086519	RETAIL DEL SUR S.A.C.	SECTOR 2 MZA. K LOTE. 17 GRU. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1868	20602095704	KCF CORPORACION EMPRESA INDIVI	JR. LAS ALMENDRAS VERDES NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1869	20602098487	IMPORTACIONES & COMERCIALIZADO	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1870	20602123112	VULTEC PERU S.A.C.	CAL. LOMA UMBROSA NRO. 404 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1871	20602133088	NEGOCIACIONES KELLY S.A.C.	JR. HUAROCHIRI NRO. 518 PJE A,	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1872	20602177271	PROMECAL SOCIEDAD ANONIMA CERR	AV. GUILLERMO DANSEY NRO. 1094	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1873	20602200681	NEUMATICA INDUSTRIAL NELY E.I.	AV. ARGENTINA NRO. 523 INT. F-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1874	20602207740	IMPORTACIONES & DISTRIBUCIONES	AV. AV.PAKAMUROS NRO. 2162 SEC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1875	20602215068	PRIZMA TECHNOLOGY S.A.C.	CAL.FLORA TRISTAN NRO. 461 DPT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1876	20602217508	DIRECCION DE REDES INTEGRADAS 	CAL.A MZA. 2 LOTE. 3 A.V.R. HA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1877	20602230938	CORPORACION LIMP S.A.C.	AV. GUILLERMO DANSEY NRO. 405 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1878	20602245838	J & P COLD AIR E.I.R.L.	CAL. GRANATE MZA. E LOTE 4 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1879	20602246702	EMPRESA RAZER STORE EMPRESA IN	CAL.OCTAVIO MUÑOZ NAJAR NRO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1880	20602255914	MANNYS EMPRESA INDIVIDUAL DE R	JR. SUCRE NRO. 215 PUNO - SAN 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1881	20602258573	CERTIFICACIONES VEHICULARES DE	CAR. HUARAZ - LIMA KM. 2.5 BAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1882	20602275672	QUIJATEL S.A.C.	AV. AGRICULTURA NRO. 929 LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1883	20602282253	MCR SUMINISTROS S.A.C.	JR. BAMBAS NRO. 411 INT. 204 C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1884	20602283080	EMPRENDER CAPITAL PERU S.A.	AV. MARISCAL LA MAR NRO. 638 D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1885	20602289673	CHILDREN´S ENTERTAIMENT E.I.R.	CAR. ANTIGUA PANAMERICANA SUR 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1886	20602295797	SUTUNACEMSAA	---- BQ HUALHUAS GRANDE NRO. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1887	20602308236	INVERSIONES MDS PERU SOCIEDAD 	JR. PIURA NRO. 167 PROV. CONST	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1888	20602312969	P & S NEUMATICA INDUSTRIAL S.A	AV. ARGENTINA NRO. 523 INT. A-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1889	20602320562	FORCELEC E.I.R.L	AV. ARGENTINA NRO. 344 INT. L2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1890	20602336060	REPUESTOS Y ACCESORIOS M.A.P E	AV. AUGUSTO B. LEGUIA NRO. 930	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1891	20602355595	JHON FERRE SERVICIOS E.I.R.L	AV. GUILLERMO DANSEY NRO. 581 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1892	20602363423	Q & P SOLUCIONES INTEGRALES S.	MZA. G LOTE 20 A.H. LOS OLIVOS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1893	20602364756	INDUSTRIAS MOBILIARIAS MIAN E.	MZA. H1 LOTE. 19 PARCELA II PA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1894	20602425526	SVS MULTISERVICE & LOGISTIC E.	AV. ELMER FAUCETT NRO. 3453 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1895	20602431224	MACI EVENTOS & CATERING S.A.C.	MZA. A LOTE. 44 A.H. EL BOSQUE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1896	20602437362	MTLAB S.A.C.	AV. GERARDO UNGER NRO. 317 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1897	20602450890	KINGNOVA S.A.C.	CAL. PACAMARCA NRO. 193 DPTO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2612	10025542946	GEMIO QUISPE RICARDO	\N	NATURAL	2026-05-26 14:17:53.677671	2026-05-26 14:17:53.677671
1898	20602455271	CONSORCIO ENERGIA III	CAL.MANUEL ASENCIO SEGURA MZA.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1899	20602481434	J. SALOMON S.A.C.	JR. URUBAMBA NRO. 102 URB. JOS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1900	20602488200	ELECTRIC SOLUTIONS LAM E.I.R.L	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1901	20602493572	CONTUSOL S.A.C.	AV. BOLIVAR NRO. 1272 URB. SAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1902	20602497438	MATIZADOS MONICOLOR E.I.R.L.	AV. PERU NRO. 4099 SAN MARTIN 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1903	20602497730	JUEGOS Y EVENTOS S.A.C.	PARCEL 10964 KM. 32.5 ANT PANA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1904	20602533264	LUBRICENTRO JORGE E.I.R.L.	AV. ENRIQUE VALENZUELA NRO. 69	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1905	20602557171	BATERY CENTRO AUTOMOTRIZ CESAR	AV. CARLOS A. IZAGUIRRE MZA. C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1906	20602564038	GRUPO ITANGO E.I.R.L.	AV. AMERICA OESTE NRO. 382 DPT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1907	20602566189	DIFATEC M & V S.R.L.	CAL. LOS GIRASOLES MZA. S LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1908	20602567894	TRAVEL CORP CJ E.I.R.L.	PJ. LOS CIPRECES NRO. 178 SEC.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1909	20602595006	MAXICOR E.I.R.L.	JR. ALEXANDER VON HUMBOLDT NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1910	20602604366	PERCO SERVICIOS ELECTRICOS S.A	CAL.BRIGADIER MATEO PUMACAHUA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1911	20602609457	TRANSPORTES Y GRUAS DEL SUR SC	AV. ABANCAY NRO. 242 ---- JORG	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1912	20602618898	W & J POLLERIA SALAZAR E.I.R.L	MZA. G37 LOTE 35 A.H. BOCANEGR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1913	20602675298	COORPORACION TURISTICA SAN MAR	CAL. SAN MARTIN NRO. 982 TACNA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1914	20602682812	VIDRIOS Y ACRILICOS DEL SUR S.	MZA. M LOTE. 22 SEC. 2 GRUPO 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1915	20602711979	IMPORTACIONES GERAL MOTOR S.A.	JR. SANCHEZ CARRION NRO. 1321 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1916	20602712533	WELDCOR S.A.C.	MZA. E2 LOTE 15 A.H. BOCANEGRA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1917	20602717951	COMPAÑIA GENERAL DE MANTENIMIE	CAL.ANTISUYO NRO. 259 URB. ZAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1918	20602728324	IMPORTACIONES SATELITE S.A.C.	CAL.PROLONGACION PARINACOCHAS 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1919	20602745822	NEGOCIACIONES & MULTISERVICIOS	AV. INCA RIPAC NRO. 662 P.J. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1920	20602763693	KABEL SUPPLY E.I.R.L.	MZA. E LOTE. 8 RES. P.V. RESID	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1921	20602764461	VICTORIAS INN S.A.C.	AV. PACASMAYO NRO. 4792 URB. E	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1922	20602789943	FARAGAUSS PERU S.R.L.	JR. BENJAMIN UGARTECHE NRO. 19	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1923	20602791751	HYSA E.I.R.L.	JR. CORONEL MIGUEL ZAMORA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1924	20602831460	ABOGADOS INGENIEROS GROUP S.A.	JR. PRESBITERO GARCIA VILLON N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1925	20602846009	MONTAGREK S.A.C.	PIURA NRO. 172B JOSE GALVEZ LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1926	20602867227	MAX CENTER E.I.R.L.	AV. FRAY BARTOLOME DE LAS CAS 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1927	20602871186	HYDRO OZONE S.A.C	CAL. SAN SIMON NRO. 121 URB. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1928	20602882170	SECURITY CORPORATE SUPPLY S.A.	AV. GUILLERMO DANSEY NRO. 405 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1929	20602891110	CONCRETERA PERU MIX S.A.C.	AV. LAS TORRES MZA. L LOTE 2 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1930	20602907563	CHINT LATAM (PERU) S.A.C.	Av. Camino Real Nro. 159	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1931	20602909922	TRANSPORTES RCHAC S.A.C.	CAL.4 MZA. D LOTE. 05 URB. SAN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1932	20602917429	GRUPO NT SERVICE E.I.R.L.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1933	20602918352	MAQUIHERRAMIENTAS PRECISION PE	AV. GUILLERMO DANSEY NRO. 701 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1934	20602924182	CONSTRUCTORA JHEAN & SOLUCIONE	AV. GUILLERMO DANSEY NRO. 828 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1935	20602924654	ENERGIT TECHNOLOGY EIRL	JR. PARURO NRO. 1401 INT. 103S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1936	20602956378	INGELEC TECH S.A.C.	JR. LOS JACINTOS NRO. 2118 APV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1937	20602985262	INFRAESTRUCTURA TECNOLOGIA Y C	JR. PERSEO MZA. K LOTE. 9 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1938	20602993303	GRUPO ANTONIO E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1939	20603008872	ELECTRO GENANDER E.I.R.L.	AV. ARGENTINA NRO. 523 INT. L9	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1940	20603072007	CONSULTORA FENIX S.R.L.	JR. LOS PENSAMIENTOS NRO. 136 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1941	20603125135	MAQ-CENTER SERVICE PERU S.A.C.	AV. TOMAS VALLE NRO. 526 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1942	20603135190	SERMIN INDUSTRIAL S.A.C.	MZA. BY-1 LOTE. 06 A.H. LA JUN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1943	20603159871	PMP AIR CONDITIONER SERVICE E.	MZA. S LOTE. 10 P.J. P. ALTA S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1944	20603172052	POSTRES Y TORTAS ELI E.I.R.L	AV. DE LOS HEROES NRO. 509 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1945	20603202806	ENVASADORA NORLIMA GAS S.A.C.	AV. LAS PALMAS LOTE. 6 LOT. AG	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1946	20603243979	ESTACION DE SERVICIOS CHACLACA	CAR. CARRETERA CENTRAL KM 21.7	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1947	20603302151	IMPORT EXPORT JAXU S.A.C.	CAL.SCHELL NRO. 255 COM. SAN M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1948	20603317174	CONSORCIO ALIANZA PERÚ	CAL.GRAL SUAREZ NRO. 1030 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1949	20603328753	GRUPO REY DORADO S.A.C. - GRUR	MZA. A5 LOTE. 06 C. HAB. ALFON	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1950	20603370385	BARRA CEVICHERA LAMBAYEQUE SAC	AV. MIGUEL GRAU NRO. 365 CERCA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1951	20603381697	INVERSIONES URBANISTICAS OPERA	JR. MARISCAL LA MAR NRO. 991 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1952	20603381824	INVERSIONES URBANISTICAS S.A.	CAL. DEAN VALDIVIA NRO. 148 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1953	20603385064	IMPORTACIONES SPARTAKUS S.A.C.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1954	20603396520	SISTEMAS DE QUIMICOS S.A.C.	CAL. LAS ALMEJAS MZA. V LOTE 9	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1955	20603412461	VRV PERNOS & ACEROS E.I.R.L.	AV. ARGENTINA NRO. 327 INT. Y1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1956	20603428791	EIT INGENIERIA CORPORATIVA S.A	CAL.LINARES NRO. 191 DPTO. 302	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1957	20603430248	REFERMAT S.A.C.	AV. LAS MAQUINARIAS NRO. 1891 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1958	20603434260	GRUPO BENJAMIN S.A.C.	JR. ANDAHUAYLAS NRO. 1198 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1959	20603441371	SCV SOLUTIONS PERU S.A.C.	AV. MANUEL OLGUIN NRO. 231 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1960	20603446543	SKY AIRLINE PERU S.A.C.	AV. MANUEL OLGUIN NRO. 325 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1961	20603458657	FC ARTE CREATIVIDAD & DISEÑO S	JR. QUILCA NRO. 549 URB. PERU 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1962	20603460911	TINCOR E.I.R.L.	CAL. FERREÑAFE NRO. 101D DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1963	20603471751	INSULATION SYSTEMS & SERVICES 	CAL. PEDRO CHAMOCHUMBE AGUIRRE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1964	20603485573	PYRAMID SCALE ALL ROUND SOCIED	MZA. O LOTE 7A URB. LA ALBORAD	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1965	20603503334	FARMACEUTICA JOSE GALVEZ S.A.C	AV. LIMA NRO. 738A P.J. POETA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1966	20603505264	AGROMAN NEGOCIOS E.I.R.L.	AV. ARGENTINA NRO. 215 INT. I1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1967	20603515014	GRUPO INVERSIONES SOPHIE ESPER	MZA. J LOTE 22 ---- ASOCIACION	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1968	20603516878	INVERSIONES BARVISUR SOCIEDAD 	PRO.PATRICIO MELENDEZ NRO. 192	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1969	20603577702	SPRAY & BRAZZINI INVERSIONES E	MZA. B LOTE 14 ASC. LOS ROSALE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1970	20603584628	INVERSIONES M&J BARDALES E.I.R	JR. CALLAO NRO. 459 SEC. TARMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1971	20603586001	NEGOCIOS RETAIL DEL PERU SAC	AV. FERROCARRIL NRO. 654 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1972	20603590296	ANDO RENOVANDO S.A.C.	ALM.SAN JUAN DE BUENA VISTA MZ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1973	20603599234	CONSTRUCTORA Y COMERCIALIZADOR	JR. GUADALUPE MZA. E LOTE. 8 (	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1974	20603615019	GRUPO VISION TECNOLOGICA S.A.C	PJ. HERNAN VELARDE NRO. 165 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1975	20603624425	ESTACION ATOCONGO S.A.C.	AV. 26 DE NOVIEMBRE NRO. 2683 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1976	20603627408	INVERSIONES DOÑA AUGUSTA S.A.	CAR.PANAMERICANA SUR KM. 29,5 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1977	20603653271	YLLACONZA & ASOCIADOS COMPANY 	AV. COLONIAL NRO. 212 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1978	20603663234	TECHNOLOGY MUNDO LED PONCE S.A	JR. PARURO NRO. 1290 URB. BARR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1979	20603671261	PROSINFER EIRL	JR. PUTUMAYO NRO. 246 LIMA - L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1980	20603676433	LUBRICENTRO WILLIAMS S.A.C.	AV. PERU NRO. 3933 LIMA - LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1981	20603687443	HORBE GROUP S.A.C.	JR. AUGUSTO DURAND NRO. 2779 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1982	20603698046	ALGUSAR TRANSPORTE Y LOGISTICA	CAL. PAIMAS MZA. D5 LOTE 26B A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1983	20603702655	CORPORACION GAVITUR S.A.C.	AV. LA PAZ NRO. 108 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1984	20603704666	BMC SOLUCIONES MODULARES E.I.R	CAL.LOS ALGARROBOS MZA. G LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1985	20603721439	JC ELECTRO INNOVATION S.A.C.	JR. PARURO NRO. 1349 INT. 13 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1986	20603770979	MAXIMUM SECURITY GROUP S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1987	20603782250	EL OLAM COMPAÑÍA OPERADORA DE 	JR. 27 DE OCTUBRE NRO. S/N JUN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1988	20603792034	IMPORTACIONES INDUPER S.A.C.	JR. LOS TORNOS NRO. 282 URB. -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1989	20603797427	PERU REC E.I.R.L.	JR. HUANTAR NRO. 5018 URB. PAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1990	20603800908	GRUPELEC PERU S.A.C.	MZA. 144 LOTE. 22 AGR HUASCAR 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1991	20603808747	MULTISERVICIOS Y REPUESTOS ANT	AV. PERU MZA. E14 LOTE. 15 A.H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1992	20603814364	SERVICIOS MEDICOS BIO MEDIL E.	AV. MIGUEL IGLESIAS 971-A NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1993	20603834781	FENIX IMPORT PERU E.I.R.L.	CAL. CAJABAMBA NRO. 313 URB. T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1994	20603850140	MULTISERVICIOS MAMA FLOR INTER	GAL.CENTRO COMERCIAL LURIN CEN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1995	20603889755	CORPORACION PUNTO G DEL PERU E	JR. RAMON CASTILLA NRO. 708 PB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1996	20603893558	SEGURIDAD ELECTRONICA MARRUY S	AV. INCA GARCILAZO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1997	20603924828	DESTINOS GLOBAL LOGISTICS ACL 	CAL.CARBONO NRO. 320 INT. 02 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1998	20603950705	INVERSIONES ELECTRICOS MR E.I.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1999	20603990642	INVERSIONES HURSA SOCIEDAD ANO	JR. CHANCHAMAYO NRO. 210 SEC. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2000	20603993471	BOTICA BARRENECHEA S.R.L.	JR. LADISLAO ESPINAR NRO. 101A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2001	20604000689	INVERSIONES VALERIA ILO EIRL	MZA. H LOTE 09 ASC. AMAUTA MOQ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2002	20604032564	SELCROM PERU E.I.R.L.	CAL. LOS SAUCES LOTE. 16 DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2003	20604057567	INVERSIONES SUPREMA DEL PERU E	MZA. 61 LOTE 9 P.J. VILLA POET	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2004	20604072141	PREVENTIVE SEGURITY E.I.R.L.	AV. GUILLERMO DANSEY NRO. 775 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2005	20604089558	CORPORACION EDY SAC	MZA. E LOTE. 15 ASC. NUEVA AME	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2006	20604100551	GRUPO ENERMEC S.A.C.	JR. 2 DE MAYO 132 MZA. 17 LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2007	20604122466	SOLUCIONES LIDISA E.I.R.L.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2008	20604154759	ORUKIKO EMPRESA INDIVIDUAL DE 	JR. LIMA NRO. 746 SEC. TARMA (	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2488	10278347899	CIEZA CERA CESAR JEFREY	\N	NATURAL	2026-05-18 15:37:28.141548	2026-05-18 15:37:28.141548
2009	20604171408	INVERSIONES VAHTITO S.A.C.	AV. LOS HEROES NRO. 515 DPTO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2010	20604180717	MINI BF PERU S.A.C.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2011	20604212856	CENTER OF ENGINEERING FOR THE 	CAL.ZAPALLAL NRO. 1384 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2012	20604240451	SEGURIDAD INDUSTRIAL FLORES MU	AV. ENRIQUE VALENZUELA NRO. 68	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2013	20604243719	GYD INNOVA COMPANY S.A.C.	AV. TOMAS VALLE NRO. 2110 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2014	20604260231	CORPORACION PROVINSUR SOCIEDAD	AV. GUARDIA CIVIL NRO. 516 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2015	20604279870	WELDER POWER E.I.R.L.	AV. MARISCAL OSCAR R. BENAVID 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2016	20604282145	FERRETERIA PROYECTOS  E.I.R.L.	MZA. 61 LOTE 6 URB. L.E VALCAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2017	20604302545	GRUPO OXIMER IMPORT S.A.C.	AV. COLONIAL NRO. 358 DPTO. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2018	20604302863	ADMINISTRACION DE GRIFOS LEP S	JR. MONTE ROSA NRO. 256 INT. 9	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2019	20604329681	AKV CATERING S.A.C.	AV. DOS DE MAYO NRO. 830 DPTO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2020	20604330808	MANDRIL IMPORTACIONES E.I.R.L.	CAL. LOS EUCALIPTOS NRO. 460 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2021	20604357234	OBRAS FERRETERO INDUSTRIALES S	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2022	20604385556	INVERSIONES LA BRAZA E.I.R.L.	MZA. J LOTE. 16 INT. 01 URB. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2023	20604389837	PINTURA Y MATIZADOS MACO COLOR	AV. GULLMAN MZA. O LOTE 17 A.H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2024	20604395870	G & M FERREVALLEJO E.I.R.L.	MZA. L LOTE. 15 INT. 3 URB. LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2025	20604446628	TECHNO TOOLS S.A.C.	AV. ANGAMOS ESTE NRO. 979 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2026	20604457921	COMUTEL PERU S.A.C.	CAL. FRAY GIOVANNI ANGELICO NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2027	20604461953	M & M GAB SERVICIOS GENERALES 	CAL.GARCILAZO DE LA VEGA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2028	20604491160	JA LU IMPORTADORA FERRETERA E.	PJ. 10 AV ARGENTINA NRO. 215 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2029	20604491178	LUFERVA PERU S.A.C.	CAL.1 MZA. B LOTE. 09 P.V. MON	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2030	20604504881	FORUSA SOCIEDAD ANONIMA CERRAD	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2031	20604510504	SN INVERSIONES S.A.C.	AV. PROCERES DE LA INDEPENDENC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2032	20604524483	AGRO OLMOS EXPORT S.A.C.	CAR. PANAMERICANA NORTE KM. 91	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2033	20604539383	OREGON CHEM GROUP S.A.C.	CAL. PEDRO ALCOCER NRO. 150 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2034	20604586152	HOSTAL KIARA E.I.R.L.	NRO. SN FND. SANTA ISABEL ICA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2035	20604614539	PARIS ARAKEL S.A.C.	JR. LEONCIO PRADO NRO. 117 PUE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2036	20604621551	NUCOR INVERSIONES PERU S.A.C. 	CAL. SANTA ANA LOTE 52 FND. EX	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2037	20604667535	PEINSAC INGENIERIA S.A.C.	AV. TOMAS VALLE MZA. I LOTE 3 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2038	20604705721	SERVICELIB S.A.C.	AV. GONZALO UGAS NRO. 29 LA LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2039	20604716188	IMPORTACIONES KOFCELL S.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2040	20604767289	HILTI PERU S.A	AV. JAVIER PRADO ESTE NRO. 499	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2041	20604794243	CIMEDISA IMPORT S.A.C.	AV. GERARDO UNGER MZA. E LOTE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2042	20604811601	CORPORACION DE NEGOCIOS VELVET	CAL. MURCIA NRO. 232 DPTO. 302	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2043	20604819688	V.M. FERREMAT E.I.R.L	JR. LADISLAO ESPINAR NRO. 85 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2044	20604850194	DISTRIBUCIONES CAMACHO S.R.L.	AV. TAHUANTINSUYO NRO. 1009 BA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2045	20604854912	INVERSIONES MIGUEL ANGELO E.I.	NRO. SN SECTOR QUEFE LAMBAYEQU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2046	20604891389	TERRA MAPS INGENIERIA TOPOGRAF	MZA. I LOTE 18 ---- ASOC LAS G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2047	20604910642	DINANT S.A.C.	CAL. ALICIA ALARCON NRO. 350 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2048	20604913960	SISTEMAS INTEGRADOS DE GESTION	MZA. A LOTE. 5 BAÑOS DE OTERO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2049	20604947589	KHALERGY E.I.R.L.	AV. CIRCUNVALACION GOLF LOS I 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2050	20604978824	INGENIERIA Y DISEÑO DEL ACERO 	MLC.RIMAC NRO. 1996 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2051	20604993751	HELUKABEL PERU S.A.C.	AV. VICTOR ANDRES BELAUNDE NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2052	20605008365	RUTA DIEZ DEL NORTE S.A.C.	MZA. 70 LOTE. 19 URB. LA RINCO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2053	20605012931	TROCHA SUJECIONES E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2054	20605015736	ARITZ AUTOMOTRIZ EMPRESA INDIV	AV. AUGUSTO B. LEGUIA NRO. 920	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2055	20605046241	KABELWIRE S.A.C.	CAL. MARBELLA NRO. 259 DPTO. 6	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2057	20605113754	CONSORCIO IQUITOS PERU	CAL. CONDAMINE NRO. 395 LORETO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2058	20605116699	ELECTRO COMERCIAL RW & JA S.A.	AV. OSCAR BENAVIDES NRO. 200 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2059	20605141723	E.E.S.S. ONERGY SOCIEDAD ANONI	AV. SANCHEZ CERRO MZA. A LOTE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2060	20605172475	IMPORTADORES Y DISTRIBUIDORES 	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2061	20605199292	INDUCH E.I.R.L.	AV. GUILLERMO DANSEY NRO. 451 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2062	20605221000	OPEN SERVICES PERU S.A.C.	AV. INCA G DE LA VEGA NRO. 134	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2063	20605254960	GRUPO INKFINITY SOCIEDAD ANONI	JR. CAMANA NRO. 1043 INT. 305 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2064	20605307788	OLWI & PT S.A.C	JR. HUAROCHIRI NRO. 550 INT. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2065	20605334505	M & E LUKEVI S.A.C.	AV. REPUBLICA DE PANAMA NRO. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2066	20605340378	INDUSTRIAS CRISSPLAST E.I.R.L.	MZA. D LOTE. 30 URB. SANTA ELV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2067	20605346392	ORIGINAL J J S.A.C.	AV. ABANCAY NRO. 666 CERCADO D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2068	20605356100	GARANTIA CAPITAL S.A.C.	AV. FAUSTINO SANCHEZ CARRION N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2069	20605370048	FERRETERIAS Y METALES JORGE SA	AV. FCO. DE PAULA OTERO NRO. 5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2070	20605408410	IMPORTACIONES Y DECORACIONES V	JR. ANTONIO BAZO NRO. 580 INT.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2071	20605419926	IMPORTACIONES GARRUCHAS ANGELO	AV. ARGENTINA NRO. 639 INT. A-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2072	20605441204	INDUSTRIAS ALTOS SOCIEDAD ANON	AV. ALAMEDA SAN MARCOS MZA. S1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2073	20605459910	FERRETERIA & DISTRIBUCIONES VI	MZA. A LOTE. 6 PRO VIVIENDA  L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2074	20605499725	SIEMENS S.A.C.	AV. DOMINGO ORUE NRO. 971 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2075	20605502912	CONSTRUCCION Y FABRICACION CON	CAL.PANAMERICANA NORTE MZA. A 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2076	20605545328	CORPORACION NIMAR E.I.R.L.	CAL. 7 MZA. A LOTE 1 ASC. 23 D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2077	20605551280	RESTOBAR SECRETOS DEL MAR S.R.	MZA. 15 LOTE 05 URB. DANIEL A.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2078	20605552669	FERREPER E.I.R.L.	CAL.CONSTITUCION NRO. 901 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2079	20605559400	INTEM G & C E.I.R.L.	AV. ARGENTINA NRO. 215 (PJS 8 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2080	20605560068	IMPORTACIONES COMPUSTORE E.I.R	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2081	20605569723	MAXWELL CONTROLS PERU E.I.R.L.	AV. LOS VIRREYES NRO. 1260 DPT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2082	20605575375	GRUPO 2B IMPORT E.I.R.L.	AV. NACIONES UNIDAS NRO. 1578 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2083	20605596577	CORPORACION JOHNTOP S.A.C.	AV. SANTIAGO DE SURCO NRO. 439	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2084	20605597484	OPERACIONES LOGISTICAS HERNAND	MZA. 38 LOTE. 4A INT. 302 P.J.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2085	20605608001	SERVICIOS MULTIPLES COORPORACI	MZA. B LOTE. 16 A.V. EL PARAIS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2086	20605669566	JMC MEDICAL E.I.R.L.	AV. EMANCIPACION NRO. 701 CERC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2087	20605674543	UNIFORMES FERNANDO E.I.R.L.	MZA. G LOTE. 32 COO. VILLA MER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2088	20605737791	LAMINADOS Y PERFILES FLORES SO	AV. E. GONZALES CACEDA NRO. 17	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2089	20605738207	MGS SOLUCIONES ELECTRONICAS E.	MZA. I LOTE. 28 SEC. 2 NUEVO P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2090	20605758496	WORK TOOLS EMPRESA INDIVIDUAL 	----PROLONG.PATRICIO MELENDEZ 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2091	20605784802	PROCESADORA DE PRODUCTOS ILO E	MZA. Y LOTE 01 URB. A.I. SAN F	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2092	20605793488	SERVICIOS GENERALES PATRICK & 	JR. LA CANTUTA NRO. 940 VLL. U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2093	20605806725	STANDARD  R Y B S.A.C.	AV. PERU NRO. 3930 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2094	20605809805	IEMA PERU S.A.C.	MZA. A6 LOTE. 53 URB. SANTA PA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2095	20605817085	SERVICIOS GENERALES EL MANGLAR	MZA. H LOTE 06 APV. VILLA META	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2096	20605823972	IMPORTADORA DIGITAL TECNOLOGIC	CAL.D4 MZA. 60 LOTE. 43 A.H. H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2097	20605848444	SOLUCIONES TECNICAS FIGUEROA E	CAL.SANTA ELENA NORTE NRO. 155	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2098	20605857265	GESTIONA CONSULTORIAS Y SERVIC	OTR.ASOC. RICARDO PALMA MZA. 0	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2099	20605885072	SHARLUX ELECTRICIDAD SOCIEDAD 	MZA. 360 LOTE. 15 ASC. 28 DE A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2100	20605888144	PUBLICITY BRANDING TRADE E.I.R	AV. LIMA NRO. 1693 A.H. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2101	20605906550	TECNOLOGY 360 SOCIEDAD ANONIMA	CAL. LOS SAUCES MZA. H1 LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2102	20605927450	SERVICIOS INTEGRALES DE METROL	CAL.JOSE DIEZ CANSECO NRO. 142	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2103	20605939199	AQUAMET SOLUCIONES INTEGRALES 	AV. VICENTE MORALES DUAREZ NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2104	20605940961	CONSTRUYE J & C E.I.R.L.	JR. J. CAPELLO NRO. 362 URB. I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2105	20606004843	CORPORACION FERRETERA EL AGUIL	CAL.INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2106	20606017309	BUTYCAR LIMP E.I.R.L.	CAL. ASCOPE CUADRA 4 NRO. . IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2107	20606037482	AUDIO SEM S.A.C.	AV. LA MOLINA NRO. 500 URB. RE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2108	20606046325	MULTI HERRAMIENTAS LUDELCA S.A	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2109	20606047666	L & U SERVICE TOURS E.I.R.L.	MZA. A5 LOTE. 41 ASC. RESIDENC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2110	20606054131	PRISA SOLUTIONS S.A.C.	AV. LA FONTANA NRO. 440 INT. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2111	20606059681	EMPRESA DE TRANSPORTES HIDALGO	MZA. E BAR. TOTORA AYACUCHO - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2112	20606065362	PETROGROUP E.I.R.L.	JR. HUMBOLT CON PROLONGACION N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2113	20606070391	JUVISA FERRETERO S.A.C.	AV. CESAR VALLEJO NRO. 870 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2114	20606098805	CORPORACION VH & FA SOCIEDAD A	CAL. RAMON RODRIGUEZ NRO. 933 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2115	20606109343	SOLANA COMERCIAL S.A.C.	AV. SANTO TORIBIO NRO. 0143 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2116	20606110619	SERVICENTRO EL OLIVAR S.A.C.	PJ. SANTA ROSA NRO. 435 (CERCA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2117	20606121424	JR COMMERCE.COM S.A.C.	AV. GUILLERMO DANSEY NRO. 405 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2118	20606127775	INVERSIONES PKR E.I.R.L.	MZA. D9 LOTE. 23 URB. LOS CEDR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2119	20606134488	INVERSIONES HEGY E.I.R.L.	AV. GUILLERMO DANSEY NRO. 478 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2120	20606155485	IMPORTADORA Y DISTRIBUIDORA DA	CAL. ASCOPE NRO. 452 INT. Y1-1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2121	20606169877	GRUPO VENEZUELA SAC	MZA. A LOTE. 6A A.V. AGROPECUA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2122	20606196891	COREIN GROUP S.A.C.	AV. GUILLERMO DANSEY NRO. 401 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2123	20606250496	REPUESTOS ELECTRONEUMATICAS HY	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2124	20606260203	ANCOPAR E.I.R.L.	JR. PABLO BERMUDEZ NRO. 125 SE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2126	20606283602	MACPRO SOLUTIONS PERU S.A.C.	JR. NEVADO HUASCARAN NRO. 247 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2127	20606289660	BREXTON CAPITAL S.A.C.	AV. MARISCAL OSCAR R. BENAVID 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2128	20606289708	REFRIMART S.A.C.	CAL. ISAAC RECAVARREN NRO. 179	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2129	20606290803	SOLUCIONES INTEGRALES EN ELECT		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2130	20606331763	IMPORT PAUCAR SYSTEMS S.A.C.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2131	20606336803	CORPORACION LIGHT SOLUTIONS S.	JR. HUAROCHIRI NRO. 536 OTR. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2132	20606352621	BENSA PERNOS DE ACERO E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2133	20606362405	ENCARGA TOTAL S.A.C.	CAL. MOQUEGUA MZA. F 11 LOTE 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2134	20606363843	TRANSPORTES IMPERIAL EXPRESS S	CAL. CAPRICORNIO MZA. F LOTE 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2135	20606370718	NBS ELECTRICIDAD INDUSTRIAL S.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2136	20606371366	VENTA DE BIENES DE LINEA INDUS	CAL.FINAL DE AV LOS CHANCAS AL	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2137	20606381388	YERLUX COMER DE SUMINISTROS EL	CAL. PACASMAYO NRO. 551 URB. L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2138	20606387564	CAMARA DE COMERCIO VIRTUAL S.A	AV. MANUEL GONZALES PRADA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2139	20606389915	ENELEC PERU S.A.C.	AV. GUILLERMO DANSEY NRO. 444 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2140	20606407794	GO INGENIERIA Y TECNOLOGIA S.A	CAL. GERMAN SCHEREIBER NRO. 27	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2141	20606407816	NOMADS EQUIPMENT S.R.L.	CAL. SANZIO NRO. 341 URB. LA C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2142	20606477903	MAQRENTAL LUISMA S.A.C.	MZA. P LOTE. 9 ASC. VILLA UNIV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2143	20606478870	GRUPO PALAFOX E.I.R.L.	PRO. PARINACOCHAS NRO. 1275 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2144	20606479604	M & D IMPORTADORA Y DISTRIBUID	AV. OSCAR R. BENAVIDES NRO. 21	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2145	20606481161	SERVICENTRO HERBERT MEZA CACED	AV. DE LA MARINA NRO. 892 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2147	20606492724	ALNE SALUD EMPRESA INDIVIDUAL 	AV. PACHECO NRO. 247 JUNIN - T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2148	20606507047	ARLINK-J EIRL	MZA. J1 LOTE 04 A.H. SAN JOSE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2149	20606566337	NDS AUTOMATIZACIÓN Y PROYECTOS	CAL.LOS AMANCAES MZA. B LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2150	20606572035	IMPORTACION CHEN S.A.C.	JR. PARURO NRO. 1096 DPTO. 106	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2151	20606609931	CORPORACION VILLATUR PERU E.I.	CAL.ASENTAMIENTO HUMANO JUAN P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2152	20606616253	ELECTRONICA GUERRERO E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2153	20606627301	SAFE TOURS E.I.R.L.	AV. PASTOR SEVILLA MZA. L LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2154	20606648589	FERRETERIA E INVERSIONES JOSE 	AV. PACHACUTEC NRO. 2810 P.J. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2155	20606650796	G & C INVERSIONES Y NEGOCIOS S	AV. ANGAMOS ESTE NRO. 1651 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2156	20606666536	JCP MAQUINARIA Y CONSTRUCCION 	MZA. 17 LOTE 18 A.H. NUEVO ILO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2157	20606685379	SERVICIOS GENERALES COLONNA S.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2158	20606688041	GECY B & A PHARMA EMPRESA INDI	JR. DOS DE MAYO NRO. 240 JUNIN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2159	20606691301	INTERNATIONAL TRAVEL TEAM SOCI	CAL. MIGUEL ANGEL NRO. 286 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2160	20606699221	ELECTRO FERRETERO SYALUZ S.A.C	AV. GUILLERMO DANSEY NRO. 468 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2161	20606747170	MOCHIKA TOURS S.A.C.	CAL.CENTENARIO NRO. 348 URB. A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2162	20606751657	GOL MARINO PACASMAYO S.A.C.	CAL.ADOLFO KING NRO. 133 LA LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2163	20606763744	INTERNACIONAL EXPRESO SAN CRIS	AV. EVITAMIENTO NRO. S/N INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2164	20606777257	ALMACENES FORWARDER S.A.C.	AV. CORONEL NESTOR GAMBETTA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2165	20606782552	INDUSTRIAS MR COPPO S.R.L - IN	JR. LADISLAO ESPINAR NRO. 101 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2166	20606790784	LG NET PERU SAC		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2167	20606790890	LP HOTELES S.A.	JR. MARISCAL LA MAR NRO. 991 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2168	20606840781	MALLAS DAVICOR E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2169	20606873787	JEP ELECTRICIDAD PERUANA S.R.L	JR. LAMPA NRO. 1021 INT. 145 C	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2170	20606873973	PORT LATIN S.A.C.	JR. SANCHEZ CARRION NRO. 733 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2171	20606884843	ONPLUS E.I.R.L.	AV. GUILLERMO DANSEY NRO. 330 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2172	20606888954	TURISMO EXPRESS M&O SOCIEDAD C	AV. SAN BORJA SUR NRO. 1174 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2173	20606898348	ESNA MEDIC INVERSIONES S.A.C.	AV. EMANCIPACION NRO. 615 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2174	20606908491	COMERCIALIZADORA SAN MARTIN DE	CAL.PATRICIO MELENDEZ NRO. 425	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2175	20606918985	PROTEC PERU & SUMINISTROS E.I.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2176	20606922869	MERCOCELL S.A.C.	AV. SANTA CRUZ NRO. 381 DPTO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2177	20606944005	CASA & OFERTAS EIRL	MZA. E LOTE. 9 URB. LAS VIRREY	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2178	20606947012	SERVICIO E INVERSIONES ANDY S.	AV. . PACHACUTEC NRO. 3107 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2179	20606976063	CENTRO DE PREVENCION DE RIESGO	MZA. E3 LOTE. 17 INT. C2 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2180	20606988941	CITEK SOLUTIONS S.A.C.	CAL.2 DE MAYO NRO. 516 INT. 20	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2181	20606988967	SERVICIOS Y SUMINISTROS DE IMP	CAL. TUPAC AMARU NRO. 492 A.H.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2182	20606989653	MVG REPARACIONES INDUSTRIALES 	CAL.01 MZA. A LOTE. 46 URB. VI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2183	20607021661	SYR COMPANY S.A.C.	JR. LUCANAS NRO. 160 URB. JOSE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2184	20607024031	GALCO GRUAS Y EQUIPOS S.A.C.	MZA. A LOTE 14 URB. VILLA GLOR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2185	20607036323	ARPEZLA E.I.R.L.	----GALVEZ NRO. 500 INT. 1 (CO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2186	20607058939	DATACAM S.A.C.	CAL. LOS CANARIOS NRO. 350 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2187	20607075540	SERVIRED PERU E.I.R.L.	JR. SAN DIEGO NRO. 484 URB. CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2188	20607096172	GX SOLUCIONES INFORMATICAS E.I	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2189	20607134716	FRIOIMPORTPERU S.A.C.	RESIDENCIAL MZA. E LOTE. 5 APV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2190	20607147851	AL CILINDRO ZAYURI E.I.R.L.	AV. GERARDO UNGER NRO. 6911 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2191	20607175994	RESTAURANT LA CALESA DEL SUR S	AV. TOMAS VALLE MZA. F LOTE. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2192	20607176915	DOCTOR FRIO S.A.C.	JR. PACASMAYO NRO. 279 INT. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2193	20607189375	INGEMEL PERÚ S.A.C.	SCT 0504 MZT 029 MZA. A7 LOTE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2194	20607189456	SERVICIOS GENERALES CONFORT CA	PRO.ARICA NRO. 2321 (A ESPALDA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2195	20607221210	ERGONOMIASUR S.A.C.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2196	20607222691	SERVICIOS MEDICOS & FARMACIA G	JR. DOS DE MAYO NRO. 449 JUNIN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2197	20607253901	COMPLEJO TURISTICO RECREACIONA	AV. LAS AMERICAS NRO. 1080 JUN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2198	20607270857	EXPRESO EL RUSO E.I.R.L.	JR. FRANCISCO JAVIER DE LUNA N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2199	20607272043	INVERSIONES QUELLO S.A.C.	JR. HUAROCHIRI NRO. 536 INT. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2200	20607276839	R & S SYSTEM SERVICIOS GENERAL	JR. MOLINO DEL AMO NRO. 759 OT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2201	20607284645	AVP INDUSTRIA ELECTRIC E.I.R.L	AV. GUILLERMO DANSEY NRO. 444 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2202	20607290564	SERVICIOS INDUSTRIALES Z Y L S	CAL. SALAVERRY MZA. D LOTE. 1A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2203	20607303917	GRUPO PAYMI SOCIEDAD ANONIMA C	JR. LIMA NRO. 242 JUNIN - TARM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2204	20607377597	MULTISERVICIOS MAPERZ E.I.R.L.	AV. GUILLERMO DANSEY NRO. 454 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2205	20607393649	JETSMART AIRLINES PERU S.A.C.	AV. CAMINO REAL NRO. 493 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2206	20607425991	BEJUL SOCIEDAD ANONIMA CERRADA	MZA. F2 LOTE. 42 SEC. FRATERNI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2207	20607439193	CORPORACION LIDIMI SOCIEDAD AN	JR. PARURO NRO. 1101 URB. BARR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2208	20607557595	REVISIONES TECNICAS VEHICULARE	CAR. CARR. CHICLAYO A POMALCA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2209	20607560162	IMPORTACIONES LUBECKA S.A.C.	AV. MARISCAL OSCAR R. BENAVIDE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2210	20607561631	CORPORACION OWEN & DAVID S.A.C	JR. SANCHEZ CARRION NRO. 1082 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2211	20607561746	PLAZA SEIKO S.A.C.	BL. VERGANI NRO. 1 JUNIN - CHA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2212	20607567256	MULTINEGOCIOS LYAM E.I.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2213	20607574287	ALFASEGUR SOLUCIONES S.A.C.	CAL. AGUSTO SALAZAR BONDI NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2214	20607579475	HOTEL ARIS S.A.C.	CAL. JOSE FRANCISCO CABRERA NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2215	20607603007	CORPORACION MANGUIPERU SOCIEDA	AV. SAN JUAN MZA. D 1 LOTE. 19	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2216	20607615862	GRUPO GREDISA S.A.C.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2217	20607619990	LIU SERVICIOS EMPRESARIALES S.	JR. HUARAZ NRO. 325 URB. CHACR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2218	20607657018	EMPRESA DE TRANSPORTES, TURISM	JR. TACNA NRO. 171 (ENTRE PUNO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2219	20607666211	UNIDAD Y PODER SOCIEDAD ANONIM	JR. CHANCHAMAYO NRO. 391 (S711	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2220	20607745413	FERRETERO EL OBELISCO E.I.R.L	JR. SANTIAGO ZAVALA NRO. 267 P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2221	20607809454	INYELUMA S.A.C.	AV. PACHACUTEC NRO. 2890 A.H. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2222	20607812251	CORPORACION PRODIMER PERU SOCI	MZA. J LOTE. 21 ASC. DE VIVIEN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2223	20607814903	JK FULLWAGEN S.A.C.	AV. ALEJANDRO VELASCO ASTETE N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2224	20607858447	CORPORACION AJUSTE PRECISO S.A	MZA. A LOTE. 9 APV. ASOCIACION	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2225	20607868515	TRANSPORTES ERATUR S.A.C.	AV. SAN CARLOS NRO. 201 INT. 0	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2226	20607889890	COMERCIAL SALAZAR FYS S.A.C.	AV. MARISCAL OSCAR R. BENAVIDE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2227	20607908771	ELECTRIC COMPANY M & R E.I.R.L	AV. ARGENTINA NRO. 215 INT. S5	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2228	20607919535	ELECTRA GROUP S.A.C.	CAL.LOS SAUCES SUB LOTE. 04 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2229	20607952524	GRUPO TERRAKO E.I.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2230	20607963135	SECURITY STORE KAMIA IMPORT S.	PRO.PATRICIO MELENDEZ NRO. 106	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2231	20607972479	SANTA CRUZ MEDICAL SOCIEDAD AN	AV. JAVIER PRADO ESTE NRO. 275	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2232	20607977268	TYC FABRICACIONES, MONTAJES, P	AV. AVIACIÓN NRO. 1147 C.P. CO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2233	20607993506	CORPORACION BARLOVENTO S.A.C.	MZA. D LOTE. 25 ASC. LAS MARGA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2234	20607994006	SERGING S.A.C.	PQ. SEÑOR DE LOS MILAGROS MZA.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2235	20608003437	CORPORACION RIMAYA S.A.C.	MZA. A LOTE. 10 OTR. PROVIDA R	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2236	20608053191	JDONDADE INVERSIONES S.A.C.	CAL. FLORA TRISTAN NRO. 501 DP	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2237	20608070606	COLORES CLOWN S.A.C.	AV. DEL PACIFICO NRO. 180 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2238	20608077678	MULTISERVICIOS CISNEROS S.A.C.	AV. BOLIVIA NRO. 148 INT. 2063	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2239	20608106082	VETERIS MAXIMUS E.I.R.L.	CAL. LOS GERANIOS MZA. W2 LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2240	20608122649	CELL WORLD S.A.C.	AV. PETIT THOUARS NRO. 5228 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2241	20608152831	A & LL PROFCLEANING S.A.C.	AV. CARABAYLLO NRO. 580 URB. E	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2242	20608162241	EMPRESA CHENG TARMA E.I.R.L.	AV. MANUEL A. ODRIA NRO. SN SE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2243	20608215914	GRUPO PRIOR SAC	JR. JORGE CHAVEZ NRO. 193 INT.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2244	20608217232	ANDAMIOS RHM S.A.C.	MZA. B LOTE. 10 INT. 7 URB. LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2245	20608222007	PIONEROS DEL NORTE S.A.C.	AV. LA MARINA NRO. 143 LA LIBE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2246	20608234960	PINGÜINO FRIO & CALOR E.I.R.L.	AV. MIGUEL GRAU NRO. 141 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2247	20608246593	FABRISORTEC E.I.R.L.	AV. GUILLERMO DANSEY NRO. 828 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2248	20608256548	FEDERHT ENTERPRISE E.I.R.L	JR. SIMON BOLIVAR NRO. 615 PUE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2249	20608257765	FERRE. INDUSTRIA MARISOL E.I.R	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2250	20608274899	SISTEMA DE RIEGO POLIPLAST SOC	AV. ARGENTINA NRO. 325 URB. CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2251	20608277987	DISTRIBUIDORA LUBO S.A.C.	MZA. A1 LOTE. 5B A.V. LOS FRUT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2252	20608279637	ARTEUS S.A.C.	AV. INCA G. DE LA VEGA 1348 IN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2253	20608280333	COMPAÑIA HARD DISCOUNT S.A.C.	CAL.MORELLI NRO. 181 DPTO. 404	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2254	20608284011	CORPORACION FERRETERA FERREMAX	AV. PROCERES DE LA INDEPENDEN 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2255	20608287443	POSPERU INC S.A.C.	CAL. MONSERRATE NRO. 396 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2256	20608298887	CORPORACION FAYDO S.A.C.	AV. G. DANSEY  PASAJE 12 NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2257	20608300393	COMPAÑIA FOOD RETAIL S.A.C.	CAL.CESAR MORELLI NRO. 181 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2258	20608301756	CONSORCIO ALEX CRUZ E.I.R.L.	AV. AV GUILLERMO DANSEY NRO. 4	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2259	20608334701	UVI TECH PERU S.A.C.	AV. JOSE LARCO NRO. 1232 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2260	20608405586	INVERSIONES GASTRONOMICAS ANGE	JR. CAJAMARCA NRO. 807 C.P. TE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2261	20608411144	GRUPO INDUSTRIAL DAMISA S.A.C.	JR. HUAROCHIRI NRO. 541 INT. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2262	20608418904	EXPERT TOOLS PERU S.A.C.	CAL. PADRE URRACA NRO. 121 DPT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2263	20608430301	BOTICAS IP S.A.C.	AV. DEFENSORES DEL MORRO NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2264	20608438743	VISION ONE INTERNATIONAL S.R.L	CAL.MONTE GRANDE NRO. 188 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2265	20608496638	WTM TRADING COMPANY S.A.C.	JR. MIGUEL GRAU NRO. 528 (A LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2266	20608498878	SERVICIOS Y MANTENIMIENTOS MEC	AV. 28 DE JULIO NRO. 201 LA LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2267	20608504541	REDES Y CONTROLES INDUSTRIALES	AV. ARGENTINA NRO. 308 INT. 10	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2268	20608528441	LDA ILUMINA E.I.R.L.	JR. AZANGARO NRO. 996 CERCADO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2269	20608552171	UNACEM PERU S.A.	AV. ATOCONGO NRO. 2440 (CARCA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2270	20608621386	INVERSIONES E IMPORTACIONES ER	CAL. LOS ESCRIBANOS NRO. 125 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2271	20608663488	SERVICIOS GENERALES VALESKO'S 	AV. LA PAZ NRO. 194 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2272	20608673947	PALMA BELLA FARM S.A.C.	MZA. F LOTE. 0010 URB. PALMA B	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2273	20608692569	FERRETERIA ABANT'S S.A.C.	AV. QUILCA MZA. A37 LOTE. 7B U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2274	20608698630	ARRIETA PLASTIC S.A.C.	JR. DELICIAS DE VILLA MZA. H-1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2275	20608715534	TERALINK E.I.R.L.	AV. JOSE LOPEZ PAZOS NRO. 189 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2276	20608776142	DISTRIBUCIONES LLAMKAQ S.A.C.	PJ. RELAMPAGO NRO. 101 URB. AR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2277	20608777599	VASSAL SERVICIOS SOCIEDAD ANON	JR. JULIO BELLIDO NRO. 1020 ZO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2278	20608834592	TERMGRIF E.I.R.L.	AV. GUILLERMO DANSEY NRO. 490 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2279	20608854054	SERVICIOS MULTIPLES C & Z DIST	JR. HUAROCHIRI NRO. 536 (AV OS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2280	20608876741	GAEL & DANNA E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2281	20608885855	GASOLINERAS GRAN PRIX EMPRESA 	AV. GENERAL ALVAREZ DE ARENAL 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2282	20608908324	BUYPAL STORE PERU S.A.C.	JR. AUGUSTO DURAND NRO. 2416 I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2283	20608911996	WWW.REMATAZO.PE S.A.C.	CAL.OCTAVIO MUÑOZ NAJAR NRO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2284	20608922637	CORPORACION CHIFA FA TE GUSTAR	AV. LIMA NRO. 2335 URB. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2285	20608963376	AS ASOCIADOS Y HOTELES S.A.C.	JR. ASAMBLEA NRO. 159 URB. CER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2286	20608989961	BRACSAN S.A.C.	JR. PARURO NRO. 1353 INT. 214 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2287	20609005531	JS PROVEEDORES Y DISTRIBUIDORE	AV. BOLIVAR NRO. 2010 DPTO. 40	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2288	20609010330	CC INNOVACION Y SERVICIOS SOCI	AV. SAN FELIPE NRO. 1011 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2289	20609054027	MULTITOOLS PERU S.A.C.	JR. SARGENTO ANTONIO LISHNER N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2290	20609076993	INVERSIONES BIODEGRADABLES NEL	JR. HIPOLITO UNANUE NRO. 1789 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2291	20609079321	L & P CORPORACION 3A E.I.R.L.	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2292	20609088606	GRUPO C & M CAMACHO S.A.C.	CAL. LADISLAO ESPINAR MZA. L L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2293	20609115549	T & J HNOS. GAVILAN E.I.R.L.	AV. GUILLERMO DANSEY NRO. 468 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2294	20609186217	F & E GRUPO RISCO E.I.R.L.	CAL. MATEO REMIGIO NRO. 787 A.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2295	20609187639	CORPORACON FERRETERA MICHAEL Y	JR. SAN JUAN NRO. 521 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2296	20609198916	MISHA IMPORT S.A.C.	CAL. PUCALLPA NRO. 354 URB. SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2297	20609211351	INVERSIONES Y VENTAS DEL SUR E	MZA. A3 A.H. VILLA LOS REYES I	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2298	20609220067	IMPLEMENTOS DE SEGURIDAD EN MI	JR. SANCHEZ CARRION NRO. 1327 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2299	20609230046	IMPORT SEGURIDAD INDUSTRIAL GI	AV. ARGENTINA NRO. 327 OTR. CC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2300	20609232936	IMPORTADORA AUTOMOTRIZ GAMARRA	AV. DEL AIRE NRO. 1329 DPTO. 2	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2301	20609255774	TINK ARTE GRAFICO E.I.R.L.	PJ. ARMAS NRO. 154 (.) LA LIBE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2302	20609263742	SERVICIOS ELECTRICOS D & C E.I	AV. ARGENTINA NRO. 215 (C.C NI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2303	20609270153	SEGURIMAX INDUSTRIAS GENERALES	AV. CORONEL FRANCISCO BOLOGNE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2304	20609312361	CHPER ELECTRONICS E.I.R.L.	JR. PARURO NRO. 1353 INT. 119 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2305	20609316226	SOLUTIONS AND IMPORT CB & C S.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2306	20609359634	TRANSPORTES DE CARGA UNION EXP	AV. 28 DE JULIO NRO. 1864 LIMA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2307	20609362201	GROUP ALCANTARA E.I.R.L.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2308	20609435993	IMPORT EXPORT CHU E.I.R.L.	JR. ALVARIÑO RETABLO 3RA ETAPA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2309	20609437881	IMPORTACIONES RALLY AUTOPARTS 	VIA. A.H VILLA ALEJANDRO MZA. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2310	20609455382	INDUSTRIAS MIAN E.I.R.L.	OTR.CALLE LOS EBANISTAS MZA. J	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2311	20609473127	FYMEG INGENIEROS SOCIEDAD ANON	MZA. D2 LOTE. 1 URB. JUAN EL B	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2312	20609503379	IMPORTADORA E & A NICOL S.A.C.	AV. ARGENTINA NRO. 327 INT. 5-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2313	20609512467	BEIK SERVICES S.A.C.	AV. NICOLÁS ARRIOLA NRO. 740 L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2314	20609530821	RINCON DEL MAR S.A.C.	CAL.FRANCISCO BOLOGNESI MZA. H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2315	20609531208	LICENCIAS ORIGINALES PERU E.I.	MZA. P LOTE. 01 URB. LAS PALME	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2316	20609553261	CORPORACION GIGA MANTARO SOCIE	AV. CARRERTERA  CENTRAL NRO. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2317	20609580870	GO MANCO CAPAC S.A.C.	AV. EL DERBY NRO. 254 DPTO. 70	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2318	20609606216	KAMARTAJ S.A.C.	CAL.MADRID NRO. 440 DPTO. 604 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2319	20609649608	LA BARRA DEL GORDO E.I.R.L.	CAL. PUNO NRO. 284 BAR. CHONTA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2320	20609667801	DISTRIBUIDORA RECSO S.A.C.	AV. VICTOR RAUL HAYA DE LA TO 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2321	20609704374	TRANSPORTES PLUS PERU S.A.C.	AV. UCV NRO. 133 LIMA - LIMA -	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2322	20609712563	CENTRO DE INSPECCIONES TECNICO	AV. MANUEL OLGUIN NRO. 231 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2323	20609744520	MY V INDUSTRIALES E.I.R.L.	AV. ANTONIO RAIMONDI NRO. 480 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2324	20609778912	COREIN IMPORT S.A.C.	AV. GUILLERMO DANSEY NRO. 454 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2325	20609808650	NELCOM PERU S.A.C.	AV. GUILLERMO DANSEY NRO. 405 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2326	20609855020	ERGOSEN S.A.C.	CAL. LA HERMITA M D - L 09 MZA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2327	20609856140	CONSORCIO KIMBIRI	JR. ARICA NRO. 290 URB. LA MER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2328	20609868342	NEGOSERVICES ALFARO EIRL	JR. MANCO CAPAC NRO. 313 OTR. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2329	20609873915	TOUR NACIONAL L & C E.I.R.L.	PJ. MIRADORES NRO. SN JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2330	20609885531	JK MASCHINEN E.I.R.L.	JR. NARCISO DE LA COLINA NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2331	20609908638	JEMATHI E.I.R.L.	JR. RAZURI NRO. 16 (2º Y 3º PI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2332	20609922983	DIANA INDUSTRIAL S.A.C.	AV. GUILLERMO DANSEY NRO. 798 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2333	20609934728	GIAMBAR EMPRESA INDIVIDUAL DE 	JR. IQUIQUE NRO. 338 URB. CHAC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2334	20609942844	NEGOCIACIONES ELECTRO BENDEZU 	JR. PARURO NRO. 1369 INT. 143 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2335	20609975483	GROUP MEGA TECHNOLOGY S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2336	20610002081	AMFE AUTOMATIZACION S.A.C.	JR. LAS GLADIOLAS MZA. F LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2337	20610006737	ICE360 S.A.C.	JR. PACASMAYO NRO. 279 INT. 15	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2338	20610013822	CONTROL DE LA FLAMA S.A.C.	AV. LIMA NRO. 2460 URB. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2339	20610026002	DEMACOL SOCIEDAD ANONIMA CERRA	AV. PERU NRO. 4515 A.H. BOCANE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2481	20612347248	CONSTRUMARKET SAN IGNACIO S.A.C.	JR. SANTA ROSA NRO. 378 URB. SANTA ROSA CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:19.572988	2026-05-18 15:37:19.572988
2482	20611677708	AG. MENDOZA ING. CONTRATISTAS & CONSULTORES E.I.R.L.	JR. DEL MAYO NRO. 275 SAN MARTIN MOYOBAMBA MOYOBAMBA	JURIDICA	2026-05-18 15:37:20.71918	2026-05-18 15:37:20.71918
2483	20613702459	GRUPO INVERSIONISTA O & R SOCIEDAD ANONIMA CERRADA	JR. LOS GERANIOS NRO. S/N SEC. ALTO LOYOLA CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:21.972015	2026-05-18 15:37:21.972015
2485	20570790618	"EMPRESA DE TRANSPORTES RIO CANCHIS SOCIEDAD ANONIMA ABIERTA"	JR. LIMA NRO. REF SEC. ALTO LOYOLA CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:24.640501	2026-05-18 15:37:24.640501
2486	20601087198	EMPRESA DE TRANSPORTES & MULTISERVICIOS SEFRONOR SOCIEDAD ANONIMA	PRO. CONTISUYO NRO. S/N H.U. LOS LIBERTADORES CAJAMARCA JAEN JAEN	JURIDICA	2026-05-18 15:37:25.850256	2026-05-18 15:37:25.850256
2489	20613499947	CONSTRUCCIONES DEL NORTE QUEVEDO CARRION SOCIEDAD ANONIMA CERRADA	CAL. PBLO NAMBALLE NRO. S/N OTR. PBLO NAMBALLE CAJAMARCA SAN IGNACIO NAMBALLE	JURIDICA	2026-05-18 15:37:29.414449	2026-05-18 15:37:29.414449
2490	20487385167	L & B TECNIAMAZON S.R.L.	CAL. IQUITOS NRO. 1798 SEC. PUEBLO NUEVO CAJAMARCA JAEN JAEN	JURIDICA	2026-05-18 15:37:30.632585	2026-05-18 15:37:30.632585
2491	20610823361	INVERSIONES PERUANAS DE LA FRONTERA SOCIEDAD ANONIMA CERRADA	JR. BOLIVAR NRO. 400 OTR. CENTRO SAN IGNACIO CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:32.3421	2026-05-18 15:37:32.3421
2494	20614728168	ESENSIA S.A.C.	AV. DE LOS CONSTRUCTORES NRO. 1385 URB. COVIMA LIMA LIMA LA MOLINA	JURIDICA	2026-05-18 15:37:35.960968	2026-05-18 15:37:35.960968
2495	20443178342	TRANSPORTES BREDDE E.I.R.L.	NRO. B-1 URB. SANTA LUCILA CUSCO CUSCO WANCHAQ	JURIDICA	2026-05-18 15:37:37.066685	2026-05-18 15:37:37.066685
2496	20480559232	EMPRESA DE TRANSPORTES BRISAS DEL CHINCHIPE S.R.L.	AV. PAKAMUROS NRO. 2093 SECTOR PUEBLO LIBRE CAJAMARCA JAEN JAEN	JURIDICA	2026-05-18 15:37:38.155507	2026-05-18 15:37:38.155507
2497	20570798511	DISTRIBUCIONES BAIQUE EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA	JR. ATAHUALPA NRO. 183 CENT. SAN IGNACIO CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:39.500632	2026-05-18 15:37:39.500632
2498	20603851014	FERRETERIA Y AGROVETERINARIA PIO PIO SOCIEDAD ANONIMA CERRADA	JR. SANTA ROSA NRO. 613 CENTRO SAN IGNACIO CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:40.695563	2026-05-18 15:37:40.695563
2499	20100210909	LA POSITIVA SEGUROS Y REASEGUROS S.A.	CAL. FRANCISCO MASIAS NRO. 370 LIMA LIMA SAN ISIDRO	JURIDICA	2026-05-18 15:37:42.097389	2026-05-18 15:37:42.097389
2500	20601015324	ELIZABETH COMPANY E.I.R.L.	CAL. ALFONSO UGARTE NRO. 1630 CERCADO DE CHICLAYO LAMBAYEQUE CHICLAYO CHICLAYO	JURIDICA	2026-05-18 15:37:43.399881	2026-05-18 15:37:43.399881
2501	20611708948	Y & A GROUP S.A.C.	MZA. B LOTE. 19 URB. LA FLOR LIMA LIMA CARABAYLLO	JURIDICA	2026-05-18 15:37:44.569034	2026-05-18 15:37:44.569034
2502	20602599702	CORPORACION CIE E.I.R.L.	JR. CORONEL FRANCISCO BOLOGNE NRO. 448 URB. ORBEA LIMA LIMA MAGDALENA DEL MAR	JURIDICA	2026-05-19 09:29:11.600451	2026-05-19 09:29:11.600451
2340	20610053549	GRUPO HLL DRYWALL Y CONSTRUCCI	AV. UNIVERSITARIA MZA. B LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2341	20610058168	FAMMINSERG E.I.R.L.	MZA. C LOTE. 1 A.H. LA GREDA L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2342	20610087265	MASTER CRAFTER 3D E.I.R.L.	JR. MANUEL SEOANE NRO. 138 PRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2343	20610152270	AUDIOELECTRONIC E.I.R.L.	JR. PARURO NRO. 1322 INT. S121	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2344	20610152458	J & K SOLUCIONES TECNOLOGICAS 	CAL.SN MZA. A LOTE. 39 URB. VI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2345	20610167951	TITO ACCE PERU S.A.C.	AV. CALCA NRO. 251 COO. VEINTI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2346	20610169105	A & M MEDICAL SALUD S.A.C.	AV. EMANCIPACION NRO. 701 INT.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2347	20610215964	REALCE ACABADOS SOCIEDAD COMER	CAL.SANTA INES NRO. 101 URB. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2348	20610239804	CE & JP E.I.R.L.	CAL.ARROSPEDI LOYOLA MZA. B LO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2349	20610247408	PUBLICIDAD & MARKETING CORPORA	CAL. LOS GIRASOLES NRO. 279 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2350	20610266615	INVERSIONES ERALDO E.I.R.L.	AV. GUILLERMO DANSEY NRO. 464 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2351	20610296506	BOOMBA OFERTAS S.A.C.	CAL. HERNANDO DE LAVALLE NRO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2352	20610296981	SOLUCIONES INDUSTRIALES L & G 	AV. GUILLERMO DANSEY NRO. 828 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2353	20610325468	SERVICIOS GENERALES HUVERFES S	MZA. C LOTE. 12 DPTO. 401 A.V.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2354	20610326154	LT USA PERU E.I.R.L.	JR. BAMBAS NRO. 407 LIMA - LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2355	20610329111	GO PARDO S.A.C.	AV. EL DERBY NRO. 254 URB. EL 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2356	20610335544	INVERSIONES SAYIDAM		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2357	20610352830	PROSINFER DISTRIBUIDORES E.I.R	CAL. JOSE CELENDON NRO. 1072 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2358	20610363661	HQSE CONSULTING & CAPACITACION	MZA. G LOTE. 3 URB. SAN ISIDRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2359	20610364226	GRUPO ALCA COMPANY S.A.C.	JR. 10 DE DICIEMBRE NRO. 171 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2360	20610400621	MOKPAI E.I.R.L.	JR. PUNO NRO. 731 LIMA - LIMA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2361	20610404236	GLOBAL ANDREX S.A.C.	JR. CNEL. MIGUEL BAQUERO 200 N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2362	20610416587	CONTRATISTAS GENERALES COOL & 	OTR. COSTA DEL SOL IV ETAPA MZ	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2363	20610421131	DISTRIBUIDORA Y SERVICIOS LUMI	AV. GUILLERMO DANSEY NRO. 411 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2364	20610515071	SYSTEMS TELECOMM S.A.C.	CAL. ALFREDO MALDONADO NRO. 65	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2365	20610520988	PRODUCTORES SEED S.A.C.	AV. LOS HUERTOS NRO. 335 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2366	20610528814	AEM IMPORTACIONES S.A.C.	AV. VILLA MARIA NRO. 491 URB. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2367	20610537058	CSZ PERU S.A.C.	AV. TOMAS VALLE NRO. 1877 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2368	20610552766	MELENDEZ GLOBAL S.R.L.	JR. AMAZONAS NRO. 291 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2369	20610557032	IMPRENTA GRAFICA CORPORATIVA E	JR. CUSCO NRO. 546 HUANCAYO CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2370	20610568247	LAS ALONDRAS REST. E.I.R.L.	CAL. LAS ALONDRAS NRO. 365 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2371	20610609059	INVERSIONES BERMUDEZ B & C E.I	MZA. H LOTE. 10 A.V. RESIDENCI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2372	20610615130	FIBER SOLUTIONS PERU SOCIEDAD 	CAL. LOS HUANCAS NRO. 119 URB.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2373	20610638601	VINDAX TECNOLOGIA SOCIEDAD ANO	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2374	20610671668	SOLIPAL ELETTRICA S.A.C.	JR. BAMBAS NRO. 461 CERCADO DE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2375	20610674543	FACTORIZALO SOCIEDAD ANONIMA C	CAL. GENERAL RECAVARREN NRO. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2376	20610716301	PROYECTOS ELECTRICOS FABRICACI	MZA. A LOTE. 4 APV. PROGRAMA D	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2377	20610720073	INVERSIONES NAVA SPORT EMPRESA	JR. DOS DE MAYO NRO. 320 JUNIN	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2378	20610726691	KMV CORP S.A.C.	CAL. GERMÁN SCHREIBER NRO. 276	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2379	20610758950	KIO ENERGY S.A.C.	AV. LOS CASTILLOS NRO. 340 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2380	20610788441	HD MULTIMEDIA PERU S.A.C.	AV. ABEL B DU PETIT THOUARS NR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2381	20610808418	GEOCLIMA E.I.R.L.	CAL. SOL DE ORO NRO. 223 COO. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2382	20610808639	MINIMARKET MAYLI E.I.R.L.	AV. LIMA NRO. SN CMP. ATOCONGO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2383	20610823778	COMERCIAL SAIDA TEX E.I.R.L.	JR. BETA MZA. M12 LOTE. 02 A.H	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2384	20610842284	FERRETERIA EL GENIO E.I.R.L.	JR. LEONCIO PRADO NRO. 040 OTR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2385	20610904301	CAFE PROFUNDO STEAKBURGER E.I.	AV. LIMA NRO. 1275 URB. JOSE G	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2386	20610904549	CHICLAYO EXPRESS S.A.C.	AV. JAVIER CASTRO MZA. H LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2387	20610905049	GRUPO BETHOR E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2388	20610931554	ARQUESA S.A.C.	AV. SAN LUIS NRO. 2203 URB. SA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2389	20610956913	DISTRIBUIDORA MEGA GAMES SOCIE	PJ. E NRO. 123 URB. TEODORO VA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2390	20610965611	SERVICIOS GENERALES SICHEZ E.I	MZA. 5 LOTE. 20 A.H. LAS PALME	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2391	20610981888	CORPORACION Y & E ABDIEL SOCIE	AV. BARTOLOME GUERRA NRO. 255 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2392	20610989781	GRUPO HEIDI COMPANY S.A.C.	AV. TUPAC AMARU NRO. SN OTR. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2393	20611051361	LIBRERIA Y SERVICIOS ISIDRO S.	AV. FRANCISCO DE PAULO OTERO N	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2394	20611055031	INVERSIONES CARHUARICRA E.I.R.	CAR. CARRETERA CENTRAL NRO. S/	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2395	20611055146	INDUSTRIAL RODASY E.I.R.L.	AV. LA MINA MZA. J LOTE. 05H A	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2396	20611127406	J & N REPUESTOS Y SERVICIOS E.	CAL. ESPAÑA NRO. 100 C.P. SAN 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2397	20611143894	INVERSIONES QALLAR E.I.R.L.	JR. LIMA NRO. 836 JUNIN - TARM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2398	20611158433	NEGOCIOS Y SERVICIOS OCT E.I.R	AV. AUGUSTO B. LEGUIA NRO. 958	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2399	20611191821	TOURS MANUEL A. ODRIA S.R.L.	AV. RAMON CASTILLA NRO. 217 JU	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2400	20611213469	EL SABOR DE PALE S.A.C.	CAL. SANTA LUCILA MZA. F1 LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2401	20611213515	CONSULTORIAS Y SERVICIOS TRAMI	CAL. ANTONINA MORENO DE CACERE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2402	20611245522	EL RINCON DEL TURCO'S 777 S.R.	JR. MAX UHLE NRO. 245 (AL COST	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2403	20611270195	DDB EXPRESS INGENIERIA & SOFTW	JR. CORONEL FELIX CIPRIANO ZE 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2404	20611271264	MULTISERVICIOS Y EVENTOS LA PR	MLC. GRAU NRO. 103 INT. A LA L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2405	20611272554	ELECTRO ANTNER E.I.R.L	PJ. LOS DATILES NRO. 185 A.H. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2406	20611337443	FERRETERO IMPORTADORA S.A.C	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2407	20611347902	MECHMASTER E.I.R.L.	AV. ANDRES AVELINO CACERES MZA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2408	20611354275	AUTOTRONICA EL-OLAM E.I.R.L.	JR. CHINCHA NRO. 135 URB. JOSE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2409	20611398582	PRONELLO M & I S.A.C.	CAL. VICTOR ALZAMORA NRO. 377 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2410	20611428775	GRUPO CLABE S.A.C.	AV. PERU NRO. 3343 URB. PERU L	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2411	20611432942	HIDRÁULICA ALEJO S.A.C.	AV. GUILLERMO DANSEY NRO. 828 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2412	20611500701	PLAZA CHINA CENTER S.A.C.	CAL. CESAR VALLEJO NRO. 150 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2413	20611585188	B2B PLAZA E.I.R.L.	AV. PASEO DE LA REPUBLICA NRO.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2414	20611586681	CORPORACION ELECTRICA INDUSTRI	AV. GUILLERMO DANSEY NRO. 417 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2415	20611587831	IMPORTACIONES BIÑA SOCIEDAD AN	JR. UCAYALI NRO. 145 JUNIN - T	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1	10001079005	RAMIREZ MAITAHUARI ALEIDA MARI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2	10004413283	MACHACA CAHUAPAZA ELSA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
3	10004680788	HOLGUIN BAILON DE MIRANDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
4	10012109909	CHOQUE LLANO VIRGINIA ASUNCION	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
5	10012192300	MENDOZA ZEVALLOS ZOILO OSVALDO	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
6	10013011767	TAPIA MAMANI CESAR	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
7	10018724397	COSI DE MAQUE GLADYS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
8	10023929924	COLQUE VALDEZ TEODOCIA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
9	10024164883	MONTESINOS MUÑOS AIDE BEATRIS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
10	10024372702	VILCA MONTEAGUDO ELARD WILFRED	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
11	10026120026	BURGOS SAAVEDRA FRANCISCO JAVI	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
12	10026561464	LALUPU ESPINOZA ALFREDO VIDAL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
13	10027795337	MEDINA RODRIGUEZ MARIELA MAGAL	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
14	10028059774	YOVERA MORE TOMAS	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
15	10028790886	MOSCOL GOMEZ KARINA YOLANDA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
16	10031273817	ANDINO CARHUATOCTO MILTER	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2416	20611741708	STOP PARKING S.A.C.	CAL. MANUEL DEL PINO NRO. 222 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2417	20611902108	LUBRICENTRO REMICIO E.I.R.L.	CAR. ANTIGUA PANAMERICANA SUR 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2418	20611921838	USCASA EMPRESA INDIVIDUAL DE R	AV. JUAN S. ATAHUALPA NRO. 296	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2419	20611935669	ING. JC VENTURA CONTRATISTAS G	JR. DANIEL CARRION NRO. 65 SEC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2420	20612025755	EMPRESA DE TRANSPORTES, TURISM	JR. AMAZONAS NRO. 159 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2421	20612046281	M & L 3 INVERSIONES E.I.R.L.	AV. GUILLERMO DANSEY NRO. 411 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2422	20612139050	SERVICIOS Y DISTRIBUCIONES DIV	JR. SAN DIEGO NRO. 484 URB. CE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2423	20612212288	MULTINEGOCIOS RODAR ELECTRIC S	AV. AV. CORPAC NRO. 305 AYACUC	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2424	20612295868	IMPORT & EXPORT PERU L & B S.A	AV. ARGENTINA NRO. 327 INT. 9 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2425	20612356433	AUTOTEC COMPANY S.A.C.	AV. EL NARANJAL NRO. 444 INT. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2426	20612381845	CORPORATION M&V HURTADO SOCIED	CAR. CENTRAL - ACOBAMBA NRO. S	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2427	20612391239	SIN BATERIA PERU S.A.C.	MZA. B LOTE. 10 SEC. 7 DE JULI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2428	20612476412	SGRIAL E.I.R.L.	AV. MANUEL ECHEANDIA NRO. 285 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2429	20612554090	SOLUCIONES INDUSTRIALES LY E.I	CAL. JOSE OLAYA NRO. 907 LA LI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2430	20612586862	CORPORACION ICE360 E.I.R.L.	JR. PACASMAYO MZA. E LOTE. 13 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2431	20612700631	AUTOPARTES SAFED E.I.R.L.	CAL. LOS TALADROS NRO. 298 LIM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2432	20612762130	SAINT MICHAEL ARCHANGEL EMPRES	MZA. C LOTE. 5 URB. SAN FELIPE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2433	20612846180	GRUPO LI E.I.R.L.	AV. CASTILLA NRO. 103 JUNIN - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2434	20612856771	PRIME SOLUTION SERVICES ASW S.	JR. LAS ESCARCHAS NRO. 225 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2435	20612902331	SERVILAPTOP S.A.C.	AV. INCA GARCILASO DE LA VEGA 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2436	20613004565	SERVICIOS MECANICOS INDUSTRIAL	CAL. ABRAHAM LINCON NRO. SN UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2437	20613042564	MACHACA PERU E.I.R.L.	JR. HUAROCHIRI NRO. 539 INT. 1	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2438	20613044672	M & R INGENIERIA Y TECNOLOGIA 	PJ. JOSE CARLOS MARIATEGUI NRO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2439	20613117157	DE TODO SANCHEZ E.I.R.L.	JR. LUIS GIRIBALDI NRO. 472 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2440	20613125737	OROBOR E.I.R.L.	CAL. BELLAVISTA MZA. B11 LOTE.	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2441	20613181467	INVERSIONES ACUÑA IMPORT S.A.C	AV. TOMAS VALLE NRO. 1250 DPTO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2442	20613190776	SOLTEX PERU S.A.C.	PRO. HUANUCO NRO. 2559 LIMA - 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2443	20613196910	CORPORACION QORIMAX S.A.C.	CAL. EL PORVENIR MZA. A LOTE. 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2444	20613319957	PIXEL PERFECT DISPLAYS IMPORTS	JR. MANUEL VILLAR NRO. 431 URB	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2445	20613458167	INVERSIONES ZIRA S.R.L.	MINAS DEL PEDREGAL MZA. I LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2446	20613460421	CARGO LA MERCED S.A.C.	CAL. LOS DIAMANTES NRO. 135 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2447	20613501763	PASTELERIA CHANTILLY N° 3 E.I.	MZA. M LOTE. 1 SEC. 3 GRUPO 16	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2448	20613536915	KAIZAN HC E.I.R.L.	MZA. Ñ LOTE. 25 APV. NUEVA JUV	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2449	20613545809	RAMILOZA E.I.R.L.	MZA. F LOTE. 42 GRU. BRISAS DE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2450	20613547518	GARCIMORA E.I.R.L.	MZA. A LOTE. 4 URB. ALBINO HER	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2451	20613567411	BAETECH PERU S.A.C.	PJ. SANTA ROSA NRO. 103 URB. M	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2452	20613577204	GRANSOLA E.I.R.L.	AV. BOCANEGRA MZA. J LOTE. 4 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
545	10471750340	CARDENAS LEON DOMINGA	-	NATURAL	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
824	20110931248	INET S.A.C.	AV. UNIVERSITARIA NRO. 1619 AS	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1211	20507727647	CROSBY S.A.		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
1265	20511914125	SOLTRAK S.A.	AV. ARGENTINA NRO. 5799 CALLAO	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2480	10761724211	RODRIGUEZ GUEVARA YOSELI	\N	NATURAL	2026-05-18 15:37:18.457503	2026-05-18 15:37:18.457503
2056	20605088059	S&S ELECTRONIC E.I.R.L.	-	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2125	20606264543	INNOVACAD PROYECTA INGENIERIA 		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2146	20606484853	SUMI PERU S.A.	AV. ALFREDO MENDIOLA NRO. 5653	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2492	10278488921	PENA PARRA NATALIA ADELA	\N	NATURAL	2026-05-18 15:37:33.604795	2026-05-18 15:37:33.604795
2464	20614488680	AOLARD E.I.R.L.	JR. PARURO NRO. 1255 URB. BARR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2453	20613641719	DULCE DELI E.I.R.L.	AV. DE LOS HEROES NRO. 509 INT	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2454	20613689215	ALLE ESTACIONES S.A.C.	AV. REDUCTO NRO. 861 URB. RESI	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2455	20613750534	ALUMACERO & GLASS E.I.R.L.	CAL. LAS AMATISTAS NRO. 499 UR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2456	20613842269	WR CHINA IMPORT S.A.C.	CAL. VIOLETA PARRA MZA. H LOTE	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2457	20613850644	ZI DISTRIBUIDORA S.A.C.	CAL. LIMA NRO. 55 LA LIBERTAD 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2458	20613890204	SEMULTEC E.I.R.L.	JR. HUAROCHIRI NRO. 550 C.C. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2459	20613937138	FRIOMAX REFRIGERACION S.A.C.	PJ. SANTA JUANA MZA. B LOTE. 8	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2460	20613997301	TEKTRON INDUSTRIAL S.A.C.	JR. UNIÓN NRO. 361 TRUJILLO LA	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2461	20614174090	ALEXOLIVER DISTRIBUIDORES E.I.	AV. HUAROCHIRI NRO. 536 URB. P	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2462	20614263408	DARCAFI SOLUTIONS S.A.C.	JR. FRANCISCO BOLOGNESI NRO. 7	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2463	20614327201	PROVEEDOR DE EPPS S.A.C.	CAL. JOSE CELENDON NRO. 1072 U	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2465	20614800993	BOTICAS NILAB S.A.C.	JR. LIMA NRO. 486 JUNIN - TARM	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2466	20614888556	VA COMPUTERS SOCIEDAD ANONIMA 	CAL. SEVILLA NRO. 327 DPTO. 30	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2467	20614959968	LUNA ZHANG JUAN E.I.R.L.	AV. ODRIA NRO. 217 JUNIN - TAR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2468	20615054641	AEMS E.I.R.L.	JR. LUCANAS NRO. 166 URB. BARR	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2469	20615256235	INTEC GLOBAL S.A.C.	JR. AMBROSIO SALAZAR NRO. S/N 	JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2470	99999999999	VARIOS		JURIDICA	2026-05-04 15:03:26.055971	2026-05-04 15:03:26.055971
2471	20601161592	CORPORACION DIMARSA E.I.R.L.	JR. HUAROCHIRI NRO. 528 CC PLAZA FERRETERO LAS MA LIMA LIMA LIMA	JURIDICA	2026-05-15 14:56:31.959158	2026-05-15 14:56:31.959158
2472	20490358537	EMPRESA DE SERVICIOS DE TRANSPORTES TERRESTRES REY EXPRESS URIPA S.R.L	AV. RAMON CASTILLA NRO. S/N APURIMAC CHINCHEROS ANCO_HUALLO	JURIDICA	2026-05-18 11:57:47.574066	2026-05-18 11:57:47.574066
2473	20610496068	OPERADORES LOGISTICOS MAGRA S.A.C.	MZA. K LOTE. 138 INT. 2 URB. LEONCIO PRADO OESTE LIMA LIMA PUENTE PIEDRA	JURIDICA	2026-05-18 12:36:13.111265	2026-05-18 12:36:13.111265
2474	20551613217	COMPAÑIA MAGRA SOCIEDAD ANONIMA CERRADA	MZA. K LOTE. 138 URB. LEONCIO PRADO OESTE LIMA LIMA PUENTE PIEDRA	JURIDICA	2026-05-18 13:09:53.89774	2026-05-18 13:09:53.89774
2475	20613521004	CONSORCIO CIMA ENERGY	JR. ALFONSO UGARTE NRO. 389 AMAZONAS LUYA LUYA	JURIDICA	2026-05-18 15:37:10.363957	2026-05-18 15:37:10.363957
2476	20610396349	ESTACION DE SERVICIOS SOLANO E.I.R.L.	AV. MARIZAGUA NRO. SN CAS. MARIZAGUA CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:12.074949	2026-05-18 15:37:12.074949
2477	20570844645	TURISMO SANTUARIO NAMBALLE SOCIEDAD ANONIMA CERRADA	JR. PROLONGACION JIRON COMER NRO. S/N NINGUNO CAJAMARCA SAN IGNACIO SAN IGNACIO	JURIDICA	2026-05-18 15:37:14.401669	2026-05-18 15:37:14.401669
2478	20509507199	BANCO DE COMERCIO	AV. CANAVAL Y MOREYRA NRO. 452 LIMA LIMA SAN ISIDRO	JURIDICA	2026-05-18 15:37:15.897674	2026-05-18 15:37:15.897674
2493	10002516425	NUÑEZ QUIJANO EBER	\N	NATURAL	2026-05-18 15:37:34.858982	2026-05-18 15:37:34.858982
2503	10742278285	CARRION MEDINA NOE	\N	NATURAL	2026-05-19 09:29:13.402603	2026-05-19 09:29:13.402603
2504	10278332956	JIMENEZ GARCIA INES BRIGIDA	\N	NATURAL	2026-05-19 09:29:14.977311	2026-05-19 09:29:14.977311
2505	10427833165	ALFARO GRANDEZ ADOLFO	\N	NATURAL	2026-05-19 09:29:16.832105	2026-05-19 09:29:16.832105
2506	20479373613	SANTA LUCIA SERVICE S.A.C.	JR. ALFONSO UGARTE NRO. 389 AMAZONAS LUYA LUYA	JURIDICA	2026-05-19 09:29:18.131306	2026-05-19 09:29:18.131306
2507	20428036426	MECZA S.A. CONTRATISTAS	AV. EMILIO CAVENECIA NRO. 225 INT. 301 URB. SANTA CRUZ LIMA LIMA SAN ISIDRO	JURIDICA	2026-05-19 09:29:19.500339	2026-05-19 09:29:19.500339
2508	10413103091	RAMIREZ GONZALES JHONY	\N	NATURAL	2026-05-19 09:29:20.885925	2026-05-19 09:29:20.885925
2509	10257036141	PESANTES PEÑA SARALUZ	\N	NATURAL	2026-05-19 09:29:22.413853	2026-05-19 09:29:22.413853
2510	20604794651	PLAZA SUIT 2 DE MAYO S.A.C.	AV. BENAVIDES NRO. 137 DPTO. B LIMA LIMA LIMA	JURIDICA	2026-05-19 09:29:24.021959	2026-05-19 09:29:24.021959
2511	10167642361	PEÑA MARTINEZ RONALD	\N	NATURAL	2026-05-19 09:29:25.447348	2026-05-19 09:29:25.447348
2512	20606883740	CONSORCIO Z & D SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA	AV. VENEZUELA NRO. 801 URB. CHACRA COLORADA LIMA LIMA BREÑA	JURIDICA	2026-05-19 09:29:27.146237	2026-05-19 09:29:27.146237
2513	20603147775	NEGOCIOS E INVERSIONES MJM E.I.R.L.	AV. PAKAMUROS NRO. 1797 SEC. PUEBLO LIBRE CAJAMARCA JAEN JAEN	JURIDICA	2026-05-19 09:29:28.633046	2026-05-19 09:29:28.633046
2514	10710686241	TORRES AMARI RAFAEL	\N	NATURAL	2026-05-19 09:29:29.869627	2026-05-19 09:29:29.869627
2515	20515694740	AYAME S.A.C.	JR. DE LA UNION NRO. 748 LIMA LIMA LIMA	JURIDICA	2026-05-19 09:29:31.438061	2026-05-19 09:29:31.438061
2516	20479441988	FERRETERIA HUAMANTANGA S.R.L.	AV. MARISCAL CASTILLA NRO. 524 SEC. CENTRO JAEN CAJAMARCA JAEN JAEN	JURIDICA	2026-05-19 09:29:32.586581	2026-05-19 09:29:32.586581
2517	10462473155	CHAVEZ RODRIGUEZ ROXANA CARLOTA	\N	NATURAL	2026-05-19 09:29:34.127257	2026-05-19 09:29:34.127257
2518	20613444107	RVQ INGENIERIA Y CONSTRUCCION E.I.R.L.	CAL. CARLOS GERMAN AMEZAGA NRO. 261 URB. SAN JUAN DE MIRAFLORES LIMA LIMA SAN JUAN DE MIRAFLORES	JURIDICA	2026-05-19 09:29:35.533094	2026-05-19 09:29:35.533094
2596	10192342266	RUIZ REAÑO JORGE AUGUSTO	\N	NATURAL	2026-05-21 15:18:56.194004	2026-05-21 15:18:56.194004
2519	20450537099	ASOCIACION ZAMBRANO	JR. CUBA MZA. I LOTE. 12B URB. QUISPICANCHIS CUSCO CUSCO CUSCO	JURIDICA	2026-05-19 09:29:38.643193	2026-05-19 09:29:38.643193
2520	20543600611	CAXAMARCA ARQUEOLOGOS E.I.R.L. - CAXARQUEO E.I.R.L.	JR. BRESCIA NRO. 242 INT. P-3 URB. SANTA ROSA LIMA LIMA COMAS	JURIDICA	2026-05-19 09:29:40.770419	2026-05-19 09:29:40.770419
2521	20557143123	JENNSA OPERADOR LOGISTICO S.A.C.	---- UCV 6 LOTE. 42 P.J. HUAYCAN ZONA A LIMA LIMA ATE	JURIDICA	2026-05-19 09:29:42.521035	2026-05-19 09:29:42.521035
2522	20544945484	RONEY INVERSIONES S.A.C	JR. LAS ARCILLAS MZA. T1 LOTE. 37 URB. URB. SAN CARLOS LIMA LIMA SAN JUAN DE LURIGANCHO	JURIDICA	2026-05-19 09:29:44.562501	2026-05-19 09:29:44.562501
2523	20522208745	MISUJA TRAVES S.A.C.	CAL. MALAGA NRO. 208 URB. MAYORAZGO LIMA LIMA ATE	JURIDICA	2026-05-19 09:29:46.343638	2026-05-19 09:29:46.343638
2524	20511265216	EMPRESA DE TRANSPORTES GRUPO HORNA SOCIEDAD ANONIMA CERRADA	AV. IQUITOS NRO. 1282 LIMA LIMA LA VICTORIA	JURIDICA	2026-05-19 09:29:48.305458	2026-05-19 09:29:48.305458
2525	20479848662	EMPRESA DE TRANSPORTE Y TURISMO INTERNACIONAL JAEN-SAN IGNACIO S.A.	AV. PAKAMUROS NRO. 2093 SECTOR PUEBLO LIBRE CAJAMARCA JAEN JAEN	JURIDICA	2026-05-19 09:29:50.552565	2026-05-19 09:29:50.552565
2526	20480479638	EMPRESA DE TRANSPORTES UNIENDO FRONTERAS S.A.	AV. PAKAMUROS NRO. 1801 SECTOR PUEBLO LIBRE CAJAMARCA JAEN JAEN	JURIDICA	2026-05-19 09:29:53.125249	2026-05-19 09:29:53.125249
2527	20610568930	NEGOCIOS & CONSTRUCCIONES SIJOMAJE E.I.R.L.	JR. MICAELA BASTIDAS NRO. 296 AMAZONAS UTCUBAMBA BAGUA GRANDE	JURIDICA	2026-05-19 10:51:22.869752	2026-05-19 10:51:22.869752
2528	10107996295	SOYURI ORE DAVID	\N	NATURAL	2026-05-19 10:51:29.633636	2026-05-19 10:51:29.633636
2529	10477434661	ZAMORA LEON EDWUAR	\N	NATURAL	2026-05-19 10:51:30.957215	2026-05-19 10:51:30.957215
2530	20103795631	EMP REG DE SERV PUBLICO DE ELECTRICIDAD	AV. GENERAL EP AUGUSTO FREYRE NRO. 1168 LORETO MAYNAS IQUITOS	JURIDICA	2026-05-19 11:35:05.120839	2026-05-19 11:35:05.120839
2531	10422377129	NAVARRO MIRANDA GABRIELA GENOVEVA	\N	NATURAL	2026-05-19 12:30:10.08477	2026-05-19 12:30:10.08477
2532	10211017886	SOTO PECHO AQUILA CONSUELO	\N	NATURAL	2026-05-19 13:04:34.150904	2026-05-19 13:04:34.150904
2533	10236445866	PUENTE VALER RUBEN JUAN	\N	NATURAL	2026-05-19 13:05:42.62151	2026-05-19 13:05:42.62151
2534	10710913477	SALAZAR CRISPIN YUDITH NAYELI	\N	NATURAL	2026-05-19 13:08:45.422848	2026-05-19 13:08:45.422848
2535	20573925417	INGENIERIA LPL EMPRESA CONSTRUCTORA S.A.C.	JR. ICA NRO. SN BAR. COMUNIDAD PAUCARA HUANCAVELICA ACOBAMBA PAUCARA	JURIDICA	2026-05-19 13:14:36.474596	2026-05-19 13:14:36.474596
2536	20219801531	EXPRESO ANTEZANA HNOS S A	AV. SAN LUIS NRO. 784 LIMA LIMA SAN LUIS	JURIDICA	2026-05-19 13:16:51.133121	2026-05-19 13:16:51.133121
2537	17278762009	VIDALON VASQUEZ NANCY ANGELICA	\N	JURIDICA	2026-05-19 13:17:51.528554	2026-05-19 13:17:51.528554
2538	20568061994	EXPRESO WARIVILCA PERU S.R.L.	---- PABLO RISSO NRO. 415 LIMA LIMA SAN LUIS	JURIDICA	2026-05-19 13:21:22.587463	2026-05-19 13:21:22.587463
2539	20612306045	E.T. S & Q SOCIEDAD ANONIMA CERRADA	PJ. LA MAR NRO. S/N BAR. PAMPA AMARILLA HUANCAVELICA HUANCAVELICA HUANCAVELICA	JURIDICA	2026-05-19 13:54:22.353729	2026-05-19 13:54:22.353729
2540	20613706306	LOGISTICA ANTEZANA S.A.C.	AV. SAN LUIS NRO. 784 URB. MARISCAL RAMON CASTILLA LIMA LIMA SAN LUIS	JURIDICA	2026-05-19 14:01:14.325569	2026-05-19 14:01:14.325569
2541	20609596024	CORPORACION FS & S E.I.R.L.	CAL. CASAPALCA NRO. 1674 DPTO. 703 URB. CHACRA RIOS NORTE LIMA LIMA LIMA	JURIDICA	2026-05-19 14:01:15.753475	2026-05-19 14:01:15.753475
2542	20601064376	CONSTRUCTORA E INMOBILIARIA ZICOM E.I.R.L.- CIZIM E.I.R.L.	NRO. S/N C.C. CAMPESINA DE CHOCORVOS HUANCAVELICA HUAYTARA HUAYTARA	JURIDICA	2026-05-19 14:19:19.303968	2026-05-19 14:19:19.303968
2543	20486833557	PROMOTORES ELECTRICOS MILAGROS Y CESAR S.A.C.	AV. 13 DE NOVIEMBRE NRO. 591 JUNIN HUANCAYO EL TAMBO	JURIDICA	2026-05-19 14:27:18.653491	2026-05-19 14:27:18.653491
2544	20606604603	NEGOCIACIONES PETROMAX SAC	JR. JERONIMO DE SILVA NRO. 240 SEC. HUANCAYO SECTOR 02 JUNIN HUANCAYO HUANCAYO	JURIDICA	2026-05-19 14:31:42.590067	2026-05-19 14:31:42.590067
2545	10803075846	LAPA PEPE REDY	\N	NATURAL	2026-05-19 17:02:33.205848	2026-05-19 17:02:33.205848
2546	10755286929	ROJAS VASQUEZ SINAI MILKA	\N	NATURAL	2026-05-19 17:02:34.472069	2026-05-19 17:02:34.472069
2547	10282841571	PARIONA DE LA CRUZ CARMELO	\N	NATURAL	2026-05-19 17:02:35.614759	2026-05-19 17:02:35.614759
2548	20605688676	GRUPO ECONOMICO GUIRAY E.I.R.L.	NRO. S/N BQ. TAHUANTINSUYO LOBO CUSCO LA CONVENCION KIMBIRI	JURIDICA	2026-05-19 17:02:36.729731	2026-05-19 17:02:36.729731
2549	20604896356	GRUPO HVV INFRAESTRUCTURA Y CONSTRUCCION S.A.C.	AV. EL EJERCITO NRO. S/N AYACUCHO LA MAR SANTA ROSA	JURIDICA	2026-05-19 17:02:37.970979	2026-05-19 17:02:37.970979
2550	10704217710	PACHECO PARAVICINO CARLOS ARNOLD	\N	NATURAL	2026-05-19 17:02:39.103139	2026-05-19 17:02:39.103139
2551	10442989996	POCRA CARDENAS JHON ROGER	\N	NATURAL	2026-05-19 17:02:41.61528	2026-05-19 17:02:41.61528
2552	20610089438	ESTACION DE SERVICIOS HRG S.A.C.	\N	JURIDICA	2026-05-19 17:02:43.963462	2026-05-19 17:02:43.963462
2553	10435836581	JUAREZ DE LA CRUZ GRACIELA	\N	NATURAL	2026-05-19 17:02:46.198365	2026-05-19 17:02:46.198365
2554	20452769370	REPRESENTACIONES LADICO E.I.R.L.	JR. AYACUCHO NRO. 212 AYACUCHO LA MAR AYNA	JURIDICA	2026-05-19 17:02:47.400505	2026-05-19 17:02:47.400505
2555	20608407813	GRUPO CORPORATIVO RIVERA VRAEM E.I.R.L.	AV. TUPAC AMARU NRO. 362 CUSCO LA CONVENCION KIMBIRI	JURIDICA	2026-05-19 17:02:48.668263	2026-05-19 17:02:48.668263
2556	10422675740	CARDENAS NAVARRO RUTH	\N	NATURAL	2026-05-19 17:02:49.795862	2026-05-19 17:02:49.795862
2557	20607616109	MULTIVENTAS JAM E.I.R.L.	AV. RAMON CASTILLA NRO. 898 AYACUCHO HUAMANGA SAN JUAN BAUTISTA	JURIDICA	2026-05-19 17:02:50.891356	2026-05-19 17:02:50.891356
2558	20452319501	AGROQUIMICA ALPAMAYO E.I.R.L.	AV. EL PUENTE NRO. 121 CUSCO LA CONVENCION KIMBIRI	JURIDICA	2026-05-19 17:02:52.286603	2026-05-19 17:02:52.286603
2559	20503953839	SCHREDER PERU S.A.C.	AV. ALFREDO BENAVIDES NRO. 768 INT. 303 LIMA LIMA MIRAFLORES	JURIDICA	2026-05-19 17:02:53.642966	2026-05-19 17:02:53.642966
2560	10428402061	ROCA QUISPE LIZ KARINA	\N	NATURAL	2026-05-19 17:02:54.775673	2026-05-19 17:02:54.775673
2561	20611318619	GIDANCH S.A.C.	JR. LIMA MZA. R1 LOTE. 13 C.P. PISCUYACU SAN MARTIN HUALLAGA PISCOYACU	JURIDICA	2026-05-19 17:02:56.016376	2026-05-19 17:02:56.016376
2562	10108150977	LA ROSA TORO MORALES WILDE	\N	NATURAL	2026-05-19 18:20:23.590133	2026-05-19 18:20:23.590133
2563	10061649269	CARRASCO RAYMUNDEZ OMAR GERARDO	\N	NATURAL	2026-05-19 18:20:24.782121	2026-05-19 18:20:24.782121
2564	10487435991	ISIDRO CABALLERO ABRAHAM ABEL	\N	NATURAL	2026-05-19 18:20:26.010327	2026-05-19 18:20:26.010327
2565	10072376582	ECHEVARRIA VILLANUEVA LUIS MANUEL	\N	NATURAL	2026-05-19 18:20:27.143416	2026-05-19 18:20:27.143416
2566	20609978458	EMPRESA DE TRANSPORTES CIELO PUNKU VRAEM S.R.L.	\N	JURIDICA	2026-05-19 18:20:28.312057	2026-05-19 18:20:28.312057
2567	20609814609	TRANSPORTES PAHUARA S.A.C.	JR. CIRO ALEGRIA NRO. 102 BAR. OVALO DE LA MAGDALENA AYACUCHO HUAMANGA AYACUCHO	JURIDICA	2026-05-19 18:20:29.541586	2026-05-19 18:20:29.541586
2568	20606220341	GRUPO ASROM S.A.C.	AV. PROGRESO NRO. S/N AYACUCHO LA MAR AYNA	JURIDICA	2026-05-19 18:20:30.704199	2026-05-19 18:20:30.704199
2569	20610764682	MULTISERVICIOS Y FERRETERIA DIAZ E.I.R.L.	AV. 28 DE JULIO NRO. 029 --- AYACUCHO LA MAR AYNA	JURIDICA	2026-05-19 18:20:32.058425	2026-05-19 18:20:32.058425
2570	20608213962	VRAEM COLOR E.I.R.L.	AV. PROGRESO MZA. A LOTE. 6 OTR. PROGRESO AYACUCHO LA MAR AYNA	JURIDICA	2026-05-19 18:20:33.272232	2026-05-19 18:20:33.272232
2571	20603238673	"MEGA EL MAESTRO S.A.C."	AV. INTIRRAYMI NRO. 21 PBLO. KIMBIRI CUSCO LA CONVENCION KIMBIRI	JURIDICA	2026-05-19 18:20:34.65073	2026-05-19 18:20:34.65073
2572	20600095235	TRANSPORTES MOLINA PERU S.A.C	AV. NICOLAS AYLLON NRO. 1352 INT. 1-B URB. EL PINO LIMA LIMA SAN LUIS	JURIDICA	2026-05-19 18:20:35.846043	2026-05-19 18:20:35.846043
2573	20545063094	TRANSPORTES DON GOYO DEL VALLE RIO APURIMAC Y ENE S.A.C. - TRANS DON GOYO VRAE S.A.C.	PRO. ANDAHUAYLAS NRO. 599 LIMA LIMA LA VICTORIA	JURIDICA	2026-05-19 18:20:37.224821	2026-05-19 18:20:37.224821
2574	20608295411	MUNDO ELECTRIC VRAEM SOCIEDAD ANONIMA CERRADA	MZA. 015 LOTE. 003 SEC. AGUA VIVA CUSCO LA CONVENCION KIMBIRI	JURIDICA	2026-05-19 18:20:38.413188	2026-05-19 18:20:38.413188
2576	20610328335	MULTISERVICIOS E INVERSIONES ECONNVRAE TOURS S.A.C.	JR. SALVADOR CAVERO NRO. 104 AYACUCHO HUAMANGA AYACUCHO	JURIDICA	2026-05-19 18:20:41.48866	2026-05-19 18:20:41.48866
2577	20608430891	IMPORTACIONES RUBIDIVI EIRL	JR. LA MAR NRO. S/N PUEBLO SAN FRANCISCO AYACUCHO LA MAR AYNA	JURIDICA	2026-05-19 18:20:42.763709	2026-05-19 18:20:42.763709
2578	20602318916	CONSORCIO FERNANDO FD E.I.R.L.	AV. REPUBLICA DE ARGENTINA NRO. 327 INT. B-1 URB. LIMA INDUSTRIAL LIMA LIMA LIMA	JURIDICA	2026-05-19 18:20:43.956588	2026-05-19 18:20:43.956588
2579	20432994253	TRANSPORTES TURISTICOS REYBUS S.R.L.	MZA. B LOTE. 4 A.P PRADERAS DE STA ANITA LIMA LIMA SANTA ANITA	JURIDICA	2026-05-19 18:20:45.266687	2026-05-19 18:20:45.266687
2580	20569021554	COENZA E.I.R.L.	NRO. SN C.P. CHIRUMPIARI CUSCO LA CONVENCION KIMBIRI	JURIDICA	2026-05-19 18:20:46.645852	2026-05-19 18:20:46.645852
2581	10201060805	ANTONIO ACUÑA OSWALDO MAXIMO	\N	NATURAL	2026-05-19 18:20:47.76884	2026-05-19 18:20:47.76884
2582	10200704997	CRUZ CONTRERAS ALFREDO	\N	NATURAL	2026-05-19 18:34:54.662579	2026-05-19 18:34:54.662579
2583	20603399723	EMPRESA DE TRANSPORTES DAXI EMPRESA INDIVIDUAL DE RESPONSABILIDAD LIMITADA	PJ. LAS ARENAS NRO. 112 URB. MILLOTINGO JUNIN HUANCAYO EL TAMBO	JURIDICA	2026-05-19 18:36:39.33896	2026-05-19 18:36:39.33896
2584	20609892677	GRUPO ECOANDINA S.A.C.	AV. CAJAMARQUILLA MZA. E LOTE. 1-C LOT. PRE-URBANA NIEVERIA LIMA LIMA LURIGANCHO	JURIDICA	2026-05-20 08:45:13.804758	2026-05-20 08:45:13.804758
2585	10210876508	VILLANUEVA CASTAÑEDA SONIA	\N	NATURAL	2026-05-20 08:47:51.682063	2026-05-20 08:47:51.682063
2586	10444132421	AVILA CARDENAS ALFREDO JESUS	\N	NATURAL	2026-05-20 08:49:26.918184	2026-05-20 08:49:26.918184
2587	10210858160	PAREDES GOMEZ LUIS JOSE	\N	NATURAL	2026-05-20 09:08:07.711662	2026-05-20 09:08:07.711662
2588	20601324262	FERRETERIA FERREMAS EIRL	JR. SANTA POLONIA NRO. SN JUNIN TARMA TARMA	JURIDICA	2026-05-20 09:08:49.813792	2026-05-20 09:08:49.813792
2589	20609303922	ETSM ANDE SAC.	BL. 21 NRO. 301 RES. MARCA VALLE BLOCK 21 INT JUNIN YAULI LA OROYA	JURIDICA	2026-05-20 09:09:25.036996	2026-05-20 09:09:25.036996
2590	20548910324	GESTION PROYECTOS METAL MECANICOS E.I.R.L.	JR. ANGARAES NRO. 548 DPTO. 6 HUANCAYO CERCADO JUNIN HUANCAYO HUANCAYO	JURIDICA	2026-05-20 09:10:11.364474	2026-05-20 09:10:11.364474
2591	20601746311	CONSTRUCCIONES GENERALES ROMA S.A.C.	JR. AGRICULTURA NRO. 682 JUNIN SATIPO SATIPO	JURIDICA	2026-05-20 09:10:47.216307	2026-05-20 09:10:47.216307
2592	20486338386	EMPRESA DE TRANSPORTES EXPRESO DORADO S.R.L.	JR. JOSE A. SUCRE NRO. 125 JUNIN CHANCHAMAYO PICHANAQUI	JURIDICA	2026-05-20 09:11:25.655595	2026-05-20 09:11:25.655595
2593	20600098633	CRECER SEGUROS S.A. COMPAÑIA DE SEGUROS	AV. JORGE BASADRE NRO. 310 LIMA LIMA SAN ISIDRO	JURIDICA	2026-05-20 09:30:20.269153	2026-05-20 09:30:20.269153
2594	20523470761	SANITAS PERU S.A. - EPS	CAL. AMADOR MERINO REYNA NRO. 492 URB. JARDIN LIMA LIMA SAN ISIDRO	JURIDICA	2026-05-20 09:31:14.296681	2026-05-20 09:31:14.296681
2595	20611585102	GRUPO LAVANDA S.A.C.	JR. JUNIN NRO. 43 LA LIBERTAD PACASMAYO PACASMAYO	JURIDICA	2026-05-21 15:16:50.855339	2026-05-21 15:16:50.855339
2597	20606289961	CORPORACION ELECTRONICA 3B E.I.R.L.	JR. PARURO NRO. 1386 LIMA LIMA LIMA	JURIDICA	2026-05-21 16:09:18.185006	2026-05-21 16:09:18.185006
2598	10422026571	ALARCON FLORES ANTONIO	\N	NATURAL	2026-05-21 17:27:52.879188	2026-05-21 17:27:52.879188
2599	20608962311	TRANSPORTES VIP DE LOS REYES SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA	JR. PACHACUTEC NRO. 371 OTR. PACHACUTEC JUNIN JAUJA CANCHAYLLO	JURIDICA	2026-05-21 18:03:06.732927	2026-05-21 18:03:06.732927
2600	20615203336	QUIPU CORPORATION S.A.C.	OTR. JOSE GALVEZ MZA. 48 LOTE. 4 P.J. VILLA POETA LIMA LIMA VILLA MARIA DEL TRIUNFO	JURIDICA	2026-05-21 18:10:39.617222	2026-05-21 18:10:39.617222
2601	20614318237	IMPORTACIONES EXITO S.A.C.	JR. ANDAHUAYLAS NRO. 635 LIMA LIMA LIMA	JURIDICA	2026-05-21 18:30:38.230054	2026-05-21 18:30:38.230054
2602	10474605031	ZUÑIGA CHECCA GIANCARLO	\N	NATURAL	2026-05-21 18:31:23.971314	2026-05-21 18:31:23.971314
2603	20602161537	GRUPO INCCOSAC SOCIEDAD COMERCIAL DE RESPONSABILIDAD LIMITADA	MZA. I´ LOTE. 19A URB. -URB. PARCELACION SEMI RU LIMA LIMA PUENTE PIEDRA	JURIDICA	2026-05-22 11:21:11.606507	2026-05-22 11:21:11.606507
2604	20511030332	VISION 2005 S.A.C.	PJ. LAS ROSAS NRO. 149 URB. MIRAMAR LIMA LIMA SAN MIGUEL	JURIDICA	2026-05-22 11:22:22.951417	2026-05-22 11:22:22.951417
2605	20609725169	GRUPO SIDELEC S.A.C.	CAL. RINCONADA SUR MZA. A LOTE. 30 ASC. LA RINCONADA DE VILLA LIMA LIMA VILLA EL SALVADOR	JURIDICA	2026-05-22 15:16:45.429426	2026-05-22 15:16:45.429426
2606	20612691984	FABRICA DE PINTURAS EMPERADOR S.A.C.	MZA. A LOTE. 5 A.V. TRES HORIZONTES LIMA LIMA SAN MARTIN DE PORRES	JURIDICA	2026-05-25 14:59:08.951272	2026-05-25 14:59:08.951272
2607	20557763008	DISA INGENIEROS HVAC S.A.C.	CAL. LOS JASPES NRO. 1680 URB. VILLA FLORES LIMA LIMA SAN JUAN DE LURIGANCHO	JURIDICA	2026-05-25 15:00:28.748493	2026-05-25 15:00:28.748493
2608	20448013376	GRIFOS & INVERSIONES SAN JOSE SOCIEDAD ANONIMA CERRADA	AV. CIRCUNVALACION NRO. 761 URB. SAN JOSE PUNO SAN ROMAN JULIACA	JURIDICA	2026-05-25 15:03:59.577705	2026-05-25 15:03:59.577705
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.schema_migrations (version, descripcion, checksum, ejecutado_en, ejecutado_por) FROM stdin;
0005	Producción inicial limpia: tablas documentales históricas vacías	\N	2026-07-03 19:59:05.576885	postgres
0006	Tabla documentos.documento_eventos para historial documental append-only	\N	2026-07-06 16:20:43.091881	postgres
\.


--
-- Data for Name: sistemas; Type: TABLE DATA; Schema: core; Owner: postgres
--

COPY core.sistemas (id, codigo, nombre, descripcion, estado, orden, creado_en, actualizado_en) FROM stdin;
1	DOCUMENTAL	Gestión Documental	\N	activo	1	2026-06-28 03:17:26.136116	2026-06-28 03:17:26.136116
2	CAJA_CHICA	Caja Chica	\N	activo	2	2026-06-28 03:17:26.136116	2026-06-28 03:17:26.136116
3	PROYECTOS	Gestión de Proyectos	\N	activo	3	2026-06-28 03:17:26.136116	2026-06-28 03:17:26.136116
4	GIS	GIS	\N	activo	4	2026-06-28 03:17:26.136116	2026-06-28 03:17:26.136116
6	REQUERIMIENTOS	Rendición de Requerimientos	\N	activo	2	2026-06-28 03:17:26.137621	2026-06-28 03:17:26.137621
9	FINANZAS	Finanzas	\N	activo	5	2026-06-28 03:17:26.137621	2026-06-28 03:17:26.137621
10	LOGISTICA	Logística	\N	activo	6	2026-06-28 03:17:26.137621	2026-06-28 03:17:26.137621
11	COMPRAS	Compras	\N	activo	7	2026-06-28 03:17:26.137621	2026-06-28 03:17:26.137621
\.


--
-- Data for Name: asientos_documentales; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.asientos_documentales (id, cliente_abreviatura, anio, mes, asiento_interno, asiento_starsoft, fuente_asiento, estado, creado_en) FROM stdin;
\.


--
-- Data for Name: asientos_documentos; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.asientos_documentos (id, asiento_id, documento_id, creado_en) FROM stdin;
\.


--
-- Data for Name: cierres_contables; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.cierres_contables (id, empresa_codigo, anio, mes, estado, cerrado_por, cerrado_en, observacion, creado_en) FROM stdin;
\.


--
-- Data for Name: documento_alertas; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documento_alertas (id, documento_id, tipo_alerta, estado, mensaje, creado_en, resuelto_en) FROM stdin;
\.


--
-- Data for Name: documento_eventos; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documento_eventos (id, documento_id, archivo_id, tipo_evento, entidad_tipo, entidad_id, expediente_id, descripcion, metadata, usuario_id, origen, request_id, correlation_id, evento_version, creado_en) FROM stdin;
1	4	2	ocr.rechazado	ocr_resultado	2	\N	Resultado OCR rechazado.	{"motivo": "Prueba local Sprint 1.3D", "usuarioId": null}	\N	api	\N	\N	1	2026-07-06 19:49:03.776111+00
2	5	3	ocr.confirmado	ocr_resultado	3	\N	Resultado OCR confirmado.	{"usuarioId": null, "tipoPropuesto": "FACTURA", "claveDocumental": "BBTI|FACTURA|20222222222|F003|000001|SPRINT_1_3D_CONFIRMAR"}	\N	api	\N	\N	1	2026-07-06 19:53:09.999516+00
3	6	\N	documento.creado	documento	6	41	Documento contenedor creado desde carga guiada.	{"filename": "OC_007950.pdf", "areaOrigen": "COMPRAS", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "tipoEsperado": "OC", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 19:56:06.753712+00
4	6	4	archivo.subido	archivo	4	41	Archivo subido desde carga guiada.	{"filename": "OC_007950.pdf", "areaOrigen": "COMPRAS", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "storageKey": "documentos/2026/07/BBTI/81a442f4-d265-4951-b0aa-fcdcdbbf8418__OC_007950.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "tipoEsperado": "OC", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 19:56:10.427251+00
5	7	\N	documento.creado	documento	7	41	Documento contenedor creado desde carga guiada.	{"filename": "OC_007950.pdf", "areaOrigen": "COMPRAS", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "tipoEsperado": "OC", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 20:21:43.361933+00
6	7	5	archivo.subido	archivo	5	41	Archivo subido desde carga guiada.	{"filename": "OC_007950.pdf", "areaOrigen": "COMPRAS", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "storageKey": "documentos/2026/07/BBTI/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "tipoEsperado": "OC", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 20:21:46.956715+00
7	7	5	ocr.procesado	ocr_resultado	4	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "OC", "claveDocumental": "BBTI|OC|007950"}	\N	ocr	\N	\N	1	2026-07-06 20:21:50.997258+00
8	8	\N	documento.creado	documento	8	41	Documento contenedor creado desde carga guiada.	{"filename": "factura_scaneada_1.pdf", "areaOrigen": "COMPRAS", "hashSha256": "f67c30d648098a372538092407dcc0f266233af02208de802c22012d93077177", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "FACTURA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 20:35:44.570159+00
9	8	6	archivo.subido	archivo	6	41	Archivo subido desde carga guiada.	{"filename": "factura_scaneada_1.pdf", "areaOrigen": "COMPRAS", "hashSha256": "f67c30d648098a372538092407dcc0f266233af02208de802c22012d93077177", "storageKey": "documentos/2026/07/BBTI/00cfc8ed-ae62-4f12-9362-b29dfc086774__factura_scaneada_1.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "FACTURA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 20:35:48.856916+00
10	8	6	ocr.procesado	ocr_resultado	5	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "0.00", "tipoPropuesto": "FACTURA", "claveDocumental": null}	\N	ocr	\N	\N	1	2026-07-06 20:36:42.354053+00
11	9	\N	documento.creado	documento	9	41	Documento contenedor creado desde carga guiada.	{"filename": "factura_comatpe.PDF", "areaOrigen": "COMPRAS", "hashSha256": "c68152b284b54265aabdee96896e8123bd5184ff8dead76843d054921c98351d", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "FACTURA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 20:39:21.442509+00
12	9	7	archivo.subido	archivo	7	41	Archivo subido desde carga guiada.	{"filename": "factura_comatpe.PDF", "areaOrigen": "COMPRAS", "hashSha256": "c68152b284b54265aabdee96896e8123bd5184ff8dead76843d054921c98351d", "storageKey": "documentos/2026/07/BBTI/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "FACTURA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 20:39:25.036095+00
13	9	7	ocr.procesado	ocr_resultado	6	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "FACTURA", "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135"}	\N	ocr	\N	\N	1	2026-07-06 20:39:29.011188+00
14	10	\N	documento.creado	documento	10	41	Documento contenedor creado desde carga guiada.	{"filename": "nota_i_31_bbti.pdf", "areaOrigen": "ALMACEN", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 20:56:06.385032+00
15	10	8	archivo.subido	archivo	8	41	Archivo subido desde carga guiada.	{"filename": "nota_i_31_bbti.pdf", "areaOrigen": "ALMACEN", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "storageKey": "documentos/2026/07/BBTI/5d285217-6164-447c-b9e9-42c2c47c1a93__nota_i_31_bbti.pdf", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 20:56:10.540908+00
16	10	8	ocr.procesado	ocr_resultado	7	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "0.50", "tipoPropuesto": "GUIA_REMISION", "claveDocumental": null}	\N	ocr	\N	\N	1	2026-07-06 20:57:17.375753+00
17	11	\N	documento.creado	documento	11	41	Documento contenedor creado desde carga guiada.	{"filename": "nota_i_31_bbti.pdf", "areaOrigen": "COMPRAS", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 21:00:16.73492+00
18	11	9	archivo.subido	archivo	9	41	Archivo subido desde carga guiada.	{"filename": "nota_i_31_bbti.pdf", "areaOrigen": "COMPRAS", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "storageKey": "documentos/2026/07/BBTI/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 21:00:20.830674+00
19	11	9	ocr.procesado	ocr_resultado	8	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "0.50", "tipoPropuesto": "GUIA_REMISION", "claveDocumental": null}	\N	ocr	\N	\N	1	2026-07-06 21:01:21.456241+00
22	12	10	ocr.procesado	ocr_resultado	9	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165"}	\N	ocr	\N	\N	1	2026-07-06 21:03:36.436586+00
25	13	11	ocr.procesado	ocr_resultado	10	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6,981-0"}	\N	ocr	\N	\N	1	2026-07-06 21:11:05.700052+00
20	12	\N	documento.creado	documento	12	41	Documento contenedor creado desde carga guiada.	{"filename": "guia_3_2.pdf", "areaOrigen": "COMPRAS", "hashSha256": "acd597e21954b13df67e6765acb4a999b0a3c57a4af5d94e9085eb1529d9ae3f", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 21:03:28.036124+00
21	12	10	archivo.subido	archivo	10	41	Archivo subido desde carga guiada.	{"filename": "guia_3_2.pdf", "areaOrigen": "COMPRAS", "hashSha256": "acd597e21954b13df67e6765acb4a999b0a3c57a4af5d94e9085eb1529d9ae3f", "storageKey": "documentos/2026/07/BBTI/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 21:03:32.494386+00
23	13	\N	documento.creado	documento	13	41	Documento contenedor creado desde carga guiada.	{"filename": "pago_1.pdf", "areaOrigen": "FINANZAS", "hashSha256": "2f31b2b004fd50df5f2a11b5d94f921eea1fa637cbe00cdf9956d99fccbe34b3", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_TRANSFERENCIA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 21:10:57.86509+00
24	13	11	archivo.subido	archivo	11	41	Archivo subido desde carga guiada.	{"filename": "pago_1.pdf", "areaOrigen": "FINANZAS", "hashSha256": "2f31b2b004fd50df5f2a11b5d94f921eea1fa637cbe00cdf9956d99fccbe34b3", "storageKey": "documentos/2026/07/BBTI/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_TRANSFERENCIA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 21:11:01.893731+00
26	14	\N	documento.creado	documento	14	41	Documento contenedor creado desde carga guiada.	{"filename": "pago_detraccion_1_bbti_sac.pdf", "areaOrigen": "FINANZAS", "hashSha256": "95e9f1c8c85102f26f17a19e9554c856b421fd629eb67a2f02f34b48a636918d", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_DETRACCION", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 21:15:36.05085+00
27	14	12	archivo.subido	archivo	12	41	Archivo subido desde carga guiada.	{"filename": "pago_detraccion_1_bbti_sac.pdf", "areaOrigen": "FINANZAS", "hashSha256": "95e9f1c8c85102f26f17a19e9554c856b421fd629eb67a2f02f34b48a636918d", "storageKey": "documentos/2026/07/BBTI/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_DETRACCION", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 21:15:40.552293+00
28	14	12	ocr.procesado	ocr_resultado	11	41	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "0.00", "tipoPropuesto": "PAGO_DETRACCION", "claveDocumental": null}	\N	ocr	\N	\N	1	2026-07-06 21:15:55.758503+00
29	15	\N	documento.creado	documento	15	7	Documento contenedor creado desde carga guiada.	{"filename": "OS_BBTEC.pdf", "areaOrigen": "COMPRAS", "hashSha256": "e1609e9213f75909f60345eacabdd7ee7b4bd71a855d727a1baff3d8ec12c709", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "tipoEsperado": "OS", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 22:18:16.84169+00
30	15	13	archivo.subido	archivo	13	7	Archivo subido desde carga guiada.	{"filename": "OS_BBTEC.pdf", "areaOrigen": "COMPRAS", "hashSha256": "e1609e9213f75909f60345eacabdd7ee7b4bd71a855d727a1baff3d8ec12c709", "storageKey": "documentos/2026/07/BBTI/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "tipoEsperado": "OS", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 22:18:21.443404+00
31	15	13	ocr.procesado	ocr_resultado	12	7	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "OS", "claveDocumental": "BBTI|OS|000284"}	\N	ocr	\N	\N	1	2026-07-06 22:18:25.667885+00
32	16	\N	documento.creado	documento	16	7	Documento contenedor creado desde carga guiada.	{"filename": "factura_scaneada_2.pdf", "areaOrigen": "COMPRAS", "hashSha256": "e2da77a837658c9598d17fdc5458e372bec7da24f216d4f4e5a58b213f01675f", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "FACTURA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 22:19:49.260606+00
33	16	14	archivo.subido	archivo	14	7	Archivo subido desde carga guiada.	{"filename": "factura_scaneada_2.pdf", "areaOrigen": "COMPRAS", "hashSha256": "e2da77a837658c9598d17fdc5458e372bec7da24f216d4f4e5a58b213f01675f", "storageKey": "documentos/2026/07/BBTI/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "tipoEsperado": "FACTURA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 22:19:53.43722+00
34	16	14	ocr.procesado	ocr_resultado	13	7	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "FACTURA", "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909"}	\N	ocr	\N	\N	1	2026-07-06 22:20:07.31357+00
35	17	\N	documento.creado	documento	17	7	Documento contenedor creado desde carga guiada.	{"filename": "guia_3_4.pdf", "areaOrigen": "ALMACEN", "hashSha256": "f696f58d1a97e4fae9ea36b2afbe4012a0396387c86a04a3734e993266454942", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 22:22:24.174857+00
36	17	15	archivo.subido	archivo	15	7	Archivo subido desde carga guiada.	{"filename": "guia_3_4.pdf", "areaOrigen": "ALMACEN", "hashSha256": "f696f58d1a97e4fae9ea36b2afbe4012a0396387c86a04a3734e993266454942", "storageKey": "documentos/2026/07/BBTI/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "tipoEsperado": "GUIA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 22:22:28.712926+00
37	17	15	ocr.procesado	ocr_resultado	14	7	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163"}	\N	ocr	\N	\N	1	2026-07-06 22:22:32.873325+00
38	18	\N	documento.creado	documento	18	7	Documento contenedor creado desde carga guiada.	{"filename": "nota_i_31_bbti.pdf", "areaOrigen": "ALMACEN", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "tipoEsperado": "NOTA_INGRESO", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 22:22:53.296402+00
39	18	16	archivo.subido	archivo	16	7	Archivo subido desde carga guiada.	{"filename": "nota_i_31_bbti.pdf", "areaOrigen": "ALMACEN", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "storageKey": "documentos/2026/07/BBTI/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "tipoEsperado": "NOTA_INGRESO", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 22:22:57.473471+00
44	20	\N	documento.creado	documento	20	7	Documento contenedor creado desde carga guiada.	{"filename": "pago_3.pdf", "areaOrigen": "FINANZAS", "hashSha256": "b13c3973b1a9a5aa15301ade41221ba775c351a338a28bf6036c1f074d522a4c", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_TRANSFERENCIA", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 22:26:19.701134+00
45	20	18	archivo.subido	archivo	18	7	Archivo subido desde carga guiada.	{"filename": "pago_3.pdf", "areaOrigen": "FINANZAS", "hashSha256": "b13c3973b1a9a5aa15301ade41221ba775c351a338a28bf6036c1f074d522a4c", "storageKey": "documentos/2026/07/BBTI/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_TRANSFERENCIA", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 22:26:23.613942+00
40	18	16	ocr.procesado	ocr_resultado	15	7	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": "MISMA_CLAVE_DOCUMENTAL", "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031"}	\N	ocr	\N	\N	1	2026-07-06 22:23:01.338622+00
41	19	\N	documento.creado	documento	19	7	Documento contenedor creado desde carga guiada.	{"filename": "pago_detraccion_3.pdf", "areaOrigen": "FINANZAS", "hashSha256": "f8d3c1baccba81421e4f20a02469d1d530a61d91027e14b81d7b512af4e5c62d", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_DETRACCION", "clienteAbreviatura": "BBTI"}	\N	api	\N	\N	1	2026-07-06 22:24:47.332387+00
42	19	17	archivo.subido	archivo	17	7	Archivo subido desde carga guiada.	{"filename": "pago_detraccion_3.pdf", "areaOrigen": "FINANZAS", "hashSha256": "f8d3c1baccba81421e4f20a02469d1d530a61d91027e14b81d7b512af4e5c62d", "storageKey": "documentos/2026/07/BBTI/c643c422-9c81-4d25-ae88-e4abeb0b50bb__pago_detraccion_3.pdf", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "tipoEsperado": "PAGO_DETRACCION", "storageBucket": "data-prod", "storageProvider": "r2", "duplicadoAdvertencia": false}	\N	api	\N	\N	1	2026-07-06 22:24:51.266421+00
43	19	17	ocr.procesado	ocr_resultado	16	7	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "0.00", "tipoPropuesto": "PAGO_DETRACCION", "claveDocumental": null}	\N	ocr	\N	\N	1	2026-07-06 22:25:04.025599+00
46	20	18	ocr.procesado	ocr_resultado	17	7	OCR procesado y registrado como pendiente de validación.	{"estado": "pendiente_validacion", "motivo": null, "yaExistia": false, "confidence": "1.00", "tipoPropuesto": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444"}	\N	ocr	\N	\N	1	2026-07-06 22:26:27.422273+00
\.


--
-- Data for Name: documento_relaciones; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documento_relaciones (id, documento_origen_id, documento_destino_id, tipo_relacion, metadata, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos (id, cliente_abreviatura, anio, mes, tipo_documental, ruc_emisor, razon_social_emisor, serie, numero, clave_documental, estado, creado_en, fecha_emision, moneda, monto_total, metadata, periodo_anio, periodo_mes, alerta_contable, observacion_contable, actualizado_en, validado_en, validado_por) FROM stdin;
1	CIMA	2026	7	FACTURA	20123456789	PROVEEDOR PRUEBA LOCAL S.A.C.	F001	000001	CIMA|FACTURA|20123456789|F001|000001|SPRINT_1_3D_LOCAL	pendiente_validacion	2026-07-06 16:24:57.411958	2026-07-06	PEN	100.00	{"origenPrueba": "SPRINT_1_3D_LOCAL", "puedeEliminarse": true}	2026	7	\N	\N	2026-07-06 16:24:57.411958	\N	\N
2	BBTI	2026	7	OC	\N	\N	\N	\N	\N	pendiente_ocr	2026-07-06 18:47:27.894349	\N	\N	\N	{"origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "OC_007950.pdf", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "storageProvider": "r2", "tipoRelacionSugerida": "principal_oc"}	2026	7	\N	\N	2026-07-06 18:47:27.894349	\N	\N
3	BBTI	2026	7	OC	\N	\N	\N	\N	\N	pendiente_ocr	2026-07-06 19:04:21.670696	\N	\N	\N	{"origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "OC_007950.pdf", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "storageProvider": "r2", "tipoRelacionSugerida": "principal_oc"}	2026	7	\N	\N	2026-07-06 19:04:21.670696	\N	\N
4	BBTI	2026	7	FACTURA	20111111111	PROVEEDOR BBTI PRUEBA LOCAL S.A.C.	F002	000001	BBTI|FACTURA|20111111111|F002|000001|SPRINT_1_3D_LOCAL	pendiente_validacion	2026-07-06 19:28:18.702738	\N	\N	\N	{"origenSprint": "SPRINT_1_3D", "puedeEliminarse": true}	2026	7	\N	\N	2026-07-06 19:28:18.702738	\N	\N
5	BBTI	2026	7	FACTURA	20222222222	PROVEEDOR BBTI CONFIRMACION LOCAL S.A.C.	F003	000001	BBTI|FACTURA|20222222222|F003|000001|SPRINT_1_3D_CONFIRMAR	confirmado	2026-07-06 19:52:36.128192	2026-07-06	\N	200.00	{"ocr": {"estado": "confirmado", "metadata": {"serie": "F003", "moneda": "PEN", "numero": "000001", "proveedor": "PROVEEDOR BBTI CONFIRMACION LOCAL S.A.C.", "montoTotal": 200.00, "fechaEmision": "2026-07-06", "rucProveedor": "20222222222", "clienteAbreviatura": "BBTI"}, "origenSprint": "SPRINT_1_3D", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20222222222|F003|000001|SPRINT_1_3D_CONFIRMAR", "puedeEliminarse": true, "clienteAbreviatura": "BBTI"}, "origenSprint": "SPRINT_1_3D", "puedeEliminarse": true}	2026	7	\N	\N	2026-07-06 19:52:36.128192	\N	\N
6	BBTI	2026	7	OC	\N	\N	\N	\N	\N	pendiente_ocr	2026-07-06 19:56:06.749567	\N	\N	\N	{"origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "OC_007950.pdf", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "storageProvider": "r2", "tipoRelacionSugerida": "principal_oc"}	2026	7	\N	\N	2026-07-06 19:56:06.749567	\N	\N
7	BBTI	2026	7	OC	20370146994	CORPORACION ACEROS AREQUIPA S.A.	\N	007950	BBTI|OC|007950	confirmado	2026-07-06 20:21:43.359153	2026-04-23	DOLARES AMERICANOS	4181.92	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T20:27:23.976Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"moneda": "DOLARES AMERICANOS", "numero": "007950", "proveedor": "CORPORACION ACEROS AREQUIPA S.A.", "cotizacion": "AA510317037-1", "montoTotal": "4181.92", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20370146994", "tipoDocumental": "OC", "claveDocumental": "BBTI|OC|007950", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "41", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}}, "expedienteId": 41, "tipoRelacion": "principal_oc", "tipoPropuesto": "OC"}, "usuarioId": null, "observacion": "Guardar y confirmar principal desde Compras > Nuevo"}], "texto": {"length": 4049, "preview": "SEÑOR(ES) : CORPORACION ACEROS AREQUIPA S.A.\\n23/04/2026\\nFECHA :\\nOrden de Compra Nº:007950\\nBBTI S.A.C.\\nCAL.6 MZA. D LOTE. 13 URB. INDUSTRIAL GRIMAN (ALT. DE LIMA CARGO \\nCITY) PROV. CONST. DEL CALLAO - PROV. CONST. DEL CALLAO - CALLAO\\n20565747356\\nR.U.C.  :\\nTELEFONO :\\nATENCIÓN :\\n20370146994\\nCAR. PANAMERICANA SUR NRO. 241 ---- PANAMERICANA SUR ICA - PISCO - PARACAS\\nCONDICION DE PAGO : FACTURA NEGOCIABLE 60 DÍAS\\nCALLE 6 MZ D LOTE 13 URB. GRIMANEZA CALLAO CALLAO\\nLUGAR DE ENTREGA :\\nDIRECCIÓN :\\nMONEDA :"}, "estado": "confirmado", "archivo": {"filename": "edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "resolvedPath": "storage/tmp/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"moneda": "DOLARES AMERICANOS", "numero": "007950", "proveedor": "CORPORACION ACEROS AREQUIPA S.A.", "cotizacion": "AA510317037-1", "montoTotal": "4181.92", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20370146994", "tipoDocumental": "OC", "claveDocumental": "BBTI|OC|007950", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "41", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}}, "archivoId": 5, "duplicado": null, "confidence": 1, "documentoId": 7, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "tipoEsperado": "OC", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "principal_oc"}, "tipoPropuesto": "OC", "metadataSource": {"moneda": "MANUAL", "numero": "MANUAL", "proveedor": "MANUAL", "cotizacion": "MANUAL", "montoTotal": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "OC", "camposFaltantes": [], "claveDocumental": "BBTI|OC|007950", "camposDetectados": ["numero", "fechaEmision", "montoTotal", "proveedor", "rucProveedor", "rucComprador", "moneda", "cotizacion", "codigoExpediente"], "vinculoExpediente": {"orden": 1, "documentoId": 7, "esPrincipal": true, "vinculadoEn": "2026-07-06T20:21:50.994731+00:00", "expedienteId": 41, "tipoRelacion": "principal_oc", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": 41, "confirmadoDesde": "compras_nuevo", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "OC_007950.pdf", "hashSha256": "40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "rucComprador": "20565747356", "tipoRelacion": "principal_oc", "storageProvider": "r2", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}	2026	7	\N	\N	2026-07-06 20:27:23.968032	\N	\N
8	BBTI	2026	7	FACTURA	\N	\N	\N	\N	\N	pendiente_ocr	2026-07-06 20:35:44.563644	\N	\N	\N	{"origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "factura_scaneada_1.pdf", "hashSha256": "f67c30d648098a372538092407dcc0f266233af02208de802c22012d93077177", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "storageProvider": "r2", "tipoRelacionSugerida": "adjunto_factura"}	2026	7	\N	\N	2026-07-06 20:35:44.563644	\N	\N
9	BBTI	2026	7	FACTURA	20516403650	CORPORACION COMATPE SAC	F011	00001135	BBTI|FACTURA|20516403650|F011|00001135	confirmado	2026-07-06 20:39:21.440111	2026-05-04	SOLES	40.00	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T20:46:30.217Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20516403650", "serie": "F011", "moneda": "SOLES", "numero": "00001135", "proveedor": "CORPORACION COMATPE SAC", "rucEmisor": "20516403650", "montoTotal": "40", "razonSocial": "CORPORACION COMATPE SAC", "fechaEmision": "2026-05-04", "rucComprador": "20565747356", "rucProveedor": "20516403650", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CORPORACION COMATPE SAC", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "AV. GERARDO UNGER NRO. 5385 UR", "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 41, "tipoRelacion": "adjunto_factura", "tipoPropuesto": "FACTURA"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 1979, "preview": "CORPORACIÓN COMATPE\\nS.A.C.\\nR.U.C .: 20516403650\\nFACTURA ELECTRÓNICA\\nF011- 00001135\\nOFICINA PRINCIPAL:\\nAv. Gerardo  Unger N° 5385 - Los Olivos\\nSEDE ATE VITARTE\\n- Mz.R Lote 9 Parque Industrial El asesor Ate\\n- Lima este: (01) 355-4815 / 983476 386\\n- ventas_este@grupocomatpe.com\\nSERVICIO AL CLIENTE\\n(01) 528-9488 / (01) 637-2834\\nventas@grupocomatpe.com\\nSEDE VILLA EL SALVADOR\\n- OTR.SECTOR 8 PUEBLO JOVEN MUNICIPAL\\nMZA. C LOTE. 04 (PARQUE INDUSTRIAL V.E.S.)\\n- Lima Sur. (01) 259-2208 / 998100530\\nventas_s"}, "estado": "confirmado", "archivo": {"filename": "69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "resolvedPath": "storage/tmp/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20516403650", "serie": "F011", "moneda": "SOLES", "numero": "00001135", "proveedor": "CORPORACION COMATPE SAC", "rucEmisor": "20516403650", "montoTotal": "40", "razonSocial": "CORPORACION COMATPE SAC", "fechaEmision": "2026-05-04", "rucComprador": "20565747356", "rucProveedor": "20516403650", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CORPORACION COMATPE SAC", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "AV. GERARDO UNGER NRO. 5385 UR", "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 7, "duplicado": null, "confidence": 1, "documentoId": 9, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "FACTURA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_factura"}, "tipoPropuesto": "FACTURA", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "montoTotal": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "FACTURA", "camposFaltantes": [], "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "factura_comatpe.PDF", "hashSha256": "c68152b284b54265aabdee96896e8123bd5184ff8dead76843d054921c98351d", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "rucComprador": "20565747356", "tipoRelacion": "adjunto_factura", "storageProvider": "r2", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}	2026	7	\N	\N	2026-07-06 20:46:30.204732	\N	\N
10	BBTI	2026	7	GUIA	\N	\N	\N	\N	\N	pendiente_ocr	2026-07-06 20:56:06.383012	\N	\N	\N	{"origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "nota_i_31_bbti.pdf", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 41, "storageProvider": "r2", "tipoRelacionSugerida": "adjunto_guia"}	2026	7	\N	\N	2026-07-06 20:56:06.383012	\N	\N
11	BBTI	2026	7	NOTA_INGRESO	20602599702	\N	\N	0000000031	BBTI|NOTA_INGRESO|0000000031	confirmado	2026-07-06 21:00:16.732946	2026-04-23	\N	\N	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:03:02.352Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20602599702", "serie": null, "numero": "0000000031", "rucEmisor": "20602599702", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20602599702", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "expedienteId": 41, "tipoRelacion": "adjunto_nota_ingreso", "tipoPropuesto": "NOTA_INGRESO"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 604, "preview": "1\\nPag.\\nBBTI SAC\\nFecha :23/04/2026\\nHora    18:09:22\\nNOTA DE INGRESO\\nI\\nALMACEN         \\nTRANSACCION\\nFECHA DOC\\nPROVEEDOR\\nCLIENTE\\nAUTORIZADO\\nORD. COMPRA  \\nNro. DOC. REF.\\nCENTRO DE COSTO\\nMONEDA\\nALMACEN PRINCIPAL\\n26/02/2026\\n20602599702\\nCORPORACION CIE E.I.R.L.\\n0000000000006\\nGC 0012292\\n0000000031\\nCL COMPRAS PRODUCTOS NACIONALES\\nMN\\nCOMENTARIO\\nINV043\\nT.C.\\n 3.363\\nCODIGO\\nDESCRIPCION\\nUND SERIE\\\\LOTE\\nCANT.\\nITEM\\nCOSTO UNIT.\\nTOTAL\\nC.COSTO\\nORD. \\n28.000000  23,772.00\\n 1\\n240302\\nEspiga de AºGº para Cruceta y Aislad"}, "estado": "confirmado", "archivo": {"filename": "c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "resolvedPath": "storage/tmp/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "storageProvider": "r2"}, "mensaje": "Documento requiere revisión manual por metadata incompleta o clave documental no generable.", "metadata": {"ruc": "20602599702", "serie": null, "numero": "0000000031", "rucEmisor": "20602599702", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20602599702", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "archivoId": 9, "duplicado": null, "confidence": 0.5, "documentoId": 11, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "tipoPropuesto": "NOTA_INGRESO", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "numero": "MANUAL", "rucEmisor": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "NOTA_INGRESO", "camposFaltantes": ["serie", "numero"], "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "camposDetectados": ["ruc", "fechaEmision"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "nota_i_31_bbti.pdf", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "rucComprador": "20565747356", "tipoRelacion": "adjunto_nota_ingreso", "storageProvider": "r2", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}	2026	7	\N	\N	2026-07-06 21:03:02.347241	\N	\N
12	BBTI	2026	7	GUIA_REMISION	20612122416	CONSORCIO HUANCAVELICA	EG07	00000165	BBTI|GUIA_REMISION|20612122416|EG07|00000165	confirmado	2026-07-06 21:03:28.032776	2026-04-20	\N	\N	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:05:32.445Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000165", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-20", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 41, "tipoRelacion": "adjunto_guia", "tipoPropuesto": "GUIA_REMISION"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 1692, "preview": "RUC N°20612122416\\nGUÍA DE REMISIÓN ELECTRÓNICA\\nREMITENTE\\nN° EG07 - 00000165\\nCONSORCIO HUANCAVELICA\\n20/04/2026 11:24 AM\\nMotivo de Traslado :OTROS\\nJR 28 DE JULIO MZ F1 LT9 - PAUCARA - ACOBAMBA -\\nHUANCAVELICA\\nCALLE SEIS MZ D LOT 13 URB IND. GRIMANEZA - CALLAO -\\nPROV. CONST. DEL CALLAO - PROV. CONST. DEL CALLAO\\nPunto de llegada\\nPunto de Partida\\nDatos del Destinatario :CONSORCIO HUANCAVELICA - REGISTRO ÚNICO DE CONTRIBUYENTES N° 20612122416\\nFecha de entrega de Bienes al  transportista:20/04/2026\\nDesc"}, "estado": "confirmado", "archivo": {"filename": "658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "resolvedPath": "storage/tmp/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000165", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-20", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 10, "duplicado": null, "confidence": 1, "documentoId": 12, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "tipoPropuesto": "GUIA_REMISION", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "GUIA_REMISION", "camposFaltantes": [], "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "guia_3_2.pdf", "hashSha256": "acd597e21954b13df67e6765acb4a999b0a3c57a4af5d94e9085eb1529d9ae3f", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "rucComprador": "20565747356", "tipoRelacion": "adjunto_guia", "storageProvider": "r2", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}	2026	7	\N	\N	2026-07-06 21:05:32.436923	\N	\N
13	BBTI	2026	7	PAGO_TRANSFERENCIA	\N	\N	\N	6981-0	BBTI|PAGO_TRANSFERENCIA|6981-0	confirmado	2026-07-06 21:10:57.862857	2026-01-29	SOLES	504.00	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:13:37.036Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"banco": "BBVA", "moneda": "SOLES", "numero": "6981-0", "fechaPago": "2026-01-29", "clienteRuc": null, "montoTotal": "504", "comprobante": null, "fechaEmision": "2026-01-29", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6981-0", "numeroOperacion": "6981-0", "proveedorNombre": null, "codigoExpediente": "050201", "numeroConstancia": "6,981-0", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}}, "expedienteId": 41, "tipoRelacion": "adjunto_transferencia", "tipoPropuesto": "PAGO_TRANSFERENCIA"}, "usuarioId": null, "observacion": "Guardar y confirmar pago desde Finanzas"}], "texto": {"length": 855, "preview": "2026/01/29 10:16:56\\nBBTI SAC\\nTransferencias\\nImporte Cargado\\n 504.00 SOLES\\nCuenta de Cargo\\n0011-0111-0100059057   SOLES\\nBBTI SAC\\nCuenta de Abono\\n0011-0733-0100005447   SOLES\\nISA INDUSTRIAL SAC\\nDetalle de la operación\\nImporte Abonado\\n504.00  SOLES\\nFecha / Hora\\n29/01/2026   10:19\\nReferencia\\nPYATOCONGO\\nNúmero de Operación\\n6,981-0\\nDetalle de Comisiones\\nComisión por Otra Plaza\\n0.00   SOLES\\nDatos Adicionales\\nPre-inscritas\\nAl Exterior\\nInterbancarias\\nTerceros\\nPropias\\nTransferencias - Cuentas de Terceros\\n"}, "estado": "confirmado", "archivo": {"filename": "7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "resolvedPath": "storage/tmp/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"banco": "BBVA", "moneda": "SOLES", "numero": "6981-0", "fechaPago": "2026-01-29", "clienteRuc": null, "montoTotal": "504", "comprobante": null, "fechaEmision": "2026-01-29", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6981-0", "numeroOperacion": "6981-0", "proveedorNombre": null, "codigoExpediente": "050201", "numeroConstancia": "6,981-0", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}}, "archivoId": 11, "duplicado": null, "confidence": 1, "documentoId": 13, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "PAGO_TRANSFERENCIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_transferencia"}, "tipoPropuesto": "PAGO_TRANSFERENCIA", "metadataSource": {"banco": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "fechaPago": "MANUAL", "clienteRuc": "MANUAL", "montoTotal": "MANUAL", "comprobante": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "clienteNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "numeroOperacion": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "numeroConstancia": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "PAGO_TRANSFERENCIA", "camposFaltantes": [], "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6981-0", "camposDetectados": ["numeroOperacion", "numeroConstancia", "fechaPago", "montoTotal"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "pago_1.pdf", "hashSha256": "2f31b2b004fd50df5f2a11b5d94f921eea1fa637cbe00cdf9956d99fccbe34b3", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "rucComprador": "20565747356", "tipoRelacion": "adjunto_transferencia", "storageProvider": "r2", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}	2026	7	\N	\N	2026-07-06 21:13:37.031002	\N	\N
14	BBTI	2026	7	PAGO_DETRACCION	20565747356	Instituto De Seguridad Minera	\N	296801526	BBTI|PAGO_DETRACCION|296801526	confirmado	2026-07-06 21:15:36.047761	2026-02-05	SOLES	240.00	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:18:39.346Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20565747356", "banco": "BANCO DE LA NACION", "moneda": "SOLES", "numero": "296801526", "fechaPago": "2026-02-05", "proveedor": "Instituto De Seguridad Minera", "clienteRuc": "20565747356", "montoTotal": "240", "comprobante": "NUMERO", "fechaEmision": "2026-02-05", "rucComprador": "20565747356", "rucProveedor": "20565747356", "clienteNombre": "Bbti S.a.C.", "tipoDocumental": "PAGO_DETRACCION", "claveDocumental": "BBTI|PAGO_DETRACCION|296801526", "numeroOperacion": "296801526", "proveedorNombre": "Instituto De Seguridad Minera", "codigoExpediente": "050201", "numeroConstancia": "296801526", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}}, "expedienteId": 41, "tipoRelacion": "adjunto_detraccion", "tipoPropuesto": "PAGO_DETRACCION"}, "usuarioId": null, "observacion": "Guardar y confirmar pago desde Finanzas"}], "texto": {"length": 845, "preview": "j \\nA St SAO \\nNúmero de constancia \\nUsuario SOL \\nN* Cuenta de detracciones (Banco de la Nación) \\nTipo de Cuenta \\nRuc del Proveedor \\nNombre/Razón Socila del Proveedor \\nTipo de Documento del Adquiriente \\nNúmero de Documento del Adquiriente \\nNombre/Razón Social del Adquiriente \\nTipo de Operación \\nTipo de Bien ó servicio \\nMonto del depósito \\nFecha y hora de pago \\nPeriodo Tributario \\nTipo de Comprobante \\nNúmero de Comprobante \\nNúmero de operación \\nNúmero de Pago de Detracciones \\n296801526 \\n2D5INSMC \\n0"}, "estado": "confirmado", "archivo": {"filename": "799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "resolvedPath": "storage/tmp/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "storageProvider": "r2"}, "mensaje": "Documento requiere revisión manual por metadata incompleta o clave documental no generable.", "metadata": {"ruc": "20565747356", "banco": "BANCO DE LA NACION", "moneda": "SOLES", "numero": "296801526", "fechaPago": "2026-02-05", "proveedor": "Instituto De Seguridad Minera", "clienteRuc": "20565747356", "montoTotal": "240", "comprobante": "NUMERO", "fechaEmision": "2026-02-05", "rucComprador": "20565747356", "rucProveedor": "20565747356", "clienteNombre": "Bbti S.a.C.", "tipoDocumental": "PAGO_DETRACCION", "claveDocumental": "BBTI|PAGO_DETRACCION|296801526", "numeroOperacion": "296801526", "proveedorNombre": "Instituto De Seguridad Minera", "codigoExpediente": "050201", "numeroConstancia": "296801526", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}}, "archivoId": 12, "duplicado": null, "confidence": 0, "documentoId": 14, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "PAGO_DETRACCION", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_detraccion"}, "tipoPropuesto": "PAGO_DETRACCION", "metadataSource": {"ruc": "MANUAL", "banco": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "fechaPago": "MANUAL", "proveedor": "MANUAL", "clienteRuc": "MANUAL", "montoTotal": "MANUAL", "comprobante": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "clienteNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "numeroOperacion": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "numeroConstancia": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "PAGO_DETRACCION", "camposFaltantes": ["numeroOperacion"], "claveDocumental": "BBTI|PAGO_DETRACCION|296801526", "camposDetectados": ["comprobante", "fechaPago", "banco", "proveedorRuc", "proveedorNombre", "clienteRuc", "clienteNombre", "clienteAbreviatura"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "pago_detraccion_1_bbti_sac.pdf", "hashSha256": "95e9f1c8c85102f26f17a19e9554c856b421fd629eb67a2f02f34b48a636918d", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "rucComprador": "20565747356", "tipoRelacion": "adjunto_detraccion", "storageProvider": "r2", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}	2026	7	\N	\N	2026-07-06 21:18:39.339948	\N	\N
15	BBTI	2026	7	OS	20573856938	INSTRUINGENIERIA S.A.C.	\N	000284	BBTI|OS|000284	confirmado	2026-07-06 22:18:16.828807	2026-06-13	SOLES	141.60	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:19:22.273Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"moneda": "SOLES", "numero": "000284", "proveedor": "INSTRUINGENIERIA S.A.C.", "cotizacion": "13/06/2026", "montoTotal": "141.6", "razonSocial": "INSTRUINGENIERIA S.A.C.", "fechaEmision": "2026-06-13", "rucComprador": "20565747356", "rucProveedor": "20573856938", "tipoDocumental": "OS", "claveDocumental": "BBTI|OS|000284", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "7", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}}, "expedienteId": 7, "tipoRelacion": "principal_os", "tipoPropuesto": "OS"}, "usuarioId": null, "observacion": "Guardar y confirmar principal desde Compras > Nuevo"}], "texto": {"length": 3668, "preview": "SEÑOR(ES) :\\nTELEFONO :\\nATENCIÓN :\\n20573856938\\nR.U.C.  \\nCal. Lorenzo Astrana Nro. 280\\nCONDICION DE PAGO :\\nFECHA :\\nOrden de Servicio\\nLUGAR DE ENTREGA :\\nDIRECCIÓN :\\nNº:000284\\nMONEDA :\\nTIEMPO DE ENTREGA :\\nSOLES\\nOBSERVACIONES :\\nE-MAIL :\\nCUENTAS BANCARIAS :\\nCOTIZACION :\\nINSTRUINGENIERIA S.A.C.\\n13/06/2026\\nALMACENES DE INSTRUINGENIERIA S.A.C\\n13/06/2026\\nCOI-228_06_2026\\nCONTADO CONTRA ENTREGA\\nDESCRIPCION\\nIMPORTE\\nPRECIO\\nCANT\\nCODIGO\\nBB TECNOLOGIA INDUSTRIAL S.A.C.\\nCAL.CALLE 6 MZA. D LOTE. 15 DPTO. 2DO INT. "}, "estado": "confirmado", "archivo": {"filename": "585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "resolvedPath": "storage/tmp/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"moneda": "SOLES", "numero": "000284", "proveedor": "INSTRUINGENIERIA S.A.C.", "cotizacion": "13/06/2026", "montoTotal": "141.6", "razonSocial": "INSTRUINGENIERIA S.A.C.", "fechaEmision": "2026-06-13", "rucComprador": "20565747356", "rucProveedor": "20573856938", "tipoDocumental": "OS", "claveDocumental": "BBTI|OS|000284", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "7", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}}, "archivoId": 13, "duplicado": null, "confidence": 1, "documentoId": 15, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 7, "tipoEsperado": "OS", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "principal_os"}, "tipoPropuesto": "OS", "metadataSource": {"moneda": "MANUAL", "numero": "MANUAL", "proveedor": "MANUAL", "cotizacion": "MANUAL", "montoTotal": "MANUAL", "razonSocial": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "OS", "camposFaltantes": [], "claveDocumental": "BBTI|OS|000284", "camposDetectados": ["numero", "fechaEmision", "montoTotal", "proveedor", "rucProveedor", "moneda", "cotizacion", "codigoExpediente"], "vinculoExpediente": {"orden": 1, "documentoId": 15, "esPrincipal": true, "vinculadoEn": "2026-07-06T22:18:25.660256+00:00", "expedienteId": 7, "tipoRelacion": "principal_os", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "030101"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": 7, "confirmadoDesde": "compras_nuevo", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "OS_BBTEC.pdf", "hashSha256": "e1609e9213f75909f60345eacabdd7ee7b4bd71a855d727a1baff3d8ec12c709", "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 7, "rucComprador": "20565747356", "tipoRelacion": "principal_os", "storageProvider": "r2", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}	2026	7	\N	\N	2026-07-06 22:19:22.264159	\N	\N
16	BBTI	2026	7	FACTURA	20565747356	BBTI S.A.C.	F001	0000909	BBTI|FACTURA|20565747356|F001|0000909	confirmado	2026-07-06 22:19:49.258282	2026-01-21	SOLES	238.64	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:20:59.586Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20565747356", "serie": "F001", "moneda": "SOLES", "numero": "0000909", "proveedor": "BBTI S.A.C.", "rucEmisor": "20565747356", "montoTotal": "238.64", "razonSocial": "BBTI S.A.C.", "fechaEmision": "2026-01-21", "rucComprador": "20565747356", "rucProveedor": "20565747356", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "BBTI S.A.C.", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "compras_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "CAL. 6 MZA. D LOTE 13 URB. IND", "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 7, "tipoRelacion": "adjunto_factura", "tipoPropuesto": "FACTURA"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 1004, "preview": "= 1 \\npa \\n* 20565747356 \\n== bbtis.a.c \\nad \\nBBTI S.A.C.. \\nFACTURA ELECTRONICA \\nCAL.6 MZA. D LOTE. 13 URB. INDUSTRIAL GRIMAN \\n(ALT. DE LIMA CARGO CITY) PROV. CONST. DEL \\no \\na \\nCALLAO - PROV. CONST. DEL CALLAO - CALLAO \\n' \\nN? \\nF001 \\n- 0000909 \\n) \\nSEÑOR: \\nBB TECNOLOGIA INDUSTRIAL S.A.C. \\nFECHA EMISION: \\n21/01/2026 \\nFECHA VCTO: \\n21/01/2026 \\nRUC: \\n20299922821 \\nORD. COMPRA: \\n2955 \\nDIRECCIÓN: \\nCALLE 6 MZA. D LOTE. 15 DPTO. 2DO INT. 2PIS URB. GRIMANEZA \\nGUÍA DE REMISIÓN: \\n10010000226 \\n¡PERES \\nPR147-25 \\nFO"}, "estado": "confirmado", "archivo": {"filename": "44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "resolvedPath": "storage/tmp/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20565747356", "serie": "F001", "moneda": "SOLES", "numero": "0000909", "proveedor": "BBTI S.A.C.", "rucEmisor": "20565747356", "montoTotal": "238.64", "razonSocial": "BBTI S.A.C.", "fechaEmision": "2026-01-21", "rucComprador": "20565747356", "rucProveedor": "20565747356", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "BBTI S.A.C.", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "compras_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "CAL. 6 MZA. D LOTE 13 URB. IND", "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 14, "duplicado": null, "confidence": 1, "documentoId": 16, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "FACTURA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_factura"}, "tipoPropuesto": "FACTURA", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "montoTotal": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "FACTURA", "camposFaltantes": [], "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "compras_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "factura_scaneada_2.pdf", "hashSha256": "e2da77a837658c9598d17fdc5458e372bec7da24f216d4f4e5a58b213f01675f", "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 7, "rucComprador": "20565747356", "tipoRelacion": "adjunto_factura", "storageProvider": "r2", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}	2026	7	\N	\N	2026-07-06 22:20:59.572706	\N	\N
17	BBTI	2026	7	GUIA_REMISION	20612122416	CONSORCIO HUANCAVELICA	EG07	00000163	BBTI|GUIA_REMISION|20612122416|EG07|00000163	confirmado	2026-07-06 22:22:24.171912	2026-04-01	\N	\N	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:22:45.185Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000163", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-01", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 7, "tipoRelacion": "adjunto_guia", "tipoPropuesto": "GUIA_REMISION"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Almacén"}], "texto": {"length": 2140, "preview": "RUC N°20612122416\\nGUÍA DE REMISIÓN ELECTRÓNICA\\nREMITENTE\\nN° EG07 - 00000163\\nCONSORCIO HUANCAVELICA\\n01/04/2026 02:40 PM\\nFecha de inicio de Traslado :\\nMotivo de Traslado :\\n01/04/2026\\nOTROS\\nJR 28 DE JULIO MZ F1 LT9 - PAUCARA - ACOBAMBA -\\nHUANCAVELICA\\nCAL. CAPPA NRO. 237 Z.I. PARQUE INTERNACIONAL DE LA\\nINDUSTRIA Y COMERCIO (NRO. 237, 249,267)  - CALLAO - PROV.\\nCONST. DEL CALLAO - PROV. CONST. DEL CALLAO\\nPunto de llegada\\nPunto de Partida\\nDatos del Destinatario :CONSORCIO HUANCAVELICA - REGISTRO ÚNICO"}, "estado": "confirmado", "archivo": {"filename": "d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "resolvedPath": "storage/tmp/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000163", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-01", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 15, "duplicado": null, "confidence": 1, "documentoId": 17, "contextoCarga": {"areaOrigen": "ALMACEN", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "tipoPropuesto": "GUIA_REMISION", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "GUIA_REMISION", "camposFaltantes": [], "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "guia_3_4.pdf", "hashSha256": "f696f58d1a97e4fae9ea36b2afbe4012a0396387c86a04a3734e993266454942", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "rucComprador": "20565747356", "tipoRelacion": "adjunto_guia", "storageProvider": "r2", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}	2026	7	\N	\N	2026-07-06 22:22:45.181545	\N	\N
18	BBTI	2026	7	NOTA_INGRESO	\N	\N	\N	0000000031	BBTI|NOTA_INGRESO|0000000031	confirmado	2026-07-06 22:22:53.294286	2026-02-26	\N	\N	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:23:08.975Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"numero": "0000000031", "clienteRuc": "20565747356", "ordenCompra": "0000000000006", "fechaEmision": "2026-02-26", "rucComprador": "20565747356", "empresaNombre": "BBTI S.A.C.", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "proveedorNombre": "CORPORACION CIE E.I.R.L.", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "expedienteId": 7, "tipoRelacion": "adjunto_nota_ingreso", "tipoPropuesto": "NOTA_INGRESO"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Almacén"}], "texto": {"length": 604, "preview": "1\\nPag.\\nBBTI SAC\\nFecha :23/04/2026\\nHora    18:09:22\\nNOTA DE INGRESO\\nI\\nALMACEN         \\nTRANSACCION\\nFECHA DOC\\nPROVEEDOR\\nCLIENTE\\nAUTORIZADO\\nORD. COMPRA  \\nNro. DOC. REF.\\nCENTRO DE COSTO\\nMONEDA\\nALMACEN PRINCIPAL\\n26/02/2026\\n20602599702\\nCORPORACION CIE E.I.R.L.\\n0000000000006\\nGC 0012292\\n0000000031\\nCL COMPRAS PRODUCTOS NACIONALES\\nMN\\nCOMENTARIO\\nINV043\\nT.C.\\n 3.363\\nCODIGO\\nDESCRIPCION\\nUND SERIE\\\\LOTE\\nCANT.\\nITEM\\nCOSTO UNIT.\\nTOTAL\\nC.COSTO\\nORD. \\n28.000000  23,772.00\\n 1\\n240302\\nEspiga de AºGº para Cruceta y Aislad"}, "estado": "confirmado", "archivo": {"filename": "4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "resolvedPath": "storage/tmp/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"numero": "0000000031", "clienteRuc": "20565747356", "ordenCompra": "0000000000006", "fechaEmision": "2026-02-26", "rucComprador": "20565747356", "empresaNombre": "BBTI S.A.C.", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "proveedorNombre": "CORPORACION CIE E.I.R.L.", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "archivoId": 16, "duplicado": {"documentoId": 11, "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "existeDocumento": true}, "confidence": 1, "documentoId": 18, "contextoCarga": {"areaOrigen": "ALMACEN", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "NOTA_INGRESO", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_nota_ingreso"}, "tipoPropuesto": "NOTA_INGRESO", "metadataSource": {"numero": "MANUAL", "clienteRuc": "MANUAL", "ordenCompra": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "empresaNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "NOTA_INGRESO", "camposFaltantes": [], "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "camposDetectados": ["clienteAbreviatura", "clienteRuc", "empresaNombre", "numero", "fechaEmision", "ordenCompra", "proveedorRuc", "proveedorNombre"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "nota_i_31_bbti.pdf", "hashSha256": "7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85", "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "rucComprador": "20565747356", "tipoRelacion": "adjunto_nota_ingreso", "storageProvider": "r2", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}	2026	7	\N	\N	2026-07-06 22:23:08.97167	\N	\N
19	BBTI	2026	7	PAGO_DETRACCION	\N	\N	\N	\N	\N	pendiente_ocr	2026-07-06 22:24:47.327709	\N	\N	\N	{"origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "pago_detraccion_3.pdf", "hashSha256": "f8d3c1baccba81421e4f20a02469d1d530a61d91027e14b81d7b512af4e5c62d", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "storageProvider": "r2", "tipoRelacionSugerida": "adjunto_detraccion"}	2026	7	\N	\N	2026-07-06 22:24:47.327709	\N	\N
20	BBTI	2026	7	PAGO_TRANSFERENCIA	\N	\N	\N	3442-3444	BBTI|PAGO_TRANSFERENCIA|3442-3444	confirmado	2026-07-06 22:26:19.6943	2026-04-06	SOLES	5460.90	{"ocr": {"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:26:45.379Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"banco": "SCOTIABANK", "moneda": "SOLES", "numero": "3442-3444", "fechaPago": "2026-04-06", "clienteRuc": null, "montoTotal": "5460.9", "comprobante": null, "fechaEmision": "2026-04-06", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444", "numeroOperacion": "3442-3444", "proveedorNombre": null, "codigoExpediente": "030101", "numeroConstancia": "3442-3444", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}}, "expedienteId": 7, "tipoRelacion": "adjunto_transferencia", "tipoPropuesto": "PAGO_TRANSFERENCIA"}, "usuarioId": null, "observacion": "Guardar y confirmar pago desde Finanzas"}], "texto": {"length": 895, "preview": "2026/04/06 07:52:39\\nCONSORCIO HUANCAVELICA\\nTransferencias\\nImporte Transferido\\n5,454.85  SOLES\\nNúmero de Cuenta de Cargo\\n0011-0153-430100096873\\nCONSORCIO HUANCAVELI CA\\nNúmero de Cuenta Interbancaria\\nde Abono\\n009-214-000002109263-80\\nUN*** NA*** DE*** IN*** UN*** \\nDetalle de la Operación\\nEstado de la Operación :\\nAbonada\\nNúmero de Operación :\\n3442 - 3444\\nOperación :\\nTransferencia Interbancaria\\nTipo de transferencia:\\nInmediata\\nImporte Cargado :\\n5,460.90     SOLES\\nUsuario(s) que autoriza(n)\\nCIRO FERNA"}, "estado": "confirmado", "archivo": {"filename": "69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "resolvedPath": "storage/tmp/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"banco": "SCOTIABANK", "moneda": "SOLES", "numero": "3442-3444", "fechaPago": "2026-04-06", "clienteRuc": null, "montoTotal": "5460.9", "comprobante": null, "fechaEmision": "2026-04-06", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444", "numeroOperacion": "3442-3444", "proveedorNombre": null, "codigoExpediente": "030101", "numeroConstancia": "3442-3444", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}}, "archivoId": 18, "duplicado": null, "confidence": 1, "documentoId": 20, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "PAGO_TRANSFERENCIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_transferencia"}, "tipoPropuesto": "PAGO_TRANSFERENCIA", "metadataSource": {"banco": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "fechaPago": "MANUAL", "clienteRuc": "MANUAL", "montoTotal": "MANUAL", "comprobante": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "clienteNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "numeroOperacion": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "numeroConstancia": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "PAGO_TRANSFERENCIA", "camposFaltantes": [], "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444", "camposDetectados": ["numeroOperacion", "numeroConstancia", "fechaPago", "montoTotal", "banco"], "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "finanzas_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}}, "origen": "WEB_ADMIN_CARGA_GUIADA", "filename": "pago_3.pdf", "hashSha256": "b13c3973b1a9a5aa15301ade41221ba775c351a338a28bf6036c1f074d522a4c", "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "rucComprador": "20565747356", "tipoRelacion": "adjunto_transferencia", "storageProvider": "r2", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}	2026	7	\N	\N	2026-07-06 22:26:45.375171	\N	\N
\.


--
-- Data for Name: documentos_archivos; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_archivos (id, documento_id, nombre_archivo, ruta_archivo, hash_sha256, tipo_version, area_origen, estado, creado_en, origen_archivo, observacion, metadata, storage_provider, storage_bucket, storage_key, public_url, version, es_version_actual) FROM stdin;
1	1	SPRINT_1_3D_LOCAL_FACTURA.pdf	/tmp/SPRINT_1_3D_LOCAL_FACTURA.pdf	SPRINT_1_3D_LOCAL_HASH	original	prueba_local	activo	2026-07-06 16:24:57.411958	local_seed	Archivo local de prueba para eventos documentales	{"origenPrueba": "SPRINT_1_3D_LOCAL", "puedeEliminarse": true}	local	local	pruebas/SPRINT_1_3D_LOCAL_FACTURA.pdf	\N	1	t
2	4	SPRINT_1_3D_BBTI_FACTURA.pdf	/tmp/SPRINT_1_3D_BBTI_FACTURA.pdf	SPRINT_1_3D_BBTI_HASH	original	COMPRAS	activo	2026-07-06 19:28:18.702738	local_seed	Archivo BBTI local para probar eventos OCR	{"origenSprint": "SPRINT_1_3D", "puedeEliminarse": true}	local	local	pruebas/SPRINT_1_3D_BBTI_FACTURA.pdf	\N	1	t
3	5	SPRINT_1_3D_BBTI_CONFIRMAR.pdf	/tmp/SPRINT_1_3D_BBTI_CONFIRMAR.pdf	SPRINT_1_3D_BBTI_CONFIRMAR_HASH	original	COMPRAS	activo	2026-07-06 19:52:36.128192	local_seed	Archivo BBTI local para probar confirmación OCR	{"origenSprint": "SPRINT_1_3D", "puedeEliminarse": true}	local	local	pruebas/SPRINT_1_3D_BBTI_CONFIRMAR.pdf	\N	1	t
4	6	OC_007950.pdf	documentos/2026/07/BBTI/81a442f4-d265-4951-b0aa-fcdcdbbf8418__OC_007950.pdf	40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2	original	COMPRAS	subido	2026-07-06 19:56:10.421834	COMPRAS_NUEVO_UPLOAD_PRINCIPAL	Carga desde Compras Nuevo: OC principal	{"size": 77611, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "tipoEsperado": "OC", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "principal_oc"}	r2	data-prod	documentos/2026/07/BBTI/81a442f4-d265-4951-b0aa-fcdcdbbf8418__OC_007950.pdf	\N	1	t
5	7	OC_007950.pdf	documentos/2026/07/BBTI/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf	40168afc7951facf10a578d9c040b6e8d14872f98d53192d4511f0c509e635e2	original	COMPRAS	subido	2026-07-06 20:21:46.952001	COMPRAS_NUEVO_UPLOAD_PRINCIPAL	Carga desde Compras Nuevo: OC principal	{"size": 77611, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "tipoEsperado": "OC", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "principal_oc"}	r2	data-prod	documentos/2026/07/BBTI/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf	\N	1	t
6	8	factura_scaneada_1.pdf	documentos/2026/07/BBTI/00cfc8ed-ae62-4f12-9362-b29dfc086774__factura_scaneada_1.pdf	f67c30d648098a372538092407dcc0f266233af02208de802c22012d93077177	original	COMPRAS	subido	2026-07-06 20:35:48.85108	COMPRAS_EDITAR_UPLOAD	Carga desde Compras Editar: adjunto - Factura	{"size": 624538, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "FACTURA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_factura"}	r2	data-prod	documentos/2026/07/BBTI/00cfc8ed-ae62-4f12-9362-b29dfc086774__factura_scaneada_1.pdf	\N	1	t
7	9	factura_comatpe.PDF	documentos/2026/07/BBTI/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF	c68152b284b54265aabdee96896e8123bd5184ff8dead76843d054921c98351d	original	COMPRAS	subido	2026-07-06 20:39:25.033031	COMPRAS_EDITAR_UPLOAD	Carga desde Compras Editar: adjunto - Factura	{"size": 458132, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "FACTURA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_factura"}	r2	data-prod	documentos/2026/07/BBTI/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF	\N	1	t
8	10	nota_i_31_bbti.pdf	documentos/2026/07/BBTI/5d285217-6164-447c-b9e9-42c2c47c1a93__nota_i_31_bbti.pdf	7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85	original	ALMACEN	subido	2026-07-06 20:56:10.513486	ALMACEN_EDITAR_UPLOAD	Carga desde Almacén: Guía escaneada	{"size": 37364, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_guia"}	r2	data-prod	documentos/2026/07/BBTI/5d285217-6164-447c-b9e9-42c2c47c1a93__nota_i_31_bbti.pdf	\N	1	t
9	11	nota_i_31_bbti.pdf	documentos/2026/07/BBTI/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf	7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85	original	COMPRAS	subido	2026-07-06 21:00:20.82676	COMPRAS_EDITAR_UPLOAD	Carga desde Compras Editar: adjunto - Guía	{"size": 37364, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_guia"}	r2	data-prod	documentos/2026/07/BBTI/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf	\N	1	t
10	12	guia_3_2.pdf	documentos/2026/07/BBTI/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf	acd597e21954b13df67e6765acb4a999b0a3c57a4af5d94e9085eb1529d9ae3f	original	COMPRAS	subido	2026-07-06 21:03:32.487947	COMPRAS_EDITAR_UPLOAD	Carga desde Compras Editar: adjunto - Guía	{"size": 4870, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_guia"}	r2	data-prod	documentos/2026/07/BBTI/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf	\N	1	t
11	13	pago_1.pdf	documentos/2026/07/BBTI/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf	2f31b2b004fd50df5f2a11b5d94f921eea1fa637cbe00cdf9956d99fccbe34b3	original	FINANZAS	subido	2026-07-06 21:11:01.828974	FINANZAS_EDITAR_UPLOAD	Carga desde Finanzas: Pago transferencia	{"size": 8526, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "PAGO_TRANSFERENCIA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_transferencia"}	r2	data-prod	documentos/2026/07/BBTI/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf	\N	1	t
12	14	pago_detraccion_1_bbti_sac.pdf	documentos/2026/07/BBTI/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf	95e9f1c8c85102f26f17a19e9554c856b421fd629eb67a2f02f34b48a636918d	original	FINANZAS	subido	2026-07-06 21:15:40.547463	FINANZAS_EDITAR_UPLOAD	Carga desde Finanzas: Pago detracción	{"size": 368947, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "PAGO_DETRACCION", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_detraccion"}	r2	data-prod	documentos/2026/07/BBTI/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf	\N	1	t
13	15	OS_BBTEC.pdf	documentos/2026/07/BBTI/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf	e1609e9213f75909f60345eacabdd7ee7b4bd71a855d727a1baff3d8ec12c709	original	COMPRAS	subido	2026-07-06 22:18:21.439049	COMPRAS_NUEVO_UPLOAD_PRINCIPAL	Carga desde Compras Nuevo: OS principal	{"size": 212115, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 7, "tipoEsperado": "OS", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "principal_os"}	r2	data-prod	documentos/2026/07/BBTI/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf	\N	1	t
14	16	factura_scaneada_2.pdf	documentos/2026/07/BBTI/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf	e2da77a837658c9598d17fdc5458e372bec7da24f216d4f4e5a58b213f01675f	original	COMPRAS	subido	2026-07-06 22:19:53.433055	COMPRAS_EDITAR_UPLOAD	Carga desde Compras Editar: adjunto - Factura	{"size": 378042, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "FACTURA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_factura"}	r2	data-prod	documentos/2026/07/BBTI/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf	\N	1	t
15	17	guia_3_4.pdf	documentos/2026/07/BBTI/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf	f696f58d1a97e4fae9ea36b2afbe4012a0396387c86a04a3734e993266454942	original	ALMACEN	subido	2026-07-06 22:22:28.708111	ALMACEN_EDITAR_UPLOAD	Carga desde Almacén: Guía escaneada	{"size": 5851, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "GUIA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_guia"}	r2	data-prod	documentos/2026/07/BBTI/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf	\N	1	t
16	18	nota_i_31_bbti.pdf	documentos/2026/07/BBTI/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf	7589a0dbcd3471b1d9de7b77dcc84e3b178977d39db4baed487b736297678e85	original	ALMACEN	subido	2026-07-06 22:22:57.469199	ALMACEN_EDITAR_UPLOAD	Carga desde Almacén: Nota de ingreso	{"size": 37364, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "NOTA_INGRESO", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_nota_ingreso"}	r2	data-prod	documentos/2026/07/BBTI/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf	\N	1	t
17	19	pago_detraccion_3.pdf	documentos/2026/07/BBTI/c643c422-9c81-4d25-ae88-e4abeb0b50bb__pago_detraccion_3.pdf	f8d3c1baccba81421e4f20a02469d1d530a61d91027e14b81d7b512af4e5c62d	original	FINANZAS	subido	2026-07-06 22:24:51.260119	FINANZAS_EDITAR_UPLOAD	Carga desde Finanzas: Pago detracción	{"size": 313629, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "PAGO_DETRACCION", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_detraccion"}	r2	data-prod	documentos/2026/07/BBTI/c643c422-9c81-4d25-ae88-e4abeb0b50bb__pago_detraccion_3.pdf	\N	1	t
18	20	pago_3.pdf	documentos/2026/07/BBTI/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf	b13c3973b1a9a5aa15301ade41221ba775c351a338a28bf6036c1f074d522a4c	original	FINANZAS	subido	2026-07-06 22:26:23.610166	FINANZAS_EDITAR_UPLOAD	Carga desde Finanzas: Pago transferencia	{"size": 8260, "duplicados": [], "contentType": "application/pdf", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "PAGO_TRANSFERENCIA", "uploadOrigen": "carga-guiada", "clienteAbreviatura": "BBTI", "duplicadoAdvertencia": false, "tipoRelacionSugerida": "adjunto_transferencia"}	r2	data-prod	documentos/2026/07/BBTI/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf	\N	1	t
\.


--
-- Data for Name: documentos_factura; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_factura (documento_id, ruc_emisor, razon_social_emisor, serie, numero, fecha_emision, moneda, total, creado_en) FROM stdin;
5	\N	\N	F003	000001	2026-07-06	\N	200.00	2026-07-06 19:53:09.992031
9	20516403650	\N	F011	00001135	2026-05-04	\N	40.00	2026-07-06 20:46:30.204732
16	20565747356	\N	F001	0000909	2026-01-21	\N	238.64	2026-07-06 22:20:59.572706
\.


--
-- Data for Name: documentos_guia_remision; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_guia_remision (documento_id, ruc_emisor, razon_social_emisor, serie, numero, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos_nota_ingreso; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_nota_ingreso (documento_id, numero, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos_oc; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_oc (documento_id, numero, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos_origenes; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_origenes (id, documento_id, tabla_origen, registro_origen_id, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos_os; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_os (documento_id, numero, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos_otro; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_otro (documento_id, descripcion, creado_en) FROM stdin;
\.


--
-- Data for Name: documentos_pago_detraccion; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_pago_detraccion (documento_id, ruc_emisor, serie, numero, creado_en, banco_abreviatura, codigo_operacion) FROM stdin;
\.


--
-- Data for Name: documentos_pago_transferencia; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_pago_transferencia (documento_id, banco_abreviatura, codigo_operacion, creado_en, monto, fecha_operacion) FROM stdin;
\.


--
-- Data for Name: documentos_recibo_honorario; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.documentos_recibo_honorario (id, documento_id, serie, numero, ruc_emisor, razon_social_emisor, fecha_emision, moneda, descripcion_servicio, monto_total, retencion, monto_neto, observaciones, creado_en) FROM stdin;
\.


--
-- Data for Name: expediente_documentos; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.expediente_documentos (expediente_id, documento_id, tipo_relacion, creado_en, es_principal, orden) FROM stdin;
681	1	principal_factura	2026-07-06 16:47:20.895957	t	1
41	7	principal_oc	2026-07-06 20:21:50.991862	t	1
41	9	adjunto_factura	2026-07-06 20:46:30.204732	f	10
41	11	adjunto_nota_ingreso	2026-07-06 21:03:02.347241	f	10
41	12	adjunto_guia	2026-07-06 21:05:32.436923	f	10
41	13	adjunto_transferencia	2026-07-06 21:13:37.031002	f	20
41	14	adjunto_detraccion	2026-07-06 21:18:39.339948	f	20
7	15	principal_os	2026-07-06 22:18:25.655527	t	1
7	16	adjunto_factura	2026-07-06 22:20:59.572706	f	10
7	17	adjunto_guia	2026-07-06 22:22:45.181545	f	20
7	18	adjunto_nota_ingreso	2026-07-06 22:23:08.97167	f	20
7	20	adjunto_transferencia	2026-07-06 22:26:45.375171	f	20
\.


--
-- Data for Name: expedientes; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.expedientes (id, empresa_codigo, descripcion, estado, metadata, creado_en, actualizado_en, codigo_expediente, cliente_destino_id) FROM stdin;
2	BBTI	ADMINISTRACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	01	2
3	BBTI	ADMINISTRACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0101	2
4	BBTI	ADMINISTRACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	010101	2
5	BBTI	UNIDAD UNACEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	03	2
6	BBTI	UNACEM PROYECTOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0301	2
7	BBTI	UNACEM TARMA (SERVICIOS)	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030101	2
8	BBTI	UNACEM TARMA (CHANCADORA)	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030102	2
9	BBTI	UNACEM LIMA (SERVICIOS)	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030103	2
10	BBTI	UNACEM LIMA (CHANCADORA)	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030104	2
11	BBTI	HOSPITAL AMAZONICO - PUCALLPA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030105	2
12	BBTI	PROYECTO ENFRIADOR PY2196 - C	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030106	2
13	BBTI	PROYECTO ATOCONGO -RED AEREA C	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030107	2
14	BBTI	PROYECTO TARMA PY2135. C. OCT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030108	2
15	BBTI	PROYECTO ATOCONGO PY2234. C.	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030109	2
16	BBTI	PROYECTO ATOCONGO- PY2244 MOLI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	030110	2
17	BBTI	PROYECTOS DIVERSOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	04	2
18	BBTI	PROYECTOS DIVERSOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0401	2
19	BBTI	PROTISA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040101	2
20	BBTI	TEXTILES PACIFICO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040102	2
21	BBTI	UNIVERSIDAD DE PIURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040103	2
22	BBTI	HOSPITAL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040104	2
23	BBTI	PERUBAR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040105	2
24	BBTI	UNMSM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040106	2
25	BBTI	PROYECTO MENOR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	040107	2
26	BBTI	PRODUCCION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	05	2
27	BBTI	COSTOS DE PRODUCCION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0501	2
28	BBTI	MECANICA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050101	2
29	BBTI	ELECTRICIDAD	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050102	2
30	BBTI	SOLDADURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050103	2
31	BBTI	PINTURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050104	2
32	BBTI	ENSAMBLE Y ACABADO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050105	2
33	BBTI	ALMACEN Y LOGISTICA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050106	2
34	BBTI	SISTEMAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050107	2
35	BBTI	SEGURIDAD - EPPS CALLAO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050108	2
36	BBTI	MURETE LC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050109	2
37	BBTI	ALQUILER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050197	2
38	BBTI	PROVISION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050198	2
39	BBTI	DEPRECIACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050199	2
40	BBTI	COSTO INDIRECTO DE PRODUCCION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0502	2
41	BBTI	PRODUCCION C X DISTRIBUIR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050201	2
42	BBTI	COSTO DE PRODUCCION-SEGUN OP	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0505	2
43	BBTI	PR-049-24 UNACEM TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050501	2
44	BBTI	PR-050-24 UNACEM ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050502	2
45	BBTI	PR-051-24 UNACEM ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050503	2
46	BBTI	PR-052-24 UNACEM TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050504	2
47	BBTI	PR-053-24 ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050505	2
48	BBTI	PR-054-24 TEXTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050506	2
49	BBTI	PR-055-24 PERT INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050507	2
50	BBTI	PR-056-24 YURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050508	2
51	BBTI	PR-057-24 FILADELFIO RUIZ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050509	2
52	BBTI	PR-058-24  JCCJ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050510	2
53	BBTI	PR-059-24 MERCADO CONSTRUCTORE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050511	2
54	BBTI	PR-060-24CONSORCIO CHANCHAMAYO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050512	2
55	BBTI	PR-061-24 MEG PERU	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050513	2
56	BBTI	PR-062-24 ABENGOA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050514	2
57	BBTI	PR-063-24 CMEJIA - IQUITOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050515	2
58	BBTI	PR-064-24 CTL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050516	2
59	BBTI	PR-065-24 CONSORCIO KILLA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050517	2
60	BBTI	PR-066-24 KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050518	2
61	BBTI	PR-067-24 HOSPITAL SJL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050519	2
62	BBTI	PR-068-24 BBTI - TEXTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050520	2
63	BBTI	PR-069-24 BBT - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050521	2
64	BBTI	PR-070-24 BBT ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050522	2
65	BBTI	PR-071-24 SIPA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050523	2
66	BBTI	PR-072-24 AMAZONAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050524	2
67	BBTI	PR 073-24 C. VALLE DORADO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050525	2
68	BBTI	PR 074-24 SIPA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050526	2
69	BBTI	PR-075-24 KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050527	2
70	BBTI	PR-076-24 CONSORCIO ENERGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050528	2
71	BBTI	PR-077-24 INANBARI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050529	2
72	BBTI	PR-078-24 CONSORCIO TESLA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050530	2
73	BBTI	PR-079-24 CONSORCIO YURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050531	2
74	BBTI	PR-080-24 CONSORCIO TESLA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050532	2
75	BBTI	PR-081-24 BBTECNO - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050533	2
76	BBTI	PR-082-24 CONSORCIO PRO REDES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050534	2
77	BBTI	PR-089-24 SANTA ELENA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050535	2
78	BBTI	PR-083-24 CONSORCIO ENERGIA V	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050536	2
79	BBTI	PR-084-24 BBTI - HOSPITAL  SJL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050537	2
80	BBTI	PR-085-24 CONSORCIO ENERGIA V	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050538	2
81	BBTI	PR-086-24 CONSORCIO KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050539	2
82	BBTI	PR-087-24 CHANCHAMAYO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050540	2
83	BBTI	PR-088-24 BBTECNOLOGIA -UNACEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050541	2
84	BBTI	PR-090-24 INAMBARI S.A.	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050542	2
85	BBTI	PR-091-24 LOZADA GROUP SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050543	2
86	BBTI	PR-092 BB TECNOLOGIA - ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050544	2
87	BBTI	PR-093-2 PROYECTOS ENERGETICO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050545	2
88	BBTI	PR-094-24 C. PROYECTO  NORTE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050546	2
89	BBTI	PR-095-24 C. PROYECTO  NORTE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050547	2
90	BBTI	PR-096-24 CONSORCIO SUR PERU	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050548	2
91	BBTI	PR-097-24 BBTI  - PROTISA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050549	2
92	BBTI	PR-098-24 BBTEC - UNACEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050550	2
93	BBTI	PR-099-24 BBTI - CONDORCHOCHA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050551	2
94	BBTI	PR-100-24 KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050552	2
95	BBTI	PR-101-24 KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050553	2
96	BBTI	PR-102-24 HILARIO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050554	2
97	BBTI	PR-103-24 PROTISA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050555	2
98	BBTI	PR-104-24 ELECTROSUR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050556	2
99	BBTI	PR-105-24 BBTEC - COND	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050557	2
100	BBTI	PR-106-24 BBTECNOLOGIA - ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050558	2
101	BBTI	PR-107-24 JCCJ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050559	2
102	BBTI	PR-108-24 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050560	2
103	BBTI	PR-109-24 PRENISAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050561	2
104	BBTI	PR-110-24 EMELSUR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050562	2
105	BBTI	PR-111-24 CMEJIA - IQUITOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050563	2
106	BBTI	PR-112-24  BB TECNOL - PACASM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050564	2
107	BBTI	PR-113-24 BB TECNOLOGIA - TARM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050565	2
108	BBTI	PR-114-24 MEGPERU	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050566	2
109	BBTI	PR-115-24 SERV GENERAL QUIHE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050567	2
110	BBTI	PR-116-24 KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050568	2
111	BBTI	PR-117-24 CLAFER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050569	2
112	BBTI	PR-118-24 BBTI - SOFTYS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050570	2
113	BBTI	PR-119-24 BBTI - TEXTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050571	2
114	BBTI	PR-120-24 CONSORCIO URB PIURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050572	2
115	BBTI	PR-121-24 CONSORCIO LATINA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050573	2
116	BBTI	PR-122-24 JRZ SERVICE E.I.R.L.	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050574	2
117	BBTI	PR-123-24 OBRITEC S.A.C.	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050575	2
118	BBTI	PR-124-24 BBTI- TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050576	2
119	BBTI	PR-125-24 BBTI- TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050577	2
120	BBTI	PR-126-24 FORZAMAT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050578	2
121	BBTI	PR-127-24 BBT ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050579	2
122	BBTI	PR-128-24 CONSORCIO VERSALLES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050580	2
123	BBTI	PR-129-24 CONSTRUCTOR MARTINEZ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050581	2
124	BBTI	PR-130-24 ICELER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050582	2
125	BBTI	PR-131-24 CONSORCIO UNION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050583	2
126	BBTI	PR-001-25 COMESA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050584	2
127	BBTI	PR-002-25 BBTI  - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050585	2
128	BBTI	PR-003-25 BB TECNOLOGIA-CONDOR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050586	2
129	BBTI	PR-004-25 CONSOR ELE CHONTALY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050587	2
130	BBTI	PR-005-25 ELDAMO EIRL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050588	2
131	BBTI	PR-006-25 BB TECNOLOGIA-ATOCON	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050589	2
132	BBTI	PR-007-25 PERT INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050590	2
133	BBTI	PR-008-25 CONSORCIO ELECT CHON	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050591	2
134	BBTI	PR-009-25 CHINA CAMC ENGINEER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050592	2
135	BBTI	PR-010-25 GRUPO CTL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050593	2
136	BBTI	PR-011-25 BBTI S.A.C - PROTISA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050594	2
137	BBTI	PR-012-25 BB TECNOLOGIA -TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050595	2
138	BBTI	PR-013-25 BB TECNOLOGIA -TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050596	2
139	BBTI	PR-014-25  BBTECNOLOGIA -ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050597	2
140	BBTI	PR-015-25 BBTECNOLOGIA -ATOCON	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050598	2
141	BBTI	PR-016-25 COM ELECTRO NIETSA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	050599	2
142	BBTI	PR-017-25 BBTECNOLOGIA - ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051100	2
143	BBTI	PR-018-25 CONSORCIO PERU	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051101	2
144	BBTI	PR-019-25 BB TECNOLOGIA  ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051102	2
145	BBTI	PR-020-25 MANUFACT IND MENDOZA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051103	2
146	BBTI	PR-021-25 CONSORCIO LUPUNA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051104	2
147	BBTI	PR-022-25 BBTI SAC - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051105	2
148	BBTI	PR-023-25 BBTI SAC - TEXTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051106	2
149	BBTI	PR-024-25 BBT - PACASMAYO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051107	2
150	BBTI	PR-025-25 CONSORCIO PRO-REDES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051108	2
151	BBTI	PR-026-25 CONSORCIO MAQ & ASOC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051109	2
152	BBTI	PR-027-25 P Y D TELECOM S.R.L.	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051110	2
153	BBTI	PR-028-25 CONSORCIO PRO REDES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051111	2
154	BBTI	PR-029-25 BBTI.SAC - UNI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051112	2
155	BBTI	PR-030-25 HSJL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051113	2
156	BBTI	PR-031-25 PROMYERS CG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051114	2
157	BBTI	PR-032-25 BBTECNOLO ATOCONG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051115	2
158	BBTI	PR-033-25 HSJL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051116	2
159	BBTI	PR-034-25 ADIRSA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051117	2
160	BBTI	PR-035-25 CONSORCIO KOPER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051118	2
161	BBTI	PR-036-25 BBTISAC ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051119	2
162	BBTI	PR-037-25 BBTISAC TEXTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051120	2
163	BBTI	PR-038-25 JCCI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051121	2
164	BBTI	PR-039-25 PERT INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051122	2
165	BBTI	PR-040-25  CONSORCIO  F. DATEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051123	2
166	BBTI	PR-041-25 BBTISAC-CALLAO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051124	2
167	BBTI	PR-042-25 PROMATEL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051125	2
168	BBTI	PR-043-25 BBTISAC PAD UDEP	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051126	2
169	BBTI	PR-044-25 CONSORCIO LA MAR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051127	2
170	BBTI	PR-045-25 CONSORCIO VITROL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051128	2
171	BBTI	PR-046-25 SIPA CONTRATISTAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051129	2
172	BBTI	PR-047-25 FORTALEZA MAM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051130	2
173	BBTI	PR-048-25 BB TECNOLOGIA-CONDOR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051131	2
174	BBTI	PR-049-25 BBTISAC CONDORCOCHA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051132	2
175	BBTI	PR-050-25 CMEJIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051133	2
176	BBTI	PR-051-25 HIDRANDINA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051134	2
177	BBTI	PR-052-25 CONSORCIO VITRIOL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051135	2
178	BBTI	PR-053-25 C. MYJ ASOCIADOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051136	2
179	BBTI	PR-054-25 CONSORCIO LUPUNA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051137	2
180	BBTI	PR-055-25 C.ELECTRO PLUS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051138	2
181	BBTI	PR-056-25 MEGPERU SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051139	2
182	BBTI	PR-057-25 CONSORCIO LAMPA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051140	2
183	BBTI	PR-058-25 GOB REGIONAL  CUZCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051141	2
184	BBTI	PR-059-25 CONSORCIO FOTOVOL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051142	2
185	BBTI	PR-060-25 CONSORCIO KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051143	2
186	BBTI	PR-061-25 UNIVERSIDAD AGRARIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051144	2
187	BBTI	PR-062-25 CONSORCIO PRO REDES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051145	2
188	BBTI	PR-063-25 BBTI.SAC - SOFTYS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051146	2
189	BBTI	PR-064-25 JCCJ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051147	2
190	BBTI	PR-065-25 OBRITEC.SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051148	2
191	BBTI	PR-066-25 UNACEM ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051149	2
192	BBTI	PR-067-25 UNACEM ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051150	2
193	BBTI	PR-068-25 C.FOTOVOLTAICO DATEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051151	2
194	BBTI	PR-069-25 BB TECN - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051152	2
195	BBTI	PR-070-25 INGESA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051153	2
196	BBTI	PR-071-25 ELECTRO SERV DAVILA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051154	2
197	BBTI	PR-072-25 NETSYSTEL COMUNIC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051155	2
198	BBTI	PR-073-25 CONSORCIO HUANC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051156	2
199	BBTI	PR-074-25 BBTECNOL - ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051157	2
200	BBTI	PR-075-25 NETSYSTEL COMUNIC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051158	2
201	BBTI	PR-076-25 BBTECNOL - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051159	2
470	BBTEC	PROYECTOS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	06	1
202	BBTI	PR-077-25 BBTI SAC - HSJL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051160	2
203	BBTI	PR-078-25 CONSORCIO LAMPA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051161	2
204	BBTI	PR-079-25 CONSORCIO SUR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051162	2
205	BBTI	PR-080-25 TALLANES PACKER SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051163	2
206	BBTI	PR-081-25 TALLANES PACKER SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051164	2
207	BBTI	PR-082-25 CONSORCIO HUANCAV	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051165	2
208	BBTI	PR-083-25 BBTECNOLOGIA - ATOC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051166	2
209	BBTI	PR-084-25 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051167	2
210	BBTI	PR-085-25 NETSYSTEL COMUNIC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051168	2
211	BBTI	PR-086-25 BBTECNOLOGIA -CONDOR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051169	2
212	BBTI	PR-087-25 UNACEM PERU S.A.	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051170	2
213	BBTI	PR-088-25 NETSYSTEL COMUNIC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051171	2
214	BBTI	PR-089-25 BBTI - TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051172	2
215	BBTI	PR-090-25 NETSYSTEL COMUNIC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051173	2
216	BBTI	PR-091-25 UNACEM PERU	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051174	2
217	BBTI	PR-092-25 INGENIERIA ELEC ICG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051175	2
218	BBTI	PR-093-25 CONSORCIO FOTOVOLTAI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051176	2
219	BBTI	PR-094-25 V Y P ICE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051177	2
220	BBTI	PR-095-25 BBTI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051178	2
221	BBTI	PR-096-25 JUNTA PROP CC.MERC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051179	2
222	BBTI	PR-097-25 JCCJ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051180	2
223	BBTI	PR-098-25 YESDY TM SERV GENER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051181	2
224	BBTI	PR-099-25 BBTI- PROTISA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051182	2
225	BBTI	PR-100-25 BBTI - TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051183	2
226	BBTI	PR-101-25 PROSPECTIVA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051184	2
227	BBTI	PR-102-25 BBTEC ATOCONG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051185	2
228	BBTI	PR-103-25 ICG.SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051186	2
229	BBTI	PR-104-25 CARONI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051187	2
230	BBTI	PR-105-25 DIAR INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051188	2
231	BBTI	PR-106-25 VyP ICE SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051189	2
232	BBTI	PR-107-25 PRENISAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051190	2
233	BBTI	PR-108-25 MMVE CORPORACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051191	2
234	BBTI	PR-109-25 BBTECNOLOGIA - TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051192	2
235	BBTI	PR-110-25 BBTI.SAC - HSJL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051193	2
236	BBTI	PR-111-25 DARTEL ELECTRICIDAD	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051194	2
237	BBTI	PR-112-25 OMEGA POWER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051195	2
238	BBTI	PR-113-25 DOLLARCITY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051196	2
239	BBTI	PR-114-25 ELECTROENCHUFE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051197	2
240	BBTI	PR-115-25 CIE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051198	2
241	BBTI	PR-116-25 CMEJIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051199	2
242	BBTI	PR-117-25 BBTECNOLOGIA - TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051200	2
243	BBTI	PR-118-25 OMEGA POWER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051201	2
244	BBTI	PR-119-25 BBTEC - ATOCONGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051202	2
245	BBTI	PR-120-25 BBTEC - TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051203	2
246	BBTI	PR-121-25 PROSPECTIVA - ENSA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051204	2
247	BBTI	PR-122-25 ELECTRO ORIENTE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051205	2
248	BBTI	PR-123-25 CONST ERRLA CHUCUYA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051206	2
249	BBTI	PR-124-25 BB TECN - PACASMAYO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051207	2
250	BBTI	PR-125-25 CONSORCIO DELTA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051208	2
251	BBTI	PR-126-25 CD INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051209	2
252	BBTI	PR-127-25 MACOGESAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051210	2
253	BBTI	PR-128-25 DATEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051211	2
254	BBTI	PR-129-25 BB TEC - PACASMAYO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051212	2
255	BBTI	PR-130-25 INFRAESTRUCTURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051213	2
256	BBTI	PR-131-25 BBTECNOLOGIA - ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051214	2
257	BBTI	PR-132-25 BBTECNOLOGIA- CONDOR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051215	2
258	BBTI	PR-133-25 BBTECNOLOGIA - ATOCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051216	2
259	BBTI	PR-134-25 BB TEXTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051217	2
260	BBTI	PR-135-25 CIEEC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051218	2
261	BBTI	PR-136-25 DATEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051219	2
262	BBTI	PR-137-25 HIDRANDINA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051220	2
263	BBTI	PR-138-25 CIMA ENERGY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051221	2
264	BBTI	PR 139-25 CONSORCIO SAN JOSE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051222	2
265	BBTI	PR-140-25 ICG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051223	2
266	BBTI	PR-141-25 ELECTROENCHUFE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051224	2
267	BBTI	PR-142-25 CONSORCIO HUANCAV	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051225	2
268	BBTI	PR-143-25 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051226	2
269	BBTI	PR-144-25 INFRAESTRUCTURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051227	2
270	BBTI	PR-145-25 MEE ELECTRICAL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051228	2
271	BBTI	PR-146-25 ICG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051229	2
272	BBTI	PR-147-25 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051230	2
273	BBTI	PR-148-25 MYC INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051231	2
274	BBTI	PR-149-25 CIMA ENERGY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051232	2
275	BBTI	PR-001-26 CONSORCIO HUANC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051233	2
276	BBTI	PR-002-26 INFRAESTRUCTURAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051234	2
277	BBTI	PR-003-26 CONSORCIO PUTUMAYO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051235	2
278	BBTI	PR-004-26 CONSORCIO DELTA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051236	2
279	BBTI	PR-005-26 C. CARRETERA CUSCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051237	2
280	BBTI	PR-006-26 ELECTROENCHUFE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051238	2
281	BBTI	PR-007-26 IDEMACOM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051239	2
282	BBTI	PR-008-26 CONSORCIO CANAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051240	2
283	BBTI	PR-009-26 BB TECNOLOGIA - ATOC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051241	2
284	BBTI	PR-010-26 BB TECNOLOGIA - ATO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051242	2
285	BBTI	PR-011-26 TECNICA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051243	2
286	BBTI	PR-012-26 TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051244	2
287	BBTI	PR-013-26 ELECTROENCHUFE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051245	2
288	BBTI	PR-014-26 BB TECNOLOGIA - ATO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051246	2
289	BBTI	PR-015-26 CONSORCIO HUANC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051247	2
290	BBTI	PR-016-26 CONSORCIO TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051248	2
291	BBTI	PR-017-26 MEE ELECTRICAL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051249	2
292	BBTI	PR-018-26 UNIV PIURA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051250	2
293	BBTI	PR-019-26 AYM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051251	2
294	BBTI	PR-020-26 SAN JOSE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051252	2
295	BBTI	PR-021-26 BB TECNOLOGIA ATOC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051253	2
296	BBTI	PR-022-26 BBTI SAC-SOFTYS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051254	2
297	BBTI	PR-023-26 CONSORCIO SUR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051255	2
298	BBTI	PR-024-26 CONSORCIO HUANCAVELI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051256	2
299	BBTI	PR-025-26 CONSORCIO PACIFICO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051257	2
300	BBTI	PR-026-26 CONSORCIO ILUMINACIO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051258	2
301	BBTI	PR-027-26 BB TECNOLOGIA ATO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051259	2
302	BBTI	PR-028-26 MYC INGENIEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051260	2
303	BBTI	PR-029-26 BBTI SAC -CONDORCOCH	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051261	2
304	BBTI	PR-150-25 CONSORCIO UNION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051262	2
305	BBTI	PR-151-25 WHD - DATEM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051263	2
306	BBTI	PR-030-26 CORDEX	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051264	2
307	BBTI	PR-031-26 CONSORCIO HUANCAVELI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051265	2
308	BBTI	PR-032-26 CONSORCIO KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051266	2
309	BBTI	PR-033-26 CONSTRUCTORA SAGITAR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051267	2
310	BBTI	PR-034-26 CONSTRUCTORA SAGITAR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051268	2
311	BBTI	PR-035-26 BB TECNOLOGIA ATOCON	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051269	2
312	BBTI	PR-036-26 CIMA ENERGY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051270	2
313	BBTI	PR-037-26 CORPEX SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051271	2
314	BBTI	PR-038-26 C. ILUMINACIO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051272	2
315	BBTI	PR-039-26 C. HUANCAVELI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051273	2
316	BBTI	PR-040-26 VENTAS Y SERV	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051274	2
317	BBTI	PR-041-26 C. ILUMINACIO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051275	2
318	BBTI	PR-042-26 CONSORCIO DAT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051276	2
319	BBTI	PR-043-26 JCCJ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051277	2
320	BBTI	PR-044-26 STN PROJECT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051278	2
321	BBTI	PR-045-26 C. HUANCAVELI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051279	2
322	BBTI	PR-046-26 C. HUANCAVELI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051280	2
323	BBTI	PR-047-26 C. CIMA ENERG	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051281	2
324	BBTI	PR-048-26 CONSORCIO PASCO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051282	2
325	BBTI	PR-049-26 C. HUANCAVELICA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051283	2
326	BBTI	PR-050-26 V Y P	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051284	2
327	BBTI	PR-051-26 MACOGESAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051285	2
328	BBTI	PR-052-26 CMEJIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051286	2
329	BBTI	PR-053-26 CONSORCIO HUA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051287	2
330	BBTI	PR-054-26 CONSORCIO ASC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051288	2
331	BBTI	PR-055-26 MYC INGENIERO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051289	2
332	BBTI	PR-056-26 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051290	2
333	BBTI	PR-057-26 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051291	2
334	BBTI	PR-058-26 ICELER	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051292	2
335	BBTI	PR-059-26 C.I. TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051293	2
336	BBTI	PR-060-26 BBTI SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051294	2
337	BBTI	PR-061-26 GEPELSA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051295	2
338	BBTI	PR-062-26 CONSORCIO ANDOAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051296	2
339	BBTI	PR-063-26 CEA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051297	2
340	BBTI	PR-064-26 BBTI SAC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051298	2
341	BBTI	PR-065-26 CONSORCIO HUA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051299	2
342	BBTI	PR-066-26 CONSORCIO KIM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051300	2
343	BBTI	PR-067-26 BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051301	2
344	BBTI	PR-068-26 CONSORCIO ILU	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051302	2
345	BBTI	PR-069-26 CMMEI DEL SUR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051303	2
346	BBTI	PR-070-26 CONSORCIO FOT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051304	2
347	BBTI	PR-071-26 CONSORCIO ATA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051305	2
348	BBTI	PR-072-26 CIEEC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051306	2
349	BBTI	PR-073-26 CORPORACION CIE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051307	2
350	BBTI	PR-074-26 BUSINESS INTERNAT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051308	2
351	BBTI	PR-075-26 CONSORCIO UNION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051309	2
352	BBTI	PR-076-26 STN	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051310	2
353	BBTI	PR-077-26 BBTI -CONDORCOCHA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051311	2
354	BBTI	PR-078-26 INGENI OBRAS Y SS.EE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	051312	2
355	BBTI	OBRAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	06	2
356	BBTI	OBRAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0601	2
357	BBTI	OBRA CONSORCIO KIMBIRI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	060101	2
358	BBTI	OBRA CONSORCIO HUANCAVELICA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	060102	2
359	BBTI	OBRA CONSORCIO CIMA ENERGY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	060103	2
360	BBTI	CONSORCIO ILUMINACION TARMA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	060104	2
361	BBTI	CONSORCIO PUNO NORTE ESTUDIO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	060105	2
362	BBTI	INNOVACION Y DESARROLLO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	07	2
363	BBTI	INNOVACION Y DESARROLLO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0701	2
364	BBTI	PROYECTOS DE INNOVACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	070101	2
365	BBTI	ALQUILERES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	08	2
366	BBTI	ALQUILERES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	0801	2
367	BBTI	ALQUILER HUANCAVELICA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	080101	2
368	BBTI	ALQUILER BB TECNOLOGIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	080102	2
369	BBTI	CONSORCIO PUNO ESTUDIO DE OBRA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	10	2
370	BBTI	C. PUNO GASTOS FIJOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	1001	2
371	BBTI	C. PUNO PL  ADMINISTRATIVA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100101	2
372	BBTI	C. PUNO PL OPERATIVA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100102	2
373	BBTI	C. PUNO GASTOS VARIABLES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	1002	2
374	BBTI	C. PUNO ALQUILER LOCAL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100201	2
375	BBTI	C. PUNO ALQULER VEHICULOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100202	2
376	BBTI	C. PUNO MOVILIDAD	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100203	2
377	BBTI	C. PUNO COMBUSTIBLE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100204	2
378	BBTI	C. PUNO SEGUROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100205	2
379	BBTI	OTROS GASTOS - RD	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100206	2
380	BBTI	C. PUNO DEPRECIACON ACTIVO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100207	2
381	BBTI	C. PUNO- GASTOS ANTA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100208	2
382	BBTI	C. PUNO  ALOJAMIENTO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100209	2
383	BBTI	C. PUNO TRANSPORTE CARGA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100210	2
384	BBTI	C. PUNO SUMINISTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100211	2
385	BBTI	C. PUNO LICENCIAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100212	2
386	BBTI	C. PUNO ACTIVOS MENORES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100213	2
387	BBTI	C. PUNO UTILES DE OFICINA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100214	2
388	BBTI	C. PUNO EPPS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100215	2
389	BBTI	C. PUNO  ALIMENTACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100216	2
390	BBTI	CONSORCIO PUNO_ESPECIALISTAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	1003	2
391	BBTI	C. PUNO AMBIENTAL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100301	2
392	BBTI	C. PUNO ARQUEOLOGO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100302	2
393	BBTI	C. PUNO SERVIDUMBRE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100303	2
394	BBTI	C. PUNO INGENIERIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100304	2
395	BBTI	CONSORCIO PUNO - VENTAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	1004	2
396	BBTI	C. PUNO FACTURACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	100401	2
397	BBTI	PY 2246  GSA DEL HORNO 2 RAMAL	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	11	2
398	BBTI	COSTO DIRECTO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	1101	2
399	BBTI	CD-CANALIZACIONES .ADOSADAS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110101	2
400	BBTI	CD-CAB.FUE.MT.BT-INT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110102	2
401	BBTI	CD-EQUIPAMIENTO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110103	2
402	BBTI	CD-OTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110104	2
403	BBTI	CD-TABLEROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110105	2
404	BBTI	CD-INSTRUMENTOS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110106	2
405	BBTI	CD-SISTEMA PUESTA TIERRA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110107	2
406	BBTI	CD-ALUMBRADO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110108	2
407	BBTI	CD-CONSUMIDORES BT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110109	2
408	BBTI	CD-SUPERVISION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110110	2
409	BBTI	CD-MANO DIRECTA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110111	2
410	BBTI	GASTOS GENERALES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	1102	2
411	BBTI	GG-SEDE PLANILLA - MANO INDIRE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110201	2
412	BBTI	GG-OBRA PLANILLA -MANO INDIREC	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110202	2
413	BBTI	GG-SUBCONTRATO-INTERNET	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110203	2
414	BBTI	GG-SUBCONTRATO-ALQUILER OFICIN	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110204	2
415	BBTI	GG-SUBCONTRATO-ALQUILER DE BAÑ	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110205	2
416	BBTI	GG-SUBCONTRATO-LICENCIA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110206	2
417	BBTI	GG-SUBCONT-ALQUILER CAMIONETA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110207	2
418	BBTI	GG-SUBCONTRATO-FLETE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110208	2
419	BBTI	GG-SUBCONTRATO-ALIMENTACION	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110209	2
420	BBTI	GG-SUBCONTRATO-HOSPEDAJE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110210	2
421	BBTI	GG-SUBCONTRATO-MOVILIDAD	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110211	2
422	BBTI	GG-SUBCONTRATO-OTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110212	2
423	BBTI	GG-SST-EPPS COLECTIVA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110213	2
424	BBTI	GG-SST-EPPS ESPECIFICO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110214	2
425	BBTI	GG-SST-CAPACITACONES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110215	2
426	BBTI	GG-SST-EMO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110216	2
427	BBTI	GG-SST-OTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110217	2
428	BBTI	GG-FACILIDADES DE OBRA-COMPUTO	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110218	2
429	BBTI	GG-FACILIDADES DE OBRA-UTILES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110219	2
430	BBTI	GG-FACILIDADES DE OBRA-AGUA	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110220	2
431	BBTI	GG-FACILIDADES DE OBRA-MUEBLES	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110221	2
432	BBTI	GG-FACILIDADES DE OBRA-IMPRENT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110222	2
433	BBTI	GG-FACILIDADES DE OBRA-PEAJE	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110223	2
434	BBTI	GG-FACILIDADES DE OBRA-COMBUST	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110224	2
435	BBTI	GG-FACIL DE OBRA ARTICUL LIMPI	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110225	2
436	BBTI	GG-FACILIDADES DE OBRA-OTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110226	2
437	BBTI	GG-FINANCIEROS-CF FIEL CUMPLIM	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110227	2
438	BBTI	GG-FINANCIEROS-CF ADELANTO DIR	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110228	2
439	BBTI	GG-FINANCIEROS-CF FACTORING	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110229	2
440	BBTI	GG-FINANCIEROS-CF OTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110230	2
441	BBTI	GG-SEGUROS-SCRT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110231	2
442	BBTI	GG-SEGUROS-VIDA LEY	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110232	2
443	BBTI	GG-SEGUROS-SOAT	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110233	2
444	BBTI	GG-SEGUROS-OTROS	abierto	{}	2026-06-19 16:23:05.214662	2026-06-19 16:23:05.214662	110234	2
445	BBTEC	ADMINISTRACION	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0101	1
446	BBTEC	ADMINISTRACION	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	010101	1
447	BBTEC	DIFERENCIA DE CAMBIO	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	010102	1
448	BBTEC	GERENCIA GENERAL	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	010103	1
449	BBTEC	SISTEMAS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	010105	1
450	BBTEC	VENTAS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	02	1
451	BBTEC	VENTAS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0201	1
452	BBTEC	VENTAS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	020101	1
453	BBTEC	UNACEM LIMA VMT	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	03	1
454	BBTEC	UNACEM LIMA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0301	1
455	BBTEC	UNACEM LIMA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	030101	1
456	BBTEC	UNACEM LIMA - CHANCADORA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	030102	1
457	BBTEC	UNACEM LIMA - EDIF SUBESTACION	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	030103	1
458	BBTEC	UNACEM LIMA - MANTENIMIENTO 60	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	030104	1
459	BBTEC	UNACEM TARMA CONDORCOCHA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	04	1
460	BBTEC	UNACEM TARMA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0401	1
461	BBTEC	UNACEM TARMA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	040102	1
462	BBTEC	TARMA CHANCADORA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	040103	1
463	BBTEC	UNACEM TARMA Mant. UAA y presu	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	040104	1
464	BBTEC	CEMENTOS PACASMAYO	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	05	1
465	BBTEC	CEMENTOS PACASMAYO	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0501	1
466	BBTEC	CEMENTOS PACASMAYO - PACASMAYO	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	050101	1
467	BBTEC	CEMENTOS PACASMAYO - PIURA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	050102	1
468	BBTEC	CEMENTOS PACASMAYO CHANCADORA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	050103	1
469	BBTEC	CEMENTOS PACASMAYO - HANGAR	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	050104	1
471	BBTEC	PROYECTOS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0601	1
472	BBTEC	PROYECTOS POR DISTRIBUIR	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	060101	1
473	BBTEC	PROYECTOS MENORES	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	060102	1
474	BBTEC	MINA BORO	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	060103	1
475	BBTEC	CONSORCIO TACNA - MANT. Y EMER	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	060104	1
476	BBTEC	ENSA ARBIT	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	060105	1
477	BBTEC	OBRAS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	07	1
478	BBTEC	OBRAS	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0701	1
479	BBTEC	OBRA SAN RAMON - CAJARMARCA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	070101	1
480	BBTEC	OBRA CENTRO SALUD CAJAMARCA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	070102	1
481	BBTEC	YURA- AREQUIPA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	070103	1
482	BBTEC	OBRA HUANCAVELICA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	070104	1
483	BBTEC	ALQUILERES	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	08	1
484	BBTEC	ALQUILERES	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	0801	1
485	BBTEC	ALQUILERES KIMBIRI	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	080101	1
486	BBTEC	ALQUILER CIMA	abierto	{}	2026-06-19 16:25:09.524416	2026-06-19 16:25:09.524416	080102	1
487	HUANCA	ADMINISTRACION	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	01	5
488	HUANCA	ADMINISTRACION	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0101	5
489	HUANCA	GASTOS BB	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	010101	5
490	HUANCA	CORFID	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	010102	5
491	HUANCA	SECRETARIA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	010103	5
492	HUANCA	OFICINA ADMINISTRACION	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	010104	5
493	HUANCA	VIGILANCIA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	010105	5
494	HUANCA	GASTOS NO ACEPTADOS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	010199	5
495	HUANCA	MONTAJE DE OBRA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	02	5
496	HUANCA	MONTAJE DE OBRA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0201	5
497	HUANCA	MONTAJE PERSONAL PROPIO	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020101	5
498	HUANCA	MONTAJE TERCEROS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020102	5
499	HUANCA	ALQUILER INMUEBLES	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020103	5
500	HUANCA	ALQUILER MAQUINARIA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020104	5
501	HUANCA	ALQUILER VEHICULOS CARGA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020105	5
502	HUANCA	SEGURIDAD-EPPS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020106	5
503	HUANCA	EQUIPOS Y HERRAMIENTAS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020107	5
504	HUANCA	INSUMOS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020108	5
505	HUANCA	(RD) MOVILIDAD Y TRANSP VARIOS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020109	5
506	HUANCA	(RD) ALIMENTACION	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020110	5
507	HUANCA	(RD) HOSPEDAJE	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020111	5
508	HUANCA	(RD) COMPRAS MENORES OBRA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020112	5
509	HUANCA	COMBUSTIBLE	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020113	5
510	HUANCA	SEGUROS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020114	5
511	HUANCA	SERVIDUMBRE	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020115	5
512	HUANCA	DESBROCE	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020116	5
513	HUANCA	OTROS SERVICIOS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020117	5
514	HUANCA	ARQUEOLOGO	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020118	5
515	HUANCA	AMBIENTAL	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020119	5
516	HUANCA	GASTOS NO ACEPTADOS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	020199	5
517	HUANCA	SUMINISTRO DE MATERIALES	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	05	5
518	HUANCA	SUMINISTRO DE MATERIALES	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0501	5
519	HUANCA	LP	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050101	5
520	HUANCA	RP	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050102	5
521	HUANCA	RS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050103	5
522	HUANCA	FOTOVOLTAICO	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050104	5
523	HUANCA	OTROS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050105	5
524	HUANCA	RLP	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050106	5
525	HUANCA	SFV	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	050107	5
526	HUANCA	TRANSPORTE DE MATERIALES	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	06	5
527	HUANCA	TRANSPORTE DE MATERIALES	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0601	5
528	HUANCA	TRANSPORTE DE CARGA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	060101	5
529	HUANCA	OTROS GASTOS DE OBRA GG	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	07	5
530	HUANCA	OTROS GASTOS DE OBRA GG	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0701	5
531	HUANCA	G. FINANCIEROS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	070101	5
532	HUANCA	G. ADMINISTRATIVO PL	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	070102	5
533	HUANCA	G. ADMINISTRATIVO RH	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	070103	5
534	HUANCA	CORFID	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	070104	5
535	HUANCA	KREDERE	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	070105	5
536	HUANCA	OTROS GASTOS DE OBRA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	070106	5
537	HUANCA	MAT OTROS ANC	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	08	5
538	HUANCA	MAT OTROS ANC	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0801	5
539	HUANCA	MAT OTROS ANC	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	080101	5
540	HUANCA	VENTAS	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	09	5
541	HUANCA	VENTAS - CH	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	0901	5
542	HUANCA	ADELANTO DIRECTO	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	090101	5
543	HUANCA	ADELANTO MATERIALES	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	090102	5
544	HUANCA	VAL ESTUDIO	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	090103	5
545	HUANCA	VAL OBRA	abierto	{}	2026-06-19 16:26:02.712473	2026-06-19 16:26:02.712473	090104	5
546	TARMA	TRABAJOS PRELIMINARES (TP)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0501	4
547	TARMA	TP-CARTEL	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	050101	4
548	TARMA	TP-PAMA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	050102	4
549	TARMA	TP-PMA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	050103	4
550	TARMA	TP-LIMPIEZA-TRAZO y REPLANTEO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	050104	4
551	TARMA	OBRAS CIVILES	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	06	4
552	TARMA	OBRAS CIVILES (OC)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0601	4
553	TARMA	OC-CT	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	060101	4
554	TARMA	OC-BUZONES	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	060102	4
555	TARMA	OC-CANAL SUB	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	060103	4
556	TARMA	OC-D-R-D-R	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	060104	4
557	TARMA	OC-TANQ	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	060105	4
558	TARMA	OC-SE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	060106	4
559	TARMA	OBRAS ELECTROMECANICAS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	07	4
560	TARMA	OE SUBESTACIÓN	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0701	4
561	TARMA	OE-SE-TABLEROS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070101	4
562	TARMA	OE-SE-SPAT	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070102	4
563	TARMA	OE-SE-EQUIPOS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070103	4
564	TARMA	OE-SE-COND FZA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070104	4
565	TARMA	OE SISTEMA DE ILUMINACION PRIN	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0702	4
566	TARMA	OE-SIC-COND FZA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070201	4
567	TARMA	OE-SIC-CANAL ELECTRICAS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070202	4
568	TARMA	OE-SIC-TABLEROS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070203	4
569	TARMA	OE-SIC-LUM-1800W	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070204	4
570	TARMA	OE-SIC-SPAT-TORRES	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070205	4
571	TARMA	OE SISTEMA DE CONTROL	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0703	4
572	TARMA	OE-SC-COND CONTROL	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070301	4
573	TARMA	OE-SC-COND FZA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070302	4
574	TARMA	OE-SC-TABLERO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070303	4
575	TARMA	OE ESTRUCTURAS METÁLICAS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0704	4
576	TARMA	OE-E-TORRES	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070401	4
577	TARMA	OE SISTEMA DE ILUMINACIÓN	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0705	4
578	TARMA	OE-SE-CON FZA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070501	4
579	TARMA	OE-SIC-LUM-300W	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	070502	4
580	TARMA	PRUEBAS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	08	4
581	TARMA	PRUEBAS (PRB)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0801	4
582	TARMA	PRB-LUMINARIAS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	080101	4
583	TARMA	MEDIA TENSION	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	09	4
584	TARMA	MEDIA TENSION (MT)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	0901	4
585	TARMA	MT-OC	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	090101	4
586	TARMA	MT-OE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	090102	4
587	TARMA	TRANSPORTE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	10	4
588	TARMA	TRANSPORTE (T)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1001	4
589	TARMA	T-OC	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	100101	4
590	TARMA	T-OE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	100102	4
591	TARMA	PLANILLA OBREROS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	11	4
592	TARMA	PLANILLA DE OBREROS (PLO)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1101	4
593	TARMA	PLO-OC	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	110101	4
594	TARMA	PLO-OE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	110102	4
595	TARMA	GASTOS GENERALES	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	12	4
596	TARMA	GG-PLANILLA (GG-PL)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1201	4
597	TARMA	GG-PL-PLANILLA STAFF	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120101	4
598	TARMA	GG-SUBCONTRATO (GG-S)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1202	4
599	TARMA	GG-S-ALIMENTACION	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120201	4
600	TARMA	GG-S-ALQUILER OFICINAS/VESTUAR	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120202	4
601	TARMA	GG-S-HOSPEDAJE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120203	4
602	TARMA	GG-S-ALQUILER DE BAÑOS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120204	4
603	TARMA	GG-GESTION DE SEGURIDAD EN EL	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1203	4
604	TARMA	GG-SST-EMO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120301	4
605	TARMA	GG-SST-ENFERMERA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120302	4
606	TARMA	GG-SST-EPPS INDIVIDUAL	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120303	4
607	TARMA	GG-SST-EPPS COLECTIVO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120304	4
608	TARMA	GG-SST-CAPACITACION DE SST	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120305	4
609	TARMA	GG-SST-OTROS -SST	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120306	4
610	TARMA	GG-ALQUILER HERRAMIENTAS-CAMIO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1204	4
611	TARMA	GG-AH ALQ HERRAM	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120401	4
612	TARMA	GG-AH-ALQ CAMION	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120402	4
613	TARMA	GG-SEGUROS (S)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1205	4
614	TARMA	GG-S-SCRT	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120501	4
615	TARMA	GG-S-VL	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120502	4
616	TARMA	GG-S-OTROS	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120503	4
617	TARMA	GG-FACILIDADES DE OBRA (FO)	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	1206	4
618	TARMA	GG-FO-COMBUSTIBLE	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120601	4
619	TARMA	GG-FO-EQUIPO COMPUTO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120602	4
620	TARMA	GG-FO-MUEBLES	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120603	4
621	TARMA	GG-FO-UTILES DE LIMPIEZA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120604	4
622	TARMA	GG-FO-UTILES DE OFICINA	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120605	4
623	TARMA	GG-FO-OTRAS-FO	abierto	{}	2026-06-19 16:26:26.806701	2026-06-19 16:26:26.806701	120606	4
624	CIMA	MONTAJE DE OBRA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	02	3
625	CIMA	MONTAJE DE OBRA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0201	3
626	CIMA	MONTAJE PERSONAL PROPIO	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020101	3
627	CIMA	MONTAJE TERCEROS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020102	3
628	CIMA	ALQUILER INMUEBLES	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020103	3
629	CIMA	ALQUILER MAQUINARIA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020104	3
630	CIMA	ALQUILER VEHICULOS CARGA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020105	3
631	CIMA	SEGURIDAD-EPPS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020106	3
632	CIMA	EQUIPOS Y HERRAMIENTAS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020107	3
633	CIMA	INSUMOS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020108	3
634	CIMA	(RD) MOVILIDAD Y TRANSP VARIOS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020109	3
635	CIMA	(RD) ALIMENTACION	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020110	3
636	CIMA	(RD) HOSPEDAJE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020111	3
637	CIMA	(RD) COMPRAS MENORES OBRA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020112	3
638	CIMA	COMBUSTIBLE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020113	3
639	CIMA	SEGUROS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020114	3
640	CIMA	SERVIDUMBRE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020115	3
641	CIMA	DESBROCE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020116	3
642	CIMA	OTROS SERVICIOS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020117	3
643	CIMA	GASTOS NO ACEPTADOS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	020199	3
644	CIMA	REPLANTEO OBRA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	03	3
645	CIMA	GASTOS FIJOS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0301	3
646	CIMA	PL ADMINISTRATIVA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030101	3
647	CIMA	PL OPERATIVA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030102	3
648	CIMA	PL REPLANTEO	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030103	3
649	CIMA	GASTOS VARIABLES	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0302	3
650	CIMA	ALQUILER LOCAL	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030201	3
651	CIMA	ALQUILER VEHICULOS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030202	3
652	CIMA	MOVILIDAD	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030203	3
653	CIMA	COMBUSTIBLE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030204	3
654	CIMA	SEGUROS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030205	3
655	CIMA	OTR GASTOS-RD C CHIC	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	030206	3
656	CIMA	ESPECIALISTA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	04	3
657	CIMA	ESPECIALISTAS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0401	3
658	CIMA	AMBIENTAL	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	040101	3
659	CIMA	ARQUEOLOGO	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	040102	3
660	CIMA	SERVIDUMBRE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	040103	3
661	CIMA	INGENIERIA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	040104	3
662	CIMA	SUMINISTRO DE MATERIALES	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	05	3
663	CIMA	SUMINISTRO DE MATERIALES	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0501	3
664	CIMA	LP	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	050101	3
665	CIMA	RP	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	050102	3
666	CIMA	RS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	050103	3
667	CIMA	FOTOVOLTAICO	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	050104	3
668	CIMA	OTROS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	050105	3
669	CIMA	TRANSPORTE DE MATERIALES	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	06	3
670	CIMA	TRANSPORTE DE MATERIALES	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0601	3
671	CIMA	TRANSPORTE DE CARGA	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	060101	3
672	CIMA	OTROS GASTOS DE OBRA GG	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	07	3
673	CIMA	OTROS GASTOS DE OBRA GG	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0701	3
674	CIMA	G. FINANCIEROS	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	070101	3
675	CIMA	G. ADMINISTRATIVO PL	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	070102	3
676	CIMA	G. ADMINISTRATIVO RH	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	070103	3
677	CIMA	CORFID	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	070104	3
678	CIMA	KREDERE	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	070105	3
679	CIMA	MAT OTROS ANC	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	08	3
680	CIMA	MAT OTROS ANC	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	0801	3
681	CIMA	MAT OTROS ANC	abierto	{}	2026-06-19 16:44:29.121054	2026-06-19 16:44:29.121054	080101	3
\.


--
-- Data for Name: grupo_documentos; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.grupo_documentos (id, grupo_id, documento_id, tipo_relacion, creado_en) FROM stdin;
\.


--
-- Data for Name: grupos_documentales; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.grupos_documentales (id, cliente_destino_id, asiento_contable, clave_grupo, tipo_grupo, orden_compra, estado, creado_en, actualizado_en, asiento_id, cliente_abreviatura, anio, mes, orden_servicio, area_origen, origen_grupo, metadata, origen_migracion) FROM stdin;
\.


--
-- Data for Name: ocr_resultados; Type: TABLE DATA; Schema: documentos; Owner: postgres
--

COPY documentos.ocr_resultados (id, archivo_id, documento_id, tipo_propuesto, estado, confidence, clave_documental, metadata, creado_en, validado_en, validado_por, vinculado_en, expediente_id) FROM stdin;
1	1	1	FACTURA	pendiente_validacion	0.99	CIMA|FACTURA|20123456789|F001|000001|SPRINT_1_3D_LOCAL	{"metadata": {"serie": "F001", "moneda": "PEN", "numero": "000001", "proveedor": "PROVEEDOR PRUEBA LOCAL S.A.C.", "montoTotal": 100.00, "fechaEmision": "2026-07-06", "rucProveedor": "20123456789", "codigoExpediente": "080101", "clienteAbreviatura": "CIMA"}, "origenPrueba": "SPRINT_1_3D_LOCAL", "puedeEliminarse": true}	2026-07-06 16:24:57.411958	\N	\N	\N	\N
2	2	4	FACTURA	rechazado	0.99	BBTI|FACTURA|20111111111|F002|000001|SPRINT_1_3D_LOCAL	{"estado": "rechazado", "rechazo": {"fecha": "2026-07-06T19:49:03.772911+00:00", "motivo": "Prueba local Sprint 1.3D"}, "metadata": {"serie": "F002", "moneda": "PEN", "numero": "000001", "proveedor": "PROVEEDOR BBTI PRUEBA LOCAL S.A.C.", "montoTotal": 100.00, "fechaEmision": "2026-07-06", "rucProveedor": "20111111111", "clienteAbreviatura": "BBTI"}, "origenSprint": "SPRINT_1_3D", "puedeEliminarse": true, "clienteAbreviatura": "BBTI"}	2026-07-06 19:28:18.702738	2026-07-06 19:49:03.772911	\N	\N	\N
3	3	5	FACTURA	confirmado	0.98	BBTI|FACTURA|20222222222|F003|000001|SPRINT_1_3D_CONFIRMAR	{"estado": "confirmado", "metadata": {"serie": "F003", "moneda": "PEN", "numero": "000001", "proveedor": "PROVEEDOR BBTI CONFIRMACION LOCAL S.A.C.", "montoTotal": 200.00, "fechaEmision": "2026-07-06", "rucProveedor": "20222222222", "clienteAbreviatura": "BBTI"}, "origenSprint": "SPRINT_1_3D", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20222222222|F003|000001|SPRINT_1_3D_CONFIRMAR", "puedeEliminarse": true, "clienteAbreviatura": "BBTI"}	2026-07-06 19:52:36.128192	2026-07-06 19:53:09.996318	\N	\N	\N
4	5	7	OC	confirmado	1.00	BBTI|OC|007950	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T20:27:23.976Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"moneda": "DOLARES AMERICANOS", "numero": "007950", "proveedor": "CORPORACION ACEROS AREQUIPA S.A.", "cotizacion": "AA510317037-1", "montoTotal": "4181.92", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20370146994", "tipoDocumental": "OC", "claveDocumental": "BBTI|OC|007950", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "41", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}}, "expedienteId": 41, "tipoRelacion": "principal_oc", "tipoPropuesto": "OC"}, "usuarioId": null, "observacion": "Guardar y confirmar principal desde Compras > Nuevo"}], "texto": {"length": 4049, "preview": "SEÑOR(ES) : CORPORACION ACEROS AREQUIPA S.A.\\n23/04/2026\\nFECHA :\\nOrden de Compra Nº:007950\\nBBTI S.A.C.\\nCAL.6 MZA. D LOTE. 13 URB. INDUSTRIAL GRIMAN (ALT. DE LIMA CARGO \\nCITY) PROV. CONST. DEL CALLAO - PROV. CONST. DEL CALLAO - CALLAO\\n20565747356\\nR.U.C.  :\\nTELEFONO :\\nATENCIÓN :\\n20370146994\\nCAR. PANAMERICANA SUR NRO. 241 ---- PANAMERICANA SUR ICA - PISCO - PARACAS\\nCONDICION DE PAGO : FACTURA NEGOCIABLE 60 DÍAS\\nCALLE 6 MZ D LOTE 13 URB. GRIMANEZA CALLAO CALLAO\\nLUGAR DE ENTREGA :\\nDIRECCIÓN :\\nMONEDA :"}, "estado": "confirmado", "archivo": {"filename": "edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "resolvedPath": "storage/tmp/edfc1ab7-3e57-4c03-b3b8-e8c60e1c4ef7__OC_007950.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"moneda": "DOLARES AMERICANOS", "numero": "007950", "proveedor": "CORPORACION ACEROS AREQUIPA S.A.", "cotizacion": "AA510317037-1", "montoTotal": "4181.92", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20370146994", "tipoDocumental": "OC", "claveDocumental": "BBTI|OC|007950", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "41", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}}, "archivoId": 5, "duplicado": null, "confidence": 1, "documentoId": 7, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 41, "tipoEsperado": "OC", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "principal_oc"}, "tipoPropuesto": "OC", "metadataSource": {"moneda": "MANUAL", "numero": "MANUAL", "proveedor": "MANUAL", "cotizacion": "MANUAL", "montoTotal": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "OC", "camposFaltantes": [], "claveDocumental": "BBTI|OC|007950", "camposDetectados": ["numero", "fechaEmision", "montoTotal", "proveedor", "rucProveedor", "rucComprador", "moneda", "cotizacion", "codigoExpediente"], "vinculoExpediente": {"orden": 1, "documentoId": 7, "esPrincipal": true, "vinculadoEn": "2026-07-06T20:27:23.988Z", "expedienteId": 41, "tipoRelacion": "principal_oc", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": 41, "confirmadoDesde": "compras_nuevo", "codigoExpediente": "050201", "tipoRelacionSugerida": "principal_oc"}}	2026-07-06 20:21:50.983407	2026-07-06 20:27:23.968032	\N	2026-07-06 20:27:23.968032	41
5	6	8	FACTURA	pendiente_validacion	0.00	\N	{"ok": true, "qr": null, "texto": {"length": 3, "preview": "==>"}, "estado": "requiere_revision", "archivo": {"filename": "00cfc8ed-ae62-4f12-9362-b29dfc086774__factura_scaneada_1.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/00cfc8ed-ae62-4f12-9362-b29dfc086774__factura_scaneada_1.pdf", "resolvedPath": "storage/tmp/00cfc8ed-ae62-4f12-9362-b29dfc086774__factura_scaneada_1.pdf", "storageProvider": "r2"}, "mensaje": "PDF escaneado sin texto digital y sin QR legible. Requiere revisión manual o reescaneo con mejor calidad.", "metadata": {"ruc": null, "serie": null, "numero": null, "montoTotal": null, "fechaEmision": null}, "archivoId": 6, "duplicado": null, "confidence": 0, "documentoId": 8, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "FACTURA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_factura"}, "metadataSource": {"ruc": null, "serie": null, "numero": null, "montoTotal": null, "fechaEmision": null}, "tipoDocumental": "FACTURA", "camposFaltantes": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"], "claveDocumental": null, "camposDetectados": [], "clienteAbreviatura": "BBTI"}	2026-07-06 20:36:42.350579	\N	\N	\N	\N
6	7	9	FACTURA	confirmado	1.00	BBTI|FACTURA|20516403650|F011|00001135	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T20:46:30.217Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20516403650", "serie": "F011", "moneda": "SOLES", "numero": "00001135", "proveedor": "CORPORACION COMATPE SAC", "rucEmisor": "20516403650", "montoTotal": "40", "razonSocial": "CORPORACION COMATPE SAC", "fechaEmision": "2026-05-04", "rucComprador": "20565747356", "rucProveedor": "20516403650", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CORPORACION COMATPE SAC", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "AV. GERARDO UNGER NRO. 5385 UR", "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 41, "tipoRelacion": "adjunto_factura", "tipoPropuesto": "FACTURA"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 1979, "preview": "CORPORACIÓN COMATPE\\nS.A.C.\\nR.U.C .: 20516403650\\nFACTURA ELECTRÓNICA\\nF011- 00001135\\nOFICINA PRINCIPAL:\\nAv. Gerardo  Unger N° 5385 - Los Olivos\\nSEDE ATE VITARTE\\n- Mz.R Lote 9 Parque Industrial El asesor Ate\\n- Lima este: (01) 355-4815 / 983476 386\\n- ventas_este@grupocomatpe.com\\nSERVICIO AL CLIENTE\\n(01) 528-9488 / (01) 637-2834\\nventas@grupocomatpe.com\\nSEDE VILLA EL SALVADOR\\n- OTR.SECTOR 8 PUEBLO JOVEN MUNICIPAL\\nMZA. C LOTE. 04 (PARQUE INDUSTRIAL V.E.S.)\\n- Lima Sur. (01) 259-2208 / 998100530\\nventas_s"}, "estado": "confirmado", "archivo": {"filename": "69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "resolvedPath": "storage/tmp/69366e0d-94e6-4a20-9b70-3816cdb5cd2b__factura_comatpe.PDF", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20516403650", "serie": "F011", "moneda": "SOLES", "numero": "00001135", "proveedor": "CORPORACION COMATPE SAC", "rucEmisor": "20516403650", "montoTotal": "40", "razonSocial": "CORPORACION COMATPE SAC", "fechaEmision": "2026-05-04", "rucComprador": "20565747356", "rucProveedor": "20516403650", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CORPORACION COMATPE SAC", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "AV. GERARDO UNGER NRO. 5385 UR", "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 7, "duplicado": null, "confidence": 1, "documentoId": 9, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "FACTURA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_factura"}, "tipoPropuesto": "FACTURA", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "montoTotal": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "FACTURA", "camposFaltantes": [], "claveDocumental": "BBTI|FACTURA|20516403650|F011|00001135", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"], "vinculoExpediente": {"orden": 10, "documentoId": 9, "esPrincipal": false, "vinculadoEn": "2026-07-06T20:46:30.230Z", "expedienteId": 41, "tipoRelacion": "adjunto_factura", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_factura"}}	2026-07-06 20:39:29.007753	2026-07-06 20:46:30.204732	\N	2026-07-06 20:46:30.204732	41
7	8	10	GUIA_REMISION	pendiente_validacion	0.50	\N	{"ok": true, "qr": null, "texto": {"length": 604, "preview": "1\\nPag.\\nBBTI SAC\\nFecha :23/04/2026\\nHora    18:09:22\\nNOTA DE INGRESO\\nI\\nALMACEN         \\nTRANSACCION\\nFECHA DOC\\nPROVEEDOR\\nCLIENTE\\nAUTORIZADO\\nORD. COMPRA  \\nNro. DOC. REF.\\nCENTRO DE COSTO\\nMONEDA\\nALMACEN PRINCIPAL\\n26/02/2026\\n20602599702\\nCORPORACION CIE E.I.R.L.\\n0000000000006\\nGC 0012292\\n0000000031\\nCL COMPRAS PRODUCTOS NACIONALES\\nMN\\nCOMENTARIO\\nINV043\\nT.C.\\n 3.363\\nCODIGO\\nDESCRIPCION\\nUND SERIE\\\\LOTE\\nCANT.\\nITEM\\nCOSTO UNIT.\\nTOTAL\\nC.COSTO\\nORD. \\n28.000000  23,772.00\\n 1\\n240302\\nEspiga de AºGº para Cruceta y Aislad"}, "estado": "requiere_revision", "archivo": {"filename": "5d285217-6164-447c-b9e9-42c2c47c1a93__nota_i_31_bbti.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/5d285217-6164-447c-b9e9-42c2c47c1a93__nota_i_31_bbti.pdf", "resolvedPath": "storage/tmp/5d285217-6164-447c-b9e9-42c2c47c1a93__nota_i_31_bbti.pdf", "storageProvider": "r2"}, "mensaje": "Documento requiere revisión manual por metadata incompleta o clave documental no generable.", "metadata": {"ruc": "20602599702", "serie": null, "numero": null, "fechaEmision": "2026-04-23"}, "archivoId": 8, "duplicado": null, "confidence": 0.5, "documentoId": 10, "contextoCarga": {"areaOrigen": "ALMACEN", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "metadataSource": {"ruc": "TEXT", "serie": null, "numero": null, "fechaEmision": "TEXT"}, "tipoDocumental": "GUIA_REMISION", "camposFaltantes": ["serie", "numero"], "claveDocumental": null, "camposDetectados": ["ruc", "fechaEmision"], "clienteAbreviatura": "BBTI"}	2026-07-06 20:57:17.373796	\N	\N	\N	\N
8	9	11	NOTA_INGRESO	confirmado	0.50	BBTI|NOTA_INGRESO|0000000031	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:03:02.352Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20602599702", "serie": null, "numero": "0000000031", "rucEmisor": "20602599702", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20602599702", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "expedienteId": 41, "tipoRelacion": "adjunto_nota_ingreso", "tipoPropuesto": "NOTA_INGRESO"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 604, "preview": "1\\nPag.\\nBBTI SAC\\nFecha :23/04/2026\\nHora    18:09:22\\nNOTA DE INGRESO\\nI\\nALMACEN         \\nTRANSACCION\\nFECHA DOC\\nPROVEEDOR\\nCLIENTE\\nAUTORIZADO\\nORD. COMPRA  \\nNro. DOC. REF.\\nCENTRO DE COSTO\\nMONEDA\\nALMACEN PRINCIPAL\\n26/02/2026\\n20602599702\\nCORPORACION CIE E.I.R.L.\\n0000000000006\\nGC 0012292\\n0000000031\\nCL COMPRAS PRODUCTOS NACIONALES\\nMN\\nCOMENTARIO\\nINV043\\nT.C.\\n 3.363\\nCODIGO\\nDESCRIPCION\\nUND SERIE\\\\LOTE\\nCANT.\\nITEM\\nCOSTO UNIT.\\nTOTAL\\nC.COSTO\\nORD. \\n28.000000  23,772.00\\n 1\\n240302\\nEspiga de AºGº para Cruceta y Aislad"}, "estado": "confirmado", "archivo": {"filename": "c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "resolvedPath": "storage/tmp/c696d972-5d6e-46b1-b950-5cfc9659aed5__nota_i_31_bbti.pdf", "storageProvider": "r2"}, "mensaje": "Documento requiere revisión manual por metadata incompleta o clave documental no generable.", "metadata": {"ruc": "20602599702", "serie": null, "numero": "0000000031", "rucEmisor": "20602599702", "fechaEmision": "2026-04-23", "rucComprador": "20565747356", "rucProveedor": "20602599702", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "codigoExpediente": "050201", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "archivoId": 9, "duplicado": null, "confidence": 0.5, "documentoId": 11, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "tipoPropuesto": "NOTA_INGRESO", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "numero": "MANUAL", "rucEmisor": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "NOTA_INGRESO", "camposFaltantes": ["serie", "numero"], "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "camposDetectados": ["ruc", "fechaEmision"], "vinculoExpediente": {"orden": 10, "documentoId": 11, "esPrincipal": false, "vinculadoEn": "2026-07-06T21:03:02.360Z", "expedienteId": 41, "tipoRelacion": "adjunto_nota_ingreso", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}	2026-07-06 21:01:21.451714	2026-07-06 21:03:02.347241	\N	2026-07-06 21:03:02.347241	41
9	10	12	GUIA_REMISION	confirmado	1.00	BBTI|GUIA_REMISION|20612122416|EG07|00000165	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:05:32.445Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000165", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-20", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 41, "tipoRelacion": "adjunto_guia", "tipoPropuesto": "GUIA_REMISION"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 1692, "preview": "RUC N°20612122416\\nGUÍA DE REMISIÓN ELECTRÓNICA\\nREMITENTE\\nN° EG07 - 00000165\\nCONSORCIO HUANCAVELICA\\n20/04/2026 11:24 AM\\nMotivo de Traslado :OTROS\\nJR 28 DE JULIO MZ F1 LT9 - PAUCARA - ACOBAMBA -\\nHUANCAVELICA\\nCALLE SEIS MZ D LOT 13 URB IND. GRIMANEZA - CALLAO -\\nPROV. CONST. DEL CALLAO - PROV. CONST. DEL CALLAO\\nPunto de llegada\\nPunto de Partida\\nDatos del Destinatario :CONSORCIO HUANCAVELICA - REGISTRO ÚNICO DE CONTRIBUYENTES N° 20612122416\\nFecha de entrega de Bienes al  transportista:20/04/2026\\nDesc"}, "estado": "confirmado", "archivo": {"filename": "658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "resolvedPath": "storage/tmp/658ca56f-1f29-4c23-8a3c-9d36c86d31a0__guia_3_2.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000165", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-20", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "050201", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 10, "duplicado": null, "confidence": 1, "documentoId": 12, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "tipoPropuesto": "GUIA_REMISION", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "GUIA_REMISION", "camposFaltantes": [], "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000165", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision"], "vinculoExpediente": {"orden": 10, "documentoId": 12, "esPrincipal": false, "vinculadoEn": "2026-07-06T21:05:32.450Z", "expedienteId": 41, "tipoRelacion": "adjunto_guia", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "compras_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_guia"}}	2026-07-06 21:03:36.433655	2026-07-06 21:05:32.436923	\N	2026-07-06 21:05:32.436923	41
10	11	13	PAGO_TRANSFERENCIA	confirmado	1.00	BBTI|PAGO_TRANSFERENCIA|6981-0	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:13:37.036Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"banco": "BBVA", "moneda": "SOLES", "numero": "6981-0", "fechaPago": "2026-01-29", "clienteRuc": null, "montoTotal": "504", "comprobante": null, "fechaEmision": "2026-01-29", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6981-0", "numeroOperacion": "6981-0", "proveedorNombre": null, "codigoExpediente": "050201", "numeroConstancia": "6,981-0", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}}, "expedienteId": 41, "tipoRelacion": "adjunto_transferencia", "tipoPropuesto": "PAGO_TRANSFERENCIA"}, "usuarioId": null, "observacion": "Guardar y confirmar pago desde Finanzas"}], "texto": {"length": 855, "preview": "2026/01/29 10:16:56\\nBBTI SAC\\nTransferencias\\nImporte Cargado\\n 504.00 SOLES\\nCuenta de Cargo\\n0011-0111-0100059057   SOLES\\nBBTI SAC\\nCuenta de Abono\\n0011-0733-0100005447   SOLES\\nISA INDUSTRIAL SAC\\nDetalle de la operación\\nImporte Abonado\\n504.00  SOLES\\nFecha / Hora\\n29/01/2026   10:19\\nReferencia\\nPYATOCONGO\\nNúmero de Operación\\n6,981-0\\nDetalle de Comisiones\\nComisión por Otra Plaza\\n0.00   SOLES\\nDatos Adicionales\\nPre-inscritas\\nAl Exterior\\nInterbancarias\\nTerceros\\nPropias\\nTransferencias - Cuentas de Terceros\\n"}, "estado": "confirmado", "archivo": {"filename": "7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "resolvedPath": "storage/tmp/7b08c359-295a-4d88-bf14-33de71e9febd__pago_1.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"banco": "BBVA", "moneda": "SOLES", "numero": "6981-0", "fechaPago": "2026-01-29", "clienteRuc": null, "montoTotal": "504", "comprobante": null, "fechaEmision": "2026-01-29", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6981-0", "numeroOperacion": "6981-0", "proveedorNombre": null, "codigoExpediente": "050201", "numeroConstancia": "6,981-0", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}}, "archivoId": 11, "duplicado": null, "confidence": 1, "documentoId": 13, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "PAGO_TRANSFERENCIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_transferencia"}, "tipoPropuesto": "PAGO_TRANSFERENCIA", "metadataSource": {"banco": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "fechaPago": "MANUAL", "clienteRuc": "MANUAL", "montoTotal": "MANUAL", "comprobante": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "clienteNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "numeroOperacion": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "numeroConstancia": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "PAGO_TRANSFERENCIA", "camposFaltantes": [], "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|6981-0", "camposDetectados": ["numeroOperacion", "numeroConstancia", "fechaPago", "montoTotal"], "vinculoExpediente": {"orden": 20, "documentoId": 13, "esPrincipal": false, "vinculadoEn": "2026-07-06T21:13:37.045Z", "expedienteId": 41, "tipoRelacion": "adjunto_transferencia", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_transferencia"}}	2026-07-06 21:11:05.696779	2026-07-06 21:13:37.031002	\N	2026-07-06 21:13:37.031002	41
11	12	14	PAGO_DETRACCION	confirmado	0.00	BBTI|PAGO_DETRACCION|296801526	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T21:18:39.346Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20565747356", "banco": "BANCO DE LA NACION", "moneda": "SOLES", "numero": "296801526", "fechaPago": "2026-02-05", "proveedor": "Instituto De Seguridad Minera", "clienteRuc": "20565747356", "montoTotal": "240", "comprobante": "NUMERO", "fechaEmision": "2026-02-05", "rucComprador": "20565747356", "rucProveedor": "20565747356", "clienteNombre": "Bbti S.a.C.", "tipoDocumental": "PAGO_DETRACCION", "claveDocumental": "BBTI|PAGO_DETRACCION|296801526", "numeroOperacion": "296801526", "proveedorNombre": "Instituto De Seguridad Minera", "codigoExpediente": "050201", "numeroConstancia": "296801526", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}}, "expedienteId": 41, "tipoRelacion": "adjunto_detraccion", "tipoPropuesto": "PAGO_DETRACCION"}, "usuarioId": null, "observacion": "Guardar y confirmar pago desde Finanzas"}], "texto": {"length": 845, "preview": "j \\nA St SAO \\nNúmero de constancia \\nUsuario SOL \\nN* Cuenta de detracciones (Banco de la Nación) \\nTipo de Cuenta \\nRuc del Proveedor \\nNombre/Razón Socila del Proveedor \\nTipo de Documento del Adquiriente \\nNúmero de Documento del Adquiriente \\nNombre/Razón Social del Adquiriente \\nTipo de Operación \\nTipo de Bien ó servicio \\nMonto del depósito \\nFecha y hora de pago \\nPeriodo Tributario \\nTipo de Comprobante \\nNúmero de Comprobante \\nNúmero de operación \\nNúmero de Pago de Detracciones \\n296801526 \\n2D5INSMC \\n0"}, "estado": "confirmado", "archivo": {"filename": "799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "resolvedPath": "storage/tmp/799290fa-3ae4-470c-93bf-f27536dee9c6__pago_detraccion_1_bbti_sac.pdf", "storageProvider": "r2"}, "mensaje": "Documento requiere revisión manual por metadata incompleta o clave documental no generable.", "metadata": {"ruc": "20565747356", "banco": "BANCO DE LA NACION", "moneda": "SOLES", "numero": "296801526", "fechaPago": "2026-02-05", "proveedor": "Instituto De Seguridad Minera", "clienteRuc": "20565747356", "montoTotal": "240", "comprobante": "NUMERO", "fechaEmision": "2026-02-05", "rucComprador": "20565747356", "rucProveedor": "20565747356", "clienteNombre": "Bbti S.a.C.", "tipoDocumental": "PAGO_DETRACCION", "claveDocumental": "BBTI|PAGO_DETRACCION|296801526", "numeroOperacion": "296801526", "proveedorNombre": "Instituto De Seguridad Minera", "codigoExpediente": "050201", "numeroConstancia": "296801526", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "41", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}}, "archivoId": 12, "duplicado": null, "confidence": 0, "documentoId": 14, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 41, "tipoEsperado": "PAGO_DETRACCION", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_detraccion"}, "tipoPropuesto": "PAGO_DETRACCION", "metadataSource": {"ruc": "MANUAL", "banco": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "fechaPago": "MANUAL", "proveedor": "MANUAL", "clienteRuc": "MANUAL", "montoTotal": "MANUAL", "comprobante": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "clienteNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "numeroOperacion": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "numeroConstancia": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "PAGO_DETRACCION", "camposFaltantes": ["numeroOperacion"], "claveDocumental": "BBTI|PAGO_DETRACCION|296801526", "camposDetectados": ["comprobante", "fechaPago", "banco", "proveedorRuc", "proveedorNombre", "clienteRuc", "clienteNombre", "clienteAbreviatura"], "vinculoExpediente": {"orden": 20, "documentoId": 14, "esPrincipal": false, "vinculadoEn": "2026-07-06T21:18:39.352Z", "expedienteId": 41, "tipoRelacion": "adjunto_detraccion", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "050201"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": 41, "confirmadoDesde": "finanzas_editar", "codigoExpediente": "050201", "tipoRelacionSugerida": "adjunto_detraccion"}}	2026-07-06 21:15:55.753628	2026-07-06 21:18:39.339948	\N	2026-07-06 21:18:39.339948	41
12	13	15	OS	confirmado	1.00	BBTI|OS|000284	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:19:22.273Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"moneda": "SOLES", "numero": "000284", "proveedor": "INSTRUINGENIERIA S.A.C.", "cotizacion": "13/06/2026", "montoTotal": "141.6", "razonSocial": "INSTRUINGENIERIA S.A.C.", "fechaEmision": "2026-06-13", "rucComprador": "20565747356", "rucProveedor": "20573856938", "tipoDocumental": "OS", "claveDocumental": "BBTI|OS|000284", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "7", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}}, "expedienteId": 7, "tipoRelacion": "principal_os", "tipoPropuesto": "OS"}, "usuarioId": null, "observacion": "Guardar y confirmar principal desde Compras > Nuevo"}], "texto": {"length": 3668, "preview": "SEÑOR(ES) :\\nTELEFONO :\\nATENCIÓN :\\n20573856938\\nR.U.C.  \\nCal. Lorenzo Astrana Nro. 280\\nCONDICION DE PAGO :\\nFECHA :\\nOrden de Servicio\\nLUGAR DE ENTREGA :\\nDIRECCIÓN :\\nNº:000284\\nMONEDA :\\nTIEMPO DE ENTREGA :\\nSOLES\\nOBSERVACIONES :\\nE-MAIL :\\nCUENTAS BANCARIAS :\\nCOTIZACION :\\nINSTRUINGENIERIA S.A.C.\\n13/06/2026\\nALMACENES DE INSTRUINGENIERIA S.A.C\\n13/06/2026\\nCOI-228_06_2026\\nCONTADO CONTRA ENTREGA\\nDESCRIPCION\\nIMPORTE\\nPRECIO\\nCANT\\nCODIGO\\nBB TECNOLOGIA INDUSTRIAL S.A.C.\\nCAL.CALLE 6 MZA. D LOTE. 15 DPTO. 2DO INT. "}, "estado": "confirmado", "archivo": {"filename": "585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "resolvedPath": "storage/tmp/585b2017-9101-4831-9cfd-b43db81f668f__OS_BBTEC.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"moneda": "SOLES", "numero": "000284", "proveedor": "INSTRUINGENIERIA S.A.C.", "cotizacion": "13/06/2026", "montoTotal": "141.6", "razonSocial": "INSTRUINGENIERIA S.A.C.", "fechaEmision": "2026-06-13", "rucComprador": "20565747356", "rucProveedor": "20573856938", "tipoDocumental": "OS", "claveDocumental": "BBTI|OS|000284", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": "7", "confirmadoDesde": "compras_nuevo", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}}, "archivoId": 13, "duplicado": null, "confidence": 1, "documentoId": 15, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_NUEVO_UPLOAD_PRINCIPAL", "expedienteId": 7, "tipoEsperado": "OS", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "principal_os"}, "tipoPropuesto": "OS", "metadataSource": {"moneda": "MANUAL", "numero": "MANUAL", "proveedor": "MANUAL", "cotizacion": "MANUAL", "montoTotal": "MANUAL", "razonSocial": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "OS", "camposFaltantes": [], "claveDocumental": "BBTI|OS|000284", "camposDetectados": ["numero", "fechaEmision", "montoTotal", "proveedor", "rucProveedor", "moneda", "cotizacion", "codigoExpediente"], "vinculoExpediente": {"orden": 1, "documentoId": 15, "esPrincipal": true, "vinculadoEn": "2026-07-06T22:19:22.280Z", "expedienteId": 7, "tipoRelacion": "principal_os", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "030101"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_NUEVO_MODAL_PRINCIPAL", "expedienteId": 7, "confirmadoDesde": "compras_nuevo", "codigoExpediente": "030101", "tipoRelacionSugerida": "principal_os"}}	2026-07-06 22:18:25.637531	2026-07-06 22:19:22.264159	\N	2026-07-06 22:19:22.264159	7
13	14	16	FACTURA	confirmado	1.00	BBTI|FACTURA|20565747356|F001|0000909	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:20:59.586Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20565747356", "serie": "F001", "moneda": "SOLES", "numero": "0000909", "proveedor": "BBTI S.A.C.", "rucEmisor": "20565747356", "montoTotal": "238.64", "razonSocial": "BBTI S.A.C.", "fechaEmision": "2026-01-21", "rucComprador": "20565747356", "rucProveedor": "20565747356", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "BBTI S.A.C.", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "compras_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "CAL. 6 MZA. D LOTE 13 URB. IND", "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 7, "tipoRelacion": "adjunto_factura", "tipoPropuesto": "FACTURA"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Compras > Editar"}], "texto": {"length": 1004, "preview": "= 1 \\npa \\n* 20565747356 \\n== bbtis.a.c \\nad \\nBBTI S.A.C.. \\nFACTURA ELECTRONICA \\nCAL.6 MZA. D LOTE. 13 URB. INDUSTRIAL GRIMAN \\n(ALT. DE LIMA CARGO CITY) PROV. CONST. DEL \\no \\na \\nCALLAO - PROV. CONST. DEL CALLAO - CALLAO \\n' \\nN? \\nF001 \\n- 0000909 \\n) \\nSEÑOR: \\nBB TECNOLOGIA INDUSTRIAL S.A.C. \\nFECHA EMISION: \\n21/01/2026 \\nFECHA VCTO: \\n21/01/2026 \\nRUC: \\n20299922821 \\nORD. COMPRA: \\n2955 \\nDIRECCIÓN: \\nCALLE 6 MZA. D LOTE. 15 DPTO. 2DO INT. 2PIS URB. GRIMANEZA \\nGUÍA DE REMISIÓN: \\n10010000226 \\n¡PERES \\nPR147-25 \\nFO"}, "estado": "confirmado", "archivo": {"filename": "44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "resolvedPath": "storage/tmp/44fc5c10-227a-4d0b-9cd7-a5284c69aab8__factura_scaneada_2.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20565747356", "serie": "F001", "moneda": "SOLES", "numero": "0000909", "proveedor": "BBTI S.A.C.", "rucEmisor": "20565747356", "montoTotal": "238.64", "razonSocial": "BBTI S.A.C.", "fechaEmision": "2026-01-21", "rucComprador": "20565747356", "rucProveedor": "20565747356", "tipoDocumental": "FACTURA", "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "BBTI S.A.C.", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "compras_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}, "direccionProveedor": "CAL. 6 MZA. D LOTE 13 URB. IND", "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 14, "duplicado": null, "confidence": 1, "documentoId": 16, "contextoCarga": {"areaOrigen": "COMPRAS", "canalIngreso": "COMPRAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "FACTURA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_factura"}, "tipoPropuesto": "FACTURA", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "montoTotal": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "FACTURA", "camposFaltantes": [], "claveDocumental": "BBTI|FACTURA|20565747356|F001|0000909", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision", "montoTotal"], "vinculoExpediente": {"orden": 10, "documentoId": 16, "esPrincipal": false, "vinculadoEn": "2026-07-06T22:20:59.600Z", "expedienteId": 7, "tipoRelacion": "adjunto_factura", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "030101"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "COMPRAS_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "compras_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_factura"}}	2026-07-06 22:20:07.310561	2026-07-06 22:20:59.572706	\N	2026-07-06 22:20:59.572706	7
14	15	17	GUIA_REMISION	confirmado	1.00	BBTI|GUIA_REMISION|20612122416|EG07|00000163	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:22:45.185Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000163", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-01", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "expedienteId": 7, "tipoRelacion": "adjunto_guia", "tipoPropuesto": "GUIA_REMISION"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Almacén"}], "texto": {"length": 2140, "preview": "RUC N°20612122416\\nGUÍA DE REMISIÓN ELECTRÓNICA\\nREMITENTE\\nN° EG07 - 00000163\\nCONSORCIO HUANCAVELICA\\n01/04/2026 02:40 PM\\nFecha de inicio de Traslado :\\nMotivo de Traslado :\\n01/04/2026\\nOTROS\\nJR 28 DE JULIO MZ F1 LT9 - PAUCARA - ACOBAMBA -\\nHUANCAVELICA\\nCAL. CAPPA NRO. 237 Z.I. PARQUE INTERNACIONAL DE LA\\nINDUSTRIA Y COMERCIO (NRO. 237, 249,267)  - CALLAO - PROV.\\nCONST. DEL CALLAO - PROV. CONST. DEL CALLAO\\nPunto de llegada\\nPunto de Partida\\nDatos del Destinatario :CONSORCIO HUANCAVELICA - REGISTRO ÚNICO"}, "estado": "confirmado", "archivo": {"filename": "d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "resolvedPath": "storage/tmp/d71b2bee-7dca-4bdf-9808-28d36a1df0c9__guia_3_4.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"ruc": "20612122416", "serie": "EG07", "numero": "00000163", "proveedor": "CONSORCIO HUANCAVELICA", "rucEmisor": "20612122416", "razonSocial": "CONSORCIO HUANCAVELICA", "fechaEmision": "2026-04-01", "rucComprador": "20565747356", "rucProveedor": "20612122416", "tipoDocumental": "GUIA_REMISION", "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163", "proveedorOrigen": "CATALOGO_PROVEEDORES", "codigoExpediente": "030101", "razonSocialEmisor": "CONSORCIO HUANCAVELICA", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}, "tipoPersonaProveedor": "JURIDICA"}, "archivoId": 15, "duplicado": null, "confidence": 1, "documentoId": 17, "contextoCarga": {"areaOrigen": "ALMACEN", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "GUIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_guia"}, "tipoPropuesto": "GUIA_REMISION", "metadataSource": {"ruc": "MANUAL", "serie": "MANUAL", "numero": "MANUAL", "proveedor": "CATALOGO_PROVEEDORES", "rucEmisor": "MANUAL", "razonSocial": "CATALOGO_PROVEEDORES", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "rucProveedor": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorOrigen": "SISTEMA", "codigoExpediente": "MANUAL", "razonSocialEmisor": "CATALOGO_PROVEEDORES", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL", "direccionProveedor": "CATALOGO_PROVEEDORES", "tipoPersonaProveedor": "CATALOGO_PROVEEDORES"}, "tipoDocumental": "GUIA_REMISION", "camposFaltantes": [], "claveDocumental": "BBTI|GUIA_REMISION|20612122416|EG07|00000163", "camposDetectados": ["ruc", "serie", "numero", "fechaEmision"], "vinculoExpediente": {"orden": 20, "documentoId": 17, "esPrincipal": false, "vinculadoEn": "2026-07-06T22:22:45.191Z", "expedienteId": 7, "tipoRelacion": "adjunto_guia", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "030101"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_guia"}}	2026-07-06 22:22:32.868311	2026-07-06 22:22:45.181545	\N	2026-07-06 22:22:45.181545	7
15	16	18	NOTA_INGRESO	confirmado	1.00	BBTI|NOTA_INGRESO|0000000031	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:23:08.975Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"numero": "0000000031", "clienteRuc": "20565747356", "ordenCompra": "0000000000006", "fechaEmision": "2026-02-26", "rucComprador": "20565747356", "empresaNombre": "BBTI S.A.C.", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "proveedorNombre": "CORPORACION CIE E.I.R.L.", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "expedienteId": 7, "tipoRelacion": "adjunto_nota_ingreso", "tipoPropuesto": "NOTA_INGRESO"}, "usuarioId": null, "observacion": "Guardar y confirmar adjunto desde Almacén"}], "texto": {"length": 604, "preview": "1\\nPag.\\nBBTI SAC\\nFecha :23/04/2026\\nHora    18:09:22\\nNOTA DE INGRESO\\nI\\nALMACEN         \\nTRANSACCION\\nFECHA DOC\\nPROVEEDOR\\nCLIENTE\\nAUTORIZADO\\nORD. COMPRA  \\nNro. DOC. REF.\\nCENTRO DE COSTO\\nMONEDA\\nALMACEN PRINCIPAL\\n26/02/2026\\n20602599702\\nCORPORACION CIE E.I.R.L.\\n0000000000006\\nGC 0012292\\n0000000031\\nCL COMPRAS PRODUCTOS NACIONALES\\nMN\\nCOMENTARIO\\nINV043\\nT.C.\\n 3.363\\nCODIGO\\nDESCRIPCION\\nUND SERIE\\\\LOTE\\nCANT.\\nITEM\\nCOSTO UNIT.\\nTOTAL\\nC.COSTO\\nORD. \\n28.000000  23,772.00\\n 1\\n240302\\nEspiga de AºGº para Cruceta y Aislad"}, "estado": "confirmado", "archivo": {"filename": "4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "resolvedPath": "storage/tmp/4101165b-d191-47f4-a89b-0ff0e8baf7f3__nota_i_31_bbti.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"numero": "0000000031", "clienteRuc": "20565747356", "ordenCompra": "0000000000006", "fechaEmision": "2026-02-26", "rucComprador": "20565747356", "empresaNombre": "BBTI S.A.C.", "tipoDocumental": "NOTA_INGRESO", "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "proveedorNombre": "CORPORACION CIE E.I.R.L.", "codigoExpediente": "030101", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}, "archivoId": 16, "duplicado": {"documentoId": 11, "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "existeDocumento": true}, "confidence": 1, "documentoId": 18, "contextoCarga": {"areaOrigen": "ALMACEN", "canalIngreso": "ALMACEN_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "NOTA_INGRESO", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_nota_ingreso"}, "tipoPropuesto": "NOTA_INGRESO", "metadataSource": {"numero": "MANUAL", "clienteRuc": "MANUAL", "ordenCompra": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "empresaNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "NOTA_INGRESO", "camposFaltantes": [], "claveDocumental": "BBTI|NOTA_INGRESO|0000000031", "camposDetectados": ["clienteAbreviatura", "clienteRuc", "empresaNombre", "numero", "fechaEmision", "ordenCompra", "proveedorRuc", "proveedorNombre"], "vinculoExpediente": {"orden": 20, "documentoId": 18, "esPrincipal": false, "vinculadoEn": "2026-07-06T22:23:08.979Z", "expedienteId": 7, "tipoRelacion": "adjunto_nota_ingreso", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "030101"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "ALMACEN_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "almacen_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_nota_ingreso"}}	2026-07-06 22:23:01.335937	2026-07-06 22:23:08.97167	\N	2026-07-06 22:23:08.97167	7
16	17	19	PAGO_DETRACCION	pendiente_validacion	0.00	\N	{"ok": true, "qr": null, "texto": {"length": 981, "preview": "6/2/26, 5:08 p.m. \\nConstancia de Deposito \\nCONSTANCIA DE DEPÓSITO \\nSISTEMA DE PAGO DE OBLIGACIONES TRIBUTARIAS D.LEG. 940 \\nNúmero de constancia \\nUsuario SOL \\nN* Cuenta de detracciones (Banco de la Nación) \\nTipo de Cuenta \\nRue del Proveedor \\nNombre/Razón Socila del Proveedor \\nTipo de Documento del Adquiriente \\nNúmero de Documento del Adquiriente \\nNombre/Razón Social del Adquiriente \\nTipo de Operación \\nTipo de Bien ó servicio \\nMonto del depósito \\nFecha y hora de pago \\nPeriodo Tributario \\nTipo de C"}, "estado": "requiere_revision", "archivo": {"filename": "c643c422-9c81-4d25-ae88-e4abeb0b50bb__pago_detraccion_3.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/c643c422-9c81-4d25-ae88-e4abeb0b50bb__pago_detraccion_3.pdf", "resolvedPath": "storage/tmp/c643c422-9c81-4d25-ae88-e4abeb0b50bb__pago_detraccion_3.pdf", "storageProvider": "r2"}, "mensaje": "Documento requiere revisión manual por metadata incompleta o clave documental no generable.", "metadata": {"banco": "BANCO DE LA NACION", "fechaPago": "2026-02-06", "clienteRuc": "20299922821", "montoTotal": null, "comprobante": "NUMERO", "clienteNombre": "BB TECNOLOGIA INDUSTRIAL S.A.C.", "numeroOperacion": null, "proveedorNombre": "MEDICINA EMPRESARIAL DE PREVENCION", "numeroConstancia": null, "clienteAbreviatura": null}, "archivoId": 17, "duplicado": null, "confidence": 0, "documentoId": 19, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "PAGO_DETRACCION", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_detraccion"}, "metadataSource": {"banco": "TEXT", "fechaPago": "TEXT", "clienteRuc": "TEXT", "montoTotal": null, "comprobante": "TEXT", "clienteNombre": "TEXT", "numeroOperacion": null, "proveedorNombre": "TEXT", "numeroConstancia": null, "clienteAbreviatura": null}, "tipoDocumental": "PAGO_DETRACCION", "camposFaltantes": ["numeroOperacion"], "claveDocumental": null, "camposDetectados": ["comprobante", "fechaPago", "banco", "proveedorRuc", "proveedorNombre", "clienteRuc", "clienteNombre"], "clienteAbreviatura": "BBTI"}	2026-07-06 22:25:04.022688	\N	\N	\N	\N
17	18	20	PAGO_TRANSFERENCIA	confirmado	1.00	BBTI|PAGO_TRANSFERENCIA|3442-3444	{"ok": true, "qr": null, "audit": [{"fecha": "2026-07-06T22:26:45.379Z", "accion": "CONFIRMADO_CON_EXPEDIENTE", "cambios": {"metadata": {"banco": "SCOTIABANK", "moneda": "SOLES", "numero": "3442-3444", "fechaPago": "2026-04-06", "clienteRuc": null, "montoTotal": "5460.9", "comprobante": null, "fechaEmision": "2026-04-06", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444", "numeroOperacion": "3442-3444", "proveedorNombre": null, "codigoExpediente": "030101", "numeroConstancia": "3442-3444", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}}, "expedienteId": 7, "tipoRelacion": "adjunto_transferencia", "tipoPropuesto": "PAGO_TRANSFERENCIA"}, "usuarioId": null, "observacion": "Guardar y confirmar pago desde Finanzas"}], "texto": {"length": 895, "preview": "2026/04/06 07:52:39\\nCONSORCIO HUANCAVELICA\\nTransferencias\\nImporte Transferido\\n5,454.85  SOLES\\nNúmero de Cuenta de Cargo\\n0011-0153-430100096873\\nCONSORCIO HUANCAVELI CA\\nNúmero de Cuenta Interbancaria\\nde Abono\\n009-214-000002109263-80\\nUN*** NA*** DE*** IN*** UN*** \\nDetalle de la Operación\\nEstado de la Operación :\\nAbonada\\nNúmero de Operación :\\n3442 - 3444\\nOperación :\\nTransferencia Interbancaria\\nTipo de transferencia:\\nInmediata\\nImporte Cargado :\\n5,460.90     SOLES\\nUsuario(s) que autoriza(n)\\nCIRO FERNA"}, "estado": "confirmado", "archivo": {"filename": "69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "extension": ".pdf", "storageKey": "documentos/2026/07/BBTI/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "resolvedPath": "storage/tmp/69cd7a32-e287-47b8-bf0f-d2a0ba68704f__pago_3.pdf", "storageProvider": "r2"}, "mensaje": "Archivo leído, clasificado y extraído correctamente", "metadata": {"banco": "SCOTIABANK", "moneda": "SOLES", "numero": "3442-3444", "fechaPago": "2026-04-06", "clienteRuc": null, "montoTotal": "5460.9", "comprobante": null, "fechaEmision": "2026-04-06", "rucComprador": "20565747356", "clienteNombre": null, "tipoDocumental": "PAGO_TRANSFERENCIA", "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444", "numeroOperacion": "3442-3444", "proveedorNombre": null, "codigoExpediente": "030101", "numeroConstancia": "3442-3444", "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": "7", "confirmadoDesde": "finanzas_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}}, "archivoId": 18, "duplicado": null, "confidence": 1, "documentoId": 20, "contextoCarga": {"areaOrigen": "FINANZAS", "canalIngreso": "FINANZAS_EDITAR_UPLOAD", "expedienteId": 7, "tipoEsperado": "PAGO_TRANSFERENCIA", "documentoBaseId": null, "codigoExpediente": null, "tipoRelacionSugerida": "adjunto_transferencia"}, "tipoPropuesto": "PAGO_TRANSFERENCIA", "metadataSource": {"banco": "MANUAL", "moneda": "MANUAL", "numero": "MANUAL", "fechaPago": "MANUAL", "clienteRuc": "MANUAL", "montoTotal": "MANUAL", "comprobante": "MANUAL", "fechaEmision": "MANUAL", "rucComprador": "MANUAL", "clienteNombre": "MANUAL", "tipoDocumental": "MANUAL", "claveDocumental": "MANUAL", "numeroOperacion": "MANUAL", "proveedorNombre": "MANUAL", "codigoExpediente": "MANUAL", "numeroConstancia": "MANUAL", "clienteAbreviatura": "MANUAL", "contextoValidacion": "MANUAL"}, "tipoDocumental": "PAGO_TRANSFERENCIA", "camposFaltantes": [], "claveDocumental": "BBTI|PAGO_TRANSFERENCIA|3442-3444", "camposDetectados": ["numeroOperacion", "numeroConstancia", "fechaPago", "montoTotal", "banco"], "vinculoExpediente": {"orden": 20, "documentoId": 20, "esPrincipal": false, "vinculadoEn": "2026-07-06T22:26:45.383Z", "expedienteId": 7, "tipoRelacion": "adjunto_transferencia", "empresaCodigo": "BBTI", "clienteDestinoId": 2, "codigoExpediente": "030101"}, "clienteAbreviatura": "BBTI", "contextoValidacion": {"origen": "FINANZAS_EDITAR_MODAL", "expedienteId": 7, "confirmadoDesde": "finanzas_editar", "codigoExpediente": "030101", "tipoRelacionSugerida": "adjunto_transferencia"}}	2026-07-06 22:26:27.418951	2026-07-06 22:26:45.375171	\N	2026-07-06 22:26:45.375171	7
\.


--
-- Name: perfiles_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: postgres
--

SELECT pg_catalog.setval('auth.perfiles_id_seq', 8, true);


--
-- Name: sistemas_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: postgres
--

SELECT pg_catalog.setval('auth.sistemas_id_seq', 7, true);


--
-- Name: usuario_accesos_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: postgres
--

SELECT pg_catalog.setval('auth.usuario_accesos_id_seq', 5, true);


--
-- Name: usuario_workspaces_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: postgres
--

SELECT pg_catalog.setval('auth.usuario_workspaces_id_seq', 6, true);


--
-- Name: usuarios_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: postgres
--

SELECT pg_catalog.setval('auth.usuarios_id_seq', 5, true);


--
-- Name: auditoria_eventos_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.auditoria_eventos_id_seq', 238, true);


--
-- Name: bancos_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.bancos_id_seq', 8, true);


--
-- Name: clientes_destino_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.clientes_destino_id_seq', 6, true);


--
-- Name: monedas_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.monedas_id_seq', 2, true);


--
-- Name: proveedores_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.proveedores_id_seq', 2613, true);


--
-- Name: sistemas_id_seq; Type: SEQUENCE SET; Schema: core; Owner: postgres
--

SELECT pg_catalog.setval('core.sistemas_id_seq', 11, true);


--
-- Name: asientos_documentales_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.asientos_documentales_id_seq', 1, false);


--
-- Name: asientos_documentos_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.asientos_documentos_id_seq', 1, false);


--
-- Name: cierres_contables_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.cierres_contables_id_seq', 1, false);


--
-- Name: documento_alertas_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documento_alertas_id_seq', 1, false);


--
-- Name: documento_eventos_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documento_eventos_id_seq', 46, true);


--
-- Name: documento_relaciones_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documento_relaciones_id_seq', 1, false);


--
-- Name: documentos_archivos_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documentos_archivos_id_seq', 18, true);


--
-- Name: documentos_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documentos_id_seq', 20, true);


--
-- Name: documentos_origenes_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documentos_origenes_id_seq', 1, false);


--
-- Name: documentos_recibo_honorario_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.documentos_recibo_honorario_id_seq', 1, false);


--
-- Name: expedientes_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.expedientes_id_seq', 681, true);


--
-- Name: grupo_documentos_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.grupo_documentos_id_seq', 1, false);


--
-- Name: grupos_documentales_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.grupos_documentales_id_seq', 1, false);


--
-- Name: ocr_resultados_id_seq; Type: SEQUENCE SET; Schema: documentos; Owner: postgres
--

SELECT pg_catalog.setval('documentos.ocr_resultados_id_seq', 17, true);


--
-- Name: perfiles perfiles_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.perfiles
    ADD CONSTRAINT perfiles_pkey PRIMARY KEY (id);


--
-- Name: perfiles perfiles_sistema_id_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.perfiles
    ADD CONSTRAINT perfiles_sistema_id_codigo_key UNIQUE (sistema_id, codigo);


--
-- Name: sistemas sistemas_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.sistemas
    ADD CONSTRAINT sistemas_codigo_key UNIQUE (codigo);


--
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: usuario_accesos usuario_accesos_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_pkey PRIMARY KEY (id);


--
-- Name: usuario_accesos usuario_accesos_usuario_id_sistema_id_empresa_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_usuario_id_sistema_id_empresa_codigo_key UNIQUE (usuario_id, sistema_id, empresa_codigo);


--
-- Name: usuario_workspaces usuario_workspaces_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_pkey PRIMARY KEY (id);


--
-- Name: usuario_workspaces usuario_workspaces_usuario_id_empresa_codigo_sistema_id_per_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_usuario_id_empresa_codigo_sistema_id_per_key UNIQUE (usuario_id, empresa_codigo, sistema_id, perfil_id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: auditoria_eventos auditoria_eventos_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.auditoria_eventos
    ADD CONSTRAINT auditoria_eventos_pkey PRIMARY KEY (id);


--
-- Name: bancos bancos_codigo_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.bancos
    ADD CONSTRAINT bancos_codigo_key UNIQUE (codigo);


--
-- Name: bancos bancos_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.bancos
    ADD CONSTRAINT bancos_pkey PRIMARY KEY (id);


--
-- Name: clientes_destino clientes_destino_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.clientes_destino
    ADD CONSTRAINT clientes_destino_pkey PRIMARY KEY (id);


--
-- Name: monedas monedas_codigo_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.monedas
    ADD CONSTRAINT monedas_codigo_key UNIQUE (codigo);


--
-- Name: monedas monedas_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.monedas
    ADD CONSTRAINT monedas_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_ruc_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.proveedores
    ADD CONSTRAINT proveedores_ruc_key UNIQUE (ruc);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sistemas sistemas_codigo_key; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.sistemas
    ADD CONSTRAINT sistemas_codigo_key UNIQUE (codigo);


--
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: core; Owner: postgres
--

ALTER TABLE ONLY core.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: asientos_documentales asientos_documentales_cliente_abreviatura_anio_mes_asiento__key; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentales
    ADD CONSTRAINT asientos_documentales_cliente_abreviatura_anio_mes_asiento__key UNIQUE (cliente_abreviatura, anio, mes, asiento_interno);


--
-- Name: asientos_documentales asientos_documentales_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentales
    ADD CONSTRAINT asientos_documentales_pkey PRIMARY KEY (id);


--
-- Name: asientos_documentos asientos_documentos_asiento_id_documento_id_key; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_asiento_id_documento_id_key UNIQUE (asiento_id, documento_id);


--
-- Name: asientos_documentos asientos_documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_pkey PRIMARY KEY (id);


--
-- Name: cierres_contables cierres_contables_empresa_codigo_anio_mes_key; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.cierres_contables
    ADD CONSTRAINT cierres_contables_empresa_codigo_anio_mes_key UNIQUE (empresa_codigo, anio, mes);


--
-- Name: cierres_contables cierres_contables_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.cierres_contables
    ADD CONSTRAINT cierres_contables_pkey PRIMARY KEY (id);


--
-- Name: documento_alertas documento_alertas_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_alertas
    ADD CONSTRAINT documento_alertas_pkey PRIMARY KEY (id);


--
-- Name: documento_eventos documento_eventos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_eventos
    ADD CONSTRAINT documento_eventos_pkey PRIMARY KEY (id);


--
-- Name: documento_relaciones documento_relaciones_documento_origen_id_documento_destino__key; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_documento_origen_id_documento_destino__key UNIQUE (documento_origen_id, documento_destino_id, tipo_relacion);


--
-- Name: documento_relaciones documento_relaciones_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_pkey PRIMARY KEY (id);


--
-- Name: documentos_archivos documentos_archivos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_archivos
    ADD CONSTRAINT documentos_archivos_pkey PRIMARY KEY (id);


--
-- Name: documentos_factura documentos_factura_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_factura
    ADD CONSTRAINT documentos_factura_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_guia_remision documentos_guia_remision_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_guia_remision
    ADD CONSTRAINT documentos_guia_remision_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_nota_ingreso documentos_nota_ingreso_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_nota_ingreso
    ADD CONSTRAINT documentos_nota_ingreso_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_oc documentos_oc_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_oc
    ADD CONSTRAINT documentos_oc_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_origenes documentos_origenes_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_origenes
    ADD CONSTRAINT documentos_origenes_pkey PRIMARY KEY (id);


--
-- Name: documentos_origenes documentos_origenes_tabla_origen_registro_origen_id_key; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_origenes
    ADD CONSTRAINT documentos_origenes_tabla_origen_registro_origen_id_key UNIQUE (tabla_origen, registro_origen_id);


--
-- Name: documentos_os documentos_os_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_os
    ADD CONSTRAINT documentos_os_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_otro documentos_otro_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_otro
    ADD CONSTRAINT documentos_otro_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_pago_detraccion documentos_pago_detraccion_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_pago_detraccion
    ADD CONSTRAINT documentos_pago_detraccion_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_pago_transferencia documentos_pago_transferencia_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_pago_transferencia
    ADD CONSTRAINT documentos_pago_transferencia_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: documentos_recibo_honorario documentos_recibo_honorario_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_recibo_honorario
    ADD CONSTRAINT documentos_recibo_honorario_pkey PRIMARY KEY (id);


--
-- Name: expediente_documentos expediente_documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.expediente_documentos
    ADD CONSTRAINT expediente_documentos_pkey PRIMARY KEY (expediente_id, documento_id);


--
-- Name: expedientes expedientes_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.expedientes
    ADD CONSTRAINT expedientes_pkey PRIMARY KEY (id);


--
-- Name: grupo_documentos grupo_documentos_grupo_id_documento_id_key; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_grupo_id_documento_id_key UNIQUE (grupo_id, documento_id);


--
-- Name: grupo_documentos grupo_documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_pkey PRIMARY KEY (id);


--
-- Name: grupos_documentales grupos_documentales_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupos_documentales
    ADD CONSTRAINT grupos_documentales_pkey PRIMARY KEY (id);


--
-- Name: ocr_resultados ocr_resultados_pkey; Type: CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.ocr_resultados
    ADD CONSTRAINT ocr_resultados_pkey PRIMARY KEY (id);


--
-- Name: idx_usuario_workspaces_empresa; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_usuario_workspaces_empresa ON auth.usuario_workspaces USING btree (empresa_codigo, estado);


--
-- Name: idx_usuario_workspaces_usuario; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX idx_usuario_workspaces_usuario ON auth.usuario_workspaces USING btree (usuario_id, estado);


--
-- Name: usuario_workspaces_un_favorito_por_usuario_sistema; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE UNIQUE INDEX usuario_workspaces_un_favorito_por_usuario_sistema ON auth.usuario_workspaces USING btree (usuario_id, sistema_id) WHERE ((es_favorito = true) AND ((estado)::text = 'activo'::text));


--
-- Name: idx_auditoria_eventos_entidad; Type: INDEX; Schema: core; Owner: postgres
--

CREATE INDEX idx_auditoria_eventos_entidad ON core.auditoria_eventos USING btree (entidad, entidad_id);


--
-- Name: idx_auditoria_eventos_request; Type: INDEX; Schema: core; Owner: postgres
--

CREATE INDEX idx_auditoria_eventos_request ON core.auditoria_eventos USING btree (request_id);


--
-- Name: idx_auditoria_eventos_workspace; Type: INDEX; Schema: core; Owner: postgres
--

CREATE INDEX idx_auditoria_eventos_workspace ON core.auditoria_eventos USING btree (workspace_id, creado_en DESC);


--
-- Name: idx_documento_eventos_archivo_creado; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_eventos_archivo_creado ON documentos.documento_eventos USING btree (archivo_id, creado_en DESC);


--
-- Name: idx_documento_eventos_correlation_id; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_eventos_correlation_id ON documentos.documento_eventos USING btree (correlation_id);


--
-- Name: idx_documento_eventos_documento_creado; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_eventos_documento_creado ON documentos.documento_eventos USING btree (documento_id, creado_en DESC);


--
-- Name: idx_documento_eventos_expediente_creado; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_eventos_expediente_creado ON documentos.documento_eventos USING btree (expediente_id, creado_en DESC);


--
-- Name: idx_documento_eventos_request_id; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_eventos_request_id ON documentos.documento_eventos USING btree (request_id);


--
-- Name: idx_documento_eventos_tipo_creado; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_eventos_tipo_creado ON documentos.documento_eventos USING btree (tipo_evento, creado_en DESC);


--
-- Name: idx_documento_relaciones_destino; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_relaciones_destino ON documentos.documento_relaciones USING btree (documento_destino_id);


--
-- Name: idx_documento_relaciones_origen; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documento_relaciones_origen ON documentos.documento_relaciones USING btree (documento_origen_id);


--
-- Name: idx_documentos_archivos_documento_actual; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_archivos_documento_actual ON documentos.documentos_archivos USING btree (documento_id, es_version_actual);


--
-- Name: idx_documentos_archivos_documento_version; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_archivos_documento_version ON documentos.documentos_archivos USING btree (documento_id, version);


--
-- Name: idx_documentos_archivos_tipo_version; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_archivos_tipo_version ON documentos.documentos_archivos USING btree (tipo_version);


--
-- Name: idx_documentos_clave_documental; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_clave_documental ON documentos.documentos USING btree (clave_documental);


--
-- Name: idx_documentos_cliente_periodo; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_cliente_periodo ON documentos.documentos USING btree (cliente_abreviatura, periodo_anio, periodo_mes);


--
-- Name: idx_documentos_fecha_emision; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_fecha_emision ON documentos.documentos USING btree (fecha_emision);


--
-- Name: idx_documentos_tipo_estado; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_documentos_tipo_estado ON documentos.documentos USING btree (tipo_documental, estado);


--
-- Name: idx_expediente_documentos_documento; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_expediente_documentos_documento ON documentos.expediente_documentos USING btree (documento_id);


--
-- Name: idx_expedientes_cliente_codigo; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_expedientes_cliente_codigo ON documentos.expedientes USING btree (cliente_destino_id, codigo_expediente);


--
-- Name: idx_expedientes_cliente_destino; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_expedientes_cliente_destino ON documentos.expedientes USING btree (cliente_destino_id);


--
-- Name: idx_expedientes_codigo; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_expedientes_codigo ON documentos.expedientes USING btree (codigo_expediente);


--
-- Name: idx_expedientes_empresa; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_expedientes_empresa ON documentos.expedientes USING btree (empresa_codigo);


--
-- Name: idx_expedientes_empresa_codigo; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_expedientes_empresa_codigo ON documentos.expedientes USING btree (empresa_codigo, codigo_expediente);


--
-- Name: idx_ocr_resultados_archivo_id; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_ocr_resultados_archivo_id ON documentos.ocr_resultados USING btree (archivo_id);


--
-- Name: idx_ocr_resultados_clave_documental; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_ocr_resultados_clave_documental ON documentos.ocr_resultados USING btree (clave_documental);


--
-- Name: idx_ocr_resultados_estado; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE INDEX idx_ocr_resultados_estado ON documentos.ocr_resultados USING btree (estado);


--
-- Name: uq_asientos_documentos_asiento_documento; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE UNIQUE INDEX uq_asientos_documentos_asiento_documento ON documentos.asientos_documentos USING btree (asiento_id, documento_id);


--
-- Name: uq_documentos_origenes_tabla_registro; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE UNIQUE INDEX uq_documentos_origenes_tabla_registro ON documentos.documentos_origenes USING btree (tabla_origen, registro_origen_id);


--
-- Name: uq_documentos_recibo_honorario_documento; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE UNIQUE INDEX uq_documentos_recibo_honorario_documento ON documentos.documentos_recibo_honorario USING btree (documento_id);


--
-- Name: uq_expediente_documentos_documento_id; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE UNIQUE INDEX uq_expediente_documentos_documento_id ON documentos.expediente_documentos USING btree (documento_id);


--
-- Name: ux_documentos_archivos_un_actual; Type: INDEX; Schema: documentos; Owner: postgres
--

CREATE UNIQUE INDEX ux_documentos_archivos_un_actual ON documentos.documentos_archivos USING btree (documento_id) WHERE ((es_version_actual = true) AND (documento_id IS NOT NULL));


--
-- Name: perfiles perfiles_sistema_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.perfiles
    ADD CONSTRAINT perfiles_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES core.sistemas(id);


--
-- Name: usuario_accesos usuario_accesos_sistema_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES auth.sistemas(id);


--
-- Name: usuario_accesos usuario_accesos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.usuarios(id);


--
-- Name: usuario_workspaces usuario_workspaces_perfil_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES auth.perfiles(id);


--
-- Name: usuario_workspaces usuario_workspaces_sistema_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES core.sistemas(id);


--
-- Name: usuario_workspaces usuario_workspaces_usuario_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.usuarios(id);


--
-- Name: asientos_documentos asientos_documentos_asiento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_asiento_id_fkey FOREIGN KEY (asiento_id) REFERENCES documentos.asientos_documentales(id);


--
-- Name: asientos_documentos asientos_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_alertas documento_alertas_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_alertas
    ADD CONSTRAINT documento_alertas_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_eventos documento_eventos_archivo_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_eventos
    ADD CONSTRAINT documento_eventos_archivo_id_fkey FOREIGN KEY (archivo_id) REFERENCES documentos.documentos_archivos(id);


--
-- Name: documento_eventos documento_eventos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_eventos
    ADD CONSTRAINT documento_eventos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_eventos documento_eventos_expediente_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_eventos
    ADD CONSTRAINT documento_eventos_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES documentos.expedientes(id);


--
-- Name: documento_relaciones documento_relaciones_documento_destino_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_documento_destino_id_fkey FOREIGN KEY (documento_destino_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_relaciones documento_relaciones_documento_origen_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_documento_origen_id_fkey FOREIGN KEY (documento_origen_id) REFERENCES documentos.documentos(id);


--
-- Name: documentos_archivos documentos_archivos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_archivos
    ADD CONSTRAINT documentos_archivos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documentos_factura documentos_factura_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_factura
    ADD CONSTRAINT documentos_factura_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_guia_remision documentos_guia_remision_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_guia_remision
    ADD CONSTRAINT documentos_guia_remision_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_nota_ingreso documentos_nota_ingreso_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_nota_ingreso
    ADD CONSTRAINT documentos_nota_ingreso_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_oc documentos_oc_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_oc
    ADD CONSTRAINT documentos_oc_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_origenes documentos_origenes_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_origenes
    ADD CONSTRAINT documentos_origenes_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documentos_os documentos_os_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_os
    ADD CONSTRAINT documentos_os_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_otro documentos_otro_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_otro
    ADD CONSTRAINT documentos_otro_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_pago_detraccion documentos_pago_detraccion_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_pago_detraccion
    ADD CONSTRAINT documentos_pago_detraccion_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_pago_transferencia documentos_pago_transferencia_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_pago_transferencia
    ADD CONSTRAINT documentos_pago_transferencia_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_recibo_honorario documentos_recibo_honorario_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.documentos_recibo_honorario
    ADD CONSTRAINT documentos_recibo_honorario_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: expediente_documentos expediente_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.expediente_documentos
    ADD CONSTRAINT expediente_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: expediente_documentos expediente_documentos_expediente_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.expediente_documentos
    ADD CONSTRAINT expediente_documentos_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES documentos.expedientes(id);


--
-- Name: expedientes expedientes_cliente_destino_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.expedientes
    ADD CONSTRAINT expedientes_cliente_destino_id_fkey FOREIGN KEY (cliente_destino_id) REFERENCES core.clientes_destino(id);


--
-- Name: grupo_documentos grupo_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: grupo_documentos grupo_documentos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES documentos.grupos_documentales(id);


--
-- Name: grupos_documentales grupos_documentales_asiento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupos_documentales
    ADD CONSTRAINT grupos_documentales_asiento_id_fkey FOREIGN KEY (asiento_id) REFERENCES documentos.asientos_documentales(id);


--
-- Name: grupos_documentales grupos_documentales_cliente_destino_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.grupos_documentales
    ADD CONSTRAINT grupos_documentales_cliente_destino_id_fkey FOREIGN KEY (cliente_destino_id) REFERENCES core.clientes_destino(id);


--
-- Name: ocr_resultados ocr_resultados_archivo_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.ocr_resultados
    ADD CONSTRAINT ocr_resultados_archivo_id_fkey FOREIGN KEY (archivo_id) REFERENCES documentos.documentos_archivos(id);


--
-- Name: ocr_resultados ocr_resultados_expediente_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: postgres
--

ALTER TABLE ONLY documentos.ocr_resultados
    ADD CONSTRAINT ocr_resultados_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES documentos.expedientes(id);


--
-- Name: TABLE documento_eventos; Type: ACL; Schema: documentos; Owner: postgres
--

GRANT SELECT,INSERT ON TABLE documentos.documento_eventos TO platform_app;


--
-- Name: SEQUENCE documento_eventos_id_seq; Type: ACL; Schema: documentos; Owner: postgres
--

GRANT SELECT,USAGE ON SEQUENCE documentos.documento_eventos_id_seq TO platform_app;


--
-- PostgreSQL database dump complete
--

\unrestrict 9SomXKZPmJX5XcobfdnlLMa6kRtP1YfqegmDN4KQE9VvyBYc7uW6XCr9K6HTvBD

