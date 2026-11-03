#!/usr/bin/env python3
"""Copy R2 objects without deleting source or replacing destination objects.

Defaults to inventory only. --apply downloads, SHA-256 verifies and copies.
Credentials stay in the supplied env files; reports contain no credentials.
"""
import argparse
import hashlib
import json
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from pathlib import Path

import boto3
from botocore.config import Config
from botocore.exceptions import ClientError
from dotenv import dotenv_values


def client(path):
    env = dotenv_values(path, interpolate=False)
    endpoint = env.get('R2_ENDPOINT') or env.get('R2_ENDPOINT_URL')
    return boto3.client('s3', endpoint_url=endpoint,
                        aws_access_key_id=env.get('R2_ACCESS_KEY_ID'),
                        aws_secret_access_key=env.get('R2_SECRET_ACCESS_KEY'),
                        region_name='auto', config=Config(
                            connect_timeout=10, read_timeout=120,
                            retries={'max_attempts': 3}, s3={'addressing_style': 'path'})), endpoint, env.get('R2_BUCKET')


def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for block in iter(lambda: f.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


def run(args):
    source, endpoint, bucket = client(args.source_env)
    target, target_endpoint, target_bucket = client(args.target_env)
    if endpoint != 'https://45c5e83f071c47dc00ea3b924b98828e.r2.cloudflarestorage.com' or bucket != 'data-prod':
        raise ValueError('Unexpected development endpoint/bucket')
    if target_endpoint != 'https://2d1fe7144a1af728a30f4953ce53e650.r2.cloudflarestorage.com' or target_bucket != 'proyectos-prod':
        raise ValueError('Unexpected production endpoint/bucket')
    rows = []
    report = {'startedAt': datetime.now(timezone.utc).isoformat(), 'sourceBucket': bucket,
              'targetBucket': target_bucket, 'prefix': args.prefix, 'apply': args.apply, 'objects': rows}
    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_lock = threading.Lock()
    def save():
        with report_lock:
            report_path.write_text(json.dumps(report, indent=2, ensure_ascii=False) + '\n')
    save()
    try:
        # Inventory both accounts before transferring any objects.
        objects = [obj for page in source.get_paginator('list_objects_v2').paginate(Bucket=bucket, Prefix=args.prefix)
                   for obj in page.get('Contents', [])]
        print(f'Inventory: {len(objects)} objects, {sum(o["Size"] for o in objects)} bytes', flush=True)
        for obj in objects:
            row = {'key': obj['Key'], 'size': obj['Size'], 'sourceETag': obj['ETag'], 'status': 'inventoried'}
            rows.append(row)
        save()
        # Some bucket-scoped tokens cannot perform HeadBucket. Listing one object
        # checks access using the same bucket permissions needed for inventory.
        target.list_objects_v2(Bucket=target_bucket, MaxKeys=1)
        if not args.apply:
            return
        with tempfile.TemporaryDirectory(prefix='r2-migrate-') as d:
            def process(item):
                index, row = item
                src_path, dst_path = Path(d)/f'source-{index}', Path(d)/f'target-{index}'
                key = row['key']
                try:
                    head = source.head_object(Bucket=bucket, Key=key)
                    if head['ETag'] != row['sourceETag'] or head['ContentLength'] != row['size']:
                        raise RuntimeError('Source changed after inventory')
                    source.download_file(bucket, key, str(src_path))
                    sha = digest(src_path)
                    if src_path.stat().st_size != row['size']:
                        raise RuntimeError('Downloaded source size mismatch')
                    try:
                        target.head_object(Bucket=target_bucket, Key=key)
                        exists = True
                    except ClientError as exc:
                        if exc.response['Error']['Code'] not in ('404', 'NoSuchKey', 'NotFound'):
                            raise
                        exists = False
                    if not exists:
                        options = {field: head[field] for field in (
                            'ContentType', 'ContentDisposition', 'CacheControl', 'ContentEncoding',
                            'ContentLanguage', 'Metadata') if field in head}
                        # Conditional create avoids overwriting concurrent/new production uploads.
                        with src_path.open('rb') as body:
                            target.put_object(Bucket=target_bucket, Key=key, Body=body,
                                              IfNoneMatch='*', **options)
                    target.download_file(target_bucket, key, str(dst_path))
                    if dst_path.stat().st_size != row['size'] or digest(dst_path) != sha:
                        raise RuntimeError('Destination differs; existing object was not overwritten')
                    latest = source.head_object(Bucket=bucket, Key=key)
                    if latest['ETag'] != row['sourceETag']:
                        raise RuntimeError('Source changed during transfer')
                    row.update(status='verified_existing' if exists else 'copied_verified', sha256=sha)
                except Exception as exc:
                    # Do not log credentials or full signed requests.
                    row.update(status='failed', error=type(exc).__name__)
                    save()
                    raise
                save()
                print(f'{index}/{len(rows)} {row["status"]}', flush=True)
            with ThreadPoolExecutor(max_workers=getattr(args, 'workers', 1)) as pool:
                list(pool.map(process, enumerate(rows, 1)))
    finally:
        save()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-env', default='apps/ms-documentos/.env')
    parser.add_argument('--target-env', default='deployment/env/.env.production')
    parser.add_argument('--prefix', default='documentos/')
    parser.add_argument('--report', required=True)
    parser.add_argument('--apply', action='store_true')
    parser.add_argument('--workers', type=int, choices=range(1, 9), default=1)
    args = parser.parse_args()
    try:
        run(args)
    except Exception as exc:
        print(f'Migration stopped: {type(exc).__name__}', flush=True)
        if isinstance(exc, ClientError):
            print(f'Operation: {exc.operation_name}; code: {exc.response["Error"]["Code"]}', flush=True)
        raise SystemExit(1)
