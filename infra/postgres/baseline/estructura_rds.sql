--
-- PostgreSQL database dump
--

\restrict XoRuYjmC7DS3bcdNY2Mbl9nSKiY3XknrFfzsRq2QjbsvkRbLGENWLl4rzxjMhgO

-- Dumped from database version 16.14 (Debian 16.14-1.pgdg13+1)
-- Dumped by pg_dump version 16.14 (Ubuntu 16.14-0ubuntu0.24.04.1)

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
-- Name: auditoria; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auditoria;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA core;


--
-- Name: documentos; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA documentos;


--
-- Name: proyectos; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA proyectos;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: perfiles; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: perfiles_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.perfiles_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: perfiles_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.perfiles_id_seq OWNED BY auth.perfiles.id;


--
-- Name: sistemas; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sistemas (
    id integer NOT NULL,
    codigo character varying(50) NOT NULL,
    nombre character varying(120) NOT NULL,
    estado character varying(20) DEFAULT 'activo'::character varying
);


--
-- Name: TABLE sistemas; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sistemas IS 'LEGACY: reemplazada por core.sistemas. No usar para nuevos desarrollos.';


--
-- Name: sistemas_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.sistemas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sistemas_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.sistemas_id_seq OWNED BY auth.sistemas.id;


--
-- Name: usuario_accesos; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: TABLE usuario_accesos; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.usuario_accesos IS 'LEGACY: reemplazada por auth.usuario_workspaces. No usar para nuevos desarrollos.';


--
-- Name: usuario_accesos_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.usuario_accesos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_accesos_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.usuario_accesos_id_seq OWNED BY auth.usuario_accesos.id;


--
-- Name: usuario_workspaces; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: usuario_workspaces_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.usuario_workspaces_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuario_workspaces_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.usuario_workspaces_id_seq OWNED BY auth.usuario_workspaces.id;


--
-- Name: usuarios; Type: TABLE; Schema: auth; Owner: -
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


--
-- Name: usuarios_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.usuarios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: usuarios_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.usuarios_id_seq OWNED BY auth.usuarios.id;


--
-- Name: auditoria_eventos; Type: TABLE; Schema: core; Owner: -
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


--
-- Name: auditoria_eventos_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.auditoria_eventos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: auditoria_eventos_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core.auditoria_eventos_id_seq OWNED BY core.auditoria_eventos.id;


--
-- Name: bancos; Type: TABLE; Schema: core; Owner: -
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


--
-- Name: bancos_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.bancos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bancos_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core.bancos_id_seq OWNED BY core.bancos.id;


--
-- Name: clientes_destino_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.clientes_destino_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clientes_destino; Type: TABLE; Schema: core; Owner: -
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


--
-- Name: monedas; Type: TABLE; Schema: core; Owner: -
--

CREATE TABLE core.monedas (
    id integer NOT NULL,
    codigo character varying(10) NOT NULL,
    nombre character varying(50) NOT NULL,
    simbolo character varying(10),
    activo boolean DEFAULT true NOT NULL,
    orden integer DEFAULT 0 NOT NULL
);


--
-- Name: monedas_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.monedas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: monedas_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core.monedas_id_seq OWNED BY core.monedas.id;


--
-- Name: proveedores_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.proveedores_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: proveedores; Type: TABLE; Schema: core; Owner: -
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


--
-- Name: sistemas; Type: TABLE; Schema: core; Owner: -
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


--
-- Name: sistemas_id_seq; Type: SEQUENCE; Schema: core; Owner: -
--

CREATE SEQUENCE core.sistemas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sistemas_id_seq; Type: SEQUENCE OWNED BY; Schema: core; Owner: -
--

ALTER SEQUENCE core.sistemas_id_seq OWNED BY core.sistemas.id;


--
-- Name: asientos_documentales; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: asientos_documentales_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.asientos_documentales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asientos_documentales_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.asientos_documentales_id_seq OWNED BY documentos.asientos_documentales.id;


