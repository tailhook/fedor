(function(window, $) {
    function Notepad(id, obj) {
        this.ident = id;
        this.obj = $(obj);
    }
    function _make_record(rec) {
        return $("<li class='record'>")
            .attr('id', 'rec_'+rec.id)
            .text(rec.title);
    }
    Notepad.prototype.append_record = function(rec) {
        this.obj.append(_make_record(rec));
    }
    Notepad.prototype.prepend_record = function(rec) {
        this.obj.prepend(_make_record(rec));
    }
    Notepad.prototype.insert_after = function(hint, rec) {
        $("#rec_"+hint, this.obj).after(_make_record(rec));
    }
    Notepad.prototype.insert_before = function(hint, rec) {
        $("#rec_"+hint, this.obj).before(_make_record(rec));
    }
    Notepad.prototype.update_record = function(rec) {
        $("#rec_"+rec.id, this.obj).text(rec.title);
    }
    Notepad.prototype.remove_record = function(id) {
        $("#rec_"+id, this.obj).remove();
    }

    window.Notepad = Notepad;
})(this, jQuery);
