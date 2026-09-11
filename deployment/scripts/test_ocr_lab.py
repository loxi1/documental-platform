"""Launcher tests with mocked Docker; no live containers or credentials."""
import contextlib
import importlib.util
import io
from pathlib import Path
import unittest
from unittest.mock import Mock, patch

spec = importlib.util.spec_from_file_location("ocr_lab", Path(__file__).with_name("ocr-lab.py"))
launcher = importlib.util.module_from_spec(spec)
spec.loader.exec_module(launcher)


class LauncherTests(unittest.TestCase):
    def test_default_validates_only_and_never_prints_credentials(self):
        output = io.StringIO()
        with patch.object(launcher, "inspect_env", side_effect=[
            {"MINIO_ROOT_USER": "fake-lab-access", "MINIO_ROOT_PASSWORD": "fake-lab-secret"},
            {"OCR_REQUEST_SUBJECT": "lab.ocr.procesar-archivo"},
        ]) as inspect, patch.object(launcher.subprocess, "run") as run, \
                patch("sys.argv", ["ocr-lab.py"]), contextlib.redirect_stdout(output):
            launcher.main()
        self.assertEqual([c.args[0] for c in inspect.call_args_list], ["dp_minio_documental_lab", "dp_ms_documentos_carga_segura_test"])
        run.assert_called_once()
        self.assertEqual(run.call_args.args[0][-2:], ["config", "--quiet"])
        self.assertEqual(run.call_args.kwargs["env"]["OCR_LAB_MINIO_SECRET_ACCESS_KEY"], "fake-lab-secret")
        self.assertNotIn("fake-lab", output.getvalue())

    def test_missing_minio_credentials_has_no_cloudflare_fallback(self):
        with patch.object(launcher, "inspect_env", return_value={}), \
                patch.object(launcher.subprocess, "run") as run, patch("sys.argv", ["ocr-lab.py"]):
            with self.assertRaises(SystemExit): launcher.main()
        run.assert_not_called()

    def test_node_still_on_original_subject_blocks_start(self):
        with patch.object(launcher, "inspect_env", side_effect=[
            {"MINIO_ROOT_USER": "fake", "MINIO_ROOT_PASSWORD": "fake"}, {},
        ]), patch.object(launcher.subprocess, "run") as run, patch("sys.argv", ["ocr-lab.py", "--start"]):
            with self.assertRaises(SystemExit): launcher.main()
        run.assert_not_called()


if __name__ == "__main__":
    unittest.main()
