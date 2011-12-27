(function(window, $) {
    var conn = new Connection('/.ws');
    var notepads = {};
    var dashboards = {};
    var requests = {};
    var after_functions = [];

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
        console.log("GOT MESSAGE", ev.data);
        if(json[0] == '_reply') {
            var req = requests[json[1]];
            delete requests[json[1]];
            json.splice(0, 2);
            if(req.callback)
                req.callback.apply(req, json);
            return;
        }
        var parts = json[0].split('.');
        if(parts[0] == 'notepad') {
            var nid = json[1];
            json.splice(0, 2);
            var np = notepads[nid];
            if(!np) {
                log.error("Wrong notepad", nid);
                return;
            }
            var fun = np[parts[1]];
            if(!fun) {
                log.error("Wrong method", parts[1]);
            }
            fun.apply(np, json);
            for(var i = 0, il = after_functions.length; i < il; ++i) {
                after_functions[i]();
            }
            return;
        }
        if(parts[0] == 'dashboard') {
            var nid = json[1];
            json.splice(0, 2);
            var dash = dashboards[nid];
            if(!dash) {
                console.error("Wrong dashboard", nid);
                return;
            }
            var fun = dash[parts[1]];
            if(!fun) {
                console.error("Wrong method", parts[1]);
            }
            fun.apply(np, json);
            for(var i = 0, il = after_functions.length; i < il; ++i) {
                after_functions[i]();
            }
            return;
        }
    }
    conn.onmessage = message;
    function after_message(fun) {
        after_functions.push(fun);
    }

    window.connection = conn;
    window.notepads = notepads;
    window.dashboards = dashboards;
    window.notify = notify;
    window.request = request;
    window.after_message = after_message;
})(this, jQuery);