--
-- Name: asientos_documentos; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.asientos_documentos (
    id integer NOT NULL,
    asiento_id integer,
    documento_id integer,
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: asientos_documentos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.asientos_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asientos_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.asientos_documentos_id_seq OWNED BY documentos.asientos_documentos.id;


--
-- Name: cierres_contables; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: cierres_contables_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.cierres_contables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cierres_contables_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.cierres_contables_id_seq OWNED BY documentos.cierres_contables.id;


--
-- Name: documento_alertas; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: documento_alertas_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.documento_alertas_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documento_alertas_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.documento_alertas_id_seq OWNED BY documentos.documento_alertas.id;


--
-- Name: documento_relaciones; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documento_relaciones (
    id bigint NOT NULL,
    documento_origen_id integer NOT NULL,
    documento_destino_id integer NOT NULL,
    tipo_relacion character varying(50) NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documento_relaciones_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.documento_relaciones_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documento_relaciones_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.documento_relaciones_id_seq OWNED BY documentos.documento_relaciones.id;


--
-- Name: documentos; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: documentos_archivos; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: documentos_archivos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.documentos_archivos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_archivos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.documentos_archivos_id_seq OWNED BY documentos.documentos_archivos.id;


--
-- Name: documentos_factura; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: documentos_guia_remision; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_guia_remision (
    documento_id integer NOT NULL,
    ruc_emisor character varying(20),
    razon_social_emisor text,
    serie character varying(30),
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documentos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.documentos_id_seq OWNED BY documentos.documentos.id;


--
-- Name: documentos_nota_ingreso; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_nota_ingreso (
    documento_id integer NOT NULL,
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documentos_oc; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_oc (
    documento_id integer NOT NULL,
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documentos_origenes; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_origenes (
    id integer NOT NULL,
    documento_id integer,
    tabla_origen character varying(50) NOT NULL,
    registro_origen_id integer NOT NULL,
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documentos_origenes_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.documentos_origenes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_origenes_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.documentos_origenes_id_seq OWNED BY documentos.documentos_origenes.id;


--
-- Name: documentos_os; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_os (
    documento_id integer NOT NULL,
    numero character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documentos_otro; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_otro (
    documento_id integer NOT NULL,
    descripcion text,
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: documentos_pago_detraccion; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: documentos_pago_transferencia; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.documentos_pago_transferencia (
    documento_id integer NOT NULL,
    banco_abreviatura character varying(30),
    codigo_operacion character varying(100),
    creado_en timestamp without time zone DEFAULT now(),
    monto numeric(14,2),
    fecha_operacion date
);


--
-- Name: documentos_recibo_honorario; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: documentos_recibo_honorario_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.documentos_recibo_honorario_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: documentos_recibo_honorario_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.documentos_recibo_honorario_id_seq OWNED BY documentos.documentos_recibo_honorario.id;


--
-- Name: expediente_documentos; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.expediente_documentos (
    expediente_id bigint NOT NULL,
    documento_id integer NOT NULL,
    tipo_relacion character varying(50),
    creado_en timestamp without time zone DEFAULT now(),
    es_principal boolean DEFAULT false,
    orden integer DEFAULT 0
);


--
-- Name: expedientes; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: expedientes_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.expedientes_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expedientes_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.expedientes_id_seq OWNED BY documentos.expedientes.id;


--
-- Name: grupo_documentos; Type: TABLE; Schema: documentos; Owner: -
--

CREATE TABLE documentos.grupo_documentos (
    id integer NOT NULL,
    grupo_id integer,
    documento_id integer,
    tipo_relacion character varying(50),
    creado_en timestamp without time zone DEFAULT now()
);


--
-- Name: grupo_documentos_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.grupo_documentos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupo_documentos_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.grupo_documentos_id_seq OWNED BY documentos.grupo_documentos.id;


--
-- Name: grupos_documentales; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: grupos_documentales_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.grupos_documentales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: grupos_documentales_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.grupos_documentales_id_seq OWNED BY documentos.grupos_documentales.id;


--
-- Name: ocr_resultados; Type: TABLE; Schema: documentos; Owner: -
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


--
-- Name: ocr_resultados_id_seq; Type: SEQUENCE; Schema: documentos; Owner: -
--

CREATE SEQUENCE documentos.ocr_resultados_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ocr_resultados_id_seq; Type: SEQUENCE OWNED BY; Schema: documentos; Owner: -
--

ALTER SEQUENCE documentos.ocr_resultados_id_seq OWNED BY documentos.ocr_resultados.id;


--
-- Name: perfiles id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.perfiles ALTER COLUMN id SET DEFAULT nextval('auth.perfiles_id_seq'::regclass);


--
-- Name: sistemas id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sistemas ALTER COLUMN id SET DEFAULT nextval('auth.sistemas_id_seq'::regclass);


--
-- Name: usuario_accesos id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_accesos ALTER COLUMN id SET DEFAULT nextval('auth.usuario_accesos_id_seq'::regclass);


--
-- Name: usuario_workspaces id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_workspaces ALTER COLUMN id SET DEFAULT nextval('auth.usuario_workspaces_id_seq'::regclass);


--
-- Name: usuarios id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuarios ALTER COLUMN id SET DEFAULT nextval('auth.usuarios_id_seq'::regclass);


--
-- Name: auditoria_eventos id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.auditoria_eventos ALTER COLUMN id SET DEFAULT nextval('core.auditoria_eventos_id_seq'::regclass);


--
-- Name: bancos id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.bancos ALTER COLUMN id SET DEFAULT nextval('core.bancos_id_seq'::regclass);


--
-- Name: monedas id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.monedas ALTER COLUMN id SET DEFAULT nextval('core.monedas_id_seq'::regclass);


--
-- Name: sistemas id; Type: DEFAULT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.sistemas ALTER COLUMN id SET DEFAULT nextval('core.sistemas_id_seq'::regclass);


--
-- Name: asientos_documentales id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentales ALTER COLUMN id SET DEFAULT nextval('documentos.asientos_documentales_id_seq'::regclass);


--
-- Name: asientos_documentos id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentos ALTER COLUMN id SET DEFAULT nextval('documentos.asientos_documentos_id_seq'::regclass);


--
-- Name: cierres_contables id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.cierres_contables ALTER COLUMN id SET DEFAULT nextval('documentos.cierres_contables_id_seq'::regclass);


--
-- Name: documento_alertas id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_alertas ALTER COLUMN id SET DEFAULT nextval('documentos.documento_alertas_id_seq'::regclass);


--
-- Name: documento_relaciones id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_relaciones ALTER COLUMN id SET DEFAULT nextval('documentos.documento_relaciones_id_seq'::regclass);


--
-- Name: documentos id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_id_seq'::regclass);


--
-- Name: documentos_archivos id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_archivos ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_archivos_id_seq'::regclass);


--
-- Name: documentos_origenes id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_origenes ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_origenes_id_seq'::regclass);


--
-- Name: documentos_recibo_honorario id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_recibo_honorario ALTER COLUMN id SET DEFAULT nextval('documentos.documentos_recibo_honorario_id_seq'::regclass);


--
-- Name: expedientes id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.expedientes ALTER COLUMN id SET DEFAULT nextval('documentos.expedientes_id_seq'::regclass);


--
-- Name: grupo_documentos id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupo_documentos ALTER COLUMN id SET DEFAULT nextval('documentos.grupo_documentos_id_seq'::regclass);


--
-- Name: grupos_documentales id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupos_documentales ALTER COLUMN id SET DEFAULT nextval('documentos.grupos_documentales_id_seq'::regclass);


--
-- Name: ocr_resultados id; Type: DEFAULT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.ocr_resultados ALTER COLUMN id SET DEFAULT nextval('documentos.ocr_resultados_id_seq'::regclass);


--
-- Name: perfiles perfiles_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.perfiles
    ADD CONSTRAINT perfiles_pkey PRIMARY KEY (id);


--
-- Name: perfiles perfiles_sistema_id_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.perfiles
    ADD CONSTRAINT perfiles_sistema_id_codigo_key UNIQUE (sistema_id, codigo);


--
-- Name: sistemas sistemas_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sistemas
    ADD CONSTRAINT sistemas_codigo_key UNIQUE (codigo);


--
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: usuario_accesos usuario_accesos_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_pkey PRIMARY KEY (id);


--
-- Name: usuario_accesos usuario_accesos_usuario_id_sistema_id_empresa_codigo_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_usuario_id_sistema_id_empresa_codigo_key UNIQUE (usuario_id, sistema_id, empresa_codigo);


--
-- Name: usuario_workspaces usuario_workspaces_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_pkey PRIMARY KEY (id);


--
-- Name: usuario_workspaces usuario_workspaces_usuario_id_empresa_codigo_sistema_id_per_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_usuario_id_empresa_codigo_sistema_id_per_key UNIQUE (usuario_id, empresa_codigo, sistema_id, perfil_id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: auditoria_eventos auditoria_eventos_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.auditoria_eventos
    ADD CONSTRAINT auditoria_eventos_pkey PRIMARY KEY (id);


--
-- Name: bancos bancos_codigo_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.bancos
    ADD CONSTRAINT bancos_codigo_key UNIQUE (codigo);


--
-- Name: bancos bancos_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.bancos
    ADD CONSTRAINT bancos_pkey PRIMARY KEY (id);


--
-- Name: clientes_destino clientes_destino_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.clientes_destino
    ADD CONSTRAINT clientes_destino_pkey PRIMARY KEY (id);


--
-- Name: monedas monedas_codigo_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.monedas
    ADD CONSTRAINT monedas_codigo_key UNIQUE (codigo);


--
-- Name: monedas monedas_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.monedas
    ADD CONSTRAINT monedas_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.proveedores
    ADD CONSTRAINT proveedores_pkey PRIMARY KEY (id);


--
-- Name: proveedores proveedores_ruc_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.proveedores
    ADD CONSTRAINT proveedores_ruc_key UNIQUE (ruc);


--
-- Name: sistemas sistemas_codigo_key; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.sistemas
    ADD CONSTRAINT sistemas_codigo_key UNIQUE (codigo);


--
-- Name: sistemas sistemas_pkey; Type: CONSTRAINT; Schema: core; Owner: -
--

ALTER TABLE ONLY core.sistemas
    ADD CONSTRAINT sistemas_pkey PRIMARY KEY (id);


--
-- Name: asientos_documentales asientos_documentales_cliente_abreviatura_anio_mes_asiento__key; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentales
    ADD CONSTRAINT asientos_documentales_cliente_abreviatura_anio_mes_asiento__key UNIQUE (cliente_abreviatura, anio, mes, asiento_interno);


--
-- Name: asientos_documentales asientos_documentales_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentales
    ADD CONSTRAINT asientos_documentales_pkey PRIMARY KEY (id);


--
-- Name: asientos_documentos asientos_documentos_asiento_id_documento_id_key; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_asiento_id_documento_id_key UNIQUE (asiento_id, documento_id);


--
-- Name: asientos_documentos asientos_documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_pkey PRIMARY KEY (id);


--
-- Name: cierres_contables cierres_contables_empresa_codigo_anio_mes_key; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.cierres_contables
    ADD CONSTRAINT cierres_contables_empresa_codigo_anio_mes_key UNIQUE (empresa_codigo, anio, mes);


--
-- Name: cierres_contables cierres_contables_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.cierres_contables
    ADD CONSTRAINT cierres_contables_pkey PRIMARY KEY (id);


--
-- Name: documento_alertas documento_alertas_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_alertas
    ADD CONSTRAINT documento_alertas_pkey PRIMARY KEY (id);


--
-- Name: documento_relaciones documento_relaciones_documento_origen_id_documento_destino__key; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_documento_origen_id_documento_destino__key UNIQUE (documento_origen_id, documento_destino_id, tipo_relacion);


--
-- Name: documento_relaciones documento_relaciones_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_pkey PRIMARY KEY (id);


--
-- Name: documentos_archivos documentos_archivos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_archivos
    ADD CONSTRAINT documentos_archivos_pkey PRIMARY KEY (id);


--
-- Name: documentos_factura documentos_factura_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_factura
    ADD CONSTRAINT documentos_factura_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_guia_remision documentos_guia_remision_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_guia_remision
    ADD CONSTRAINT documentos_guia_remision_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_nota_ingreso documentos_nota_ingreso_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_nota_ingreso
    ADD CONSTRAINT documentos_nota_ingreso_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_oc documentos_oc_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_oc
    ADD CONSTRAINT documentos_oc_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_origenes documentos_origenes_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_origenes
    ADD CONSTRAINT documentos_origenes_pkey PRIMARY KEY (id);


--
-- Name: documentos_origenes documentos_origenes_tabla_origen_registro_origen_id_key; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_origenes
    ADD CONSTRAINT documentos_origenes_tabla_origen_registro_origen_id_key UNIQUE (tabla_origen, registro_origen_id);


--
-- Name: documentos_os documentos_os_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_os
    ADD CONSTRAINT documentos_os_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_otro documentos_otro_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_otro
    ADD CONSTRAINT documentos_otro_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_pago_detraccion documentos_pago_detraccion_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_pago_detraccion
    ADD CONSTRAINT documentos_pago_detraccion_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos_pago_transferencia documentos_pago_transferencia_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_pago_transferencia
    ADD CONSTRAINT documentos_pago_transferencia_pkey PRIMARY KEY (documento_id);


--
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id);


--
-- Name: documentos_recibo_honorario documentos_recibo_honorario_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_recibo_honorario
    ADD CONSTRAINT documentos_recibo_honorario_pkey PRIMARY KEY (id);


--
-- Name: expediente_documentos expediente_documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.expediente_documentos
    ADD CONSTRAINT expediente_documentos_pkey PRIMARY KEY (expediente_id, documento_id);


--
-- Name: expedientes expedientes_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.expedientes
    ADD CONSTRAINT expedientes_pkey PRIMARY KEY (id);


--
-- Name: grupo_documentos grupo_documentos_grupo_id_documento_id_key; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_grupo_id_documento_id_key UNIQUE (grupo_id, documento_id);


--
-- Name: grupo_documentos grupo_documentos_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_pkey PRIMARY KEY (id);


--
-- Name: grupos_documentales grupos_documentales_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupos_documentales
    ADD CONSTRAINT grupos_documentales_pkey PRIMARY KEY (id);


--
-- Name: ocr_resultados ocr_resultados_pkey; Type: CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.ocr_resultados
    ADD CONSTRAINT ocr_resultados_pkey PRIMARY KEY (id);


--
-- Name: idx_usuario_workspaces_empresa; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_usuario_workspaces_empresa ON auth.usuario_workspaces USING btree (empresa_codigo, estado);


--
-- Name: idx_usuario_workspaces_usuario; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_usuario_workspaces_usuario ON auth.usuario_workspaces USING btree (usuario_id, estado);


--
-- Name: usuario_workspaces_un_favorito_por_usuario_sistema; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX usuario_workspaces_un_favorito_por_usuario_sistema ON auth.usuario_workspaces USING btree (usuario_id, sistema_id) WHERE ((es_favorito = true) AND ((estado)::text = 'activo'::text));


--
-- Name: idx_auditoria_eventos_entidad; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX idx_auditoria_eventos_entidad ON core.auditoria_eventos USING btree (entidad, entidad_id);


--
-- Name: idx_auditoria_eventos_request; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX idx_auditoria_eventos_request ON core.auditoria_eventos USING btree (request_id);


--
-- Name: idx_auditoria_eventos_workspace; Type: INDEX; Schema: core; Owner: -
--

CREATE INDEX idx_auditoria_eventos_workspace ON core.auditoria_eventos USING btree (workspace_id, creado_en DESC);


--
-- Name: idx_documento_relaciones_destino; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documento_relaciones_destino ON documentos.documento_relaciones USING btree (documento_destino_id);


--
-- Name: idx_documento_relaciones_origen; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documento_relaciones_origen ON documentos.documento_relaciones USING btree (documento_origen_id);


--
-- Name: idx_documentos_archivos_documento_actual; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_archivos_documento_actual ON documentos.documentos_archivos USING btree (documento_id, es_version_actual);


--
-- Name: idx_documentos_archivos_documento_version; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_archivos_documento_version ON documentos.documentos_archivos USING btree (documento_id, version);


--
-- Name: idx_documentos_archivos_tipo_version; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_archivos_tipo_version ON documentos.documentos_archivos USING btree (tipo_version);


--
-- Name: idx_documentos_clave_documental; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_clave_documental ON documentos.documentos USING btree (clave_documental);


--
-- Name: idx_documentos_cliente_periodo; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_cliente_periodo ON documentos.documentos USING btree (cliente_abreviatura, periodo_anio, periodo_mes);


--
-- Name: idx_documentos_fecha_emision; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_fecha_emision ON documentos.documentos USING btree (fecha_emision);


--
-- Name: idx_documentos_tipo_estado; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_documentos_tipo_estado ON documentos.documentos USING btree (tipo_documental, estado);


--
-- Name: idx_expediente_documentos_documento; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_expediente_documentos_documento ON documentos.expediente_documentos USING btree (documento_id);


--
-- Name: idx_expedientes_cliente_codigo; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_expedientes_cliente_codigo ON documentos.expedientes USING btree (cliente_destino_id, codigo_expediente);


--
-- Name: idx_expedientes_cliente_destino; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_expedientes_cliente_destino ON documentos.expedientes USING btree (cliente_destino_id);


--
-- Name: idx_expedientes_codigo; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_expedientes_codigo ON documentos.expedientes USING btree (codigo_expediente);


--
-- Name: idx_expedientes_empresa; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_expedientes_empresa ON documentos.expedientes USING btree (empresa_codigo);


--
-- Name: idx_expedientes_empresa_codigo; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_expedientes_empresa_codigo ON documentos.expedientes USING btree (empresa_codigo, codigo_expediente);


--
-- Name: idx_ocr_resultados_archivo_id; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_ocr_resultados_archivo_id ON documentos.ocr_resultados USING btree (archivo_id);


--
-- Name: idx_ocr_resultados_clave_documental; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_ocr_resultados_clave_documental ON documentos.ocr_resultados USING btree (clave_documental);


--
-- Name: idx_ocr_resultados_estado; Type: INDEX; Schema: documentos; Owner: -
--

CREATE INDEX idx_ocr_resultados_estado ON documentos.ocr_resultados USING btree (estado);


--
-- Name: uq_asientos_documentos_asiento_documento; Type: INDEX; Schema: documentos; Owner: -
--

CREATE UNIQUE INDEX uq_asientos_documentos_asiento_documento ON documentos.asientos_documentos USING btree (asiento_id, documento_id);


--
-- Name: uq_documentos_origenes_tabla_registro; Type: INDEX; Schema: documentos; Owner: -
--

CREATE UNIQUE INDEX uq_documentos_origenes_tabla_registro ON documentos.documentos_origenes USING btree (tabla_origen, registro_origen_id);


--
-- Name: uq_documentos_recibo_honorario_documento; Type: INDEX; Schema: documentos; Owner: -
--

CREATE UNIQUE INDEX uq_documentos_recibo_honorario_documento ON documentos.documentos_recibo_honorario USING btree (documento_id);


--
-- Name: uq_expediente_documentos_documento_id; Type: INDEX; Schema: documentos; Owner: -
--

CREATE UNIQUE INDEX uq_expediente_documentos_documento_id ON documentos.expediente_documentos USING btree (documento_id);


--
-- Name: ux_documentos_archivos_un_actual; Type: INDEX; Schema: documentos; Owner: -
--

CREATE UNIQUE INDEX ux_documentos_archivos_un_actual ON documentos.documentos_archivos USING btree (documento_id) WHERE ((es_version_actual = true) AND (documento_id IS NOT NULL));


--
-- Name: perfiles perfiles_sistema_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.perfiles
    ADD CONSTRAINT perfiles_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES core.sistemas(id);


--
-- Name: usuario_accesos usuario_accesos_sistema_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES auth.sistemas(id);


--
-- Name: usuario_accesos usuario_accesos_usuario_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_accesos
    ADD CONSTRAINT usuario_accesos_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.usuarios(id);


--
-- Name: usuario_workspaces usuario_workspaces_perfil_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_perfil_id_fkey FOREIGN KEY (perfil_id) REFERENCES auth.perfiles(id);


--
-- Name: usuario_workspaces usuario_workspaces_sistema_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES core.sistemas(id);


--
-- Name: usuario_workspaces usuario_workspaces_usuario_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.usuario_workspaces
    ADD CONSTRAINT usuario_workspaces_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.usuarios(id);


--
-- Name: asientos_documentos asientos_documentos_asiento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_asiento_id_fkey FOREIGN KEY (asiento_id) REFERENCES documentos.asientos_documentales(id);


--
-- Name: asientos_documentos asientos_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.asientos_documentos
    ADD CONSTRAINT asientos_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_alertas documento_alertas_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_alertas
    ADD CONSTRAINT documento_alertas_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_relaciones documento_relaciones_documento_destino_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_documento_destino_id_fkey FOREIGN KEY (documento_destino_id) REFERENCES documentos.documentos(id);


--
-- Name: documento_relaciones documento_relaciones_documento_origen_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documento_relaciones
    ADD CONSTRAINT documento_relaciones_documento_origen_id_fkey FOREIGN KEY (documento_origen_id) REFERENCES documentos.documentos(id);


--
-- Name: documentos_archivos documentos_archivos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_archivos
    ADD CONSTRAINT documentos_archivos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documentos_factura documentos_factura_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_factura
    ADD CONSTRAINT documentos_factura_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_guia_remision documentos_guia_remision_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_guia_remision
    ADD CONSTRAINT documentos_guia_remision_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_nota_ingreso documentos_nota_ingreso_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_nota_ingreso
    ADD CONSTRAINT documentos_nota_ingreso_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_oc documentos_oc_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_oc
    ADD CONSTRAINT documentos_oc_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_origenes documentos_origenes_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_origenes
    ADD CONSTRAINT documentos_origenes_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: documentos_os documentos_os_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_os
    ADD CONSTRAINT documentos_os_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_otro documentos_otro_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_otro
    ADD CONSTRAINT documentos_otro_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_pago_detraccion documentos_pago_detraccion_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_pago_detraccion
    ADD CONSTRAINT documentos_pago_detraccion_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_pago_transferencia documentos_pago_transferencia_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_pago_transferencia
    ADD CONSTRAINT documentos_pago_transferencia_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id) ON DELETE CASCADE;


--
-- Name: documentos_recibo_honorario documentos_recibo_honorario_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.documentos_recibo_honorario
    ADD CONSTRAINT documentos_recibo_honorario_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: expediente_documentos expediente_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.expediente_documentos
    ADD CONSTRAINT expediente_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: expediente_documentos expediente_documentos_expediente_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.expediente_documentos
    ADD CONSTRAINT expediente_documentos_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES documentos.expedientes(id);


--
-- Name: expedientes expedientes_cliente_destino_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.expedientes
    ADD CONSTRAINT expedientes_cliente_destino_id_fkey FOREIGN KEY (cliente_destino_id) REFERENCES core.clientes_destino(id);


--
-- Name: grupo_documentos grupo_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES documentos.documentos(id);


--
-- Name: grupo_documentos grupo_documentos_grupo_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupo_documentos
    ADD CONSTRAINT grupo_documentos_grupo_id_fkey FOREIGN KEY (grupo_id) REFERENCES documentos.grupos_documentales(id);


--
-- Name: grupos_documentales grupos_documentales_asiento_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupos_documentales
    ADD CONSTRAINT grupos_documentales_asiento_id_fkey FOREIGN KEY (asiento_id) REFERENCES documentos.asientos_documentales(id);


--
-- Name: grupos_documentales grupos_documentales_cliente_destino_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.grupos_documentales
    ADD CONSTRAINT grupos_documentales_cliente_destino_id_fkey FOREIGN KEY (cliente_destino_id) REFERENCES core.clientes_destino(id);


--
-- Name: ocr_resultados ocr_resultados_archivo_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.ocr_resultados
    ADD CONSTRAINT ocr_resultados_archivo_id_fkey FOREIGN KEY (archivo_id) REFERENCES documentos.documentos_archivos(id);


--
-- Name: ocr_resultados ocr_resultados_expediente_id_fkey; Type: FK CONSTRAINT; Schema: documentos; Owner: -
--

ALTER TABLE ONLY documentos.ocr_resultados
    ADD CONSTRAINT ocr_resultados_expediente_id_fkey FOREIGN KEY (expediente_id) REFERENCES documentos.expedientes(id);


--
-- PostgreSQL database dump complete
--

\unrestrict XoRuYjmC7DS3bcdNY2Mbl9nSKiY3XknrFfzsRq2QjbsvkRbLGENWLl4rzxjMhgO

