import os
import sys
import json
import re
import time
import base64
import hashlib
import secrets
import threading
import subprocess
import mimetypes
from datetime import datetime, timezone
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote

mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("font/woff2", ".woff2")

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
UPLOADS_DIR = os.path.join(FRONTEND_DIR, "images", "uploads")
SEED_CMS = os.path.join(BASE_DIR, "backend", "AlHawdAlHadi.Api", "SeedData", "default-cms.json")
RUNTIME_CMS = os.path.join(BASE_DIR, "backend", "AlHawdAlHadi.Api", "SeedData", "runtime-cms.json")
ADMIN_USERS_FILE = os.path.join(BASE_DIR, "backend", "AlHawdAlHadi.Api", "SeedData", "admin-users.json")
CREDENTIALS_FILE = os.path.join(BASE_DIR, "deployment-secrets", "admin-credentials.json")

FALLBACK_ADMIN_HASH = "210000:qS72XOKwOnW7lQxpmCcvrg==:fb6Zjlou94BhskQUwJboT/Am7eUOULUns4VKI6YIHM0="
PBKDF2_ITERATIONS = 210000

os.makedirs(UPLOADS_DIR, exist_ok=True)

# Ensure runtime CMS cache exists
if not os.path.exists(RUNTIME_CMS):
    try:
        with open(SEED_CMS, "r", encoding="utf-8") as f:
            data = f.read()
        with open(RUNTIME_CMS, "w", encoding="utf-8") as f:
            f.write(data)
    except Exception as e:
        print(f"Error copying seed CMS: {e}")


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS, 32)
    return f"{PBKDF2_ITERATIONS}:{base64.b64encode(salt).decode('ascii')}:{base64.b64encode(dk).decode('ascii')}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        parts = encoded.split(":")
        if len(parts) != 3 or len(password) > 256:
            return False
        iterations = int(parts[0])
        if iterations < 100000 or iterations > 1000000:
            return False
        salt = base64.b64decode(parts[1])
        expected = base64.b64decode(parts[2])
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations, 32)
        return secrets.compare_digest(actual, expected)
    except Exception:
        return False


def normalize_role(role: str) -> str:
    r = (role or "").strip().lower()
    if r in ("admin", "sales", "editor", "viewer"):
        return r
    return "sales"


def get_role_label(role: str) -> str:
    labels = {
        "admin": "مدير النظام (صلاحيات كاملة)",
        "sales": "موظف مبيعات وحجوزات",
        "editor": "محرر محتوى ومشاريع",
        "viewer": "مشرف متابعة واطلاع"
    }
    return labels.get(role, "موظف")


def to_safe_user_dto(u: dict) -> dict:
    role = normalize_role(u.get("role", "admin"))
    return {
        "id": u.get("id", ""),
        "username": u.get("username", ""),
        "displayName": u.get("displayName", ""),
        "role": role,
        "roleLabel": get_role_label(role),
        "isActive": bool(u.get("isActive", True)),
        "createdAt": u.get("createdAt", "2026-10-27T12:00:00Z")
    }


def load_admin_users() -> list:
    if os.path.exists(ADMIN_USERS_FILE):
        try:
            with open(ADMIN_USERS_FILE, "r", encoding="utf-8") as f:
                users = json.load(f)
                if isinstance(users, list) and len(users) > 0:
                    return users
        except Exception as e:
            print("Error reading admin-users.json:", e)

    default_users = [
        {
            "id": "usr-admin",
            "username": "admin",
            "displayName": "المدير العام (الإدارة)",
            "role": "admin",
            "isActive": True,
            "passwordHash": FALLBACK_ADMIN_HASH,
            "createdAt": "2026-10-27T12:00:00Z"
        }
    ]
    save_admin_users(default_users)
    return default_users


