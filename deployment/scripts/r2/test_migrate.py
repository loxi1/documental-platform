import importlib.util
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from botocore.exceptions import ClientError

spec = importlib.util.spec_from_file_location('r2_migrate', Path(__file__).with_name('migrate.py'))
migration = importlib.util.module_from_spec(spec)
spec.loader.exec_module(migration)


class Store:
    def __init__(self, objects):
        self.objects = dict(objects)
        self.writes = []

    def get_paginator(self, name):
        return SimpleNamespace(paginate=lambda **kw: [{'Contents': [
            {'Key': k, 'Size': len(v), 'ETag': 'fixture'} for k, v in self.objects.items()]}])

    def list_objects_v2(self, **kw):
        return {}

    def head_object(self, Bucket, Key):
        if Key not in self.objects:
            raise ClientError({'Error': {'Code': '404'}}, 'HeadObject')
        return {'ETag': 'fixture', 'ContentLength': len(self.objects[Key]), 'ContentType': 'application/pdf'}

    def download_file(self, bucket, key, path):
        Path(path).write_bytes(self.objects[key])

    def put_object(self, Bucket, Key, Body, IfNoneMatch, **kw):
        assert IfNoneMatch == '*'
        assert Key not in self.objects
        self.writes.append(Key)
        self.objects[Key] = Body.read()


class MigrationTest(unittest.TestCase):
    def execute(self, target, apply=True):
        source = Store({'documentos/fixture.pdf': b'pdf fixture'})
        with tempfile.TemporaryDirectory() as d:
            args = SimpleNamespace(source_env='source', target_env='target', prefix='documentos/',
                                   report=str(Path(d)/'report.json'), apply=apply)
            with patch.object(migration, 'client', side_effect=[
                (source, 'https://45c5e83f071c47dc00ea3b924b98828e.r2.cloudflarestorage.com', 'data-prod'),
                (target, 'https://2d1fe7144a1af728a30f4953ce53e650.r2.cloudflarestorage.com', 'proyectos-prod')]):
                migration.run(args)
        return source

    def test_copy_and_verify(self):
        target = Store({})
        source = self.execute(target)
        self.assertEqual(target.objects, source.objects)
        self.assertEqual(len(target.writes), 1)

    def test_identical_existing_is_not_written(self):
        target = Store({'documentos/fixture.pdf': b'pdf fixture'})
        self.execute(target)
        self.assertEqual(target.writes, [])

    def test_conflict_is_not_overwritten(self):
        target = Store({'documentos/fixture.pdf': b'different'})
        with self.assertRaises(RuntimeError):
            self.execute(target)
        self.assertEqual(target.objects['documentos/fixture.pdf'], b'different')
        self.assertEqual(target.writes, [])

    def test_inventory_does_not_write(self):
        target = Store({})
        self.execute(target, apply=False)
        self.assertEqual(target.objects, {})


if __name__ == '__main__':
    unittest.main()
