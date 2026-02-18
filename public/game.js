// game.js - Plants vs Zombies Online
var socket = io();
var gameId = null;
var myRole = null;
var myUserId = null;
var gameState = null;
var selectedPlant = null;
var selectedZombie = 'basic';
var selectedLane = 0;
var gameStartTime = null;
var timerInterval = null;
var gameInitialized = false;

var plantEmoji = {
  peashooter: '🫛', sunflower: '🌻', wallnut: '🌰',
  cherrybomb: '🍒', snowpea: '🫐', fireflower: '🔥', cactus: '⚡'
};
var plantNames = {
  peashooter: 'Горошина', sunflower: 'Подсолнух', wallnut: 'Орех',
  cherrybomb: 'Вишня', snowpea: 'Снежный горох', fireflower: 'Огненный цветок', cactus: 'Кактус'
};
var zombieEmoji = {
  basic: '💀', cone: '🧟', bucket: '🧟‍♂️', football: '🏃', knight: '🧟‍♀️', giant: '👾'
};
var plantSpriteClass = {
  peashooter: 'sprite-peashooter', sunflower: 'sprite-sunflower', wallnut: 'sprite-wallnut',
  cherrybomb: 'sprite-cherrybomb', snowpea: 'sprite-snowpea', fireflower: 'sprite-fireflower', cactus: 'sprite-cactus'
};
var zombieSpriteClass = {
  basic: 'sprite-zombie-basic', cone: 'sprite-zombie-cone', bucket: 'sprite-zombie-bucket',
  football: 'sprite-zombie-football', knight: 'sprite-zombie-knight', giant: 'sprite-zombie-giant'
};

var BUFF_TYPES = {
  sun_boost:   { name: 'Солнечный бонус', emoji: '☀️', desc: '+50 солнца сразу', duration: 30 },
  double_dmg:  { name: 'Двойной урон',    emoji: '⚔️', desc: 'x2 урон растений', duration: 20 },
  shield:      { name: 'Щит базы',        emoji: '🛡️', desc: 'База неуязвима 15с', duration: 15 },
  brain_boost: { name: 'Мозговой бонус',  emoji: '🧠', desc: '+40 мозгов сразу', duration: 30 },
  speed_boost: { name: 'Ускорение',       emoji: '💨', desc: 'Зомби быстрее', duration: 20 },
  horde:       { name: 'Орда',            emoji: '🧟', desc: 'Бесплатный зомби', duration: 10 }
};

function showToast(msg, type) {
  var t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast ' + (type || 'success');
  t.classList.remove('hidden');
  setTimeout(function() { t.classList.add('hidden'); }, 3000);
}

// ===== ИНИЦИАЛИЗАЦИЯ =====
window.addEventListener('DOMContentLoaded', function() {
  console.log('[game.js] DOMContentLoaded');

  // Получаем userId
  var saved = localStorage.getItem('pvz_user');
  if (saved) {
    try { var u = JSON.parse(saved); myUserId = u.id; } catch(e) { console.error('user parse error', e); }
  }
  console.log('[game.js] myUserId:', myUserId);

  // Получаем данные игры
  var gameData = localStorage.getItem('pvz_game');
  console.log('[game.js] pvz_game raw:', gameData ? gameData.substring(0, 100) : 'NULL');

  if (!gameData) {
    console.warn('[game.js] No game data, redirecting...');
    window.location.href = '/';
    return;
  }

  var data;
  try {
    data = JSON.parse(gameData);
    console.log('[game.js] gameId:', data.gameId, 'role:', data.role);
  } catch(e) {
    console.error('[game.js] Parse error:', e);
    window.location.href = '/';
    return;
  }

  gameId = data.gameId;
  myRole = data.role;
  gameState = data.gameState || {};

  if (!gameId || !myRole) {
    console.error('[game.js] Missing gameId or role');
    window.location.href = '/';
    return;
  }

  // Имена игроков
  var myUser = {};
  try { myUser = JSON.parse(localStorage.getItem('pvz_user') || '{}'); } catch(e) {}
  var myName = myUser.username || '?';
  var oppName = data.opponent || 'Соперник';

  var plantNameEl = document.getElementById('hud-plant-name');
  var zombieNameEl = document.getElementById('hud-zombie-name');
  if (plantNameEl) plantNameEl.textContent = myRole === 'plant' ? myName : oppName;
  if (zombieNameEl) zombieNameEl.textContent = myRole === 'zombie' ? myName : oppName;

  // Показываем ресурсы
  var resBar = document.getElementById('resources-bar');
  if (resBar) resBar.classList.remove('hidden');

  if (myRole === 'plant') {
    var pp = document.getElementById('plant-panel');
    var sd = document.getElementById('sun-display');
    if (pp) pp.classList.remove('hidden');
    if (sd) sd.classList.remove('hidden');
  } else {
    var zp = document.getElementById('zombie-panel');
    var bd = document.getElementById('brain-display');
    if (zp) zp.classList.remove('hidden');
    if (bd) bd.classList.remove('hidden');
  }

  buildGrid();
  updateDisplay(gameState);

  gameStartTime = Date.now();
  timerInterval = setInterval(updateTimer, 1000);

  gameInitialized = true;
  console.log('[game.js] Game initialized, joining room:', gameId);

  // Переподключаемся к игре
  socket.emit('rejoin_game', { gameId: gameId, userId: myUserId });

  // Панель баффов
  initBuffPanel();
});