def save_admin_users(users: list):
    os.makedirs(os.path.dirname(ADMIN_USERS_FILE), exist_ok=True)
    raw_json = json.dumps(users, ensure_ascii=False, indent=2)
    with open(ADMIN_USERS_FILE, "w", encoding="utf-8") as f:
        f.write(raw_json)

    # Also sync to LocalDB AdminUsersStore in background thread so API responds instantaneously
    def _sync_sql():
        try:
            escaped_json = raw_json.replace("'", "''")
            q = f"""
            SET NOCOUNT ON;
            IF OBJECT_ID(N'dbo.AdminUsersStore', N'U') IS NULL
                CREATE TABLE dbo.AdminUsersStore (Id INT NOT NULL PRIMARY KEY, JsonData NVARCHAR(MAX) NOT NULL, UpdatedAt DATETIME2 NOT NULL);
            IF EXISTS (SELECT 1 FROM dbo.AdminUsersStore WHERE Id = 1)
                UPDATE dbo.AdminUsersStore SET JsonData = N'{escaped_json}', UpdatedAt = SYSUTCDATETIME() WHERE Id = 1;
            ELSE
                INSERT INTO dbo.AdminUsersStore (Id, JsonData, UpdatedAt) VALUES (1, N'{escaped_json}', SYSUTCDATETIME());
            """
            run_sql(q)
        except Exception:
            pass

    threading.Thread(target=_sync_sql, daemon=True).start()


def update_credentials_file_if_admin(username: str, plain_password: str, password_hash: str):
    if username.lower() != "admin":
        return
    try:
        os.makedirs(os.path.dirname(CREDENTIALS_FILE), exist_ok=True)
        with open(CREDENTIALS_FILE, "w", encoding="utf-8") as f:
            json.dump({
                "Username": username,
                "Password": plain_password,
                "PasswordHash": password_hash
            }, f, ensure_ascii=False, indent=2)
    except Exception:
        pass


