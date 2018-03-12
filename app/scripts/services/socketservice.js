angular.module('openapp')
  .factory('socketservice', function($rootScope) {
    var socketUrl = ':80';
    var socket = null;
    return {
      open: function(uid){
        socket = io.connect(socketUrl, {query: 'uid='+uid});
      },
      on: function(eventName, callback) {
        if (socket !== null){
          socket.on(eventName, function() {
            var args = [];
            args.push(arguments[0].data);
            console.log("socket on:", eventName, args);
            $rootScope.$apply(function() {
              callback.apply(socket, args);
            });
          });
        }
      },
      emit: function(eventName, data, callback) {
        if (socket !== null){
          socket.emit(eventName, data, function() {
            var args = arguments;
            console.log("socket emit:", eventName, data);
            $rootScope.$apply(function() {
              if(callback) {
                callback.apply(socket, args);
              }
            });
          });
        }
      },
      close: function(){
        if (socket !== null){
          console.log("socket close");
          socket.close();
        }
      }
    };
  });
