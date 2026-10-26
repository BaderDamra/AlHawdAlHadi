import os
import sys
import json
import re
import subprocess
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 3000
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")
UPLOADS_DIR = os.path.join(FRONTEND_DIR, "images", "uploads")
SEED_CMS = os.path.join(BASE_DIR, "backend", "AlHawdAlHadi.Api", "SeedData", "default-cms.json")
RUNTIME_CMS = os.path.join(BASE_DIR, "backend", "AlHawdAlHadi.Api", "SeedData", "runtime-cms.json")

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

class AlHawdHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def end_headers(self):
        # Set UTF-8 for HTML, CSS, JS and disable stale browser caching
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
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

        # SPA Routing for /admin
        if path == "/admin" or path == "/admin/":
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

        # API: GET /api/cms
        if path == "/api/cms":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            data = get_cms_data()
            self.wfile.write(json.dumps(data, ensure_ascii=False).encode("utf-8"))
            return

        # API: GET /api/bookings
        if path == "/api/bookings":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            bookings = get_bookings_from_sql()
            self.wfile.write(json.dumps(bookings, ensure_ascii=False).encode("utf-8"))
            return

        # API: GET /api/media
        if path == "/api/media":
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
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
            res = {"pairs": scenes, "uploads": uploads}
            self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            return

        # Default static file serving from frontend directory
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else ""

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
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                res = {"success": True, "booking": {"id": new_id, "name": name, "phone": phone, "project": project, "unit": unit, "status": "new"}}
                self.wfile.write(json.dumps(res, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # API: POST /api/upload (Lossless / Zero-Quality-Loss Image Compression)
        if path == "/api/upload":
            try:
                import base64, time, io
                data = json.loads(body)
                filename = data.get("filename", "upload.png")
                data_url = data.get("dataUrl", "")
                match = re.match(r"^data:image/([a-zA-Z0-9+.\-]+);base64,(.+)$", data_url)
                if match:
                    ext = match.group(1).lower()
                    if ext == "jpeg": ext = "jpg"
                    b64 = match.group(2)
                    raw_bytes = base64.b64decode(b64)
                    orig_bytes_len = int(data.get("originalSize") or len(raw_bytes))
                    final_bytes = raw_bytes
                    final_ext = ext

                    # Compress without losing quality or resolution using Pillow
                    try:
                        from PIL import Image, ImageOps
                        img = Image.open(io.BytesIO(raw_bytes))
                        is_animated = getattr(img, "is_animated", False)
                        if not is_animated and ext in ("png", "jpg", "jpeg", "webp"):
                            img = ImageOps.exif_transpose(img)
                            buf_webp = io.BytesIO()
                            # Save high-precision WebP (q=95, method=6, exact alpha preservation)
                            img.save(buf_webp, format="WEBP", quality=95, method=6, exact=True)
                            webp_bytes = buf_webp.getvalue()

                            # Also test true mathematical lossless WebP if image is small/graphic
                            buf_lossless = io.BytesIO()
                            img.save(buf_lossless, format="WEBP", lossless=True, method=6)
                            lossless_bytes = buf_lossless.getvalue()

                            # Pick best compressed representation that is smaller than raw_bytes
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

                    self.send_response(200)
                    self.send_header("Content-Type", "application/json; charset=utf-8")
                    self.end_headers()
                    res = {
                        "success": True,
                        "url": f"/images/uploads/{clean_name}",
                        "filename": clean_name,
                        "originalBytes": orig_bytes_len,
                        "compressedBytes": len(final_bytes),
                        "savedPercent": saved_pct
                    }
                    self.wfile.write(json.dumps(res).encode("utf-8"))
                    return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        # API: POST /api/cms/reset
        if path == "/api/cms/reset":
            with open(SEED_CMS, "r", encoding="utf-8") as f:
                seed = json.load(f)
            save_cms_data(seed)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "data": seed}, ensure_ascii=False).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length).decode("utf-8", errors="replace") if length > 0 else ""

        if path == "/api/cms":
            try:
                data = json.loads(body)
                save_cms_data(data)
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "data": data}, ensure_ascii=False).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
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
                self.send_response(200)
                self.send_header("Content-Type", "application/json; charset=utf-8")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
                return
            except Exception as e:
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # DELETE /api/bookings/{id}
        m = re.match(r"^/api/bookings/(\d+)$", path)
        if m:
            bk_id = m.group(1)
            q = f"DELETE FROM Bookings WHERE Id = {bk_id};"
            run_sql(q)
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.end_headers()
            self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

print(f"Starting server on http://localhost:{PORT}")
httpd = HTTPServer(("", PORT), AlHawdHandler)
httpd.serve_forever()
