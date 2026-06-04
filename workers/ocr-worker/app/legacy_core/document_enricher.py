import re
import unicodedata
from pathlib import Path

from app.legacy_core.text_utils import compact_text


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", (text or "").upper()).strip()


def normalize_text(text: str) -> str:
    text = text or ""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.upper()
    text = re.sub(r"\s+", " ", text)
    text = text.replace("0RDEN", "ORDEN")
    text = text.replace("C0MPRA", "COMPRA")
    text = text.replace("SERVICI0", "SERVICIO")
    return text.strip()


def normalize_serie(serie: str | None) -> str | None:
    if not serie:
        return None

    s = serie.upper().strip().replace(" ", "")
    s = s.replace("FO", "F0")
    s = s.replace("TOO", "T00")
    s = s.replace("TO0", "T00")
    s = s.replace("T0O", "T00")
    s = s.replace("TGO0O", "TG00")
    s = s.replace("TGOO", "TG00")
    s = s.replace("TGO", "TG0")
    s = s.replace("EGO", "EG0")
    return s


def is_documento_extranjero_o_proforma(text: str) -> bool:
    t = norm(text)
    return bool(
        "PROFORMA" in t
        or "PROFORMA INVOICE" in t
        or "QUOTATION" in t
        or "COMMERCIAL INVOICE" in t
        or "PAYMENT TERM" in t
        or "BANK DETAILS" in t
        or "SHENZHEN" in t
        or "INDUSTRIAL AND COMMERCIAL BANK OF CHINA" in t
    )


def is_factura_text(text: str, filename: str = "") -> bool:
    t = norm(text)
    c = compact_text(t)

    if is_documento_extranjero_o_proforma(t):
        return False

    return bool(
        "FACTURAELECTRONICA" in c
        or "FACTURA ELECTRONICA" in t
        or "FACTURA ELECTRÓNICA" in t
        or "REPRESENTACION IMPRESA DE LA FACTURA" in t
        or "REPRESENTACIÓN IMPRESA DE LA FACTURA" in t
        or "TIPO DE COMPROBANTE : FACTURA" in t
        or "TIPO DE COMPROBANTE: FACTURA" in t
    )


def is_guia_text(text: str, filename: str = "") -> bool:
    t = norm(text)
    c = compact_text(t)

    return bool(
        "GUIADEREMISIONELECTRONICA" in c
        or "GUIA DE REMISION ELECTRONICA" in t
        or "GUÍA DE REMISIÓN ELECTRÓNICA" in t
        or "GUIA DE REMISION REMITENTE" in t
        or "DATOS DEL TRANSPORTISTA" in t
        or "MOTIVO DE TRASLADO" in t
        or "DATOS DEL TRASLADO" in t
        or "INFORMACION DE BIENES TRASLADADOS" in t
        or "BIENES POR TRANSPORTAR" in t
        or "PESO BRUTO TOTAL DE LA CARGA" in t
    )


def is_guia_visual_text(text: str) -> bool:
    t = norm(text)
    c = compact_text(t)

    señales = [
        "DATOS DEL TRASLADO",
        "DATOS DEL TRANSPORTE",
        "DATOS DEL TRANSPORTISTA",
        "BIENES POR TRANSPORTAR",
        "BIENES TRASLADADOS",
        "MOTIVO DEL TRASLADO",
        "PUNTO DE PARTIDA",
        "PUNTO DE LLEGADA",
        "GUIA REMITENTE ELECTRONICA",
        "GUÍA REMITENTE ELECTRÓNICA",
        "GUIA DE REMISION",
        "GUÍA DE REMISIÓN",
        "REPRESENTACION IMPRESA DE LA GUIA",
        "REPRESENTACIÓN IMPRESA DE LA GUÍA",
    ]

    score = sum(1 for s in señales if s in t or compact_text(s) in c)
    return score >= 2


def extract_oc_from_text(text: str) -> str | None:
    t = norm(text)

    patterns = [
        r"ORDEN\s+DE\s+COMPRA\s*[:.\-]?\s*N[°ºO0*.:;”\"'\-]*\s*0*(\d{3,8})",
        r"ORDEN\s+DE\s+COMPRA\s+N[^0-9]{0,20}0*(\d{3,8})",
        r"ORDEN\s+DE\s+COMPRA[\s\S]{0,250}?N[°ºO0*.:;”\"'\-]*\s*0*(\d{3,8})",
        r"\bO\/C[^0-9]{0,20}0*(\d{3,8})",
        r"\bOC[^0-9]{0,20}0*(\d{3,8})",
    ]

    for pattern in patterns:
        m = re.search(pattern, t, re.I)
        if m:
            return m.group(1).zfill(6)

    return None


