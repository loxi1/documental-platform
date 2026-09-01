-- Ejecutar conectado a la base administrativa "postgres" con usuario master de RDS.
-- Objetivo: crear la base limpia de Documental Platform sin tocar documental_platform.

SELECT current_database(), current_user;

CREATE DATABASE gestion_documental
  WITH
  ENCODING = 'UTF8'
  TEMPLATE = template0;

REVOKE CONNECT ON DATABASE gestion_documental FROM PUBLIC;

COMMENT ON DATABASE gestion_documental IS
  'Base limpia productiva para Documental Platform. No usar proyectos_user.';
