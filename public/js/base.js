jQuery(function($) {

    var notepad_id = location.pathname.substr(1);
    var conn = new Connection('/.ws');
    var requests = {};
    var cursor = null;

    function notify() {
        var json = JSON.stringify(Array.prototype.slice.call(arguments));
        console.log("Notifying", json);
        conn.send(json);
    }
    function Request(args) {
        var rid = Math.random().toString();
        args.splice(1, 0, rid);
        args[0] += '+';
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
        console.log("GOT MESSAGE", json);
        if(json[0] == '_reply') {
            var req = requests[json[1]];
            delete requests[json[1]];
            json.splice(0, 2);
            if(req.callback)
                req.callback.apply(req, json);
        }
    }
    conn.onmessage = message;
    function _record_modify(inserter) {
        var el = $("<li class='record'><input type='text'></li>");
        el.find('input')
          .blur(finish_record);
        inserter(el);
        set_cursor(el);
        el.find('input').focus();
        viins.bind_to(el);
        return el;
    }
    function _record_id(el) {
        return el.attr('id').split('_')[1];
    }
    function replace_record() {
        if(!cursor || !cursor.length) return;
        _record_modify(function (el) {
            var txt = cursor.text();
            el.attr('id', cursor.attr('id'));
            cursor.replaceWith(el);
            el.find('input').val(txt).select();
        });
        return false;
    }
    function remove_record() {
        if(!cursor || !cursor.length) return;
        var rec = cursor;
        cursor_remove();
        rec.remove();
        request('notepad.remove_record', notepad_id, _record_id(rec));
    }
    function append_record() {
        _record_modify(function (el) {
            if(!cursor || !cursor.length) return;
            var txt = cursor.text();
            el.attr('id', cursor.attr('id'));
            el.find('input').val(txt);
            el.data('cmd', ['notepad.set_record_title', _record_id(el)]);
            cursor.replaceWith(el);
        });
        return false;
    }
    function insert_record_after() {
        _record_modify(function (el) {
            if(!cursor || !cursor.length) {
                el.data('cmd', ['notepad.append_record', notepad_id]);
                el.appendTo($("ul.notepad"))
            } else {
                el.data('cmd', ['notepad.insert_after',
                    notepad_id, _record_id(cursor)]);
                el.insertAfter(cursor);
            }
        });
        return false;
    }
    function insert_record_before() {
        _record_modify(function (el) {
            if(!cursor || !cursor.length) {
                el.data('cmd', ['notepad.prepend_record', notepad_id]);
                el.prependTo($("ul.notepad"))
            } else {
                el.data('cmd', ['notepad.insert_before',
                    notepad_id, _record_id(cursor)]);
                el.insertBefore(cursor);
            }
        });
        return false;
    }
    function set_cursor(el) {
        if(!el || !el.length) return;
        if(cursor) {
            cursor.removeClass('cursor');
        }
        cursor = el;
        cursor.addClass('cursor');
        cursor.scrollintoview();
    }
    function cursor_remove() {
        var ncur = cursor.next();
        if(!ncur.length) {
            ncur = cursor.prev();
        }
        console.log("NCUR", ncur);
        if(!ncur.length) {
            cursor = null;
        } else {
            set_cursor(ncur);
        }
    }
    function cursor_top() {
        set_cursor($("li.record:eq(0)"));
    }
    function cursor_bottom() {
        set_cursor($("li.record").eq(-1));
    }
    function cursor_up() {
        if(!cursor) {
            cursor_bottom();
        } else {
            set_cursor(cursor.prev());
        }
    }
    function cursor_down() {
        if(!cursor) {
            cursor_top();
        } else {
            set_cursor(cursor.next());
        }
    }
    function finish_record(ev) {
        var inp = $(ev.target);
        var rec = inp.parent('li.record');
        var txt = inp.val().trim();
        if(!txt.length) {
            cursor_remove();
            rec.remove();
            if(rec.attr('id')) {
                request('notepad.remove_record', notepad_id, _record_id(rec));
            }
            return;
        }
        inp.attr('disabled', 'disabled');
        var cmd = rec.data('cmd').concat([inp.val()]);
        request.apply(request, cmd)
            .set_callback(function (rec) {
                inp.parent().attr('id', 'rec_'+rec.id).text(rec.title);
            });
    }
    function blur_input(el) {
        el.blur();
    }

    var vicmd = new Hotkeys();
    vicmd.add_key('O', insert_record_before);
    vicmd.add_key('o', insert_record_after);
    vicmd.add_key('S', replace_record);
    vicmd.add_key('A', append_record);
    vicmd.add_key('j', cursor_down);
    vicmd.add_key('k', cursor_up);
    vicmd.add_key('gg', cursor_top);
    vicmd.add_key('G', cursor_bottom);
    vicmd.add_key('dd', remove_record);
    vicmd.bind_to(document);

    var viins = new Hotkeys();
    viins.allow_input = true;
    viins.add_key('<C-[> <esc> <return>', blur_input);
})
