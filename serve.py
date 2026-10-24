import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS and disable aggressive caching for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_GET(self):
        # SPA fallback: if file does not exist, serve /index.html
        path_without_query = self.path.split('?')[0].lstrip('/')
        local_path = os.path.join('/Users/aayushtripathi/Downloads/vortex', path_without_query)
        if not path_without_query or not os.path.exists(local_path) or os.path.isdir(local_path):
            self.path = '/index.html'
        return super().do_GET()

def run_server(port=5173):
    os.chdir('/Users/aayushtripathi/Downloads/vortex')
    ThreadingHTTPServer.allow_reuse_address = True
    try:
        server = ThreadingHTTPServer(('0.0.0.0', port), CustomHandler)
        print(f"BhandarSetu Dashboard serving at http://localhost:{port}/")
        server.serve_forever()
    except OSError as e:
        print(f"Port {port} busy, trying 8080: {e}")
        server = ThreadingHTTPServer(('0.0.0.0', 8080), CustomHandler)
        print(f"BhandarSetu Dashboard serving at http://localhost:8080/")
        server.serve_forever()

if __name__ == '__main__':
    port = 5173
    if len(sys.argv) > 1:
        port = int(sys.argv[1])
    run_server(port)

