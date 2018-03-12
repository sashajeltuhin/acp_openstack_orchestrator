angular.module('openapp')
  .directive('tip', tip)
  .directive('mkMindial', mkMindial);


function tip(){
  return {
    restrict: 'A',
    link: function(scope, element, attr){
      var opts = { title: attr.text};
      if(attr.placement !== undefined){
        opts.placement = attr.placement
      }
      $(element).tooltip(opts);
    }
  };
}

function mkMindial($timeout){
  return {
    restrict: 'A',
    require: 'ngModel',
    link: function($scope, element, $attrs, ngModelCtrl) {
      if (!$attrs.min){
        $attrs.min = 15;
      }
      if (!$attrs.max){
        $attrs.max = 300;
      }
      if (!$attrs.color){
        $attrs.color = "#23527c";
      }

      ngModelCtrl.$formatters.push(function(modelValue) {
        console.log('model value', modelValue);
        var formatted = 0;
        modelValue = Number(modelValue);
        if (modelValue){
          formatted = modelValue/1000;
        }

        return formatted;
      });

      ngModelCtrl.$render = function() {
        if (ngModelCtrl.$viewValue !== undefined){
          $(element).val(ngModelCtrl.$viewValue)
            .trigger('change');
        }
      };

      ngModelCtrl.$parsers.push(function(viewValue) {
        if (viewValue){
          return viewValue * 1000;
        }
      });


      return $timeout(function() {

        return $(element).knob({
          'min':$attrs.min,
          'max':$attrs.max,
          'step':15,
          'fgColor':"#23527c",
          'width':80,
          'height':80,
          'release' : function (v) {
            ngModelCtrl.$setViewValue(v);
          }

        });
      });
    }
  };
}
