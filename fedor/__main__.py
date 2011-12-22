from functools import partial

from zorro import Hub, zmq

from . import notepads
from . import dashboards


def default_handler(sock, cid, cmd, *tail):
    if cmd == b'connect':
        sock.publish(b'add_output', cid, '["notepad.', 'notepad')


hub = Hub()


@hub.run
def main():
    note = zmq.rep_socket(notepads.process)
    note.connect('ipc://./run/notepad.sock')
    dash = zmq.rep_socket(dashboards.process)
    dash.connect('ipc://./run/dashboard.sock')
    output = zmq.pub_socket()
    output.connect('ipc://./run/ws-output.sock')
    wsdef = zmq.pull_socket(partial(default_handler, output))
    wsdef.connect('ipc://./run/ws-default.sock')
    wsnote = zmq.pull_socket(partial(notepads.process_websock, output))
    wsnote.connect('ipc://./run/ws-notepad.sock')
