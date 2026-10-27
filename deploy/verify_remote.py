"""Verify the deployed trial site. --booking exercises and removes a test booking."""
import html
import http.client
from http.cookies import SimpleCookie
import json
from pathlib import Path
import re
import sys
import urllib.parse
import uuid

root = Path(__file__).resolve().parents[1]
origin = sys.argv[1].rstrip('/')
url = urllib.parse.urlsplit(origin)
if url.scheme != 'https' or url.path:
    raise ValueError('An HTTPS origin is required')
credentials = json.loads((root / 'deployment-secrets/admin-credentials.json').read_text(encoding='utf-8-sig'))
cookies = SimpleCookie()

def request(method, path, body=None, content_type=None, authenticated=False, origin_header=None):
    headers = {}
    if content_type:
        headers['Content-Type'] = content_type
    if origin_header:
        headers['Origin'] = origin_header
    if authenticated:
        headers['Cookie'] = '; '.join(f'{key}={value.value}' for key, value in cookies.items())
    conn = http.client.HTTPSConnection(url.hostname, url.port or 443, timeout=45)
    conn.request(method, path, body=body, headers=headers)
    response = conn.getresponse()
    payload = response.read()
    response_headers = dict(response.getheaders())
    for key, value in response.getheaders():
        if key.lower() == 'set-cookie':
            cookies.load(value)
    result = response.status, response_headers, payload
    conn.close()
    return result

def check(condition, description):
    if not condition:
        raise AssertionError(description)
    print('PASS:', description, flush=True)

check(request('GET', '/')[0] == 200, 'HTTPS homepage responds successfully')
check(request('GET', '/project?id=proj-2')[0] == 200, 'Project page responds successfully')
check(request('HEAD', '/images/light/scene-1.png')[0] == 200, 'Published images are accessible')
status, _, body = request('GET', '/api/cms')
check(status == 200 and 'hero' in json.loads(body), 'Hosted application loads CMS content from SQL')
for method, path in [('GET', '/api/bookings'), ('GET', '/api/media'), ('PUT', '/api/cms'), ('POST', '/api/upload')]:
    status, headers, _ = request(method, path)
    check(status == 401 and 'WWW-Authenticate' not in headers, f'Application rejects anonymous {method} {path}')
for path in ['/admin', '/admin.html', '/admin/']:
    status, headers, _ = request('GET', path)
    check(status == 302 and headers.get('Location') == '/admin/login', f'{path} requires admin login')

status, _, body = request('GET', '/admin/login')
check(status == 200, 'Hosted admin login page is accessible')
token = re.search(r'name="([^"]+)" value="([^"]+)"', body.decode()).groups()
form = {html.unescape(token[0]): html.unescape(token[1]), 'username': credentials['Username'], 'password': credentials['Password']}
status, headers, _ = request('POST', '/admin/login', urllib.parse.urlencode(form), 'application/x-www-form-urlencoded', authenticated=True)
check(status == 302 and headers.get('Location') == '/admin', 'Admin sign-in succeeds over HTTPS')
check(bool(cookies['AlHawd.Admin']['secure']) and bool(cookies['AlHawd.Admin']['httponly']), 'Admin cookie is Secure and HttpOnly')
check(request('GET', '/admin.html', authenticated=True)[0] == 200, 'Authenticated admin dashboard loads')
check(request('GET', '/api/bookings', authenticated=True)[0] == 200, 'Authenticated booking list loads')
check(request('PUT', '/api/cms', '{}', 'application/json', authenticated=True, origin_header='https://untrusted.example')[0] == 403, 'Cross-origin admin mutation is blocked')

if '--booking' in sys.argv:
    marker = 'Deployment smoke test ' + uuid.uuid4().hex[:8]
    booking = json.dumps({'name': marker, 'phone': '+962700000000', 'notes': 'Temporary trial deployment verification; removed immediately.'})
    created_id = None
    try:
        status, _, body = request('POST', '/api/bookings', booking, 'application/json')
        check(status == 201, 'Public booking submission succeeds on the hosted site')
        created_id = json.loads(body)['booking']['id']
        status, _, body = request('GET', f'/api/bookings/{created_id}', authenticated=True)
        check(status == 200 and json.loads(body)['name'] == marker, 'Submitted test booking persists to hosted SQL')
    finally:
        if created_id is not None:
            status, _, _ = request('DELETE', f'/api/bookings/{created_id}', authenticated=True, origin_header=origin)
            check(status == 200, 'Temporary trial booking is removed')
print('All hosted deployment checks passed.', flush=True)
