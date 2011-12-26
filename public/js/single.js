jQuery(function($) {
    var notepad_id = location.pathname.substr(1);
    notepads[notepad_id] = new Notepad(notepad_id, $('ul.notepad'));

    connection.onopen = function() {
        notify('notepad.subscribe', notepad_id);
    }
});
