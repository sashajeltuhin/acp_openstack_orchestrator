angular.module('openapp').factory('msgservice',function() {
  var service = {};
  var error;


  service.poptart = function(opts){
    var wait = 500;
    if (opts.wait !== undefined){
      wait = opts.wait;
    }
    setTimeout(function(){
      toastr.options = {
        closeButton: true,
        progressBar: true,
        showMethod: 'slideDown',
        timeOut: 4000
      };
      var fnc = 'info';
      switch(opts.type){
        case 'error':
          fnc = 'error';
          break;
        case 'success':
          fnc = 'success';
          break;
        case 'warning':
          fnc = 'warning';
          break;
      }
      toastr[fnc](opts.msg, opts.subject);
    }, wait);

  }



  service.setError = function(err){
    error = err;
  }

  service.getError = function(){
    return error;
  }

  return service;

});
