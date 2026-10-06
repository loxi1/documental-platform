import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from app.processor import resolve_file_path
from app.r2_storage import download_from_r2
from app.schemas import OcrProcesarArchivoPayload


def payload_r2(storage_key: str, nombre_original=None):
    return OcrProcesarArchivoPayload(
        storageProvider="r2",
        storageKey=storage_key,
        nombreOriginal=nombre_original,
        clienteAbreviatura="BBTI",
    )


class ProcessorR2FilenameContractTest(unittest.TestCase):
    def test_p01_forwards_storage_key_and_original_filename_exactly(self):
        payload = payload_r2(
            "documentos/tmp/11/20",
            "RHE_1200_ACME.pdf",
        )

        expected = Path("/tmp/RHE_1200_ACME.pdf")

        with patch(
            "app.processor.download_from_r2",
            return_value=expected,
        ) as mocked:
            result = resolve_file_path(payload)

        mocked.assert_called_once_with(
            "documentos/tmp/11/20",
            "RHE_1200_ACME.pdf",
        )
        self.assertEqual(result, expected)

    def test_p02_forwards_none_without_inventing_filename(self):
        payload = payload_r2(
            "test/factura.pdf",
            None,
        )

        expected = Path("/tmp/factura.pdf")

        with patch(
            "app.processor.download_from_r2",
            return_value=expected,
        ) as mocked:
            result = resolve_file_path(payload)

        mocked.assert_called_once_with(
            "test/factura.pdf",
            None,
        )
        self.assertEqual(result, expected)


class R2LocalFilenameContractTest(unittest.TestCase):
    def _download(self, storage_key: str, nombre_original=None):
        calls = []

        class FakeClient:
            def download_file(self, bucket, key, local_path):
                calls.append((bucket, key, local_path))

        with tempfile.TemporaryDirectory() as tmp:
            with (
                patch("app.r2_storage.settings.r2_bucket", "data-prod"),
                patch("app.r2_storage.settings.ocr_tmp_dir", tmp),
                patch("app.r2_storage.get_r2_client", return_value=FakeClient()),
            ):
                result = download_from_r2(
                    storage_key,
                    nombre_original,
                )

                snapshot = {
                    "path": Path(result),
                    "name": Path(result).name,
                    "suffix": Path(result).suffix,
                    "parent": Path(result).parent,
                    "tmp": Path(tmp),
                    "calls": list(calls),
                }

        return snapshot

    def test_w01_w02_w03_opaque_key_uses_remote_key_and_original_local_pdf_name(self):
        result = self._download(
            "documentos/tmp/11/20",
            "RHE_1200_ACME.pdf",
        )

        self.assertEqual(
            result["calls"][0][1],
            "documentos/tmp/11/20",
        )
        self.assertEqual(
            result["name"],
            "RHE_1200_ACME.pdf",
        )
        self.assertEqual(
            result["suffix"],
            ".pdf",
        )
        self.assertEqual(
            result["parent"],
            result["tmp"],
        )

    def test_w04_empty_original_uses_historical_storage_key_basename(self):
        result = self._download(
            "test/factura.pdf",
            "",
        )

        self.assertEqual(result["name"], "factura.pdf")
        self.assertEqual(result["suffix"], ".pdf")

    def test_w05_none_original_preserves_normal_historical_flow(self):
        result = self._download(
            "test/factura.pdf",
            None,
        )

        self.assertEqual(
            result["calls"][0][1],
            "test/factura.pdf",
        )
        self.assertEqual(result["name"], "factura.pdf")
        self.assertEqual(result["suffix"], ".pdf")

    def test_w06_posix_traversal_is_reduced_to_safe_basename(self):
        result = self._download(
            "documentos/tmp/11/20",
            "../../RHE_1200_ACME.pdf",
        )

        self.assertEqual(result["name"], "RHE_1200_ACME.pdf")
        self.assertEqual(result["parent"], result["tmp"])

    def test_w06_absolute_path_is_reduced_to_safe_basename(self):
        result = self._download(
            "documentos/tmp/11/20",
            "/tmp/RHE_1200_ACME.pdf",
        )

        self.assertEqual(result["name"], "RHE_1200_ACME.pdf")
        self.assertEqual(result["parent"], result["tmp"])

    def test_w06_windows_style_traversal_is_reduced_to_safe_basename(self):
        result = self._download(
            "documentos/tmp/11/20",
            r"..\..\RHE_1200_ACME.pdf",
        )

        self.assertEqual(result["name"], "RHE_1200_ACME.pdf")
        self.assertEqual(result["parent"], result["tmp"])


if __name__ == "__main__":
    unittest.main()
