import json

from jinja2 import Environment as Jinja
from zorro.zerogw import (ParamService as HTTPService,
                          JSONWebsockInput,
                          public, public_with_connection_id)
from zorro.redis import Redis
from zorro.di import has_dependencies, dependency, di


from .util import uri_to_title
from .notepads import Notepad


@has_dependencies
class DashboardHTTP(HTTPService):

    jinja = dependency(Jinja, 'jinja')
    redis = dependency(Redis, 'redis')

    @public
    def default(self, uri):
        ident = uri[2:]
        leftcol = []
        rightcol = []
        data = self.redis.execute('GET', 'dashboard:{}:notepads'.format(ident))
        if data:
            data = json.loads(data.decode('utf-8'))
            inject = di(self).inject
            for kind, uri in data:
                note = inject(Notepad.from_url(uri))
                if kind == 'left':
                    leftcol.append(note)
                elif kind == 'right':
                    rightcol.append(note)
                else:
                    raise NotImplementedError(kind)
        return (b'200 OK',
                b'Content-Type\0text/html; charset=utf-8\0',
                self.jinja.get_template('dashboard.html').render(
                    title=uri_to_title(ident),
                    left_column=leftcol,
                    right_column=rightcol,
                    ))

@has_dependencies
class DashboardWebsock(JSONWebsockInput):

    redis = dependency(Redis, 'redis')

    @public_with_connection_id
    def subscribe(self, cid, name):
        self.output.subscribe(cid, 'dashboard:'+name)
        return 'ok'

    @public_with_connection_id
    def insert_before(self, cid, dash, hint, uri):
        data = self.redis.execute('GET', 'dashboard:{}:notepads'.format(dash))
        if data:
            data = json.loads(data.decode('utf-8'))
        else:
            data = []
        for idx, (kind, nuri) in enumerate(data):
            if nuri[1:] == hint:
                data.insert(idx, (kind, uri))
                break
        self.redis.execute('SET', 'dashboard:{}:notepads'.format(dash),
            json.dumps(data))
        np = di(self).inject(Notepad.from_url(uri))
        self.output.subscribe(cid, np.topic)
        self.output.publish('dashboard:'+dash,
            ['dashboard.insert_before', dash, hint, {
                'ident': np.ident,
                'title': uri_to_title(uri),
                'records': np.records,
                }])
        return 'ok'

    @public_with_connection_id
    def insert_after(self, cid, dash, hint, uri):
        data = self.redis.execute('GET', 'dashboard:{}:notepads'.format(dash))
        if data:
            data = json.loads(data.decode('utf-8'))
        else:
            data = []
        for idx, (kind, nuri) in enumerate(data):
            if nuri[1:] == hint:
                data.insert(idx+1, (kind, uri))
                break
        self.redis.execute('SET', 'dashboard:{}:notepads'.format(dash),
            json.dumps(data))
        np = di(self).inject(Notepad.from_url(uri))
        self.output.subscribe(cid, np.topic)
        self.output.publish('dashboard:'+dash,
            ['dashboard.insert_after', dash, hint, {
                'ident': np.ident,
                'title': uri_to_title(uri),
                'records': np.records,
                }])
        return 'ok'

    @public_with_connection_id
    def append_left(self, cid, dash, uri):
        data = self.redis.execute('GET', 'dashboard:{}:notepads'.format(dash))
        if data:
            data = json.loads(data.decode('utf-8'))
        else:
            data = []
        data.append(('left', uri))
        self.redis.execute('SET', 'dashboard:{}:notepads'.format(dash),
            json.dumps(data))
        np = di(self).inject(Notepad.from_url(uri))
        self.output.subscribe(cid, np.topic)
        self.output.publish('dashboard:'+dash,
            ['dashboard.append_left', dash, {
                'ident': np.ident,
                'title': uri_to_title(uri),
                'records': np.records,
                }])
        return 'ok'


    @public_with_connection_id
    def append_right(self, cid, dash, uri):
        data = self.redis.execute('GET', 'dashboard:{}:notepads'.format(dash))
        if data:
            data = json.loads(data.decode('utf-8'))
        else:
            data = []
        for idx, (kind, nuri) in data:
            if nuri == hint:
                data.insert(idx+1, (kind, uri))
                break
        self.redis.execute('SET', 'dashboard:{}:notepads'.format(dash),
            json.dumps(data))
        data.append(('right', uri))
        np = di(self).inject(Notepad.from_url(uri))
        self.output.subscribe(cid, np.topic)
        self.output.publish('dashboard:'+dash,
            ['dashboard.append_left', dash, {
                'ident': np.ident,
                'title': uri_to_title(uri),
                'records': np.records,
                }])
        return 'ok'

