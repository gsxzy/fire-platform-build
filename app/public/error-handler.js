(function(){
  var el = document.getElementById('debug-error');
  function show(msg) { el.style.display='block'; el.textContent = msg; }
  window.onerror = function(msg, src, line, col, err) {
    show('JS Error: ' + msg + '\nAt: ' + src + ':' + line + ':' + col + '\n' + (err && err.stack ? err.stack : ''));
  };
  window.onunhandledrejection = function(e) {
    show('Unhandled Promise: ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
  };
})();
