(function(root, factory){
    if (typeof define === 'function' && define.amd){
        define(['extended-emitter', 'async-arrays'], factory);
    }else if(typeof exports === 'object'){
        module.exports = factory(require('extended-emitter'), require('async-arrays'));
    }else{
        root.EventedArray = factory(root.ExtendedEmitter, root.AsyncArrays);
    }
}(this, function(emitter, asyncarrays){
    function passthruFunction(func, name, ob, scope){
        if(!scope) scope = ob;
        ob[name] = function(){
            return func.apply(scope, arguments);
        }
    }
    function objectField(obj, field, value){
        Object.defineProperty(obj, field, {
            enumerable: false,
            configurable: false,
            writable: false,
            value: value
        });
    }
    
    function EventedArray(progenitor, wrap){
        var array = progenitor || [];
        var events = new emitter();
        objectField(array, '__construct__ ', EventedArray);
        /*[shim Array methods to generate events]*/
        var push = array.push;
        objectField(array, 'push', function(item){
            if(wrap) item = wrap(item);
            var result = push.apply(array, arguments);
            events.emit('change', {type : 'add', target : item});
            events.emit('add', item);
            return result;
        });
        var pop = array.pop;
        objectField(array, 'pop', function(item){
            if(wrap) item = wrap(item);
            var result = pop.apply(array, arguments);
            events.emit('change', {type : 'remove', target : item});
            events.emit('remove', item);
            return result;
        });
        var shift = array.shift;
        objectField(array, 'shift', function(item){
            if(wrap) item = wrap(item);
            var result = shift.apply(array, arguments);
            events.emit('change', {type : 'remove', target : item});
            events.emit('remove', item);
            return result;
        });
        var unshift = array.unshift;
        objectField(array, 'unshift', function(item){
            if(wrap) item = wrap(item);
            var result = unshift.apply(array, arguments);
            events.emit('change', {type : 'add', target : item});
            events.emit('add', item);
            return result;
        });
        var splice = array.splice;
        objectField(array, 'splice', function(){
            var args = Array.prototype.splice(arguments);
            var index = args.shift() || 0;
            var howMany = args.shift() || 0;
            var newArgs = [];
            args.forEach(function(item){
                if(wrap) item = wrap(item);
                newArgs.push(item);
            });
            var items = newArgs;
            newArgs.unshift(howMany);
            newArgs.unshift(index);
            var removed;
            if(howMany){
                removed = this.slice(index, howMany);
            }
            var result = splice.apply(array, newArgs);
            events.emit('change', {type : 'alter', removals : removed, additions : items});
            if(removed) removed.forEach(function(item){
                events.emit('remove', item);
            });
            items.forEach(function(item){
                events.emit('add', item);
            });
            return result;
        });
        
        /*[attach AsyncArray methods to generate events]*/
        [
            'forAllEmissionsInPool', 'forAllEmissions', 'forEachEmission', 'uForEach', 
            'combine', 'contains'//, 'erase'
        ].forEach(function(fieldName){
            objectField(array, fieldName, function(){
                var args = Array.prototype.slice.call(arguments);
                args.unshift(this);
                return asyncarrays[fieldName].apply(asyncarrays, args);
            });
        });
        
        objectField(array, 'erase', function(item){
            var args = Array.prototype.slice.call(arguments);
            args.unshift(this);
            var result = asyncarrays.erase.apply(asyncarrays, args);
            events.emit('change', {type : 'remove', target : item});
            events.emit('remove', item);
            return result;
        });
        
        /*[attach emitter methods]*/
        objectField(array, 'on', function(){
            return events.on.apply(events, arguments);
        });
        objectField(array, 'once', function(){
            return events.once.apply(events, arguments);
        });
        objectField(array, 'off', function(){
            return events.off.apply(events, arguments);
        });
        objectField(array, 'emit', function(){
            return events.emit.apply(events, arguments);
        });
        return array;
    }
    EventedArray.is = function(obj){
        return obj['__construct__ '] === EventedArray;
    };
    return EventedArray;

}));