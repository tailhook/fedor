jQuery(function ($) {

    var dashboard_id = location.pathname.substr(2);
    var cursor = null;
    var cursor_index = 0;

    function npcreate(np) {
        var npad = $("<ul class='notepad'>");
        $.each(np.records, function (idx, rec) {
            npad.append($('<li class="record">')
                .attr('id', 'rec_'+rec.id)
                .text(rec.title || ''));
        })
        var div = $("<div class='notepad'>")
            .attr('id', 'notepad_' + np.ident)
            .append($("<h2>").text(np.title))
            .append(npad);
        notepads[np.ident] = new Notepad(np.ident, npad);
        return div;
    }
    function Dashboard(id, obj) {
        this.ident = id;
        return this;
    }
    Dashboard.prototype.append_left = function(np) {
        npcreate(np).appendTo($("#left_container"));
    }
    Dashboard.prototype.append_right = function(np) {
        npcreate(np).appendTo($("#right_container"));
    }
    Dashboard.prototype.insert_before = function(hint, np) {
        npcreate(np).insertBefore($("#notepad_"+hint));
    }
    Dashboard.prototype.insert_after = function(hint, np) {
        npcreate(np).insertAfter($("#notepad_"+hint));
    }
    dashboards[dashboard_id] = new Dashboard(dashboard_id);

    connection.onopen = function () {
        notify('dashboard.subscribe', dashboard_id);
        $("div.notepad").each(function (idx, el) {
            var id = $(el).attr('id');
            id = id.substr(id.indexOf('_') + 1);
            notepads[id] = new Notepad(id, el);
            notify('notepad.subscribe', id);
        });
    }

    function _notepad_id(el) {
        var id = el.attr('id');
        return id.substr(id.indexOf('_')+1);
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
            set_cursor($('div.notepad').eq(cursor_index));
            if(!cursor.parent().length) {
                set_cursor($('div.notepad').eq(-1));
            }
        }
    }

    function insert_notepad_before() {
        var el = $("<div class='notepad'><input type='text'></div>");
        el.find('input')
          .val('/')
          .blur(finish_notepad);
        if(cursor) {
            el.insertBefore(cursor);
            el.data('cmd', ['dashboard.insert_before', dashboard_id,
                _notepad_id(cursor)]);
        } else {
            $("#left_container").append(el);
            el.data('cmd', ['dashboard.append_left', dashboard_id]);
        }
        set_cursor(el);
        el.find('input').focus();
        viins.bind_to(el);
        return false;
    }
    function insert_notepad_after() {
        var el = $("<div class='notepad'><input type='text'></div>");
        el.find('input')
          .val('/')
          .blur(finish_notepad);
        if(cursor) {
            el.insertAfter(cursor);
            el.data('cmd', ['dashboard.insert_after', dashboard_id,
                _notepad_id(cursor)]);
        } else {
            $("#left_container").append(el);
            el.data('cmd', ['dashboard.append_left', dashboard_id]);
        }
        set_cursor(el);
        el.find('input').focus();
        viins.bind_to(el);
        return false;
    }
    function replace_notepad() {
        var inp = $('<input type="text">');
        inp.val('/' + _notepad_id(cursor));
        cursor.find('h2').replaceWith(inp);
        inp.focus()
           .blur(finish_notepad);
        cursor.data('cmd', ['dashboard.replace', dashboard_id,
            _notepad_id(cursor)])
    }
    function cursor_top() {
        set_cursor($("div.notepad:eq(0)"));
    }
    function cursor_bottom() {
        set_cursor($("div.notepad").eq(-1));
    }
    function cursor_up() {
        if(!cursor) {
            cursor_bottom();
        } else {
            set_cursor(cursor.prev('div.notepad'));
        }
    }
    function cursor_down() {
        if(!cursor) {
            cursor_top();
        } else {
            set_cursor(cursor.next('div.notepad'));
        }
    }
    function cursor_left() {
        var all = $('#left_container div.notepad');
        if(all.eq(cursor_index).length) {
            set_cursor(all.eq(cursor_index));
        } else {
            set_cursor(all.eq(-1));
        }
    }
    function cursor_right() {
        var all = $('#right_container div.notepad');
        if(all.eq(cursor_index).length) {
            set_cursor(all.eq(cursor_index));
        } else {
            set_cursor(all.eq(-1));
        }
    }
    function remove_notepad() {
    }
    function edit_records() {
        cursor.removeClass('cursor');
        manage_windows.unbind_from(document);
        vicmd.bind_to(document);
        vicmd.handle('gg');
    }
    function edit_notepads() {
        $("li.record.cursor").removeClass('cursor');
        set_cursor($("div.notepad").eq(0));
        vicmd.unbind_from(document);
        manage_windows.bind_to(document);
    }
    function finish_notepad(ev) {
        var inp = $(ev.target);
        var nel = inp.parent('div.notepad');
        var txt = inp.val().trim();
        if(!txt.length) {
            throw Error("not implemented");
        }
        inp.attr('disabled', 'disabled');
        var cmd = nel.data('cmd').concat([inp.val()]);
        request.apply(request, cmd)
            .set_callback(function (rec) {
                if(!nel.attr('id')) {
                    nel.remove();
                    check_cursor();
                }
            });
    }

    var manage_windows = new Hotkeys();
    manage_windows.add_key('O', insert_notepad_before);
    manage_windows.add_key('o', insert_notepad_after);
    manage_windows.add_key('S', replace_notepad);
    manage_windows.add_key('j', cursor_down);
    manage_windows.add_key('k', cursor_up);
    manage_windows.add_key('h', cursor_left);
    manage_windows.add_key('l', cursor_right);
    manage_windows.add_key('gg', cursor_top);
    manage_windows.add_key('G', cursor_bottom);
    manage_windows.add_key('dd', remove_notepad);
    manage_windows.add_key('Q', edit_records);

    vicmd.add_key('Q', edit_notepads);
});
