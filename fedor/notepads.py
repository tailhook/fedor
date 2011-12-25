import re
import json
from urllib.parse import unquote_plus as urldecode

import jinja2
from zorro.redis import Redis
from zorro.zerogw import (ParamService as HTTPService,
                          JSONWebsockInput,
                          public, public_with_connection_id)
from zorro.di import has_dependencies, dependency, di
from zorro.util import cached_property as cached


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
        self.records_key = ("notepad:records:"+self.ident).encode('ascii')
        self.topic = ("notepad:"+self.ident).encode('ascii')

    @classmethod
    def from_url(cls, url):
        url = urldecode(url[1:])
        words = split_re.split(camel_re.sub(' \\1', url))
        title = ' '.join(words).title()
        return cls(url, title)

    @classmethod
    def from_id(cls, ident):
        return Notepad(ident, None)

    @cached
    def records(self):
        # TODO(pc) cache
        recs = self.redis.execute("SORT",
            self.records_key, "BY", "*", "GET", "record:*")
        return [json.loads(rec.decode('utf-8')) for rec in recs]

    def new_record(self, title):
        title = title.strip()
        recid = self.redis.execute('INCR', 'record_counter')
        rec = {
            'id': recid,
            'title': title,
            }
        return rec


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

    redis = dependency(Redis, 'redis')

    @public_with_connection_id
    def subscribe(self, cid, npname):
        note = di(self).inject(Notepad.from_id(npname))
        self.output.subscribe(cid, note.topic)
        return 'ok'

    @public
    def append_record(self, npname, text):
        note = di(self).inject(Notepad.from_id(npname))
        rec = note.new_record(text)
        self.redis.pipeline((
            (b"SET", 'record:{}'.format(rec['id']), json.dumps(rec)),
            (b"RPUSH", note.records_key, rec['id']),
            ))
        self.output.publish(note.topic,
            ['notepad.append_record', npname, rec])
        return rec

    @public
    def prepend_record(self, npname, text):
        note = di(self).inject(Notepad.from_id(npname))
        rec = note.new_record(text)
        self.redis.pipeline((
            (b"SET", 'record:{}'.format(rec['id']), json.dumps(rec)),
            (b"LPUSH", note.records_key, rec['id']),
            ))
        self.output.publish(note.topic,
            ['notepad.prepend_record', npname, rec])
        return rec

    @public
    def insert_after(self, npname, hint,  text):
        note = di(self).inject(Notepad.from_id(npname))
        rec = note.new_record(text)
        self.redis.pipeline((
            (b"SET", 'record:{}'.format(rec['id']), json.dumps(rec)),
            (b"LINSERT", note.records_key, "AFTER", hint, rec['id']),
            ))
        self.output.publish(note.topic,
            ['notepad.insert_after', npname, hint, rec])
        return rec

    @public
    def insert_before(self, npname, hint,  text):
        note = di(self).inject(Notepad.from_id(npname))
        rec = note.new_record(text)
        self.redis.pipeline((
            (b"SET", 'record:{}'.format(rec['id']), json.dumps(rec)),
            (b"LINSERT", note.records_key, "BEFORE", hint, rec['id']),
            ))
        self.output.publish(note.topic,
            ['notepad.insert_before', npname, hint, rec])
        return rec

    @public
    def set_record_title(self, npname, id, text):
        note = di(self).inject(Notepad.from_id(npname))
        rec = self.redis.execute("GET", 'record:{}'.format(id))
        if rec:
            rec = json.loads(rec.decode('utf-8'))
            rec['title'] = text
            self.redis.execute(b"SET", 'record:{}'.format(rec['id']),
                               json.dumps(rec))
            self.output.publish(note.topic,
                ['notepad.update_record', npname, rec])
            return rec
        else:
            return 'not_found'

    @public
    def remove_record(self, npname, id):
        note = di(self).inject(Notepad.from_id(npname))
        self.redis.pipeline((
            (b'LREM', note.records_key, b'0', id),
            (b'DEL', 'record:{}'.format(id)),
            ))
        self.output.publish(note.topic,
            ['notepad.remove_record', npname, id])
        return 'ok'


