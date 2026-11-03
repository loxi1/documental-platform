import json
from pathlib import Path
from botocore.exceptions import ClientError
from migrate import client
s3, _, _ = client('deployment/env/.env.production')
try:
    objects=[obj for page in s3.get_paginator('list_objects_v2').paginate(Bucket='data-prod') for obj in page.get('Contents',[])]
    rows=json.loads(Path('/tmp/r2-production-url-matches.json').read_text())['rows']
    keys={o['Key'] for o in objects}
    matches=[r for r in rows if r.get('storage_key') in keys]
    Path('/tmp/r2-legacy-bucket-inventory.json').write_text(json.dumps({'bucket':'data-prod','objects':[{'key':o['Key'],'size':o['Size'],'etag':o['ETag']} for o in objects],'matchingIds':[r['id'] for r in matches]},indent=2))
    print('Production-account legacy bucket:',len(objects),'objects;',len(matches),'matching production records')
except ClientError as e:
    print('Legacy bucket check:',e.response['Error']['Code'])
