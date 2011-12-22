import re
import json
from urllib.parse import unquote_plus as urldecode

import jinja2
from zorro import redis


jinja = jinja2.Environment(
    loader=jinja2.PackageLoader(__name__, 'templates'))
camel_re = re.compile('([A-Z][^A-Z])')
split_re = re.compile('[ _]')


class Notepad(object):

    def __init__(self, ident, title):
        self.ident = ident
        self.title = title

    @classmethod
    def from_url(cls, url):
        url = urldecode(url[1:].decode('utf-8'))
        words = split_re.split(camel_re.sub(' \\1', url))
        title = ' '.join(words).title()
        return cls(url, title)

    @classmethod
    def from_id(cls, ident):
        return Notepad(ident, None)

    def append_record(self, text):
        text = text.strip()
        redis.redis().execute("RPUSH", "notepad:"+self.ident, text)
        return text

    @property
    def records(self):
        # TODO(pc) cache
        recs = redis.redis().execute("LRANGE", "notepad:"+self.ident, 0, -1)
        for i in recs:
            yield i.decode('utf-8')


def process(url):
    note = Notepad.from_url(url)
    return [b'200 OK',
        b'Content-Type\0text/html; charset=utf-8\0',
        jinja.get_template('notepad.html').render(notepad=note)]


def process_websock(output, cid, _message, body=None, *tail):
    if _message != b'message':
        return
    parts = json.loads(body.decode('utf-8'))
    cmd, req_id, np_id, *args = parts
    np = Notepad.from_id(np_id)
    value = getattr(np, cmd[len('notepad.'):])(*args)
    output.publish('send', cid,
        json.dumps(['_reply', req_id, value]))
