import json

from jinja2 import Environment as Jinja
from zorro.zerogw import (ParamService as HTTPService,
                          public)
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
        data = self.redis.execute('GET', 'dashboard:{}:notepads'.format(ident))
        if data:
            data = json.loads(data.decode('utf-8'))
            layout = []
            inject = di(self).inject
            for kind, uri in data:
                note = inject(Notepad.from_url(uri))
                layout.append((kind, note))
        else:
            layout = []
        return (b'200 OK',
                b'Content-Type\0text/html; charset=utf-8\0',
                self.jinja.get_template('dashboard.html').render(
                    title=uri_to_title(ident),
                    layout=layout,
                    ))


