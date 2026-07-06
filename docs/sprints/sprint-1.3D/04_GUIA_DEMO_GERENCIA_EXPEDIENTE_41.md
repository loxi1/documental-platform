# Guía de Demo para Gerencia - Expediente 41

## Objetivo de la demo
Mostrar un expediente documental completo con trazabilidad desde compras, almacén, finanzas y revisión contable.

## Expediente demostrativo

```text
Expediente ID: 41
Código expediente: 050201
Empresa: BBTI
Cliente: BBTI S.A.C.
Descripción: PRODUCCION C X DISTRIBUIR
Estado: abierto
```

## Historia funcional

### 1. Compras crea o vincula documento principal
Documento principal:

```text
Tipo: OC
Número: 007950
Proveedor: CORPORACION ACEROS AREQUIPA S.A.
Relación: principal_oc
Estado: confirmado
```

### 2. Compras adjunta factura

```text
Tipo: FACTURA
Serie/Número: F011-00001135
Proveedor: CORPORACION COMATPE SAC
Monto: 40.00 SOLES
Relación: adjunto_factura
Estado: confirmado
```

### 3. Almacén / Compras adjunta nota de ingreso

```text
Tipo: NOTA_INGRESO
Número: 0000000031
Relación: adjunto_nota_ingreso
Estado: confirmado
```

### 4. Se adjunta guía de remisión

```text
Tipo: GUIA_REMISION
Serie/Número: EG07-00000165
Proveedor: CONSORCIO HUANCAVELICA
Relación: adjunto_guia
Estado: confirmado
```

### 5. Finanzas adjunta pago por transferencia

```text
Tipo: PAGO_TRANSFERENCIA
Número operación: 6981-0
Banco: BBVA
Monto: 504.00 SOLES
Relación: adjunto_transferencia
Estado: confirmado
```

### 6. Finanzas adjunta detracción

```text
Tipo: PAGO_DETRACCION
Número constancia: 296801526
Banco: BANCO DE LA NACION
Monto: 240.00 SOLES
Relación: adjunto_detraccion
Estado: confirmado
```

## Revisión contable
La bandeja contable filtra por fecha de emisión de la factura:

```text
Factura: F011-00001135
Fecha emisión: 2026-05-04
Periodo contable: 2026-05
```

Al abrir el expediente, el contador ve todos los documentos relacionados, aunque tengan fechas de emisión de otros meses.

## Mensaje para gerencia

```text
La plataforma permite centralizar la trazabilidad documental de un expediente: OC, factura, guía, nota de ingreso, pagos y detracciones. La revisión contable puede entrar por el periodo de la factura y revisar el expediente completo con sus documentos vinculados y sus archivos en R2.
```
