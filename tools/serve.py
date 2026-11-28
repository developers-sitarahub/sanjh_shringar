"""Local preview with the same clean URLs as the live site.

    python tools/serve.py            -> http://127.0.0.1:8090
    /shop?c=bridal -> site/shop.html, /about -> site/about.html, unknown -> 404

Mirrors server/entry.mjs so links behave locally exactly as on Wix.
"""
import http.server
import socketserver
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent / "site"
PAGES = {"shop", "product", "about", "contact", "policies"}
PORT = 8090


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(SITE), **kwargs)

    def do_GET(self):
        path, _, query = self.path.partition("?")
        path, _, _frag = path.partition("#")
        name = path.strip("/")
        if name in PAGES:
            self.path = f"/{name}.html" + (f"?{query}" if query else "")
        elif path not in ("/", "") and not (SITE / path.lstrip("/")).exists():
            self.send_error(404, "Page not found")
            return
        super().do_GET()


if __name__ == "__main__":
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.ThreadingTCPServer(("127.0.0.1", PORT), Handler) as httpd:
        print(f"Serving site/ with clean URLs on http://127.0.0.1:{PORT}  (Ctrl+C to stop)")
        httpd.serve_forever()
