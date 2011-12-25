import re
import json
from urllib.parse import unquote_plus as urldecode

import jinja2
from zorro.redis import Redis
from zorro.zerogw import (ParamService as HTTPService,
                          JSONWebsockInput,
                          public)
from zorro.di import has_dependencies, dependency, di


jinja = jinja2.Environment(
    loader=jinja2.PackageLoader(__name__, 'templates'))
camel_re = re.compile('([A-Z][^A-Z])')
split_re = re.compile('[ _]')


@has_dependencies
class Notepad(object):

    redis = dependency(Redis, 'redis')

    def __init__(self, ident, title):
        self.ident = ident
        self.title = title

    @classmethod
    def from_url(cls, url):
        url = urldecode(url[1:])
        words = split_re.split(camel_re.sub(' \\1', url))
        title = ' '.join(words).title()
        return cls(url, title)

    @classmethod
    def from_id(cls, ident):
        return Notepad(ident, None)

    def append_record(self, text):
        text = text.strip()
        recid = self.redis.execute('INCR', 'record_counter')
        rec = {
            'id': recid,
            'title': text,
            }
        self.redis.pipeline((
            ("SET", 'record:{}'.format(recid), json.dumps(rec)),
            ("RPUSH", "notepad:records:"+self.ident, recid),
            ))
        return rec

    @property
    def records(self):
        # TODO(pc) cache
        recs = self.redis.execute("SORT",
            "notepad:records:"+self.ident, "BY", "*", "GET", "record:*")
        return [json.loads(rec.decode('utf-8')) for rec in recs]


@has_dependencies
class NotepadHTTP(HTTPService):

    @public
    def default(self, uri):
        note = di(self).inject(Notepad.from_url(uri))
        return (b'200 OK',
                b'Content-Type\0text/html; charset=utf-8\0',
                jinja.get_template('notepad.html').render(notepad=note))


@has_dependencies
class NotepadWebsock(JSONWebsockInput):

    @public
    def append_record(self, npname, text):
        note = di(self).inject(Notepad.from_id(npname))
        return note.append_record(text)


