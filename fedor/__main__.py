import logging

import jinja2
from zorro import Hub, zmq
from zorro.zerogw import JSONWebsockOutput, JSONWebsockInput
from zorro.di import DependencyInjector, has_dependencies, dependency
from zorro.redis import Redis

from . import notepads
from . import dashboards


@has_dependencies
class DefaultHandler(JSONWebsockInput):

    output = dependency(JSONWebsockOutput, 'websock_output')

    def handle_connect(self, cid):
        self.output.add_output(cid, '["notepad.', 'notepad')


def main():
    logging.basicConfig(level=logging.DEBUG)

    di = DependencyInjector()
    di['redis'] = Redis()
    di['jinja'] = jinja2.Environment(
        loader=jinja2.PackageLoader(__name__, 'templates'))


    note = zmq.rep_socket(
        di.inject(notepads.NotepadHTTP('uri')))
    note.connect('ipc://./run/notepad.sock')

    dash = zmq.rep_socket(
        di.inject(dashboards.DashboardHTTP('uri')))
    dash.connect('ipc://./run/dashboard.sock')

    outsock = zmq.pub_socket()
    outsock.connect('ipc://./run/ws-output.sock')
    output = di.inject(JSONWebsockOutput(outsock))
    di['websock_output'] = output

    wsdef = zmq.pull_socket(
        di.inject(DefaultHandler()))
    wsdef.connect('ipc://./run/ws-default.sock')

    wsnote = zmq.pull_socket(
        di.inject(notepads.NotepadWebsock(prefix='notepad.'),
                  output='websock_output'))
    wsnote.connect('ipc://./run/ws-notepad.sock')

if __name__ == '__main__':
    from .__main__ import main  # to fix module's __name__
    hub = Hub()
    hub.run(main)