// ===== СЕТКА =====
function buildGrid() {
  var grid = document.getElementById('game-grid');
  if (!grid) return;
  grid.innerHTML = '';
  for (var row = 0; row < 5; row++) {
    for (var col = 1; col <= 9; col++) {
      var cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.col = col;
      cell.dataset.row = row;
      if (myRole === 'plant') {
        (function(c, r) {
          cell.addEventListener('click', function() { onCellClick(c, r); });
        })(col, row);
      }
      grid.appendChild(cell);
    }
  }
  console.log('[game.js] Grid built, role:', myRole);
}

function onCellClick(col, row) {
  console.log('[game.js] Cell click col:', col, 'row:', row, 'selectedPlant:', selectedPlant);
  if (!selectedPlant) {
    showToast('Выберите растение!', 'error');
    return;
  }
  if (!gameId || !myUserId) {
    showToast('Ошибка: нет gameId или userId', 'error');
    return;
  }
  console.log('[game.js] Emitting place_plant:', { gameId, userId: myUserId, plantType: selectedPlant, col, row });
  socket.emit('place_plant', {
    gameId: gameId,
    userId: myUserId,
    plantType: selectedPlant,
    col: col,
    row: row
  });
}

// ===== ВЫБОР РАСТЕНИЯ =====
function selectPlant(type) {
  selectedPlant = type;
  document.querySelectorAll('.plant-card').forEach(function(c) { c.classList.remove('selected'); });
  var card = document.querySelector('.plant-card[data-type="' + type + '"]');
  if (card) card.classList.add('selected');
  var info = document.getElementById('selected-plant-info');
  if (info) info.textContent = 'Выбрано: ' + (plantNames[type] || type) + '. Нажмите на клетку.';
  console.log('[game.js] Selected plant:', type);
}

// ===== ВЫБОР ЗОМБИ =====
function selectZombie(type) {
  selectedZombie = type;
  document.querySelectorAll('.zombie-card').forEach(function(c) { c.classList.remove('selected'); });
  var card = document.querySelector('.zombie-card[data-type="' + type + '"]');
  if (card) card.classList.add('selected');
  console.log('[game.js] Selected zombie:', type);
}

