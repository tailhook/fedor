jQuery(function($) {

    var notepad_id = location.pathname.substr(1);
    var conn = new Connection('/.ws');
    var requests = {};

    function notify() {
        var json = JSON.stringify(Array.prototype.slice.call(arguments));
        console.log("Notifying", json);
        conn.send(json);
    }
    function Request(args) {
        var rid = Math.random().toString();
        args.splice(1, 0, rid);
        var json = JSON.stringify(args);
        console.log("Requesting", json);
        conn.send(json);
        this.id = rid;
        requests[this.id] = this;
    }
    Request.prototype.set_callback = function add_callback(fun) {
        this.callback = fun;
    }
    function request() {
        return new Request(Array.prototype.slice.call(arguments));
    }
    function message(ev) {
        var json = JSON.parse(ev.data);
        if(json[0] == '_reply') {
            console.log("REQ", requests, json);
            var req = requests[json[1]];
            delete requests[json[1]];
            json.splice(0, 2);
            req.callback.apply(req, json);
        }
    }
    conn.onmessage = message;
    function insert_record_after(el) {
        viins.bind_to($("<li><input type='text'></li>")
            .appendTo($("ul.notepad"))
            .find('input')
                .focus()
                .blur(finish_record)
            );
        return false;
    }
    function finish_record(ev) {
        var inp = $(ev.target);
        var txt = inp.val().trim();
        if(!txt.length) {
            inp.parent().remove();
            return;
        }
        inp.attr('disabled', 'disabled');
        request('notepad.append_record', notepad_id, inp.val())
            .set_callback(function (text) {
                inp.parent().text(text);
            });
    }
    function blur_input(el) {
        el.blur();
    }

    var vicmd = new Hotkeys();
    vicmd.add_key('o', insert_record_after);
    vicmd.bind_to(document);

    var viins = new Hotkeys();
    viins.allow_input = true;
    viins.add_key('<C-[> <esc> <return>', blur_input);
})
