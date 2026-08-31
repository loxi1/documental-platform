-- ============================================================================
-- Gestion Documental - baseline estructural final
--
-- Fuentes absorbidas:
--   estructura_rds.sql, 0002, 0006, 0007, 0008 y 0011-0015.
--
-- Requisitos de ejecución:
--   * Base gestion_documental ya creada.
--   * Rol document_platform ya creado, sin incluir contraseñas en este archivo.
--   * Ejecutar en una base vacía; no es una migración incremental.
--
-- Las versiones legacy 0002-0010 quedan documentadas como absorbidas, pero no
-- se registran en core.schema_migrations. Solo se adoptan 0011-0015 usando los
-- checksums vigentes del manifest para que el runner no repita sus cambios.
-- ============================================================================

-- Garantiza propiedad consistente de todos los objetos creados.
SET ROLE document_platform;

--
-- PostgreSQL database dump
--


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

CREATE SCHEMA IF NOT EXISTS auditoria;


--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS auth;


--
-- Name: core; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS core;


--
-- Name: documentos; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS documentos;


-- El schema proyectos no forma parte de este baseline documental.


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

-- ============================================================================
-- DELTAS LEGACY ABSORBIDOS (NO REGISTRADOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS core.schema_migrations (
  version varchar(50) PRIMARY KEY,
  descripcion text,
  checksum text,
  ejecutado_en timestamp without time zone NOT NULL DEFAULT now(),
  ejecutado_por varchar(120) NOT NULL DEFAULT current_user
);

GRANT SELECT, INSERT, UPDATE, DELETE
  ON core.schema_migrations
  TO document_platform;

CREATE TABLE IF NOT EXISTS documentos.documento_eventos (
  id BIGSERIAL PRIMARY KEY,

  documento_id BIGINT NULL REFERENCES documentos.documentos(id),
  archivo_id BIGINT NULL REFERENCES documentos.documentos_archivos(id),

  tipo_evento VARCHAR(80) NOT NULL,

  entidad_tipo VARCHAR(80) NULL,
  entidad_id BIGINT NULL,

  expediente_id BIGINT NULL REFERENCES documentos.expedientes(id),

  descripcion TEXT NULL,

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  usuario_id BIGINT NULL,

  origen VARCHAR(50) NOT NULL DEFAULT 'sistema',

  request_id UUID NULL,
  correlation_id UUID NULL,

  evento_version INT NOT NULL DEFAULT 1,

  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_documento_creado
ON documentos.documento_eventos(documento_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_archivo_creado
ON documentos.documento_eventos(archivo_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_expediente_creado
ON documentos.documento_eventos(expediente_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_tipo_creado
ON documentos.documento_eventos(tipo_evento, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_request_id
ON documentos.documento_eventos(request_id);

CREATE INDEX IF NOT EXISTS idx_documento_eventos_correlation_id
ON documentos.documento_eventos(correlation_id);

GRANT SELECT, INSERT
ON documentos.documento_eventos
TO document_platform;

GRANT USAGE, SELECT
ON SEQUENCE documentos.documento_eventos_id_seq
TO document_platform;

ALTER TABLE documentos.expedientes
  ADD COLUMN IF NOT EXISTS creado_por BIGINT NULL,
  ADD COLUMN IF NOT EXISTS actualizado_por BIGINT NULL,
  ADD COLUMN IF NOT EXISTS anulado_en TIMESTAMP WITHOUT TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS anulado_por BIGINT NULL,
  ADD COLUMN IF NOT EXISTS motivo_anulacion TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_expedientes_actualizado_por
ON documentos.expedientes(actualizado_por);

CREATE INDEX IF NOT EXISTS idx_expedientes_anulado_por
ON documentos.expedientes(anulado_por);

CREATE TABLE IF NOT EXISTS documentos.expediente_auditoria (
  id BIGSERIAL PRIMARY KEY,
  expediente_id BIGINT NOT NULL REFERENCES documentos.expedientes(id),
  accion VARCHAR(80) NOT NULL,
  estado_anterior VARCHAR(30) NULL,
  estado_nuevo VARCHAR(30) NULL,
  codigo_anterior VARCHAR(50) NULL,
  codigo_nuevo VARCHAR(50) NULL,
  descripcion_anterior TEXT NULL,
  descripcion_nueva TEXT NULL,
  metadata_anterior JSONB NULL,
  metadata_nueva JSONB NULL,
  usuario_id BIGINT NULL,
  usuario_email VARCHAR(250) NULL,
  perfil VARCHAR(80) NULL,
  empresa_codigo VARCHAR(20) NULL,
  cliente_destino_id INT NULL,
  request_id UUID NULL,
  session_context_id UUID NULL,
  detalle JSONB NOT NULL DEFAULT '{}'::jsonb,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_expediente_creado
ON documentos.expediente_auditoria(expediente_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_accion_creado
ON documentos.expediente_auditoria(accion, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_usuario_creado
ON documentos.expediente_auditoria(usuario_id, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_expediente_auditoria_request_id
ON documentos.expediente_auditoria(request_id);

GRANT SELECT, INSERT
ON documentos.expediente_auditoria
TO document_platform;

GRANT USAGE, SELECT
ON SEQUENCE documentos.expediente_auditoria_id_seq
TO document_platform;

GRANT SELECT, INSERT, UPDATE
ON documentos.expedientes
TO document_platform;

-- ============================================================
-- Sprint 1.6A
-- Modelo Documental V2 - Capa física base
--
-- Migración aditiva.
-- No destruye V1.
-- No modifica documentos.documentos.
-- No modifica documentos.expediente_documentos.
-- No rompe carga guiada ni prevalidación actual.
-- ============================================================

CREATE TABLE IF NOT EXISTS documentos.contenedores_operativos (
  id BIGSERIAL PRIMARY KEY,

  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id BIGINT NULL,

  tipo_contexto VARCHAR(50) NOT NULL,
  codigo VARCHAR(100) NOT NULL,
  nombre VARCHAR(255) NULL,
  descripcion TEXT NULL,

  centro_costo_codigo VARCHAR(100) NULL,
  orden_produccion_codigo VARCHAR(100) NULL,
  proyecto_codigo VARCHAR(100) NULL,

  estado VARCHAR(30) NOT NULL DEFAULT 'activo',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_contenedor_operativo_empresa_tipo_codigo
    UNIQUE (empresa_codigo, tipo_contexto, codigo)
);

CREATE TABLE IF NOT EXISTS documentos.documentos_operativos_principales (
  id BIGSERIAL PRIMARY KEY,

  contenedor_operativo_id BIGINT NOT NULL
    REFERENCES documentos.contenedores_operativos(id)
    ON DELETE RESTRICT,

  documento_id BIGINT NOT NULL
    REFERENCES documentos.documentos(id)
    ON DELETE RESTRICT,

  tipo_principal VARCHAR(50) NOT NULL,

  es_principal_activo BOOLEAN NOT NULL DEFAULT false,

  estado VARCHAR(30) NOT NULL DEFAULT 'activo',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_documento_operativo_principal_documento
    UNIQUE (documento_id),

  CONSTRAINT uq_documento_operativo_principal_contenedor_documento
    UNIQUE (contenedor_operativo_id, documento_id)
);

CREATE TABLE IF NOT EXISTS documentos.grupos_factura (
  id BIGSERIAL PRIMARY KEY,

  documento_operativo_principal_id BIGINT NOT NULL
    REFERENCES documentos.documentos_operativos_principales(id)
    ON DELETE RESTRICT,

  factura_documento_id BIGINT NOT NULL
    REFERENCES documentos.documentos(id)
    ON DELETE RESTRICT,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_revision',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_grupo_factura_documento
    UNIQUE (factura_documento_id)
);

CREATE TABLE IF NOT EXISTS documentos.grupo_factura_documentos (
  id BIGSERIAL PRIMARY KEY,

  grupo_factura_id BIGINT NOT NULL
    REFERENCES documentos.grupos_factura(id)
    ON DELETE RESTRICT,

  documento_id BIGINT NOT NULL
    REFERENCES documentos.documentos(id)
    ON DELETE RESTRICT,

  tipo_relacion VARCHAR(80) NOT NULL,

  estado VARCHAR(30) NOT NULL DEFAULT 'activo',

  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  creado_por BIGINT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_por BIGINT NULL,
  actualizado_en TIMESTAMPTZ NULL,
  anulado_por BIGINT NULL,
  anulado_en TIMESTAMPTZ NULL,
  motivo_anulacion TEXT NULL,

  CONSTRAINT uq_grupo_factura_documento_relacion
    UNIQUE (grupo_factura_id, documento_id, tipo_relacion)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_factura_documento_activo
ON documentos.grupo_factura_documentos (documento_id)
WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_contenedores_operativos_empresa
ON documentos.contenedores_operativos (empresa_codigo, cliente_destino_id);

CREATE INDEX IF NOT EXISTS idx_contenedores_operativos_codigo
ON documentos.contenedores_operativos (codigo);

CREATE INDEX IF NOT EXISTS idx_contenedores_operativos_contexto
ON documentos.contenedores_operativos (tipo_contexto, estado);

CREATE INDEX IF NOT EXISTS idx_dop_contenedor
ON documentos.documentos_operativos_principales (contenedor_operativo_id);

CREATE INDEX IF NOT EXISTS idx_dop_documento
ON documentos.documentos_operativos_principales (documento_id);

CREATE INDEX IF NOT EXISTS idx_dop_tipo_estado
ON documentos.documentos_operativos_principales (tipo_principal, estado);

CREATE INDEX IF NOT EXISTS idx_grupos_factura_principal
ON documentos.grupos_factura (documento_operativo_principal_id);

CREATE INDEX IF NOT EXISTS idx_grupos_factura_estado
ON documentos.grupos_factura (estado);

CREATE INDEX IF NOT EXISTS idx_grupo_factura_documentos_grupo
ON documentos.grupo_factura_documentos (grupo_factura_id);

CREATE INDEX IF NOT EXISTS idx_grupo_factura_documentos_documento
ON documentos.grupo_factura_documentos (documento_id);

CREATE INDEX IF NOT EXISTS idx_grupo_factura_documentos_tipo
ON documentos.grupo_factura_documentos (tipo_relacion, estado);

-- ============================================================================
-- DELTAS ADMINISTRADOS CONSOLIDADOS
-- ============================================================================

CREATE TABLE documentos.carga_operaciones (
  id BIGSERIAL PRIMARY KEY,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,

  actor_id INTEGER NOT NULL
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  idempotency_key VARCHAR(128) NOT NULL,
  payload_fingerprint VARCHAR(64) NOT NULL,
  fingerprint_version VARCHAR(40) NOT NULL DEFAULT 'canonical-json-v1',
  request_id TEXT NULL,
  correlation_id TEXT NULL,

  canal_ingreso VARCHAR(80) NOT NULL,
  estado VARCHAR(40) NOT NULL DEFAULT 'iniciada',
  requiere_reconciliacion BOOLEAN NOT NULL DEFAULT false,

  nombre_archivo_original TEXT NOT NULL,
  content_type VARCHAR(150) NOT NULL,
  tamano_bytes BIGINT NOT NULL,
  hash_sha256 VARCHAR(64) NOT NULL,

  storage_provider VARCHAR(40) NULL,
  storage_bucket TEXT NULL,
  storage_key TEXT NULL,

  documento_id INTEGER NULL
    REFERENCES documentos.documentos(id)
    ON DELETE SET NULL,
  archivo_id INTEGER NULL
    REFERENCES documentos.documentos_archivos(id)
    ON DELETE SET NULL,

  error_codigo VARCHAR(100) NULL,
  error_detalle TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  iniciada_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  almacenada_en TIMESTAMPTZ NULL,
  completada_en TIMESTAMPTZ NULL,
  fallida_en TIMESTAMPTZ NULL,
  expira_en TIMESTAMPTZ NOT NULL,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT uq_carga_operaciones_scope_idempotency
    UNIQUE (workspace_id, empresa_codigo, idempotency_key),

  CONSTRAINT ck_carga_operaciones_estado
    CHECK (
      estado IN (
        'iniciada',
        'almacenada',
        'completada',
        'fallida',
        'requiere_reconciliacion'
      )
    ),

  CONSTRAINT ck_carga_operaciones_workspace
    CHECK (workspace_id > 0),

  CONSTRAINT ck_carga_operaciones_empresa
    CHECK (length(trim(empresa_codigo)) > 0),

  CONSTRAINT ck_carga_operaciones_idempotency_key
    CHECK (
      char_length(idempotency_key) BETWEEN 1 AND 128
      AND idempotency_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_carga_operaciones_canal_ingreso
    CHECK (length(trim(canal_ingreso)) > 0),

  CONSTRAINT ck_carga_operaciones_nombre_archivo
    CHECK (length(trim(nombre_archivo_original)) > 0),

  CONSTRAINT ck_carga_operaciones_content_type
    CHECK (length(trim(content_type)) > 0),

  CONSTRAINT ck_carga_operaciones_tamano
    CHECK (tamano_bytes > 0),

  CONSTRAINT ck_carga_operaciones_hash_sha256
    CHECK (hash_sha256 ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_carga_operaciones_payload_fingerprint
    CHECK (payload_fingerprint ~ '^[0-9a-f]{64}$'),

  CONSTRAINT ck_carga_operaciones_fingerprint_version
    CHECK (length(trim(fingerprint_version)) > 0),

  CONSTRAINT ck_carga_operaciones_reconciliacion
    CHECK (
      requiere_reconciliacion = (estado = 'requiere_reconciliacion')
    ),

  CONSTRAINT ck_carga_operaciones_expiracion
    CHECK (expira_en > iniciada_en),

  CONSTRAINT ck_carga_operaciones_fechas_estado
    CHECK (
      -- Orden temporal general.
      (almacenada_en IS NULL OR almacenada_en >= iniciada_en)
      AND (
        completada_en IS NULL
        OR (
          almacenada_en IS NOT NULL
          AND completada_en >= almacenada_en
        )
      )
      AND (fallida_en IS NULL OR fallida_en >= iniciada_en)
      AND actualizado_en >= iniciada_en

      -- Invariantes por estado.
      AND (estado <> 'almacenada' OR almacenada_en IS NOT NULL)
      AND (
        estado <> 'completada'
        OR (
          almacenada_en IS NOT NULL
          AND completada_en IS NOT NULL
        )
      )
      AND (estado <> 'fallida' OR fallida_en IS NOT NULL)
      AND (
        estado <> 'requiere_reconciliacion'
        OR almacenada_en IS NOT NULL
      )

      -- Una operación no puede terminar simultáneamente con éxito y fallo.
      AND NOT (
        completada_en IS NOT NULL
        AND fallida_en IS NOT NULL
      )
    )
);

CREATE UNIQUE INDEX uq_carga_operaciones_scope_hash_bloqueante
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE estado IN (
    'iniciada',
    'almacenada',
    'completada',
    'requiere_reconciliacion'
  );

CREATE INDEX idx_carga_operaciones_scope_estado
  ON documentos.carga_operaciones (
    workspace_id,
    empresa_codigo,
    estado,
    iniciada_en DESC
  );

CREATE INDEX idx_carga_operaciones_request
  ON documentos.carga_operaciones (request_id)
  WHERE request_id IS NOT NULL;

CREATE INDEX idx_carga_operaciones_correlation
  ON documentos.carga_operaciones (correlation_id)
  WHERE correlation_id IS NOT NULL;

CREATE INDEX idx_carga_operaciones_expira
  ON documentos.carga_operaciones (expira_en)
  WHERE estado IN ('iniciada', 'almacenada');

GRANT USAGE
  ON SCHEMA documentos
  TO document_platform;

GRANT SELECT, INSERT, UPDATE
  ON documentos.carga_operaciones
  TO document_platform;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.carga_operaciones_id_seq
  TO document_platform;

-- ============================================================================

ALTER TABLE documentos.documentos_archivos
  ADD COLUMN workspace_id INTEGER NULL,
  ADD COLUMN empresa_codigo VARCHAR(20) NULL,
  ADD COLUMN cliente_destino_id INTEGER NULL,
  ADD COLUMN expediente_id BIGINT NULL,
  ADD COLUMN carga_operacion_id BIGINT NULL,
  ADD COLUMN creado_por INTEGER NULL,
  ADD COLUMN actualizado_por INTEGER NULL,
  ADD COLUMN actualizado_en TIMESTAMPTZ NULL,
  ADD COLUMN anulado_por INTEGER NULL,
  ADD COLUMN anulado_en TIMESTAMPTZ NULL,
  ADD COLUMN motivo_anulacion TEXT NULL;

ALTER TABLE documentos.documentos_archivos
  ADD CONSTRAINT documentos_archivos_cliente_destino_id_fkey
  FOREIGN KEY (cliente_destino_id)
  REFERENCES core.clientes_destino(id)
  ON DELETE RESTRICT,

  ADD CONSTRAINT documentos_archivos_expediente_id_fkey
  FOREIGN KEY (expediente_id)
  REFERENCES documentos.expedientes(id)
  ON DELETE RESTRICT,

  ADD CONSTRAINT documentos_archivos_carga_operacion_id_fkey
  FOREIGN KEY (carga_operacion_id)
  REFERENCES documentos.carga_operaciones(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_creado_por_fkey
  FOREIGN KEY (creado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_actualizado_por_fkey
  FOREIGN KEY (actualizado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_anulado_por_fkey
  FOREIGN KEY (anulado_por)
  REFERENCES auth.usuarios(id)
  ON DELETE SET NULL,

  ADD CONSTRAINT documentos_archivos_anulacion_coherente_ck
  CHECK (
    (
      anulado_en IS NULL
      AND anulado_por IS NULL
      AND motivo_anulacion IS NULL
    )
    OR
    (
      anulado_en IS NOT NULL
      AND anulado_por IS NOT NULL
      AND length(trim(motivo_anulacion)) > 0
    )
  );

CREATE INDEX idx_documentos_archivos_scope_hash
  ON documentos.documentos_archivos (
    workspace_id,
    empresa_codigo,
    hash_sha256
  )
  WHERE workspace_id IS NOT NULL
    AND empresa_codigo IS NOT NULL
    AND hash_sha256 IS NOT NULL;

CREATE INDEX idx_documentos_archivos_carga_operacion
  ON documentos.documentos_archivos (carga_operacion_id)
  WHERE carga_operacion_id IS NOT NULL;

CREATE INDEX idx_documentos_archivos_expediente
  ON documentos.documentos_archivos (expediente_id)
  WHERE expediente_id IS NOT NULL;

GRANT USAGE
  ON SCHEMA documentos
  TO document_platform;

GRANT SELECT, INSERT, UPDATE
  ON documentos.documentos_archivos
  TO document_platform;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.documentos_archivos_id_seq
  TO document_platform;

-- ============================================================================

CREATE TABLE documentos.documento_eventos_outbox (
  id BIGSERIAL PRIMARY KEY,

  event_key VARCHAR(255) NOT NULL UNIQUE,
  evento_version INTEGER NOT NULL DEFAULT 1,

  carga_operacion_id BIGINT NOT NULL
    REFERENCES documentos.carga_operaciones(id)
    ON DELETE RESTRICT,

  workspace_id INTEGER NOT NULL,
  empresa_codigo VARCHAR(20) NOT NULL,
  cliente_destino_id INTEGER NULL
    REFERENCES core.clientes_destino(id)
    ON DELETE RESTRICT,
  expediente_id BIGINT NULL
    REFERENCES documentos.expedientes(id)
    ON DELETE RESTRICT,
  documento_id INTEGER NULL
    REFERENCES documentos.documentos(id)
    ON DELETE SET NULL,
  archivo_id INTEGER NULL
    REFERENCES documentos.documentos_archivos(id)
    ON DELETE SET NULL,
  actor_id INTEGER NOT NULL
    REFERENCES auth.usuarios(id)
    ON DELETE RESTRICT,

  tipo_evento VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id TEXT NOT NULL,

  request_id TEXT NULL,
  correlation_id TEXT NULL,
  idempotency_key VARCHAR(128) NOT NULL,

  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,

  estado VARCHAR(30) NOT NULL DEFAULT 'pendiente',
  intentos INTEGER NOT NULL DEFAULT 0,
  max_intentos INTEGER NOT NULL DEFAULT 10,
  proximo_intento_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  locked_by VARCHAR(120) NULL,
  locked_until TIMESTAMPTZ NULL,
  publicado_en TIMESTAMPTZ NULL,
  ultimo_error TEXT NULL,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT ck_documento_eventos_outbox_estado
    CHECK (
      estado IN (
        'pendiente',
        'procesando',
        'publicado',
        'fallido_permanente'
      )
    ),

  CONSTRAINT ck_documento_eventos_outbox_intentos
    CHECK (
      intentos >= 0
      AND max_intentos > 0
      AND intentos <= max_intentos
    ),

  CONSTRAINT ck_documento_eventos_outbox_version
    CHECK (evento_version > 0),

  CONSTRAINT ck_documento_eventos_outbox_workspace
    CHECK (workspace_id > 0),

  CONSTRAINT ck_documento_eventos_outbox_empresa
    CHECK (length(trim(empresa_codigo)) > 0),

  CONSTRAINT ck_documento_eventos_outbox_event_key
    CHECK (
      length(trim(event_key)) > 0
      AND event_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_documento_eventos_outbox_identificadores
    CHECK (
      length(trim(tipo_evento)) > 0
      AND length(trim(aggregate_type)) > 0
      AND length(trim(aggregate_id)) > 0
      AND length(trim(idempotency_key)) > 0
      AND idempotency_key !~ '[[:cntrl:]]'
    ),

  CONSTRAINT ck_documento_eventos_outbox_locked_by
    CHECK (
      locked_by IS NULL
      OR length(trim(locked_by)) > 0
    ),

  CONSTRAINT ck_documento_eventos_outbox_lease_estado
    CHECK (
      (
        estado = 'procesando'
        AND locked_by IS NOT NULL
        AND locked_until IS NOT NULL
      )
      OR
      (
        estado <> 'procesando'
        AND locked_by IS NULL
        AND locked_until IS NULL
      )
    ),

  CONSTRAINT ck_documento_eventos_outbox_publicacion
    CHECK (
      (estado = 'publicado' AND publicado_en IS NOT NULL)
      OR
      (estado <> 'publicado' AND publicado_en IS NULL)
    ),

  CONSTRAINT ck_documento_eventos_outbox_fallo_permanente
    CHECK (
      estado <> 'fallido_permanente'
      OR (
        intentos >= max_intentos
        AND ultimo_error IS NOT NULL
        AND length(trim(ultimo_error)) > 0
      )
    ),

  -- proximo_intento_en permanece NOT NULL para trazabilidad, pero solo gobierna
  -- la selección operativa cuando el evento está en estado pendiente.
  CONSTRAINT ck_documento_eventos_outbox_pendiente
    CHECK (
      estado <> 'pendiente'
      OR proximo_intento_en IS NOT NULL
    )
);

CREATE INDEX idx_documento_eventos_outbox_disponibles
  ON documentos.documento_eventos_outbox (
    proximo_intento_en,
    id
  )
  WHERE estado = 'pendiente';

CREATE INDEX idx_documento_eventos_outbox_lease
  ON documentos.documento_eventos_outbox (locked_until)
  WHERE estado = 'procesando';

CREATE INDEX idx_documento_eventos_outbox_carga
  ON documentos.documento_eventos_outbox (carga_operacion_id);

CREATE INDEX idx_documento_eventos_outbox_correlation
  ON documentos.documento_eventos_outbox (correlation_id)
  WHERE correlation_id IS NOT NULL;

GRANT USAGE
  ON SCHEMA documentos
  TO document_platform;

GRANT SELECT, INSERT, UPDATE
  ON documentos.documento_eventos_outbox
  TO document_platform;

GRANT USAGE, SELECT
  ON SEQUENCE documentos.documento_eventos_outbox_id_seq
  TO document_platform;

-- ============================================================================

-- ============================================================
-- PATCH-UNICIDAD-ACTIVA-Y-RECREACION-MODELO-A-01
--
-- IMPORTANTE:
-- - Esta migración está autorizada para creación y revisión local.
-- - NO está autorizada para aplicación todavía.
-- - No modifica estados ni reactiva históricos.
-- - Solo normaliza expediente_v1_id para contenedores expediente_v1.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Prevalidación de estados conocidos
-- ------------------------------------------------------------

DO $$
DECLARE
  estados_desconocidos text;
BEGIN
  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.contenedores_operativos
  WHERE estado NOT IN ('activo', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Contenedores Operativos contienen estados desconocidos: %',
      estados_desconocidos;
  END IF;

  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.documentos_operativos_principales
  WHERE estado NOT IN ('activo', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Documentos Operativos Principales contienen estados desconocidos: %',
      estados_desconocidos;
  END IF;

  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.grupos_factura
  WHERE estado NOT IN ('pendiente_revision', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Grupos de Factura contienen estados desconocidos no confirmados: %',
      estados_desconocidos;
  END IF;

  SELECT string_agg(DISTINCT estado, ', ' ORDER BY estado)
  INTO estados_desconocidos
  FROM documentos.grupo_factura_documentos
  WHERE estado NOT IN ('activo', 'anulado');

  IF estados_desconocidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Documentos asociados a Grupo contienen estados desconocidos: %',
      estados_desconocidos;
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 2. Columna normalizada para expediente_v1
-- ------------------------------------------------------------

ALTER TABLE documentos.contenedores_operativos
  ADD COLUMN IF NOT EXISTS expediente_v1_id BIGINT NULL;

-- Rechazar metadata ausente, no numérica, cero o negativa.
DO $$
DECLARE
  ids_invalidos text;
BEGIN
  SELECT string_agg(id::text, ', ' ORDER BY id)
  INTO ids_invalidos
  FROM documentos.contenedores_operativos
  WHERE tipo_contexto = 'expediente_v1'
    AND (
      metadata ->> 'expedienteId' IS NULL
      OR btrim(metadata ->> 'expedienteId') !~ '^[1-9][0-9]*$'
    );

  IF ids_invalidos IS NOT NULL THEN
    RAISE EXCEPTION
      'Contenedores expediente_v1 con metadata.expedienteId ausente o inválido. IDs: %',
      ids_invalidos;
  END IF;
END
$$;

UPDATE documentos.contenedores_operativos
SET expediente_v1_id = (metadata ->> 'expedienteId')::BIGINT
WHERE tipo_contexto = 'expediente_v1'
  AND expediente_v1_id IS NULL;

-- Rechazar referencias inexistentes o incompatibles.
DO $$
DECLARE
  ids_huerfanos text;
BEGIN
  SELECT string_agg(co.id::text, ', ' ORDER BY co.id)
  INTO ids_huerfanos
  FROM documentos.contenedores_operativos co
  LEFT JOIN documentos.expedientes e
    ON e.id = co.expediente_v1_id
  WHERE co.tipo_contexto = 'expediente_v1'
    AND (
      co.expediente_v1_id IS NULL
      OR e.id IS NULL
      OR upper(btrim(e.empresa_codigo)) <> upper(btrim(co.empresa_codigo))
      OR e.cliente_destino_id IS DISTINCT FROM co.cliente_destino_id
    );

  IF ids_huerfanos IS NOT NULL THEN
    RAISE EXCEPTION
      'Contenedores expediente_v1 con referencia ausente, inexistente o incompatible. IDs: %',
      ids_huerfanos;
  END IF;
END
$$;

ALTER TABLE documentos.contenedores_operativos
  DROP CONSTRAINT IF EXISTS fk_contenedor_operativo_expediente_v1;

ALTER TABLE documentos.contenedores_operativos
  ADD CONSTRAINT fk_contenedor_operativo_expediente_v1
  FOREIGN KEY (expediente_v1_id)
  REFERENCES documentos.expedientes(id)
  ON DELETE RESTRICT
  NOT VALID;

ALTER TABLE documentos.contenedores_operativos
  VALIDATE CONSTRAINT fk_contenedor_operativo_expediente_v1;

ALTER TABLE documentos.contenedores_operativos
  DROP CONSTRAINT IF EXISTS ck_contenedor_expediente_v1_normalizado;

ALTER TABLE documentos.contenedores_operativos
  ADD CONSTRAINT ck_contenedor_expediente_v1_normalizado
  CHECK (
    tipo_contexto <> 'expediente_v1'
    OR (
      expediente_v1_id IS NOT NULL
      AND cliente_destino_id IS NOT NULL
    )
  ) NOT VALID;

ALTER TABLE documentos.contenedores_operativos
  VALIDATE CONSTRAINT ck_contenedor_expediente_v1_normalizado;

-- ------------------------------------------------------------
-- 3. Prevalidación de unicidad vigente
-- ------------------------------------------------------------

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM documentos.contenedores_operativos
    WHERE estado = 'activo'
      AND tipo_contexto = 'expediente_v1'
    GROUP BY
      empresa_codigo,
      cliente_destino_id,
      tipo_contexto,
      expediente_v1_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Contenedor vigente para la misma identidad expediente_v1';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.contenedores_operativos
    WHERE estado = 'activo'
      AND tipo_contexto <> 'expediente_v1'
    GROUP BY empresa_codigo, tipo_contexto, codigo
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Contenedor vigente no-expediente para la misma identidad actual';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.documentos_operativos_principales
    WHERE estado = 'activo'
    GROUP BY documento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Principal activo para el mismo documento';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.grupos_factura
    WHERE estado <> 'anulado'
    GROUP BY factura_documento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un Grupo vigente para la misma Factura';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM documentos.grupo_factura_documentos
    WHERE estado = 'activo'
    GROUP BY documento_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Existe más de un vínculo activo para el mismo documento';
  END IF;
END
$$;

-- ------------------------------------------------------------
-- 4. Retirar constraints históricas bloqueantes
-- ------------------------------------------------------------

ALTER TABLE documentos.contenedores_operativos
  DROP CONSTRAINT IF EXISTS uq_contenedor_operativo_empresa_tipo_codigo;

ALTER TABLE documentos.documentos_operativos_principales
  DROP CONSTRAINT IF EXISTS uq_documento_operativo_principal_documento;

ALTER TABLE documentos.documentos_operativos_principales
  DROP CONSTRAINT IF EXISTS uq_documento_operativo_principal_contenedor_documento;

ALTER TABLE documentos.grupos_factura
  DROP CONSTRAINT IF EXISTS uq_grupo_factura_documento;

ALTER TABLE documentos.grupo_factura_documentos
  DROP CONSTRAINT IF EXISTS uq_grupo_factura_documento_relacion;

-- ------------------------------------------------------------
-- 5. Unicidad parcial de registros vigentes
-- ------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_contenedor_expediente_v1_activo
ON documentos.contenedores_operativos (
  empresa_codigo,
  cliente_destino_id,
  tipo_contexto,
  expediente_v1_id
)
WHERE estado = 'activo'
  AND tipo_contexto = 'expediente_v1';

-- Preserva temporalmente la identidad actual de otros tipos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_contenedor_otro_contexto_activo
ON documentos.contenedores_operativos (
  empresa_codigo,
  tipo_contexto,
  codigo
)
WHERE estado = 'activo'
  AND tipo_contexto <> 'expediente_v1';

CREATE UNIQUE INDEX IF NOT EXISTS uq_documento_operativo_principal_documento_activo
ON documentos.documentos_operativos_principales (documento_id)
WHERE estado = 'activo';

CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_factura_documento_vigente
ON documentos.grupos_factura (factura_documento_id)
WHERE estado <> 'anulado';

-- Ya existe en 0008; se declara nuevamente de forma idempotente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_grupo_factura_documento_activo
ON documentos.grupo_factura_documentos (documento_id)
WHERE estado = 'activo';

CREATE INDEX IF NOT EXISTS idx_contenedor_operativo_expediente_v1
ON documentos.contenedores_operativos (expediente_v1_id)
WHERE tipo_contexto = 'expediente_v1';

ALTER TABLE documentos.documentos_operativos_principales
  ADD COLUMN IF NOT EXISTS proveedor_id bigint,
  ADD COLUMN IF NOT EXISTS ruc_proveedor varchar(20),
  ADD COLUMN IF NOT EXISTS razon_social_proveedor varchar(250);

ALTER SCHEMA core OWNER TO document_platform;
ALTER SCHEMA auth OWNER TO document_platform;
ALTER SCHEMA documentos OWNER TO document_platform;
ALTER SCHEMA auditoria OWNER TO document_platform;

GRANT USAGE, CREATE ON SCHEMA core, auth, documentos, auditoria
  TO document_platform;

-- Adopción de migraciones administradas incorporadas físicamente al baseline.

INSERT INTO core.schema_migrations (
  version,
  descripcion,
  checksum,
  ejecutado_por
)
VALUES
  ('0011', 'carga operaciones', 'cd24b2e11002542420d9a1cf2eb40587991f7efb26ae2d797a653fe42ad9a159', 'gestion-documental-final-baseline'),
  ('0012', 'documentos archivos scope auditoria', 'df880f1fa87f6e1b83f2bb20cd4f4a594d5461904e24b4a5dd0a9b714e535766', 'gestion-documental-final-baseline'),
  ('0013', 'documento eventos outbox', '09ba6b26d2528c075de5ef3d983f21652bbe425735f368c1a4368e8c516efc8c', 'gestion-documental-final-baseline'),
  ('0014', 'unicidad activa recreacion modelo a', '9fda096f6f68977edade5756f0a3e90532d2b21980616de68c2d58fac19569ce', 'gestion-documental-final-baseline'),
  ('0015', 'documento operativo principal proveedor', '2a1fd4ef35097e9b963d7f2a6f0b3ed3aef2f89ed7c0e2760db5e7cfacda3ff2', 'gestion-documental-final-baseline')
ON CONFLICT (version) DO NOTHING;

RESET ROLE;
