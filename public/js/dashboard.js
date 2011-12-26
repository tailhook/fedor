jQuery(function ($) {

    connection.onopen = function () {
        $("div.notepad").each(function (idx, el) {
            var id = $(el).attr('id');
            id = id.substr(id.indexOf('_') + 1);
            notepads[id] = new Notepad(id, el);
            notify('notepad.subscribe', id);
        });
    }

});