def extract_os_from_text(text: str) -> str | None:
    t = norm(text)

    patterns = [
        r"ORDEN\s+DE\s+SERVICIO\s*[:.\-]?\s*N[°ºO0*.:;”\"'\-]*\s*0*(\d{3,8})",
        r"ORDEN\s+DE\s+SERVICIO\s+N[^0-9]{0,20}0*(\d{3,8})",
        r"ORDEN\s+DE\s+SERVICIO[\s\S]{0,250}?N[°ºO0*.:;”\"'\-]*\s*0*(\d{3,8})",
        r"\bO\/S[^0-9]{0,20}0*(\d{3,8})",
        r"\bOS[^0-9]{0,20}0*(\d{3,8})",
    ]

    for pattern in patterns:
        m = re.search(pattern, t, re.I)
        if m:
            return m.group(1).zfill(6)

    return None


def detect_tipo(text: str, archivo_fuente: str = "", cliente: str = "BBTEC") -> str:
    t = norm(text)

    if is_documento_extranjero_o_proforma(t):
        return "otro"

    if is_guia_text(t, archivo_fuente) or is_guia_visual_text(t):
        return "guia_remision"

    if is_factura_text(t, archivo_fuente):
        return "factura"

    if extract_os_from_text(t):
        return "orden_servicio"

    if extract_oc_from_text(t):
        return "orden_compra"

    if "NOTA DE INGRESO" in t or "NOTA INGRESO" in t:
        return "nota_ingreso"

    if "DETRACCION" in t or "DETRACCIÓN" in t:
        return "pago_detraccion"

    if "TRANSFERENCIA" in t or "CONSTANCIA DE OPERACION" in t:
        return "pago_transferencia"

    return "otro"


def extract_factura_from_filename(filename: str) -> dict:
    stem = Path(filename).stem.strip()

    m = re.search(
        r"^(?P<asiento>04-\d{4})\s+"
        r"(?P<cliente>[A-Z0-9]+)\s+"
        r"FACTURA\s+"
        r"(?P<serie>[A-Z0-9]{2,6})\s+"
        r"(?P<numero>\d+)\s+"
        r"(?P<ruc>(10|20)\d{9})\s+"
        r"(?P<razon>.+)$",
        stem,
        re.I,
    )

    if not m:
        return {
            "serie": None,
            "numero": None,
            "ruc": None,
            "razon_social_emisor": None,
            "clave": None,
        }

    serie = normalize_serie(m.group("serie"))
    numero = m.group("numero").strip()  
    ruc = m.group("ruc")
    razon = m.group("razon").strip()

    return {
        "serie": serie,
        "numero": numero,
        "ruc": ruc,
        "razon_social_emisor": razon,
        "clave": f"FACTURA|{ruc}|{serie}|{numero}",
    }


def extract_factura_from_text(text: str) -> dict:
    t = norm(text)

    # Prioridad: serie de factura real, no teléfonos.
    patterns = [
        r"\b(F[A-Z0-9]{2,5})\s*[-–]\s*(\d{1,12})\b",
        r"\b(FO\d{2})\s*[-–]\s*(\d{1,12})\b",
    ]

    serie = None
    numero = None

    for p in patterns:
        m = re.search(p, t, re.I)
        if m:
            serie = normalize_serie(m.group(1))
            numero = m.group(2).strip()
            break

    ruc = re.search(r"\b(10|20)\d{9}\b", t)
    ruc_val = ruc.group(0) if ruc else None

    return {
        "serie": serie,
        "numero": numero,
        "ruc": ruc_val,
        "clave": f"FACTURA|{ruc_val or 'SINRUC'}|{serie}|{numero}" if serie and numero else None,
    }


def enrich_page(text: str, archivo_fuente: str = "", cliente: str = "BBTEC", pagina: int | None = None) -> dict:
    tipo = detect_tipo(text, archivo_fuente, cliente)

    data = {
        "tipo": tipo,
        "serie": None,
        "numero": None,
        "ruc": None,
        "razon_social_emisor": None,
        "orden_servicio": extract_os_from_text(text),
        "orden_compra": extract_oc_from_text(text),
        "clave_documental": None,
        "banco": None,
        "codigo_operacion": None,
    }

    if tipo == "factura":
        f = extract_factura_from_filename(archivo_fuente)

        if not f["clave"]:
            f_text = extract_factura_from_text(text)
            f.update({
                "serie": f_text["serie"],
                "numero": f_text["numero"],
                "ruc": f_text["ruc"],
                "clave": f_text["clave"],
            })

        data.update({
            "serie": f["serie"],
            "numero": f["numero"],
            "ruc": f["ruc"],
            "razon_social_emisor": f.get("razon_social_emisor"),
            "clave_documental": f["clave"],
        })

    if not data["clave_documental"]:
        asiento = None
        m = re.search(r"(04-\d{4})", archivo_fuente or "")
        if m:
            asiento = m.group(1)

        data["clave_documental"] = f"OTRO|{asiento or 'SIN_ASIENTO'}|P{pagina or 0:03d}"

    return data
