"""Subject routing tests: no NATS, OCR, storage, or .env access."""
import ast
import asyncio
import importlib.util
import json
import os
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import AsyncMock, Mock, patch

APP = Path(__file__).parent


def settings_from_env(env):
    tree = ast.parse((APP / "config.py").read_text())
    # Load the actual Settings class, without the module's global .env instance.
    tree.body = [node for node in tree.body if isinstance(node, (ast.Import, ast.ImportFrom, ast.ClassDef))]
    namespace = {}
    exec(compile(tree, str(APP / "config.py"), "exec"), namespace)
    with patch.dict(os.environ, env, clear=True):
        return namespace["Settings"](_env_file=None)


class StopLoop(Exception):
    pass


class SubjectTests(unittest.IsolatedAsyncioTestCase):
    async def run_worker(self, env, result=None, storage_key="fixture.pdf"):
        settings = settings_from_env(env)
        process = AsyncMock(return_value=result or {"ok": True})
        spec = importlib.util.spec_from_file_location("subject_test_main", APP / "main.py")
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, {
            "app.config": types.SimpleNamespace(settings=settings),
            "app.processor": types.SimpleNamespace(process_file=process),
        }):
            spec.loader.exec_module(module)
        nc = types.SimpleNamespace(connect=AsyncMock(), publish=AsyncMock())

        async def subscribe(subject, cb):
            nc.subject = subject
            await cb(types.SimpleNamespace(subject=subject, reply="_INBOX.fixture", data=json.dumps({
                "archivoId": 1, "storageProvider": "r2", "storageKey": storage_key,
                "clienteAbreviatura": "TEST",
            }).encode()))

        nc.subscribe = AsyncMock(side_effect=subscribe)
        module.NATS = Mock(return_value=nc)
        module.console = Mock()
        with patch.object(module.asyncio, "sleep", AsyncMock(side_effect=StopLoop)):
            with self.assertRaises(StopLoop):
                await module.main()
        return settings, nc, module.console, process

    async def test_defaults_preserve_request_event_and_reply(self):
        settings, nc, console, process = await self.run_worker({})
        self.assertEqual(nc.subject, "ocr.procesar-archivo")
        self.assertEqual(nc.publish.call_args_list[0].args[0], "documento.clasificado")
        self.assertEqual(nc.publish.call_args_list[1].args[0], "_INBOX.fixture")
        self.assertEqual(process.await_count, 1)
        self.assertEqual(nc.subscribe.call_args.kwargs.keys(), {"cb"})

    async def test_lab_routes_both_subjects_and_logs_only_allowlist(self):
        settings, nc, console, _ = await self.run_worker({
            "NATS_URL": "nats://nats:4222",
            "OCR_REQUEST_SUBJECT": "lab.ocr.procesar-archivo",
            "OCR_CLASSIFIED_SUBJECT": "lab.documento.clasificado",
        })
        nc.connect.assert_awaited_once_with(servers=["nats://nats:4222"])
        self.assertEqual(nc.subject, "lab.ocr.procesar-archivo")
        self.assertEqual(nc.publish.call_args_list[0].args[0], "lab.documento.clasificado")
        self.assertEqual(nc.publish.call_args_list[1].args[0], "_INBOX.fixture")
        logged = [json.loads(c.args[0]) for c in console.log.call_args_list if c.args[0].startswith('{')]
        self.assertEqual(logged, [{"archivoId": 1, "storage_key": "fixture.pdf", "subject": nc.subject}])

    async def test_error_result_only_replies_without_classified_event(self):
        _, nc, _, _ = await self.run_worker({}, {"ok": False, "error": "mock failure"})
        self.assertEqual(nc.publish.await_count, 1)
        self.assertEqual(nc.publish.call_args.args[0], "_INBOX.fixture")

    async def test_logging_does_not_print_signed_urls(self):
        _, _, console, _ = await self.run_worker({}, storage_key="https://example.invalid/file?signature=secret")
        self.assertNotIn("signature", str(console.log.call_args_list))
        self.assertIn("[URL omitida]", str(console.log.call_args_list))


if __name__ == "__main__":
    unittest.main()
