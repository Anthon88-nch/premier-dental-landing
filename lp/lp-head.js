// Подключается в <head> без defer: помечает, что JS есть, до первой отрисовки.
// Если основной скрипт не запустится, чертёж всё равно проявится через 6 секунд.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  setTimeout(function () {
    var sheets = document.querySelectorAll('.sheet');
    for (var i = 0; i < sheets.length; i++) sheets[i].classList.add('is-live');
  }, 6000);
})();
