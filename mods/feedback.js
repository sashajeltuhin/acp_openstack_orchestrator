
var clients = {};
var subs = {};
var subtoken = '^^^';
var socketio;


module.exports = {
  init: function(io){
    socketio = io
    io.sockets.on('connection', function (socket) {
      var uid = socket.handshake.query.uid;
      console.log('uid = ', uid);
      clients[uid] = socket;

      socket.on('EV_SUBSCRIBE', function(data) {
        var key = buildKey(data.msg, data.uid);
        console.log("feedback registered key", key);
        if (subs[key] == undefined){
          subs[key] = {};
        }

        subs[key][socket.id] = socket;
      });

      socket.on('EV_UNSUBSCRIBE', function(data) {
        if (data.uid == undefined){
          //globally unsub from the message
          unsubMsg(data.msg, socket);
        }
        else{ //unsub from a specific data point
          var key = buildKey(data.msg, data.uid);
          if (subs[key] !== undefined){
            delete subs[key][socket.id];
          }
        }
      });

      socket.on('disconnect', function() {
        delete clients[uid];
        for(var key in subs){
          delete subs[key][uid];
        }
      });
    });
  },
  notify: function(msg, uid, data){
    if (uid){
      if (typeof uid !== 'string'){
        uid = uid.toHexString();
      }
      //check other subscribers and send
      var key = buildKey(msg, uid);
      var list = subs[key];
      if (list !== undefined){
        for(var key in list){
          var socket = list[key];
          if (socket !== undefined && socket !== null){
            console.log('emitting ', msg, data);
            socket.emit(msg, { data: data });
          }
        }
      }
    }
  }
}

function buildKey(msg, uid){
  return msg + subtoken + uid;
}

function isMsgKey(key, msg){
  var partone = key.substring(0, key.indexOf(subtoken));
  return partone == msg;
}

function unsubMsg(msg, socket){
  for (var key in subs){
    if (isMsgKey(key, msg)){
      delete subs[key][socket.id];
    }
  }
}
