jQuery(function($) {

    var notepad_id = location.pathname.substr(1);
    var cursor = null;
    var cursor_index = 0;
    notepads[notepad_id] = new Notepad(notepad_id, $('ul.notepad'));

    connection.onopen = function() {
        notify('notepad.subscribe', notepad_id);
    }
    after_message(check_cursor);

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
            el.data('cmd', ['notepad.set_record_title',
                            notepad_id, _record_id(el)]);
        });
        return false;
    }
    function remove_record() {
        if(!cursor || !cursor.length) return;
        var rec = cursor;
        rec.remove();
        request('notepad.remove_record', notepad_id, _record_id(rec));
        check_cursor();
    }
    function append_record() {
        _record_modify(function (el) {
            if(!cursor || !cursor.length) return;
            var txt = cursor.text();
            el.attr('id', cursor.attr('id'));
            cursor.replaceWith(el);
            el.find('input').val(txt);
            el.data('cmd', ['notepad.set_record_title',
                            notepad_id, _record_id(el)]);
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
        cursor_index = cursor.index();
    }
    function check_cursor() {
        if(!cursor.parent().length) {
            set_cursor($('li.record').eq(cursor_index));
            if(!cursor.parent().length) {
                set_cursor($('li.record').eq(-1));
            }
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
        var rel = inp.parent('li.record');
        var txt = inp.val().trim();
        if(!txt.length) {
            rel.remove();
            check_cursor();
            if(rel.attr('id')) {
                request('notepad.remove_record', notepad_id, _record_id(rel));
            }
            return;
        }
        inp.attr('disabled', 'disabled');
        var cmd = rel.data('cmd').concat([inp.val()]);
        request.apply(request, cmd)
            .set_callback(function (rec) {
                if(!rel.attr('id')) {
                    rel.remove();
                    check_cursor();
                }
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
});
