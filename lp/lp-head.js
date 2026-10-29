// Подключается в <head> без defer: помечает, что JS есть, до первой отрисовки.
// Если основной скрипт не запустится, чертёж и линия пульса всё равно проявятся через 6 секунд.
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  setTimeout(function () {
    var items = document.querySelectorAll('.sheet, [data-live]');
    for (var i = 0; i < items.length; i++) items[i].classList.add('is-live');
  }, 6000);
})();