def run_sql(query):
    try:
        cmd = [
            "sqlcmd", "-S", "(localdb)\\MSSQLLocalDB",
            "-d", "AlHawdAlHadiDb",
            "-h", "-1", "-W", "-s", "|",
            "-Q", query
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
        return res.stdout.strip()
    except Exception as e:
        print("SQL Error:", e)
        return ""


def get_bookings_from_sql():
    q = "SET NOCOUNT ON; SELECT Id, Name, Phone, Email, Project, Unit, PreferredDate, PreferredTime, Notes, Status, CONVERT(VARCHAR, CreatedAt, 126) FROM Bookings ORDER BY CreatedAt DESC;"
    raw = run_sql(q)
    bookings = []
    if raw:
        for line in raw.splitlines():
            parts = [p.strip() for p in line.split("|")]
            if len(parts) >= 11:
                bookings.append({
                    "id": int(parts[0]) if parts[0].isdigit() else parts[0],
                    "name": parts[1],
                    "phone": parts[2],
                    "email": parts[3],
                    "project": parts[4],
                    "unit": parts[5],
                    "preferredDate": parts[6],
                    "preferredTime": parts[7],
                    "notes": parts[8],
                    "status": parts[9],
                    "createdAt": parts[10]
                })
    return bookings


def get_cms_data():
    if os.path.exists(RUNTIME_CMS):
        with open(RUNTIME_CMS, "r", encoding="utf-8") as f:
            return json.load(f)
    elif os.path.exists(SEED_CMS):
        with open(SEED_CMS, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_cms_data(data):
    with open(RUNTIME_CMS, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def render_login_html(error_code: str = "") -> bytes:
    err_msg = ""
    if error_code == "disabled":
        err_msg = "هذا الحساب موقوف حالياً، يرجى مراجعة مدير النظام."
    elif error_code == "1":
        err_msg = "اسم المستخدم أو كلمة المرور غير صحيحة"

    err_html = f'<div class="error-box">{err_msg}</div>' if err_msg else ""
    html = f"""<!doctype html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>تسجيل دخول الإدارة والموظفين | الحوض الهادي للإسكان</title>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: radial-gradient(circle at top, #1b2d34 0%, #0d171a 100%);
      color: #f3eee1;
      font-family: 'IBM Plex Sans Arabic', Tahoma, sans-serif;
      padding: 20px;
    }}
    main {{
      width: min(420px, 100%);
      padding: 36px 32px;
      background: rgba(24, 38, 44, 0.95);
      border: 1px solid rgba(219, 197, 152, 0.22);
      border-radius: 20px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
    }}
    .brand-head {{
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }}
    .brand-logo {{
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background: rgba(219, 197, 152, 0.1);
      border: 1px solid rgba(219, 197, 152, 0.3);
      display: grid;
      place-items: center;
    }}
    h1 {{ font-size: 1.4rem; margin: 0 0 4px; color: #f7f3eb; }}
    .sub {{ margin: 0; font-size: 0.88rem; color: #9ab0b8; }}
    label {{ display: block; margin: 18px 0 8px; font-size: 0.9rem; font-weight: 600; color: #dbc598; }}
    .input-wrap {{ position: relative; }}
    input {{
      width: 100%;
      padding: 13px 14px;
      background: #101c20;
      color: #fff;
      border: 1px solid #354a52;
      border-radius: 10px;
      font: inherit;
      font-size: 0.95rem;
      transition: border-color 0.2s;
    }}
    input:focus {{ outline: none; border-color: #dbc598; }}
    .toggle-pw {{
      position: absolute;
      left: 10px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #9ab0b8;
      cursor: pointer;
      padding: 4px 8px;
      font-size: 0.82rem;
      width: auto;
      margin: 0;
    }}
    button.submit-btn {{
      margin-top: 26px;
      width: 100%;
      padding: 14px;
      background: linear-gradient(135deg, #e5c287 0%, #c69d59 100%);
      color: #101c20;
      font: inherit;
      font-weight: 700;
      font-size: 1rem;
      border: none;
      border-radius: 10px;
      cursor: pointer;
    }}
    button.submit-btn:hover {{ filter: brightness(1.06); }}
    .error-box {{
      background: rgba(220, 78, 78, 0.15);
      border: 1px solid rgba(220, 78, 78, 0.4);
      color: #ffb8b8;
      padding: 12px 14px;
      border-radius: 10px;
      font-size: 0.9rem;
      margin-bottom: 14px;
    }}
    .back-link {{
      display: block;
      text-align: center;
      margin-top: 20px;
      color: #dbc598;
      text-decoration: none;
      font-size: 0.9rem;
    }}
  </style>
</head>
<body>
  <main>
    <div class="brand-head">
      <div class="brand-logo">
        <svg width="28" height="28" viewBox="0 0 64 64" fill="none">
          <path d="M34 6L50 15V56H34V6Z" fill="#E5C287"/>
          <path d="M34 6L18 16V56H34V6Z" fill="#C69D59"/>
          <path d="M12 28L24 21V56H12V28Z" fill="#9E7636"/>
        </svg>
      </div>
      <div>
        <h1>بوابة الإدارة والموظفين</h1>
        <p class="sub">الحوض الهادي للإسكان — نظام إدارة المحتوى</p>
      </div>
    </div>
    {err_html}
    <form method="post" action="/admin/login">
      <label for="username">اسم المستخدم</label>
      <input id="username" name="username" dir="ltr" autocomplete="username" required maxlength="100" placeholder="admin">
      <label for="password">كلمة المرور</label>
      <div class="input-wrap">
        <input id="password" name="password" dir="ltr" type="password" autocomplete="current-password" required maxlength="256" placeholder="••••••••">
        <button type="button" class="toggle-pw" onclick="var p=document.getElementById('password');p.type=p.type==='password'?'text':'password';this.textContent=p.type==='password'?'إظهار':'إخفاء';">إظهار</button>
      </div>
      <button type="submit" class="submit-btn">تسجيل الدخول إلى اللوحة</button>
    </form>
    <a class="back-link" href="/">← العودة إلى الموقع الرئيسي</a>
  </main>
</body>
</html>"""
    return html.encode("utf-8")


class AlHawdHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def get_cookie_value(self, key: str) -> str:
        cookie_hdr = self.headers.get("Cookie", "")
        for part in cookie_hdr.split(";"):
            part = part.strip()
            if part.startswith(key + "="):
                return unquote(part[len(key) + 1:])
        return ""

    def send_json(self, status_code: int, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

        raw_path = self.path.split("?")[0].lower()
        if raw_path.endswith((".webp", ".png", ".jpg", ".jpeg", ".svg", ".ico", ".woff2", ".woff", ".ttf")):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        elif raw_path.endswith((".css", ".js")):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        qs = parse_qs(parsed.query)

        # GET /admin/login
        if path == "/admin/login":
            err = qs.get("error", [""])[0]
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(render_login_html(err))
            return

        # GET /admin/logout
        if path == "/admin/logout":
            self.send_response(302)
            self.send_header("Set-Cookie", "AlHawd_User=logged_out; Path=/; HttpOnly; SameSite=Lax")
            self.send_header("Location", "/admin/login")
            self.end_headers()
            return

        # SPA Routing for /admin
        if path == "/admin" or path == "/admin/" or path == "/admin.html":
            session_user = self.get_cookie_value("AlHawd_User")
            if session_user == "logged_out":
                self.send_response(302)
                self.send_header("Location", "/admin/login")
                self.end_headers()
                return
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(FRONTEND_DIR, "admin.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        # Routing for /project or /project.html
        if path == "/project" or path == "/project/" or path == "/project.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(FRONTEND_DIR, "project.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        # Routing for /apartment or /apartment.html
        if path == "/apartment" or path == "/apartment/" or path == "/apartment.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            with open(os.path.join(FRONTEND_DIR, "apartment.html"), "rb") as f:
                self.wfile.write(f.read())
            return

        # API: GET /api/admin/me
        if path == "/api/admin/me":
            users = load_admin_users()
            session_user = self.get_cookie_value("AlHawd_User")
            current = None
            if session_user and session_user != "logged_out":
                for u in users:
                    if u.get("username", "").lower() == session_user.lower():
                        current = u
                        break
            if not current:
                current = users[0] if users else {
                    "id": "usr-admin",
                    "username": "admin",
                    "displayName": "المدير العام",
                    "role": "admin",
                    "isActive": True
                }
            self.send_json(200, to_safe_user_dto(current))
            return

        # API: GET /api/admin/users
        if path == "/api/admin/users":
            users = load_admin_users()
            self.send_json(200, [to_safe_user_dto(u) for u in users])
            return

        # API: GET /api/cms
        if path == "/api/cms":
            self.send_json(200, get_cms_data())
            return

        # API: GET /api/bookings
        if path == "/api/bookings":
            self.send_json(200, get_bookings_from_sql())
            return

        # API: GET /api/media
        if path == "/api/media":
            scenes = [
                {"id": "scene-1", "title": "مشهد 1: الشارع الرئيسي للمجمع السكني", "category": "واجهات خارجية", "lightUrl": "/images/light/scene-1.png", "darkUrl": "/images/dark/scene-1.png"},
                {"id": "scene-2", "title": "مشهد 2: الصالة الرئيسية البانورامية", "category": "تصميم داخلي", "lightUrl": "/images/light/scene-2.png", "darkUrl": "/images/dark/scene-2.png"},
                {"id": "scene-3", "title": "مشهد 3: المسبح والحدائق والمرافق", "category": "أسلوب حياة", "lightUrl": "/images/light/scene-3.png", "darkUrl": "/images/dark/scene-3.png"},
                {"id": "scene-4", "title": "مشهد 4: إطلالة جوية للمجمع السكني", "category": "واجهات خارجية", "lightUrl": "/images/light/scene-4.png", "darkUrl": "/images/dark/scene-4.png"},
                {"id": "scene-5", "title": "مشهد 5: الحمام الرئيسي الفاخر", "category": "تصميم داخلي", "lightUrl": "/images/light/scene-5.png", "darkUrl": "/images/dark/scene-5.png"},
                {"id": "scene-6", "title": "مشهد 6: غرفة النوم الماستر", "category": "تصميم داخلي", "lightUrl": "/images/light/scene-6.png", "darkUrl": "/images/dark/scene-6.png"},
                {"id": "scene-7", "title": "مشهد 7: المدخل المعماري واللوبي", "category": "واجهات خارجية", "lightUrl": "/images/light/scene-7.png", "darkUrl": "/images/dark/scene-7.png"},
                {"id": "scene-8", "title": "مشهد 8: التراس البانورامي الخارجي", "category": "تراس وإطلالة", "lightUrl": "/images/light/scene-8.png", "darkUrl": "/images/dark/scene-8.png"},
                {"id": "scene-9", "title": "مشهد 9: المطبخ العصري المفتوح", "category": "تصميم داخلي", "lightUrl": "/images/light/scene-9.png", "darkUrl": "/images/dark/scene-9.png"},
                {"id": "scene-10", "title": "مشهد 10: المبنى السكني الرئيسي (زاوية ثلاثية)", "category": "واجهات خارجية", "lightUrl": "/images/light/scene-10.png", "darkUrl": "/images/dark/scene-10.png"}
            ]
            uploads = []
            if os.path.exists(UPLOADS_DIR):
                for f in sorted(os.listdir(UPLOADS_DIR), reverse=True):
                    if f.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                        uploads.append({
                            "id": f,
                            "filename": f,
                            "url": f"/images/uploads/{f}",
                            "sizeBytes": os.path.getsize(os.path.join(UPLOADS_DIR, f))
                        })
            self.send_json(200, {"pairs": scenes, "uploads": uploads})
            return

        # Default static file serving from frontend directory
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else ""

        # POST /admin/login
        if path == "/admin/login":
            form_data = parse_qs(body)
            username = (form_data.get("username", [""])[0]).strip()
            password = form_data.get("password", [""])[0]

            users = load_admin_users()
            matched = None
            for u in users:
                if u.get("username", "").lower() == username.lower():
                    matched = u
                    break

            if not matched or not verify_password(password, matched.get("passwordHash", "")):
                self.send_response(302)
                self.send_header("Location", "/admin/login?error=1")
                self.end_headers()
                return

            if not matched.get("isActive", True):
                self.send_response(302)
                self.send_header("Location", "/admin/login?error=disabled")
                self.end_headers()
                return

            self.send_response(302)
            self.send_header("Set-Cookie", f"AlHawd_User={matched.get('username')}; Path=/; HttpOnly; SameSite=Lax")
            self.send_header("Location", "/admin")
            self.end_headers()
            return

        # POST /admin/logout
        if path == "/admin/logout":
            self.send_response(302)
            self.send_header("Set-Cookie", "AlHawd_User=logged_out; Path=/; HttpOnly; SameSite=Lax")
            self.send_header("Location", "/admin/login")
            self.end_headers()
            return

        # API: POST /api/admin/users
        if path == "/api/admin/users":
            try:
                data = json.loads(body) if body else {}
                username = (data.get("username") or "").strip()
                display_name = (data.get("displayName") or "").strip() or username
                role = normalize_role(data.get("role", "sales"))
                password = data.get("password") or ""

                if len(username) < 2 or len(username) > 60:
                    self.send_json(400, {"error": "اسم المستخدم يجب أن يكون بين حرفين و 60 حرفاً"})
                    return
                if len(password) < 4 or len(password) > 256:
                    self.send_json(400, {"error": "كلمة المرور يجب أن تتكون من 4 خانات على الأقل"})
                    return

                users = load_admin_users()
                for u in users:
                    if u.get("username", "").lower() == username.lower():
                        self.send_json(400, {"error": "اسم المستخدم هذا مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر"})
                        return

                new_user = {
                    "id": f"usr-{int(time.time() * 1000)}",
                    "username": username,
                    "displayName": display_name,
                    "role": role,
                    "isActive": True,
                    "passwordHash": hash_password(password),
                    "createdAt": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
                }
                users.append(new_user)
                save_admin_users(users)
                self.send_json(200, {"success": True, "user": to_safe_user_dto(new_user)})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return

        # API: POST /api/admin/change-password
        if path == "/api/admin/change-password":
            try:
                data = json.loads(body) if body else {}
                user_id = (data.get("userId") or "").strip()
                username = (data.get("username") or "").strip()
                new_password = data.get("newPassword") or ""

                if len(new_password) < 4 or len(new_password) > 256:
                    self.send_json(400, {"error": "كلمة المرور الجديدة يجب أن تتكون من 4 خانات على الأقل"})
                    return

                users = load_admin_users()
                target = None
                if user_id:
                    target = next((u for u in users if u.get("id", "").lower() == user_id.lower()), None)
                if not target and username:
                    target = next((u for u in users if u.get("username", "").lower() == username.lower()), None)
                if not target:
                    session_user = self.get_cookie_value("AlHawd_User")
                    if session_user and session_user != "logged_out":
                        target = next((u for u in users if u.get("username", "").lower() == session_user.lower()), None)
                if not target and users:
                    target = users[0]

                if not target:
                    self.send_json(404, {"error": "لم يتم العثور على الحساب المطلوب"})
                    return

                new_hash = hash_password(new_password)
                target["passwordHash"] = new_hash
                save_admin_users(users)
                update_credentials_file_if_admin(target.get("username", ""), new_password, new_hash)

                self.send_json(200, {
                    "success": True,
                    "message": f"تم تغيير كلمة المرور لحساب ({target.get('displayName')}) بنجاح",
                    "user": to_safe_user_dto(target)
                })
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return

        # API: POST /api/bookings
        if path == "/api/bookings":
            try:
                data = json.loads(body)
                name = data.get("name", "").replace("'", "''")
                phone = data.get("phone", "").replace("'", "''")
                email = data.get("email", "").replace("'", "''")
                project = data.get("project", "").replace("'", "''")
                unit = data.get("unit", "").replace("'", "''")
                pdate = data.get("preferredDate", "").replace("'", "''")
                ptime = data.get("preferredTime", "").replace("'", "''")
                notes = data.get("notes", "").replace("'", "''")

                q = f"""
                SET NOCOUNT ON;
                INSERT INTO Bookings (Name, Phone, Email, Project, Unit, PreferredDate, PreferredTime, Notes, Status, CreatedAt)
                VALUES (N'{name}', N'{phone}', N'{email}', N'{project}', N'{unit}', N'{pdate}', N'{ptime}', N'{notes}', 'new', GETUTCDATE());
                SELECT SCOPE_IDENTITY();
                """
                new_id = run_sql(q)
                res = {"success": True, "booking": {"id": new_id, "name": name, "phone": phone, "project": project, "unit": unit, "status": "new"}}
                self.send_json(200, res)
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return

        # API: POST /api/upload
        if path == "/api/upload":
            try:
                import io
                data = json.loads(body)
                filename = data.get("filename", "upload.png")
                data_url = data.get("dataUrl", "")
                match = re.match(r"^data:image/([a-zA-Z0-9+.\-]+);base64,(.+)$", data_url)
                if match:
                    ext = match.group(1).lower()
                    if ext == "jpeg":
                        ext = "jpg"
                    b64 = match.group(2)
                    raw_bytes = base64.b64decode(b64)
                    orig_bytes_len = int(data.get("originalSize") or len(raw_bytes))
                    final_bytes = raw_bytes
                    final_ext = ext

                    try:
                        from PIL import Image, ImageOps
                        img = Image.open(io.BytesIO(raw_bytes))
                        is_animated = getattr(img, "is_animated", False)
                        if not is_animated and ext in ("png", "jpg", "jpeg", "webp"):
                            img = ImageOps.exif_transpose(img)
                            buf_webp = io.BytesIO()
                            img.save(buf_webp, format="WEBP", quality=95, method=6, exact=True)
                            webp_bytes = buf_webp.getvalue()

                            buf_lossless = io.BytesIO()
                            img.save(buf_lossless, format="WEBP", lossless=True, method=6)
                            lossless_bytes = buf_lossless.getvalue()

                            candidate_bytes = webp_bytes
                            if len(lossless_bytes) <= len(webp_bytes) * 1.15 and len(lossless_bytes) < len(raw_bytes):
                                candidate_bytes = lossless_bytes

                            if len(candidate_bytes) < len(raw_bytes):
                                final_bytes = candidate_bytes
                                final_ext = "webp"
                    except Exception as pil_err:
                        print("Pillow optimization skipped:", pil_err)

                    clean_name = f"upload-{int(time.time()*1000)}.{final_ext}"
                    out_p = os.path.join(UPLOADS_DIR, clean_name)
                    with open(out_p, "wb") as f:
                        f.write(final_bytes)

                    saved_pct = 0
                    if orig_bytes_len > len(final_bytes):
                        saved_pct = round((1.0 - (len(final_bytes) / orig_bytes_len)) * 100, 1)

                    res = {
                        "success": True,
                        "url": f"/images/uploads/{clean_name}",
                        "filename": clean_name,
                        "originalBytes": orig_bytes_len,
                        "compressedBytes": len(final_bytes),
                        "savedPercent": saved_pct
                    }
                    self.send_json(200, res)
                    return
            except Exception as e:
                self.send_json(500, {"error": str(e)})
                return

        # API: POST /api/cms/reset
        if path == "/api/cms/reset":
            with open(SEED_CMS, "r", encoding="utf-8") as f:
                seed = json.load(f)
            save_cms_data(seed)
            self.send_json(200, {"success": True, "data": seed})
            return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else ""

        # API: PUT /api/admin/users/{id}
        m_user = re.match(r"^/api/admin/users/([^/]+)$", path)
        if m_user:
            user_id = unquote(m_user.group(1))
            try:
                data = json.loads(body) if body else {}
                users = load_admin_users()
                target = next((u for u in users if u.get("id", "").lower() == user_id.lower()), None)
                if not target:
                    self.send_json(404, {"error": "المستخدم غير موجود"})
                    return

                if "username" in data and data["username"]:
                    new_username = data["username"].strip()
                    if len(new_username) < 2 or len(new_username) > 60:
                        self.send_json(400, {"error": "اسم المستخدم يجب أن يكون بين حرفين و 60 حرفاً"})
                        return
                    for u in users:
                        if u.get("id", "").lower() != target.get("id", "").lower() and u.get("username", "").lower() == new_username.lower():
                            self.send_json(400, {"error": "اسم المستخدم مستخدم بالفعل لحساب آخر"})
                            return
                    target["username"] = new_username

                if "displayName" in data and data["displayName"]:
                    target["displayName"] = data["displayName"].strip()

                next_role = normalize_role(data["role"]) if "role" in data and data["role"] else target.get("role", "admin")
                next_active = bool(data["isActive"]) if "isActive" in data and data["isActive"] is not None else bool(target.get("isActive", True))

                other_active_admins = sum(
                    1 for u in users
                    if u.get("id", "").lower() != target.get("id", "").lower()
                    and u.get("isActive", True)
                    and u.get("role", "").lower() == "admin"
                )
                if other_active_admins == 0 and (not next_active or next_role != "admin"):
                    self.send_json(400, {"error": "لا يمكن إيقاف أو تخفيض صلاحية حساب مدير النظام الوحيد النشط"})
                    return

                target["role"] = next_role
                target["isActive"] = next_active

                if data.get("password"):
                    pw = data["password"]
                    if len(pw) < 4 or len(pw) > 256:
                        self.send_json(400, {"error": "كلمة المرور يجب أن تتكون من 4 خانات على الأقل"})
                        return
                    new_hash = hash_password(pw)
                    target["passwordHash"] = new_hash
                    update_credentials_file_if_admin(target.get("username", ""), pw, new_hash)

                save_admin_users(users)
                self.send_json(200, {"success": True, "user": to_safe_user_dto(target)})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return

        if path == "/api/cms":
            try:
                data = json.loads(body)
                save_cms_data(data)
                self.send_json(200, {"success": True, "data": data})
            except Exception as e:
                self.send_json(500, {"error": str(e)})
            return

        self.send_response(404)
        self.end_headers()

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else ""

        # PATCH /api/bookings/{id}
        m = re.match(r"^/api/bookings/(\d+)$", path)
        if m:
            bk_id = m.group(1)
            try:
                data = json.loads(body)
                new_status = data.get("status", "new").replace("'", "''")
                q = f"UPDATE Bookings SET Status = '{new_status}', UpdatedAt = GETUTCDATE() WHERE Id = {bk_id};"
                run_sql(q)
                self.send_json(200, {"success": True})
                return
            except Exception as e:
                self.send_json(500, {"error": str(e)})
                return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # DELETE /api/admin/users/{id}
        m_user = re.match(r"^/api/admin/users/([^/]+)$", path)
        if m_user:
            user_id = unquote(m_user.group(1))
            users = load_admin_users()
            target = next((u for u in users if u.get("id", "").lower() == user_id.lower()), None)
            if not target:
                self.send_json(404, {"error": "المستخدم غير موجود"})
                return

            remaining_active_admins = sum(
                1 for u in users
                if u.get("id", "").lower() != target.get("id", "").lower()
                and u.get("isActive", True)
                and u.get("role", "").lower() == "admin"
            )
            if remaining_active_admins == 0:
                self.send_json(400, {"error": "لا يمكن حذف حساب مدير النظام الرئيسي الوحيد"})
                return

            users = [u for u in users if u.get("id", "").lower() != target.get("id", "").lower()]
            save_admin_users(users)
            self.send_json(200, {"success": True})
            return

        # DELETE /api/bookings/{id}
        m = re.match(r"^/api/bookings/(\d+)$", path)
        if m:
            bk_id = m.group(1)
            q = f"DELETE FROM Bookings WHERE Id = {bk_id};"
            run_sql(q)
            self.send_json(200, {"success": True})
            return

        self.send_response(404)
        self.end_headers()


if __name__ == "__main__":
    print(f"Starting server on http://localhost:{PORT}")
    httpd = HTTPServer(("", PORT), AlHawdHandler)
    httpd.serve_forever()
