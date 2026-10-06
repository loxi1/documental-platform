from app.core.document_keys import build_document_key
from app.core.document_types import normalize_document_type
from app.extractors.pago_extractor import extract_pago_metadata

def main() -> None:
    assert normalize_document_type("PAGO_TRANSFERENCIA") == "TRANSFERENCIA"
    assert normalize_document_type("TRANSFERENCIA") == "TRANSFERENCIA"
    bcp = """
    CONSTANCIA DE TRANSFERENCIA BCP
    Número de Operación: 1041122
    Fecha: 26/06/2026
    Moneda: USD
    Importe de la operación: US$ 2,333.80
    Comisión bancaria: US$ 1.00
    Total debitado: US$ 2,334.80
    RUC 20600000001 CIMEDISA IMPORT SAC
    Referencia: F001-202693
    Estado: Procesada
    """
    m = extract_pago_metadata(bcp, "TRANSFERENCIA", "pago_transferencia_bcp_1041122.pdf")
    assert m["numeroOperacion"] == "1041122", m
    assert m["montoOperacion"] == 2333.80, m
    assert m["comision"] == 1.00, m
    assert m["montoTotalDebitado"] == 2334.80, m
    assert m["montoTotal"] == 2333.80, m
    assert m["moneda"] == "USD", m
    assert m["proveedorNombre"] == "CIMEDISA IMPORT SAC", m
    assert m["documentoReferenciado"] == "F001-202693", m
    assert m["estadoOperacion"] == "PROCESADA", m
    assert build_document_key("BBTI", "TRANSFERENCIA", m) == "BBTI|TRANSFERENCIA|1041122"
    pen_con_cuenta_dolares = """
    CONSTANCIA DE TRANSFERENCIA BCP
    Cuenta origen:
    Corriente Dolares
    Monto de la operación: PEN 40
    """
    pm = extract_pago_metadata(pen_con_cuenta_dolares, "TRANSFERENCIA")
    assert pm["montoOperacion"] == 40.0, pm
    assert pm["montoTotal"] == 40.0, pm
    assert pm["moneda"] == "PEN", pm

    usd_con_cuenta_soles = """
    CONSTANCIA DE TRANSFERENCIA BCP
    Cuenta origen:
    Corriente Soles
    Monto de la operación: USD 40
    """
    um = extract_pago_metadata(usd_con_cuenta_soles, "TRANSFERENCIA")
    assert um["montoOperacion"] == 40.0, um
    assert um["montoTotal"] == 40.0, um
    assert um["moneda"] == "USD", um
    bcp_real = """
    CONSTANCIA DE OPERACION - PROCESADA
    Tipo de operación Transferencia a cuentas de terceros BCP local
    Fecha de operación: 05/08/2026 - 09:56 PM
    Cuenta origen
    Tipo Corriente Dolares
    Monto PEN 40
    Referencia OP 15 PRODUCCION
    Número de operación 89574218
    """
    br = extract_pago_metadata(bcp_real, "TRANSFERENCIA")
    assert br["montoOperacion"] == 40.0, br
    assert br["montoTotal"] == 40.0, br
    assert br["moneda"] == "PEN", br
    assert br["numeroOperacion"] == "89574218", br

    bbva_real = """
    BBVA
    Transferencias
    Importe Cargado 2.10 SOLES
    Detalle de la operación
    Importe Abonado 2.10 SOLES
    Número de Operación 7,745-0
    Comisión por Otra Plaza 0.00 SOLES
    """
    bv = extract_pago_metadata(bbva_real, "TRANSFERENCIA")
    assert bv["montoOperacion"] == 2.10, bv
    assert bv["montoTotal"] == 2.10, bv
    assert bv["moneda"] == "PEN", bv
    assert bv["numeroOperacion"] == "7,745-0", bv

    bcp_interbancaria = """
    BCP
    Número de operación 02025012
    Tipo Corriente Soles
    Datos de la transferencia
    Monto S/ 1,584.92
    Comisión CCE S/ 4.30
    Monto transferido S/ 1,580.62
    """
    bi = extract_pago_metadata(bcp_interbancaria, "TRANSFERENCIA")
    assert bi["montoOperacion"] == 1584.92, bi
    assert bi["montoTotal"] == 1584.92, bi
    assert bi["moneda"] == "PEN", bi
    assert bi["numeroOperacion"] == "02025012", bi

    scotiabank_real = """
    SCOTIABANK
    Operación TRANSFER. CCE
    Moneda S/
    Número de operación
    4227235
    Importe S/4,885.00
    Comisión S/ 3.30
    FACTURA ELECTRONICA
    Importe Total : S/ 10,620.00
    Monto detracción: S/ 425.00
    """
    sc = extract_pago_metadata(scotiabank_real, "TRANSFERENCIA")
    assert sc["montoOperacion"] == 4885.00, sc
    assert sc["montoTotal"] == 4885.00, sc
    assert sc["moneda"] == "PEN", sc
    assert sc["numeroOperacion"] == "4227235", sc

    # R4G: estructura OCR real acreditada en 435.
    layout_435 = """
    CONSTANCIA DE OPERACION - PROCESADA
    Datos de operación
    Tipo de operación
    Transferencia a cuentas de terceros BCP local
    Código de solicitud
    89574218
    Fecha de operación:
    05/08/2026
    Datos de la cuenta de origen
    Tipo
    Corriente Dolares
    Datos de la cuenta de destino
    Monto
    Titular
    PEN 40
    CORPORACION ACEROS AREQUIOPA S.A.C.
    """
    r435 = extract_pago_metadata(layout_435, "TRANSFERENCIA")
    assert r435["montoOperacion"] == 40.0, r435
    assert r435["montoTotal"] == 40.0, r435
    assert r435["moneda"] == "PEN", r435
    assert r435["numeroOperacion"] == "89574218", r435

    # A51: mismo layout BCP del smoke 449/438.
    bcp_codigo_solicitud = """
    CONSTANCIA DE OPERACION - PROCESADA
    Datos de operación
    Tipo de operación
    Transferencia a cuentas de terceros BCP local
    Código de solicitud
    89574219
    Fecha de operación:
    09/09/2026
    Datos de la cuenta de origen
    Tipo
    Corriente Dolares
    Datos de la cuenta de destino
    Monto
    Titular
    PEN 60
    CORPORACION ACEROS AREQUIOPA S.A.C.
    """
    r449 = extract_pago_metadata(bcp_codigo_solicitud, "PAGO_TRANSFERENCIA")
    assert r449["numeroOperacion"] == "89574219", r449
    assert r449["banco"] == "BCP", r449
    assert r449["montoOperacion"] == 60.0, r449
    assert r449["montoTotal"] == 60.0, r449
    assert r449["moneda"] == "PEN", r449

    # R4G negativa: el importe lejano/ajeno no pertenece al campo Monto.
    monto_no_relacionado = """
    CONSTANCIA DE TRANSFERENCIA BCP
    Monto
    Beneficiario
    CORPORACION EJEMPLO SAC
    Referencia
    PEN 999.00
    """
    neg = extract_pago_metadata(monto_no_relacionado, "TRANSFERENCIA")
    assert neg["montoOperacion"] is None, neg
    assert neg["montoTotal"] is None, neg

    solo_comision = """CONSTANCIA DE TRANSFERENCIA\nNúmero de Operación: 998877\nComisión bancaria: S/ 1.00"""
    sm = extract_pago_metadata(solo_comision, "TRANSFERENCIA")
    assert sm["montoTotal"] is None, sm
    detraccion = """BANCO DE LA NACION\nNúmero de Operación: 445566\nImporte: S/ 120.00"""
    dm = extract_pago_metadata(detraccion, "PAGO_DETRACCION")
    assert dm["numeroOperacion"] == "445566", dm
    assert dm["montoTotal"] == 120.0, dm
    print("PASS: extractor TRANSFERENCIA canónico y detracción compatibles")

if __name__ == "__main__":
    main()
