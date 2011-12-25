from zorro import Hub, zmq
from zorro.zerogw import JSONWebsockOutput

from . import notepads
from . import dashboards


def default_handler(cid, cmd, *tail):
    if cmd == b'connect':
        output.add_output(cid, '["notepad.', 'notepad')


def main():
    global output
    note = zmq.rep_socket(
        notepads.NotepadHTTP('uri'))
    note.connect('ipc://./run/notepad.sock')
    dash = zmq.rep_socket(dashboards.process)
    dash.connect('ipc://./run/dashboard.sock')
    outsock = zmq.pub_socket()
    outsock.connect('ipc://./run/ws-output.sock')
    output = JSONWebsockOutput(outsock)
    wsdef = zmq.pull_socket(default_handler)
    wsdef.connect('ipc://./run/ws-default.sock')
    wsnote = zmq.pull_socket(
        notepads.NotepadWebsock(output, prefix='notepad.'))
    wsnote.connect('ipc://./run/ws-notepad.sock')
    notepads.output = output

if __name__ == '__main__':
    hub = Hub()
    hub.run(main)