function selectLane(lane, btn) {
  selectedLane = lane;
  document.querySelectorAll('.lane-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
}

function sendZombie() {
  if (!gameId || !myUserId) { showToast('Ошибка соединения', 'error'); return; }
  console.log('[game.js] Sending zombie:', selectedZombie, 'lane:', selectedLane);
  socket.emit('send_zombie', {
    gameId: gameId,
    userId: myUserId,
    zombieType: selectedZombie,
    lane: selectedLane
  });
}

// ===== СДАТЬСЯ =====
function leaveGame() {
  if (!confirm('Вы уверены что хотите сдаться?')) return;
  socket.emit('leave_game', { gameId: gameId, userId: myUserId });
  localStorage.removeItem('pvz_game');
  setTimeout(function() { window.location.href = '/'; }, 500);
}

// ===== ТАЙМЕР =====
function updateTimer() {
  if (!gameStartTime) return;
  var elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
  var m = Math.floor(elapsed / 60);
  var s = elapsed % 60;
  var el = document.getElementById('game-timer');
  if (el) el.textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// ===== ОБНОВЛЕНИЕ ДИСПЛЕЯ =====
function updateDisplay(state) {
  if (!state) return;
  gameState = state;

  var sunEl = document.getElementById('sun-count');
  var brainEl = document.getElementById('brain-count');
  if (sunEl && state.plantSun !== undefined) sunEl.textContent = state.plantSun;
  if (brainEl && state.zombieBrains !== undefined) brainEl.textContent = state.zombieBrains;

  var hp = (state.plantHP !== undefined) ? state.plantHP : 100;
  var hpFill = document.getElementById('hp-fill');
  var hpText = document.getElementById('hp-text');
  if (hpFill) hpFill.style.width = Math.max(0, Math.min(100, hp)) + '%';
  if (hpText) hpText.textContent = Math.max(0, hp);

  renderPlants(state.grid || {});
  renderZombies(state.zombies || []);
}

function renderPlants(grid) {
  document.querySelectorAll('.grid-cell').forEach(function(cell) {
    cell.innerHTML = '';
    cell.classList.remove('has-plant');
  });

  var count = 0;
  for (var key in grid) {
    var plant = grid[key];
    var col = plant.col;
    var row = plant.row;
    var cell = document.querySelector('.grid-cell[data-col="' + col + '"][data-row="' + row + '"]');
    if (cell) {
      cell.classList.add('has-plant');
      var emoji = plantEmoji[plant.type] || '🌱';
      var hpPct = plant.maxHp ? Math.round((plant.hp / plant.maxHp) * 100) : 100;
      cell.innerHTML =
        '<div class="plant-in-cell">' +
          '<div class="plant-emoji">' + emoji + '</div>' +
          '<div class="plant-hp-bar"><div class="plant-hp-fill" style="width:' + hpPct + '%"></div></div>' +
        '</div>';
      count++;
    }
  }
}

function renderZombies(zombies) {
  var layer = document.getElementById('zombies-layer');
  if (!layer) return;
  layer.innerHTML = '';

  zombies.forEach(function(z) {
    var el = document.createElement('div');
    el.className = 'zombie-on-field';
    // col идёт от 8.5 до 0, поле 9 колонок
    var leftPct = Math.max(0, Math.min(100, (z.col / 9) * 100));
    var topPct = (z.lane / 5) * 100 + 2;
    el.style.cssText = 'position:absolute;left:' + leftPct + '%;top:' + topPct + '%;transform:translateX(-50%);';

    var emoji = zombieEmoji[z.type] || '🧟';
    var hpPct = z.maxHp ? Math.round((z.hp / z.maxHp) * 100) : 100;
    var hpColor = hpPct > 60 ? '#4CAF50' : hpPct > 30 ? '#FF9800' : '#f44336';

    el.innerHTML =
      '<div style="font-size:28px;text-align:center;line-height:1">' + emoji + '</div>' +
      '<div style="width:32px;height:4px;background:#333;border-radius:2px;margin:2px auto 0">' +
        '<div style="width:' + hpPct + '%;height:100%;background:' + hpColor + ';border-radius:2px"></div>' +
      '</div>';

    layer.appendChild(el);
  });
}

// ===== БАФФЫ =====
function initBuffPanel() {
  var existing = document.getElementById('buff-panel');
  if (existing) return;

  var panel = document.createElement('div');
  panel.id = 'buff-panel';
  panel.style.cssText = 'position:fixed;top:80px;right:10px;z-index:200;display:flex;flex-direction:column;gap:5px;min-width:130px;';

  var title = document.createElement('div');
  title.style.cssText = 'color:#FFD700;font-size:12px;font-weight:700;text-align:center;margin-bottom:3px;background:rgba(0,0,0,0.6);border-radius:6px;padding:3px;';
  title.textContent = '⚡ Баффы';
  panel.appendChild(title);

  var buffs = myRole === 'plant'
    ? ['sun_boost', 'double_dmg', 'shield']
    : ['brain_boost', 'speed_boost', 'horde'];

  buffs.forEach(function(buffType) {
    var b = BUFF_TYPES[buffType];
    var btn = document.createElement('button');
    btn.id = 'buff-btn-' + buffType;
    btn.title = b.desc;
    btn.style.cssText = 'background:rgba(0,0,0,0.75);border:1px solid #FFD700;color:#fff;padding:5px 8px;border-radius:8px;cursor:pointer;font-size:11px;text-align:left;width:100%;';
    btn.innerHTML = b.emoji + ' ' + b.name;
    btn.onclick = function() { activateBuff(buffType); };
    panel.appendChild(btn);
  });

  var activeDiv = document.createElement('div');
  activeDiv.id = 'active-buffs';
  activeDiv.style.cssText = 'margin-top:5px;display:flex;flex-direction:column;gap:3px;';
  panel.appendChild(activeDiv);

  document.body.appendChild(panel);
}

function activateBuff(buffType) {
  socket.emit('activate_buff', { gameId: gameId, userId: myUserId, role: myRole, buffType: buffType });
}

// ===== SOCKET EVENTS =====
socket.on('connect', function() {
  console.log('[game.js] Socket connected:', socket.id);
  if (gameId && myUserId && gameInitialized) {
    socket.emit('rejoin_game', { gameId: gameId, userId: myUserId });
  }
});

socket.on('game_update', function(state) {
  updateDisplay(state);
});

socket.on('action_error', function(data) {
  console.warn('[game.js] action_error:', data.message);
  showToast(data.message, 'error');
});

socket.on('buff_activated', function(data) {
  var b = BUFF_TYPES[data.buffType];
  if (!b) return;
  showToast('⚡ ' + b.name + ' активирован!', 'success');

  var activeDiv = document.getElementById('active-buffs');
  if (activeDiv) {
    var el = document.createElement('div');
    el.style.cssText = 'background:rgba(255,215,0,0.2);border:1px solid #FFD700;border-radius:6px;padding:3px 6px;font-size:10px;color:#FFD700;';
    el.textContent = b.emoji + ' ' + b.name + ' (' + data.duration + 'с)';
    activeDiv.appendChild(el);
    var rem = data.duration;
    var iv = setInterval(function() {
      rem--;
      el.textContent = b.emoji + ' ' + b.name + ' (' + rem + 'с)';
      if (rem <= 0) { clearInterval(iv); el.remove(); }
    }, 1000);
  }

  var btn = document.getElementById('buff-btn-' + data.buffType);
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
    var cd = data.cooldown || 30;
    var cdIv = setInterval(function() {
      cd--;
      btn.innerHTML = BUFF_TYPES[data.buffType].emoji + ' ' + cd + 'с';
      if (cd <= 0) {
        clearInterval(cdIv);
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.innerHTML = BUFF_TYPES[data.buffType].emoji + ' ' + BUFF_TYPES[data.buffType].name;
      }
    }, 1000);
  }
});

socket.on('buff_error', function(data) {
  showToast(data.message, 'error');
});

function goHome() {
  localStorage.removeItem('pvz_game');
  window.location.href = '/';
}

socket.on('game_over', function(data) {
  // Обновляем данные пользователя в localStorage
  // Только при честной победе (hp или timeout), не при сдаче/дисконнекте
  try {
    var saved = localStorage.getItem('pvz_user');
    if (saved) {
      var user = JSON.parse(saved);
      var iWonUpdate = (data.winner === myRole);
      var isHonestWin = (data.reason === 'hp' || data.reason === 'timeout');
      if (iWonUpdate && !data.isFriendly && isHonestWin) {
        user.wins = (user.wins || 0) + 1;
        user.coins = (user.coins || 0) + (data.reward || 0);
      } else if (!iWonUpdate && !data.isFriendly && !data.isBot && isHonestWin) {
        user.losses = (user.losses || 0) + 1;
      }
      // Применяем награды за уровень (только при честной победе)
      if (data.levelUpRewards && iWonUpdate && isHonestWin) {
        data.levelUpRewards.forEach(function(r) {
          if (r.type === 'coins') user.coins = (user.coins || 0) + r.amount;
        });
      }
      localStorage.setItem('pvz_user', JSON.stringify(user));
    }
  } catch(e) {}
  clearInterval(timerInterval);
  localStorage.removeItem('pvz_game');

  var screen = document.getElementById('game-over-screen');
  var emojiEl = document.getElementById('game-over-emoji');
  var titleEl = document.getElementById('game-over-title');
  var descEl = document.getElementById('game-over-desc');
  var rewardEl = document.getElementById('game-over-reward');

  var iWon = data.winner === myRole;
  if (emojiEl) emojiEl.textContent = iWon ? '🏆' : '💀';
  if (titleEl) titleEl.textContent = iWon ? 'Победа!' : 'Поражение!';

  var reasonText = {
    disconnect: 'Соперник отключился',
    surrender: 'Соперник сдался',
    hp: 'Зомби прорвались к базе!'
  }[data.reason] || 'Игра завершена';

  if (descEl) descEl.textContent = reasonText;
  if (iWon && rewardEl) {
    rewardEl.classList.remove('hidden');
    rewardEl.innerHTML = '<span>+' + (data.reward || 50) + ' 🪙</span>';
  }
  if (screen) screen.classList.remove('hidden');
});
