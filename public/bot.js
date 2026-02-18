// BOT GAME FUNCTIONS - загружается после app.js
var botRole = 'plant';
var botDiff = 'easy';

function showBotMenu() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  document.getElementById('modal-bot').style.display = 'flex';
}

function selectBotRole(role, btn) {
  botRole = role;
  var p = document.getElementById('bot-role-plant');
  var z = document.getElementById('bot-role-zombie');
  if (p) p.className = 'btn btn-secondary';
  if (z) z.className = 'btn btn-secondary';
  btn.className = 'btn btn-success';
}

function selectBotDiff(diff, btn) {
  botDiff = diff;
  ['easy', 'medium', 'hard'].forEach(function(d) {
    var b = document.getElementById('bot-diff-' + d);
    if (b) b.className = 'btn btn-secondary';
  });
  btn.className = 'btn btn-success';
}

function startBotGame() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  document.getElementById('modal-bot').style.display = 'none';
  socket.emit('start_bot_game', {
    userId: currentUser.id,
    username: currentUser.username,
    role: botRole,
    difficulty: botDiff
  });
}

// SHOP TIMER - подключаем после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
  var shopTimerInterval = null;

  socket.on('shop_timer', function(d) {
    var el = document.getElementById('shop-timer-display');
    if (!el) return;
    clearInterval(shopTimerInterval);
    function update() {
      var left = Math.max(0, d.nextRotation - Date.now());
      var m = Math.floor(left / 60000);
      var s = Math.floor((left % 60000) / 1000);
      el.textContent = 'Обновление через: ' + m + ':' + String(s).padStart(2, '0');
      if (left <= 0) {
        clearInterval(shopTimerInterval);
        el.textContent = 'Обновляется...';
        socket.emit('get_shop');
      }
    }
    update();
    shopTimerInterval = setInterval(update, 1000);
  });
});
