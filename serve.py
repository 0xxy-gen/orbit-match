#!/usr/bin/env python3
"""The prototype's static server.

This exists for one reason: python3 -m http.server sends no cache headers, so
the browser is free to guess, and it guesses wrong. An edited module keeps
serving its old copy, which at best makes a change look like it did not happen
and at worst breaks the page outright: if one module gains an export and a
stale copy of it is still in the cache, the import fails at link time and
nothing on the page renders at all.

That is not a real hosting concern, it is a local development one, so the
answer is to never cache anything. no-store is the strong form: do not keep a
copy, not even to revalidate.
"""

import functools
import http.server

PORT = 3200
ROOT = 'public'


class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()

    # one line per request, without the date noise
    def log_message(self, fmt, *args):
        print(fmt % args)


if __name__ == '__main__':
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(('', PORT), handler) as server:
        print(f'OrbitMatch on http://localhost:{PORT}  (nothing is cached)')
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass
