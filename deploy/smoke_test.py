"""Exercise a published build against a disposable LocalDB database."""
import html
import http.client
from http.cookies import SimpleCookie
import json
import os
from pathlib import Path
import re
import socket
import subprocess
import sys
import time
import urllib.parse
import uuid

root = Path(__file__).resolve().parents[1]
publish = Path(sys.argv[1]).resolve()
credentials = json.loads((root / 'deployment-secrets/admin-credentials.json').read_text(encoding='utf-8-sig'))
database = 'AlHawdDeploymentSmoke_' + uuid.uuid4().hex[:12]
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    port = sock.getsockname()[1]
origin = f'http://127.0.0.1:{port}'
environment = os.environ.copy()
environment.update({
    'ASPNETCORE_ENVIRONMENT': 'Production',
    'ASPNETCORE_URLS': origin,
    'ConnectionStrings__DefaultConnection': f'Server=(localdb)\\MSSQLLocalDB;Database={database};Trusted_Connection=True;TrustServerCertificate=True',
})
log_path = root / 'artifacts/smoke-test.log'
cookie_jar = SimpleCookie()

def request(method, path, body=None, content_type=None, authenticated=False, headers=None):
    hdr = dict(headers or {})
    if content_type:
        hdr['Content-Type'] = content_type
    if authenticated:
        # Explicit attachment lets us test production Secure cookies over loopback HTTP.
        hdr['Cookie'] = '; '.join(f'{key}={value.value}' for key, value in cookie_jar.items())
    conn = http.client.HTTPConnection('127.0.0.1', port, timeout=20)
    conn.request(method, path, body=body, headers=hdr)
    response = conn.getresponse()
    payload = response.read()
    response_headers = dict(response.getheaders())
    for key, value in response.getheaders():
        if key.lower() == 'set-cookie':
            cookie_jar.load(value)
    result = response.status, response_headers, payload
    conn.close()
    return result

def check(condition, description):
    if not condition:
        raise AssertionError(description)
    print('PASS:', description, flush=True)

with log_path.open('w', encoding='utf-8') as log:
    process = subprocess.Popen(['dotnet', str(publish / 'AlHawdAlHadi.Api.dll')], cwd=publish, env=environment, stdout=log, stderr=log)
    try:
        for _ in range(90):
            if process.poll() is not None:
                raise RuntimeError(f'App exited; see {log_path}')
            try:
                if request('GET', '/')[0] == 200:
                    break
            except (OSError, http.client.HTTPException):
                pass
            time.sleep(0.5)
        else:
            raise RuntimeError(f'Startup timed out; see {log_path}')

        check(request('GET', '/project.html')[0] == 200, 'Published front-end is served')
        status, _, body = request('GET', '/api/cms')
        check(status == 200 and 'hero' in json.loads(body), 'CMS content loads from migrated SQL database')
        check(request('GET', '/admin')[0] == 302, 'Admin page requires login')
        check(request('GET', '/admin.html')[0] == 302, 'Direct admin HTML requires login')
        check(request('GET', '/admin/')[0] == 302, 'Trailing-slash admin route requires login')
        check(request('GET', '/admin.html/')[0] == 302, 'Trailing-slash admin HTML requires login')
        for method, path in [('GET', '/api/bookings'), ('GET', '/api/media'), ('PUT', '/api/cms'), ('POST', '/api/upload'), ('DELETE', '/api/bookings/1')]:
            check(request(method, path)[0] == 401, f'Anonymous {method} {path} is rejected')

        status, _, body = request('GET', '/admin/login')
        check(status == 200, 'Login page loads')
        fields = re.search(r'name="([^"]+)" value="([^"]+)"', body.decode()).groups()
        form = {html.unescape(fields[0]): html.unescape(fields[1]), 'username': credentials['Username'], 'password': credentials['Password']}
        check(request('POST', '/admin/login', 'username=admin&password=bad', 'application/x-www-form-urlencoded')[0] == 400, 'Login rejects missing antiforgery token')
        status, headers, _ = request('POST', '/admin/login', urllib.parse.urlencode(form), 'application/x-www-form-urlencoded', authenticated=True)
        check(status == 302 and headers.get('Location') == '/admin', 'Valid admin login succeeds')
        check(cookie_jar['AlHawd.Admin']['secure'] and cookie_jar['AlHawd.Admin']['httponly'] and cookie_jar['AlHawd.Admin']['samesite'] == 'strict', 'Admin cookie has production protections')
        check(request('GET', '/admin.html', authenticated=True)[0] == 200, 'Authenticated admin page loads')
        status, _, body = request('GET', '/api/bookings', authenticated=True)
        check(status == 200 and json.loads(body) == [], 'Production does not seed sample booking data')
        check(request('PUT', '/api/cms', '{}', 'application/json', authenticated=True, headers={'Origin': 'https://untrusted.example'})[0] == 403, 'Cross-origin content mutation is rejected')
        check(request('PUT', '/api/cms', '{}', 'application/json', authenticated=True, headers={'Origin': origin})[0] == 400, 'Same-origin content mutation reaches validation')
        booking = json.dumps({'name': 'Deployment smoke test', 'phone': '+962700000000'})
        status, _, body = request('POST', '/api/bookings', booking, 'application/json')
        check(status == 201 and json.loads(body)['success'], 'Public visitor booking persists to SQL')
        check(len(json.loads(request('GET', '/api/bookings', authenticated=True)[2])) == 1, 'Authenticated admin can read submitted booking')
        print('All deployment smoke checks passed.', flush=True)
    finally:
        process.terminate()
        try:
            process.wait(timeout=10)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
        if not re.fullmatch(r'AlHawdDeploymentSmoke_[a-f0-9]{12}', database):
            raise RuntimeError('Refusing cleanup of an unexpected database name')
        result = subprocess.run(['sqlcmd', '-S', '(localdb)\\MSSQLLocalDB', '-E', '-b', '-Q', f"IF DB_ID(N'{database}') IS NOT NULL BEGIN ALTER DATABASE [{database}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE; DROP DATABASE [{database}]; END"], capture_output=True, text=True)
        if result.returncode:
            print('Disposable database cleanup failed:', result.stderr)
