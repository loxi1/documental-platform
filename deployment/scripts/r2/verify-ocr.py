"""Verify the worker R2 download path against a copied object's SHA-256."""
import hashlib
import json
import sys
import os
import tempfile
from pathlib import Path

from dotenv import dotenv_values

root = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root / 'workers/ocr-worker'))
os.chdir(root / 'workers/ocr-worker')
from app.config import settings
from app.r2_storage import download_from_r2

env = dotenv_values(root / 'deployment/env/.env.production', interpolate=False)
for name in ('r2_endpoint_url', 'r2_bucket', 'r2_access_key_id', 'r2_secret_access_key', 'r2_region'):
    setattr(settings, name, env[name.upper()])
report = json.loads(Path('/tmp/r2-migration-copy-parallel.json').read_text())
verified = [o for o in report['objects'] if o['status'] in ('copied_verified', 'verified_existing')]
assert len(verified) == len(report['objects']) and verified, 'Copy is incomplete'
obj = next(o for o in verified if o['key'].lower().endswith('.pdf'))
with tempfile.TemporaryDirectory(prefix='ocr-r2-verification-') as tmp:
    settings.ocr_tmp_dir = tmp
    path = download_from_r2(obj['key'])
    with path.open('rb') as f:
        sha = hashlib.file_digest(f, 'sha256').hexdigest()
    assert sha == obj['sha256'], 'Worker download checksum mismatch'
print('OCR R2 download: OK; production bucket; SHA-256 matches migrated PDF')
