"""Place checksum-matched PDFs at the exact keys referenced by production DB."""
import hashlib
import json
import tempfile
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import threading

from botocore.exceptions import ClientError
from migrate import client

inventory = json.loads(Path('/tmp/r2-migration-copy-parallel.json').read_text())
assert all(o['status'] in ('copied_verified', 'verified_existing') for o in inventory['objects'])
by_hash = {o['sha256']: o for o in inventory['objects']}
rows = json.loads(Path('/tmp/r2-production-url-matches.json').read_text())['rows']
plan = []
for row in rows:
    obj = by_hash.get(row.get('hash_sha256'))
    if not obj or row['storage_provider'] != 'r2' or row['storage_bucket'] != 'data-prod':
        continue
    key = row.get('storage_key')
    if not key or key.startswith('/') or '://' in key or '..' in key.split('/'):
        raise ValueError('Unsupported production key')
    plan.append({'id': row['id'], 'sourceKey': obj['key'], 'key': key,
                 'sha256': obj['sha256'], 'size': obj['size'], 'status': 'planned'})
path = Path('/tmp/r2-production-reconciled.json')
lock = threading.Lock()
def save():
    with lock:
        path.write_text(json.dumps(plan, indent=2)+'\n')
save()
s3, endpoint, bucket = client('deployment/env/.env.production')
assert bucket == 'proyectos-prod'
assert endpoint == 'https://2d1fe7144a1af728a30f4953ce53e650.r2.cloudflarestorage.com'
def checksum(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()
def copy(row):
    with tempfile.TemporaryDirectory(prefix='r2-reconcile-') as tmp:
        source, target = Path(tmp)/'source', Path(tmp)/'target'
        try:
            head = s3.head_object(Bucket=bucket, Key=row['key'])
            exists = True
        except ClientError as exc:
            if exc.response['Error']['Code'] not in ('404', 'NoSuchKey', 'NotFound'):
                raise
            exists = False
        if not exists:
            head = s3.head_object(Bucket=bucket, Key=row['sourceKey'])
            s3.download_file(bucket, row['sourceKey'], str(source))
            assert checksum(source) == row['sha256']
            options = {k: head[k] for k in ('ContentType','ContentDisposition','CacheControl','ContentEncoding','ContentLanguage','Metadata') if k in head}
            with source.open('rb') as f:
                s3.put_object(Bucket=bucket, Key=row['key'], Body=f, IfNoneMatch='*', **options)
        s3.download_file(bucket, row['key'], str(target))
        assert checksum(target) == row['sha256'] and target.stat().st_size == row['size']
        row['status'] = 'verified'
        save()
        print('Production reference verified:', row['id'], flush=True)
with ThreadPoolExecutor(max_workers=6) as pool:
    list(pool.map(copy, plan))
print('Verified production references:', len(plan))
