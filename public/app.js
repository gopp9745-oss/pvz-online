var socket=io();var currentUser=null;var shopItems=[];var leaderboardData=[];var leaderSort="wins";
function showScreen(id){document.querySelectorAll(".screen").forEach(function(s){s.classList.remove("active");});var el=document.getElementById(id);if(el)el.classList.add("active");}
function showToast(msg,type){var t=document.getElementById("toast");t.textContent=msg;t.className="toast "+(type||"success");t.classList.remove("hidden");setTimeout(function(){t.classList.add("hidden");},3000);}
function updateUserPanel(){
  if(!currentUser)return;
  document.getElementById("menu-username").textContent=currentUser.username;
  document.getElementById("menu-coins").textContent=currentUser.coins;
  document.getElementById("menu-wins").textContent=currentUser.wins;
  document.getElementById("guest-buttons").classList.add("hidden");
  document.getElementById("user-panel").classList.remove("hidden");
  var adminBtn=document.getElementById("admin-btn");
  var claimBtn=document.getElementById("claim-admin-btn");
  var modBtn=document.getElementById("mod-btn");
  if(currentUser.isAdmin){
    if(adminBtn)adminBtn.classList.remove("hidden");
    if(claimBtn)claimBtn.classList.add("hidden");
    if(modBtn)modBtn.classList.add("hidden");
  } else {
    if(adminBtn)adminBtn.classList.add("hidden");
    if(claimBtn)claimBtn.classList.remove("hidden");
    if(modBtn){
      var isMod = currentUser.isModerator && (!currentUser.moderatorExpires || Date.now() < currentUser.moderatorExpires);
      if(isMod) modBtn.classList.remove("hidden");
      else modBtn.classList.add("hidden");
    }
  }
  // Обновляем аватар
  var av = document.getElementById("menu-avatar");
  if(av) av.textContent = currentUser.avatar || (currentUser.isAdmin ? '👑' : currentUser.isModerator ? '🛡️' : '🎮');
  // Шкала уровня в меню
  var lv = calcLevelClient(currentUser.wins);
  var lvEl = document.getElementById('menu-level-num');
  var xpEl = document.getElementById('menu-xp-fill');
  var xpLbl = document.getElementById('menu-xp-label');
  if(lvEl) lvEl.textContent = lv.level;
  if(xpLbl) xpLbl.textContent = 'Ур. ' + lv.level + ' · ' + lv.xp + '/' + lv.xpNext + ' XP';
  if(xpEl) {
    var pct = lv.xpNext > 0 ? Math.min(100, Math.round(lv.xp / lv.xpNext * 100)) : 0;
    xpEl.style.width = pct + '%';
  }
  // Обновляем баннер "Путь к славе"
  var gpSub = document.getElementById('glory-path-sub');
  var gpFill = document.getElementById('glory-path-xp-fill');
  var gpLabel = document.getElementById('glory-path-xp-label');
  if (gpSub) gpSub.textContent = 'Уровень ' + lv.level + ' · ' + (currentUser.wins || 0) + ' побед';
  if (gpFill) {
    var gpPct = lv.xpNext > 0 ? Math.min(100, Math.round(lv.xp / lv.xpNext * 100)) : 0;
    gpFill.style.width = gpPct + '%';
  }
  if (gpLabel) gpLabel.textContent = lv.xp + ' / ' + lv.xpNext + ' XP';
}
function logout(){currentUser=null;localStorage.removeItem("pvz_user");document.getElementById("guest-buttons").classList.remove("hidden");document.getElementById("user-panel").classList.add("hidden");document.getElementById("admin-btn").classList.add("hidden");showScreen("screen-menu");showToast("Вы вышли из аккаунта","success");}
function doLogin(){var u=document.getElementById("login-username").value.trim();var p=document.getElementById("login-password").value;var err=document.getElementById("login-error");err.classList.add("hidden");if(!u||!p){err.textContent="Заполните все поля";err.classList.remove("hidden");return;}socket.emit("login",{username:u,password:p});}
function doRegister(){var u=document.getElementById("reg-username").value.trim();var p=document.getElementById("reg-password").value;var p2=document.getElementById("reg-password2").value;var err=document.getElementById("reg-error");var suc=document.getElementById("reg-success");err.classList.add("hidden");suc.classList.add("hidden");if(!u||!p||!p2){err.textContent="Заполните все поля";err.classList.remove("hidden");return;}if(p!==p2){err.textContent="Пароли не совпадают";err.classList.remove("hidden");return;}socket.emit("register",{username:u,password:p});}
socket.on("register_result",function(d){
  var err=document.getElementById("reg-error");
  var suc=document.getElementById("reg-success");
  if(d.success){
    suc.textContent=d.message;
    suc.classList.remove("hidden");
    // Автологин после регистрации и запуск обучения
    if(d.user && d.isNew){
      setTimeout(function(){
        currentUser = d.user;
        localStorage.setItem('pvz_user', JSON.stringify(d.user));
        updateUserPanel();
        showScreen('screen-menu');
        socket.emit('set_user_id', { userId: d.user.id });
        // Запускаем обучение автоматически
        setTimeout(function(){ startTutorial(); }, 400);
      }, 800);
    } else {
      setTimeout(function(){showScreen("screen-login");},1500);
    }
  } else {
    err.textContent=d.message;
    err.classList.remove("hidden");
  }
});
socket.on("login_result",function(d){if(d.success){currentUser=d.user;localStorage.setItem("pvz_user",JSON.stringify(d.user));updateUserPanel();showScreen("screen-menu");showToast("Добро пожаловать, "+d.user.username,"success");}else{var err=document.getElementById("login-error");err.textContent=d.message;err.classList.remove("hidden");}});
function showLeaderboard(){socket.emit("get_leaderboard");showScreen("screen-leaderboard");}
socket.on("leaderboard_data",function(data){leaderboardData=data;renderLeaderboard();});
function renderLeaderboard(){var list=document.getElementById("leaderboard-list");if(!leaderboardData.length){list.innerHTML="Нет данных";return;}var sorted=leaderboardData.slice().sort(function(a,b){return leaderSort==="wins"?b.wins-a.wins:b.coins-a.coins;});var html="";sorted.forEach(function(p,i){var rank=i===0?"1":i===1?"2":i===2?"3":(i+1)+".";var cls=i===0?"gold":i===1?"silver":i===2?"bronze":"";html+="DIV_OPEN_leader-item DIV_OPEN_leader-rank "+cls+" CLOSE"+rank+"DIV_CLOSE DIV_OPEN_leader-name CLOSE"+p.username+"DIV_CLOSE DIV_OPEN_leader-stats CLOSE W:"+p.wins+" L:"+p.losses+" C:"+p.coins+"DIV_CLOSE DIV_CLOSE";});list.innerHTML=html;}
function switchLeaderTab(sort,btn){leaderSort=sort;document.querySelectorAll(".leaderboard-tabs .tab-btn").forEach(function(b){b.classList.remove("active");});btn.classList.add("active");renderLeaderboard();}

socket.on('login_result', function(d) {
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    showScreen('screen-menu');
    showToast('Добро пожаловать, ' + d.user.username + '!', 'success');
  } else {
    var err = document.getElementById('login-error');
    err.textContent = d.message;
    err.classList.remove('hidden');
  }
});

function showLeaderboard() {
  socket.emit('get_leaderboard');
  showScreen('screen-leaderboard');
}

socket.on('leaderboard_data', function(data) {
  leaderboardData = data;
  renderLeaderboard();
});

function renderLeaderboard() {
  var list = document.getElementById('leaderboard-list');
  if (!leaderboardData.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><p>Пока нет игроков</p></div>';
    return;
  }
  var sorted = leaderboardData.slice().sort(function(a, b) {
    return leaderSort === 'wins' ? b.wins - a.wins : b.coins - a.coins;
  });
  var html = '';
  sorted.forEach(function(p, i) {
    var rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    var cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    html += '<div class="leader-item">';
    html += '<div class="leader-rank ' + cls + '">' + rank + '</div>';
    html += '<div class="leader-name">' + p.username + (p.isAdmin ? ' 👑' : '') + '</div>';
    html += '<div class="leader-stats"><span>🏆 ' + p.wins + '</span><span>💀 ' + p.losses + '</span><span>🪙 ' + p.coins + '</span></div>';
    html += '</div>';
  });
  list.innerHTML = html;
}

function switchLeaderTab(sort, btn) {
  leaderSort = sort;
  document.querySelectorAll('.leaderboard-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  btn.classList.add('active');
  renderLeaderboard();
}

function showShop() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  socket.emit('get_shop');
  document.getElementById('shop-coins').textContent = currentUser.coins;
  showScreen('screen-shop');
}

// ===== INVENTORY =====
var allShopItemsCache = [];

function showInventory() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  document.getElementById('inv-coins').textContent = currentUser.coins;
  showScreen('screen-inventory');
  // Запрашиваем ВСЕ товары (не только ротацию) для инвентаря
  socket.emit('get_all_items');
  // Сбрасываем фильтр
  document.querySelectorAll('#screen-inventory .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  var firstTab = document.querySelector('#screen-inventory .tab-btn');
  if (firstTab) firstTab.classList.add('active');
}

socket.on('all_items_data', function(items) {
  allShopItemsCache = items;
  // Если открыт инвентарь — обновляем
  var invScreen = document.getElementById('screen-inventory');
  if (invScreen && invScreen.classList.contains('active')) {
    renderInventory('all');
  }
});

socket.on('shop_data', function(items) {
  shopItems = items;
  renderShop('all');
  // Если открыт инвентарь — обновляем его тоже (используем кэш)
  var invScreen = document.getElementById('screen-inventory');
  if (invScreen && invScreen.classList.contains('active')) {
    renderInventory('all');
  }
});

// Данные прокачки растений
var PLANT_UPGRADES = {
  peashooter: [
    { level: 1, name: 'Горошина Ур.1', desc: 'Базовая атака', cost: 0, dmgBonus: 0, hpBonus: 0 },
    { level: 2, name: 'Горошина Ур.2', desc: '+25% урон', cost: 150, dmgBonus: 0.25, hpBonus: 0 },
    { level: 3, name: 'Горошина Ур.3', desc: '+50% урон, +20% HP', cost: 300, dmgBonus: 0.5, hpBonus: 0.2 },
    { level: 4, name: 'Горошина Ур.4', desc: '+100% урон, +50% HP', cost: 600, dmgBonus: 1.0, hpBonus: 0.5 },
    { level: 5, name: '⭐ Горошина Макс', desc: '+200% урон, +100% HP, двойной выстрел', cost: 1200, dmgBonus: 2.0, hpBonus: 1.0 }
  ],
  sunflower: [
    { level: 1, name: 'Подсолнух Ур.1', desc: 'Базовая генерация', cost: 0, sunBonus: 0 },
    { level: 2, name: 'Подсолнух Ур.2', desc: '+50% солнца', cost: 120, sunBonus: 0.5 },
    { level: 3, name: 'Подсолнух Ур.3', desc: '+100% солнца', cost: 250, sunBonus: 1.0 },
    { level: 4, name: 'Подсолнух Ур.4', desc: '+200% солнца, лечит растения', cost: 500, sunBonus: 2.0 },
    { level: 5, name: '⭐ Подсолнух Макс', desc: '+300% солнца, аура лечения', cost: 1000, sunBonus: 3.0 }
  ],
  wallnut: [
    { level: 1, name: 'Орех Ур.1', desc: 'Базовая защита', cost: 0, hpBonus: 0 },
    { level: 2, name: 'Орех Ур.2', desc: '+50% HP', cost: 100, hpBonus: 0.5 },
    { level: 3, name: 'Орех Ур.3', desc: '+100% HP', cost: 200, hpBonus: 1.0 },
    { level: 4, name: 'Орех Ур.4', desc: '+200% HP, замедляет зомби', cost: 400, hpBonus: 2.0 },
    { level: 5, name: '⭐ Орех Макс', desc: '+400% HP, шипы', cost: 800, hpBonus: 4.0 }
  ]
};

function renderInventory(filter) {
  var grid = document.getElementById('inventory-items');
  if (!currentUser || !currentUser.inventory || currentUser.inventory.length === 0) {
    grid.innerHTML = '<div class="inv-empty"><div style="font-size:64px;margin-bottom:16px">🎒</div><h3 style="color:#fff;margin-bottom:8px">Инвентарь пуст</h3><p style="color:rgba(255,255,255,0.6);margin-bottom:20px">Купите предметы в магазине</p><button class="btn btn-primary" onclick="showShop()">🛒 В магазин</button></div>';
    return;
  }

  var allItems = allShopItemsCache.length > 0 ? allShopItemsCache : shopItems;
  var ownedItems = allItems.filter(function(item) {
    return currentUser.inventory.includes(item.id);
  });

  if (filter !== 'all') {
    ownedItems = ownedItems.filter(function(i) { return i.type === filter; });
  }

  if (ownedItems.length === 0) {
    var typeNames = { plant: 'растений', zombie: 'зомби', skin: 'скинов' };
    grid.innerHTML = '<div class="inv-empty"><div style="font-size:48px;margin-bottom:12px">🎒</div><p style="color:rgba(255,255,255,0.6)">Нет купленных ' + (typeNames[filter] || 'предметов') + '</p><button class="btn btn-primary btn-sm" onclick="showShop()">🛒 В магазин</button></div>';
    return;
  }

  var rarityColors = { common: '#9E9E9E', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
  var rarityGradients = {
    common: 'linear-gradient(135deg, #424242, #616161)',
    rare: 'linear-gradient(135deg, #1565C0, #1976D2)',
    epic: 'linear-gradient(135deg, #6A1B9A, #8E24AA)',
    legendary: 'linear-gradient(135deg, #E65100, #FF6D00)'
  };
  var rarityNames = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' };

  var html = '<div class="inv-grid">';
  ownedItems.forEach(function(item) {
    var color = rarityColors[item.rarity] || '#9E9E9E';
    var grad = rarityGradients[item.rarity] || rarityGradients.common;
    var rarityName = rarityNames[item.rarity] || item.rarity;
    var upgrades = PLANT_UPGRADES[item.gameKey];
    var plantLvl = currentUser.plantLevels && currentUser.plantLevels[item.gameKey] ? currentUser.plantLevels[item.gameKey] : 1;

    html += '<div class="inv-card" style="--rarity-color:' + color + ';--rarity-grad:' + grad + '">';
    html += '<div class="inv-card-top" style="background:' + grad + '">';
    html += '<div class="inv-card-emoji">' + item.emoji + '</div>';
    html += '<div class="inv-rarity-badge">' + rarityName + '</div>';
    html += '</div>';
    html += '<div class="inv-card-body">';
    html += '<div class="inv-card-name">' + item.name + '</div>';
    html += '<div class="inv-card-desc">' + item.description + '</div>';

    // Прокачка только для растений
    if (item.type === 'plant' && upgrades) {
      var maxLvl = upgrades.length;
      var nextUpgrade = upgrades[plantLvl]; // plantLvl = текущий уровень (1-based), upgrades[plantLvl] = следующий
      html += '<div class="inv-upgrade-section">';
      html += '<div class="inv-upgrade-header">';
      html += '<span class="inv-level-badge">Ур. ' + plantLvl + '/' + maxLvl + '</span>';
      // Прогресс-бар уровня
      var lvlPct = Math.round((plantLvl / maxLvl) * 100);
      html += '<div class="inv-lvl-bar"><div class="inv-lvl-fill" style="width:' + lvlPct + '%;background:' + color + '"></div></div>';
      html += '</div>';
      if (nextUpgrade && plantLvl < maxLvl) {
        html += '<div class="inv-upgrade-info">';
        html += '<span style="font-size:12px;color:#555">' + nextUpgrade.desc + '</span>';
        html += '</div>';
        html += '<button class="inv-upgrade-btn" onclick="upgradePlant(\'' + item.gameKey + '\',' + nextUpgrade.cost + ')" style="background:' + grad + '">';
        html += '⬆️ Прокачать · 🪙 ' + nextUpgrade.cost;
        html += '</button>';
      } else {
        html += '<div style="text-align:center;color:#4CAF50;font-weight:700;font-size:13px;padding:8px">⭐ Максимальный уровень!</div>';
      }
      html += '</div>';
    }

    html += '<div class="inv-owned-badge">✅ В инвентаре</div>';
    html += '</div></div>';
  });
  html += '</div>';
  grid.innerHTML = html;
}

function upgradePlant(gameKey, cost) {
  if (!currentUser) return;
  if (currentUser.coins < cost) {
    showToast('Недостаточно монет! Нужно 🪙 ' + cost, 'error');
    return;
  }
  socket.emit('upgrade_plant', { userId: currentUser.id, gameKey: gameKey, cost: cost });
}

socket.on('upgrade_result', function(d) {
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    document.getElementById('inv-coins').textContent = currentUser.coins;
    renderInventory('plant');
    showToast(d.message, 'success');
  } else {
    showToast(d.message, 'error');
  }
});

function filterInventory(filter, btn) {
  document.querySelectorAll('#screen-inventory .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderInventory(filter);
}

function renderShop(filter) {
  var grid = document.getElementById('shop-items');
  var filtered = filter === 'all' ? shopItems : shopItems.filter(function(i) { return i.type === filter; });
  if (!filtered.length) {
    grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🛒</div><p>Нет товаров</p></div>';
    return;
  }
  var rarityColors = { common: '#9E9E9E', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
  var rarityNames = { common: 'Обычный', rare: 'Редкий', epic: 'Эпический', legendary: 'Легендарный' };
  var rarityClasses = { common: 'rarity-common', rare: 'rarity-rare', epic: 'rarity-epic', legendary: 'rarity-legendary' };
  var html = '';
  filtered.forEach(function(item) {
    var owned = currentUser && currentUser.inventory && currentUser.inventory.includes(item.id);
    var color = rarityColors[item.rarity] || '#9E9E9E';
    var rarityName = rarityNames[item.rarity] || item.rarity;
    var rarityClass = rarityClasses[item.rarity] || 'rarity-common';
    var canAfford = currentUser && currentUser.coins >= item.price;
    html += '<div class="shop-item' + (owned ? ' owned' : '') + '" data-rarity="' + (item.rarity || 'common') + '" style="border-top: 4px solid ' + color + '">';
    html += '<div class="shop-item-emoji">' + item.emoji + '</div>';
    html += '<div class="shop-item-name">' + item.name + '</div>';
    html += '<div class="shop-item-desc">' + item.description + '</div>';
    html += '<div class="shop-item-rarity ' + rarityClass + '">' + rarityName + '</div>';
    if (owned) {
      html += '<div class="shop-item-price" style="color:#2E7D32">✅ Куплено</div>';
    } else {
      html += '<div class="shop-item-price" style="color:' + (canAfford ? '#E65100' : '#999') + '">🪙 ' + item.price + '</div>';
      html += '<button class="btn btn-primary btn-sm" style="width:100%;margin-top:4px' + (!canAfford ? ';opacity:0.6' : '') + '" onclick="buyItem(' + JSON.stringify(item.id) + ')">' + (canAfford ? '🛒 Купить' : '💸 Мало монет') + '</button>';
    }
    html += '</div>';
  });
  grid.innerHTML = html;
}

function showShopPromo(btn) {
  // Скрываем товары, показываем промокоды
  document.querySelectorAll('#screen-shop .shop-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  document.getElementById('shop-items').style.display = 'none';
  document.getElementById('shop-promo-panel').style.display = 'block';
}

function filterShop(filter, btn) {
  // Скрываем промокоды, показываем товары
  document.getElementById('shop-promo-panel').style.display = 'none';
  document.getElementById('shop-items').style.display = 'grid';
  document.querySelectorAll('#screen-shop .shop-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  renderShop(filter);
}

function buyItem(itemId) {
  if (!currentUser) return;
  socket.emit('buy_item', { userId: currentUser.id, itemId: itemId });
}

socket.on('buy_result', function(d) {
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    document.getElementById('shop-coins').textContent = currentUser.coins;
    renderShop('all');
    showToast(d.message, 'success');
  } else {
    showToast(d.message, 'error');
  }
});

function usePromo() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  var code = document.getElementById('promo-input').value.trim();
  if (!code) { showToast('Введите промокод', 'error'); return; }
  // Используем v2 (поддержка мульти-наград)
  socket.emit('use_promo_v2', { userId: currentUser.id, code: code });
}

socket.on('promo_result', function(d) {
  var res = document.getElementById('promo-result');
  res.classList.remove('hidden');
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    document.getElementById('shop-coins').textContent = currentUser.coins;
    res.className = 'success-msg';
    res.textContent = d.message;
    document.getElementById('promo-input').value = '';
    // Обновляем инвентарь если открыт
    var invScreen = document.getElementById('screen-inventory');
    if (invScreen && invScreen.classList.contains('active')) {
      document.getElementById('inv-coins').textContent = currentUser.coins;
      renderInventory('all');
    }
  } else {
    res.className = 'error-msg';
    res.textContent = d.message;
  }
  setTimeout(function() { res.classList.add('hidden'); }, 3000);
});

// ===== CRYSTALS =====
function updateCrystalsDisplay() {
  var els = document.querySelectorAll('.menu-crystals');
  els.forEach(function(el) { el.textContent = currentUser ? (currentUser.crystals || 0) : 0; });
}

// ===== LOOT BOXES =====
var activeBoxType = null;

function openBoxModal(boxType) {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  var inv = currentUser.inventory || [];
  if (!inv.includes(boxType)) { showToast('У вас нет этого ящика!', 'error'); return; }
  activeBoxType = boxType;
  var names = { skin_box: '🎁 Ящик скинов', plant_box: '🌱 Ящик растений', crystal_box: '💎 Ящик кристаллов' };
  var descs = { skin_box: 'Случайный скин любой редкости', plant_box: 'Случайное растение любой редкости', crystal_box: 'От 10 до 100 кристаллов' };
  document.getElementById('box-modal-title').textContent = names[boxType] || 'Ящик';
  document.getElementById('box-modal-desc').textContent = descs[boxType] || '';
  document.getElementById('box-modal-result').innerHTML = '';
  document.getElementById('box-modal-result').className = 'hidden';
  document.getElementById('box-open-btn').style.display = 'inline-block';
  document.getElementById('modal-box').style.display = 'flex';
}

function doOpenBox() {
  if (!currentUser || !activeBoxType) return;
  socket.emit('open_loot_box', { userId: currentUser.id, boxType: activeBoxType });
  document.getElementById('box-open-btn').style.display = 'none';
  document.getElementById('box-modal-result').innerHTML = '<div style="text-align:center;padding:20px;font-size:32px">🎲 Открываем...</div>';
  document.getElementById('box-modal-result').className = '';
}

socket.on('box_result', function(d) {
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    updateCrystalsDisplay();
    var res = document.getElementById('box-modal-result');
    var r = d.reward;
    var html = '<div style="text-align:center;padding:20px">';
    html += '<div style="font-size:64px;margin-bottom:12px">' + (r.type === 'skin' ? r.item.emoji : r.type === 'plant' ? r.item.emoji : r.type === 'crystals' ? '💎' : '🪙') + '</div>';
    html += '<div style="font-size:18px;font-weight:700;color:#4CAF50;margin-bottom:8px">' + r.message + '</div>';
    if (r.type === 'skin' || r.type === 'plant') {
      var rarityColors = { common: '#9E9E9E', rare: '#2196F3', epic: '#9C27B0', legendary: '#FF9800' };
      html += '<div style="display:inline-block;padding:4px 12px;border-radius:20px;background:' + (rarityColors[r.item.rarity] || '#9E9E9E') + ';color:#fff;font-size:13px">' + r.item.rarity + '</div>';
    }
    html += '</div>';
    res.innerHTML = html;
    res.className = '';
    showToast(r.message, 'success');
    // Обновляем инвентарь
    socket.emit('get_all_items');
  } else {
    showToast(d.message, 'error');
    document.getElementById('modal-box').style.display = 'none';
  }
});

// ===== SHOP GIFTS =====
var shopGiftsData = [];

function loadShopGifts() {
  socket.emit('get_shop_gifts');
}

socket.on('shop_gifts_data', function(gifts) {
  shopGiftsData = gifts;
  renderShopGiftsBanner();
  renderShopGiftsPanel();
});

socket.on('new_shop_gift', function(gift) {
  shopGiftsData.push(gift);
  renderShopGiftsBanner();
  renderShopGiftsPanel();
  showToast('🎁 Новый подарок в магазине: ' + gift.title + '!', 'success');
});

socket.on('shop_gifts_updated', function() {
  socket.emit('get_shop_gifts');
});

socket.on('gift_received', function(d) {
  showToast(d.message, 'success');
  if (currentUser) socket.emit('get_fresh_user', { userId: currentUser.id });
});

function renderShopGiftsBanner() {
  var banner = document.getElementById('shop-gift-banner');
  if (!banner) return;
  var now = Date.now();
  var active = shopGiftsData.filter(function(g) { return g.active && (!g.expiresAt || g.expiresAt > now); });
  if (active.length > 0) {
    banner.style.display = 'block';
    banner.innerHTML = '🎁 <strong>ПОДАРОК!</strong> В магазине ' + active.length + ' активн' + (active.length === 1 ? 'ая акция' : 'ых акции') + ' — нажмите чтобы получить!';
    banner.onclick = function() { showShopGiftsTab(); };
  } else {
    banner.style.display = 'none';
  }
  // Также обновляем кнопку в меню
  var menuGiftBtn = document.getElementById('menu-gift-btn');
  if (menuGiftBtn) {
    if (active.length > 0) menuGiftBtn.classList.remove('hidden');
    else menuGiftBtn.classList.add('hidden');
  }
}

function renderShopGiftsPanel() {
  var panel = document.getElementById('shop-gifts-list');
  if (!panel) return;
  var now = Date.now();
  var active = shopGiftsData.filter(function(g) { return g.active && (!g.expiresAt || g.expiresAt > now); });
  if (!active.length) {
    panel.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎁</div><p>Нет активных акций</p></div>';
    return;
  }
  var html = '';
  active.forEach(function(g) {
    var claimed = currentUser && g.claimedBy && g.claimedBy.includes(currentUser.id);
    var timeLeft = '';
    if (g.expiresAt) {
      var left = Math.max(0, g.expiresAt - now);
      var mins = Math.floor(left / 60000);
      var hours = Math.floor(mins / 60);
      var days = Math.floor(hours / 24);
      if (days > 0) timeLeft = days + 'д ' + (hours % 24) + 'ч';
      else if (hours > 0) timeLeft = hours + 'ч ' + (mins % 60) + 'мин';
      else timeLeft = mins + ' мин';
    }
    var rewardDesc = (g.rewards || []).map(function(r) {
      if (r.type === 'coins') return '🪙 ' + r.amount + ' монет';
      if (r.type === 'crystals') return '💎 ' + r.amount + ' кристаллов';
      if (r.type === 'box') {
        var names = { skin_box: '🎁 Ящик скинов', plant_box: '🌱 Ящик растений', crystal_box: '💎 Ящик кристаллов' };
        return names[r.boxType] || '📦 Ящик';
      }
      return '🎁 Предмет';
    }).join(' + ');
    html += '<div class="gift-card' + (claimed ? ' gift-claimed' : '') + '">';
    html += '<div class="gift-card-header"><span class="gift-card-icon">🎁</span><div class="gift-card-info"><div class="gift-card-title">' + g.title + '</div>';
    if (g.description) html += '<div class="gift-card-desc">' + g.description + '</div>';
    html += '</div></div>';
    html += '<div class="gift-card-rewards">' + rewardDesc + '</div>';
    if (timeLeft) html += '<div class="gift-card-timer">⏰ Осталось: ' + timeLeft + '</div>';
    if (claimed) {
      html += '<div class="gift-card-btn gift-btn-claimed">✅ Получено</div>';
    } else {
      html += '<button class="gift-card-btn" onclick="claimGift(\'' + g.id + '\')">🎁 Получить!</button>';
    }
    html += '</div>';
  });
  panel.innerHTML = html;
}

function claimGift(giftId) {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  socket.emit('claim_shop_gift', { userId: currentUser.id, giftId: giftId });
}

socket.on('gift_claim_result', function(d) {
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    updateCrystalsDisplay();
    document.getElementById('shop-coins').textContent = currentUser.coins;
    showToast(d.message, 'success');
    socket.emit('get_shop_gifts');
    socket.emit('get_all_items');
  } else {
    showToast(d.message, 'error');
  }
});

function showShopGiftsTab() {
  document.getElementById('shop-promo-panel').style.display = 'none';
  document.getElementById('shop-items').style.display = 'none';
  var giftsPanel = document.getElementById('shop-gifts-panel');
  if (giftsPanel) giftsPanel.style.display = 'block';
  document.querySelectorAll('#screen-shop .shop-tabs .tab-btn').forEach(function(b) { b.classList.remove('active'); });
  var giftsTab = document.getElementById('shop-gifts-tab-btn');
  if (giftsTab) giftsTab.classList.add('active');
  socket.emit('get_shop_gifts');
}

// ===== MATCHMAKING + AUTOBOT =====
var searchTimer = null;
var searchSeconds = 0;
var searchInterval = null;

function findGame() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  socket.emit('find_game', { userId: currentUser.id, username: currentUser.username });
  showScreen('screen-searching');
  searchSeconds = 0;
  clearInterval(searchInterval);
  searchInterval = setInterval(function() {
    searchSeconds++;
    var el = document.getElementById('search-timer');
    if (el) el.textContent = searchSeconds + 'с';
    // Через 60 секунд — автоматически запускаем бота
    if (searchSeconds >= 60) {
      clearInterval(searchInterval);
      socket.emit('cancel_search', { userId: currentUser.id });
      showToast('🤖 Соперник не найден — играете против бота!', 'success');
      setTimeout(function() {
        socket.emit('start_bot_game', {
          userId: currentUser.id,
          username: currentUser.username,
          role: Math.random() > 0.5 ? 'plant' : 'zombie',
          difficulty: 'medium'
        });
      }, 500);
    }
  }, 1000);
}

function cancelSearch() {
  if (!currentUser) return;
  clearInterval(searchInterval);
  searchSeconds = 0;
  socket.emit('cancel_search', { userId: currentUser.id });
}

socket.on('search_cancelled', function() {
  clearInterval(searchInterval);
  showScreen('screen-menu');
});

socket.on('waiting_for_opponent', function() {
  showScreen('screen-searching');
});

socket.on('game_start', function(data) {
  console.log('game_start received:', data.gameId, data.role);
  try {
    localStorage.setItem('pvz_game', JSON.stringify(data));
  } catch(e) {
    console.error('localStorage error:', e);
  }
  // Небольшая задержка чтобы localStorage успел сохраниться
  setTimeout(function() {
    window.location.href = '/game.html';
  }, 300);
});

// Восстановление сессии
window.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('pvz_user');
  if (saved) {
    try {
      currentUser = JSON.parse(saved);
      updateUserPanel();
      // Регистрируем userId в сокете для получения уведомлений
      socket.emit('set_user_id', { userId: currentUser.id });
      // Загружаем запросы в друзья
      socket.emit('get_friends', { userId: currentUser.id });
      // Запрашиваем свежие данные пользователя с сервера
      socket.emit('get_fresh_user', { userId: currentUser.id });
    } catch(e) {}
  }
});

// Получаем свежие данные пользователя с сервера
socket.on('fresh_user_data', function(data) {
  if (data.success && data.user) {
    currentUser = data.user;
    localStorage.setItem('pvz_user', JSON.stringify(data.user));
    updateUserPanel();
  }
});

function showClaimAdmin() {
  if (!currentUser) { showToast('Сначала войдите в аккаунт', 'error'); return; }
  if (currentUser.isAdmin) { showToast('Вы уже администратор', 'success'); return; }
  document.getElementById('modal-claim-admin').style.display = 'flex';
}

function doClaimAdmin() {
  if (!currentUser) return;
  var code = document.getElementById('admin-secret-input').value.trim();
  if (!code) { showToast('Введите код', 'error'); return; }
  socket.emit('claim_admin', { userId: currentUser.id, secretCode: code });
}

socket.on('claim_admin_result', function(d) {
  var res = document.getElementById('claim-admin-result');
  res.style.display = 'block';
  res.className = d.success ? 'success-msg' : 'error-msg';
  res.textContent = d.message;
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    setTimeout(function() {
      document.getElementById('modal-claim-admin').style.display = 'none';
      res.style.display = 'none';
    }, 2000);
  }
});


// ===== TUTORIAL =====
var tutorialStep = 0;
var tutorialSteps = [
  {
    icon: '🌱🧟',
    title: 'Добро пожаловать в PvZ Online!',
    text: '<p>Это пошаговая онлайн-игра, где два игрока сражаются друг против друга.</p><div class="tutorial-highlight">🌱 Один игрок управляет <strong>Растениями</strong><br>🧟 Другой игрок управляет <strong>Зомби</strong></div><p>Цель: Растения должны защитить свой дом, а Зомби — прорваться к нему!</p>'
  },
  {
    icon: '📝',
    title: 'Шаг 1: Регистрация',
    text: '<p>Для игры нужен аккаунт:</p><ul><li>Нажмите <strong>📝 Регистрация</strong> на главном экране</li><li>Придумайте имя (мин. 3 символа) и пароль (мин. 4 символа)</li><li>После регистрации войдите в аккаунт</li></ul><div class="tutorial-tip">💡 Имя будет видно другим игрокам в таблице лидеров</div>'
  },
  {
    icon: '⚔️',
    title: 'Шаг 2: Поиск игры',
    text: '<p>После входа нажмите <strong>⚔️ Найти игру</strong>.</p><p>Система автоматически найдёт соперника. Когда найдётся второй игрок — игра начнётся!</p><div class="tutorial-highlight">🎲 Роли (Растения / Зомби) назначаются случайно</div><p>Пока ждёте — можно отменить поиск кнопкой <strong>Отмена</strong>.</p>'
  },
  {
    icon: '🌻',
    title: 'Шаг 3: Игра за Растения',
    text: '<p>Если вы играете за <strong>Растения</strong>:</p><ul><li>☀️ Вы получаете <strong>Солнце</strong> каждые несколько секунд</li><li>Выберите растение из панели внизу</li><li>Нажмите на клетку поля чтобы посадить его</li><li>Растения автоматически атакуют зомби в своей линии</li></ul><div class="tutorial-highlight">🏠 Защищайте левый край поля — это ваш дом!</div>'
  },
  {
    icon: '🌱',
    title: 'Растения и их способности',
    text: '<ul><li>🌱 <strong>Горошина</strong> (50☀️) — стреляет горохом, базовый атакующий</li><li>🌻 <strong>Подсолнух</strong> (25☀️) — производит дополнительное солнце</li><li>🥜 <strong>Орех</strong> (50☀️) — прочная стена, замедляет зомби</li><li>🍒 <strong>Вишня</strong> (150☀️) — взрывается, уничтожает всех зомби в линии</li><li>❄️ <strong>Снежный горох</strong> (75☀️) — замораживает зомби</li></ul><div class="tutorial-tip">💡 Ставьте Подсолнухи в начале — они дают больше солнца!</div>'
  },
  {
    icon: '🧟',
    title: 'Шаг 4: Игра за Зомби',
    text: '<p>Если вы играете за <strong>Зомби</strong>:</p><ul><li>🧠 Вы получаете <strong>Мозги</strong> каждые несколько секунд</li><li>Выберите тип зомби из панели внизу</li><li>Выберите линию (1-5) куда отправить зомби</li><li>Нажмите <strong>Отправить зомби</strong></li></ul><div class="tutorial-highlight">🎯 Зомби идут справа налево — прорвитесь к дому!</div>'
  },
  {
    icon: '🧟‍♂️',
    title: 'Виды зомби',
    text: '<ul><li>🧟 <strong>Обычный</strong> (50🧠) — базовый зомби, мало HP</li><li>🧟‍♂️ <strong>Конус</strong> (75🧠) — средняя защита</li><li>🪣 <strong>Ведро</strong> (100🧠) — высокая защита, медленный</li><li>🏈 <strong>Футболист</strong> (150🧠) — очень быстрый, средняя защита</li></ul><div class="tutorial-tip">💡 Отправляйте зомби в линии где меньше растений!</div>'
  },
  {
    icon: '🏆',
    title: 'Шаг 5: Победа и награды',
    text: '<p><strong>Растения побеждают</strong> если продержатся до конца времени (5 минут).</p><p><strong>Зомби побеждают</strong> если хотя бы один зомби доберётся до левого края поля.</p><div class="tutorial-highlight">🪙 Победитель получает <strong>+50 монет</strong>!<br>💀 Проигравший получает <strong>+10 монет</strong> за участие</div>'
  },
  {
    icon: '🛒',
    title: 'Шаг 6: Магазин',
    text: '<p>В магазине можно купить улучшения за монеты:</p><ul><li>🌱 <strong>Растения</strong> — новые виды растений</li><li>🧟 <strong>Зомби</strong> — новые виды зомби</li><li>✨ <strong>Скины</strong> — косметические улучшения</li></ul><div class="tutorial-tip">💡 Используйте промокоды для получения бесплатных монет!</div>'
  },
  {
    icon: '🏅',
    title: 'Шаг 7: Таблица лидеров',
    text: '<p>В таблице лидеров можно увидеть лучших игроков сервера.</p><ul><li>🏆 Сортировка по <strong>победам</strong></li><li>🪙 Сортировка по <strong>монетам</strong></li></ul><div class="tutorial-highlight">👑 Администраторы отмечены короной</div><p>Играйте больше — поднимайтесь в рейтинге!</p>'
  },
  {
    icon: '🎉',
    title: 'Готово! Сыграйте тестовый матч!',
    text: '<p>Вы знаете всё необходимое! Теперь попробуйте сыграть против <strong>бота</strong> — это безопасный тренировочный матч.</p><div class="tutorial-highlight">🤖 Бот (Лёгкий) — идеально для первой игры<br>🌱 Вы будете играть за Растения<br>🎯 Цель: продержаться 3 минуты!</div><div style="text-align:center;margin-top:20px"><button class="btn btn-success" style="font-size:18px;padding:14px 32px;border-radius:16px" onclick="startTutorialBotGame()">🤖 Начать тестовый матч!</button></div><p style="text-align:center;margin-top:12px;font-size:13px;color:rgba(255,255,255,0.6)">или нажмите "Закрыть" чтобы вернуться в меню</p>'
  }
];

function startTutorial() {
  tutorialStep = 0;
  document.getElementById('tutorial-overlay').style.display = 'flex';
  renderTutorialStep();
}

function renderTutorialStep() {
  var step = tutorialSteps[tutorialStep];
  var total = tutorialSteps.length;

  // Dots
  var dotsHTML = '';
  for (var i = 0; i < total; i++) {
    var cls = i === tutorialStep ? 'active' : (i < tutorialStep ? 'done' : '');
    dotsHTML += '<div class="tutorial-dot ' + cls + '"></div>';
  }
  document.getElementById('tutorial-dots').innerHTML = dotsHTML;

  // Content
  document.getElementById('tutorial-step-content').innerHTML =
    '<div class="tutorial-step-icon">' + step.icon + '</div>' +
    '<div class="tutorial-step-title">' + step.title + '</div>' +
    '<div class="tutorial-step-text">' + step.text + '</div>';

  // Counter
  document.getElementById('tutorial-counter').textContent = (tutorialStep + 1) + ' / ' + total;

  // Buttons
  document.getElementById('tutorial-prev-btn').style.display = tutorialStep === 0 ? 'none' : 'inline-block';
  var nextBtn = document.getElementById('tutorial-next-btn');
  if (tutorialStep === total - 1) {
    nextBtn.textContent = '✅ Закрыть';
    nextBtn.className = 'btn btn-success btn-sm';
  } else {
    nextBtn.textContent = 'Далее →';
    nextBtn.className = 'btn btn-primary btn-sm';
  }
}

function tutorialNext() {
  if (tutorialStep < tutorialSteps.length - 1) {
    tutorialStep++;
    renderTutorialStep();
  } else {
    document.getElementById('tutorial-overlay').style.display = 'none';
  }
}

function tutorialPrev() {
  if (tutorialStep > 0) {
    tutorialStep--;
    renderTutorialStep();
  }
}

// ===== FRIENDS =====
var friendsData = { friends: [], requests: [] };
var pendingChallengeFrom = null;

function showFriends() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  socket.emit('set_user_id', { userId: currentUser.id });
  socket.emit('get_friends', { userId: currentUser.id });
  showScreen('screen-friends');
}

socket.on('friends_data', function(data) {
  if (!data.success) return;
  friendsData = data;
  renderFriends();
  // Обновляем бейдж
  var badge = document.getElementById('friends-badge');
  if (badge) {
    if (data.requests && data.requests.length > 0) {
      badge.textContent = data.requests.length;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }
});

function renderFriends() {
  // Запросы
  var reqSection = document.getElementById('friend-requests-section');
  var reqList = document.getElementById('friend-requests-list');
  if (friendsData.requests && friendsData.requests.length > 0) {
    reqSection.style.display = 'block';
    var html = '';
    friendsData.requests.forEach(function(r) {
      html += '<div class="friend-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#FFF3E0;border-radius:10px;margin-bottom:8px">';
      html += '<span style="font-size:24px">🎮</span>';
      html += '<div style="flex:1"><strong>' + r.username + '</strong><br><span style="font-size:12px;color:#888">хочет добавить вас в друзья</span></div>';
      html += '<button class="btn btn-success btn-sm" onclick="acceptFriend(\'' + r.id + '\')">✅</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="declineFriend(\'' + r.id + '\')">❌</button>';
      html += '</div>';
    });
    reqList.innerHTML = html;
  } else {
    reqSection.style.display = 'none';
  }

  // Список друзей
  var list = document.getElementById('friends-list');
  if (!friendsData.friends || friendsData.friends.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤝</div><p>У вас пока нет друзей</p><p style="font-size:13px;color:#888">Добавьте друга по нику выше</p></div>';
    return;
  }
  var html = '';
  friendsData.friends.forEach(function(f) {
    html += '<div class="shop-item" style="text-align:left;padding:14px">';
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">';
    html += '<span style="font-size:28px">' + (f.isAdmin ? '👑' : '🎮') + '</span>';
    html += '<div style="flex:1"><strong style="font-size:15px">' + f.username + '</strong><br>';
    html += '<span style="font-size:12px;color:#888">🏆 ' + (f.wins || 0) + ' побед · 🪙 ' + (f.coins || 0) + ' монет</span></div>';
    html += '</div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="btn btn-primary btn-sm" style="flex:1" onclick="challengeFriend(\'' + f.id + '\',\'' + f.username + '\')">⚔️ Вызвать</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="removeFriend(\'' + f.id + '\')">🗑️</button>';
    html += '</div>';
    html += '</div>';
  });
  list.innerHTML = html;
}

function sendFriendRequest() {
  if (!currentUser) return;
  var input = document.getElementById('friend-username-input');
  var name = input.value.trim();
  if (!name) { showToast('Введите ник', 'error'); return; }
  socket.emit('send_friend_request', { userId: currentUser.id, targetUsername: name });
}

socket.on('friend_result', function(d) {
  var res = document.getElementById('friend-add-result');
  if (res) {
    res.classList.remove('hidden');
    res.className = d.success ? 'success-msg' : 'error-msg';
    res.textContent = d.message;
    setTimeout(function() { res.classList.add('hidden'); }, 3000);
  }
  if (d.success) {
    showToast(d.message, 'success');
    var input = document.getElementById('friend-username-input');
    if (input) input.value = '';
    // Обновляем список
    if (currentUser) socket.emit('get_friends', { userId: currentUser.id });
  } else {
    showToast(d.message, 'error');
  }
});

function acceptFriend(fromId) {
  if (!currentUser) return;
  socket.emit('accept_friend', { userId: currentUser.id, fromId: fromId });
}

function declineFriend(fromId) {
  if (!currentUser) return;
  socket.emit('decline_friend', { userId: currentUser.id, fromId: fromId });
  socket.emit('get_friends', { userId: currentUser.id });
}

function removeFriend(friendId) {
  if (!currentUser) return;
  if (!confirm('Удалить из друзей?')) return;
  socket.emit('remove_friend', { userId: currentUser.id, friendId: friendId });
  socket.emit('get_friends', { userId: currentUser.id });
}

// Входящий запрос в друзья (уведомление)
socket.on('friend_request_received', function(data) {
  showToast('📨 ' + data.username + ' хочет добавить вас в друзья!', 'success');
  if (currentUser) socket.emit('get_friends', { userId: currentUser.id });
});

socket.on('friend_accepted', function(data) {
  showToast('🤝 ' + data.username + ' принял(а) вашу заявку в друзья!', 'success');
  if (currentUser) socket.emit('get_friends', { userId: currentUser.id });
});

// ===== FRIENDLY BATTLE =====
function challengeFriend(friendId, friendName) {
  if (!currentUser) return;
  socket.emit('set_user_id', { userId: currentUser.id });
  socket.emit('challenge_friend', { userId: currentUser.id, username: currentUser.username, friendId: friendId });
  showToast('⚔️ Вызов отправлен игроку ' + friendName + '!', 'success');
}

socket.on('challenge_result', function(d) {
  showToast(d.message, d.success ? 'success' : 'error');
});

socket.on('friend_challenge', function(data) {
  pendingChallengeFrom = data;
  var modal = document.getElementById('modal-challenge');
  var text = document.getElementById('challenge-from-text');
  if (text) text.textContent = '⚔️ ' + data.fromUsername + ' вызывает вас на дружеский бой!';
  if (modal) modal.style.display = 'flex';
});

function acceptChallenge() {
  if (!currentUser || !pendingChallengeFrom) return;
  socket.emit('set_user_id', { userId: currentUser.id });
  socket.emit('accept_challenge', { userId: currentUser.id, username: currentUser.username, fromId: pendingChallengeFrom.fromId });
  document.getElementById('modal-challenge').style.display = 'none';
  pendingChallengeFrom = null;
}

function declineChallenge() {
  if (!currentUser || !pendingChallengeFrom) return;
  socket.emit('decline_challenge', { fromId: pendingChallengeFrom.fromId, username: currentUser.username });
  document.getElementById('modal-challenge').style.display = 'none';
  pendingChallengeFrom = null;
}

socket.on('challenge_declined', function(data) {
  showToast('❌ ' + data.username + ' отклонил(а) вызов', 'error');
});

// ===== PROFILE =====
var selectedAvatar = '🎮';
var viewProfileFrom = 'leaderboard';

function calcLevelClient(wins) {
  var xp = (wins || 0) * 100;
  var level = Math.floor(Math.sqrt(xp / 100)) + 1;
  var xpNext = level * level * 100;
  return { level: level, xp: xp, xpNext: xpNext };
}

function showProfile() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  // Заполняем поля
  document.getElementById('profile-username-input').value = currentUser.username;
  document.getElementById('profile-bio-input').value = currentUser.bio || '';
  selectedAvatar = currentUser.avatar || '🎮';
  document.getElementById('profile-avatar-display').textContent = selectedAvatar;
  // Статистика
  document.getElementById('ps-wins').textContent = currentUser.wins || 0;
  document.getElementById('ps-losses').textContent = currentUser.losses || 0;
  document.getElementById('ps-coins').textContent = currentUser.coins || 0;
  var lv = calcLevelClient(currentUser.wins);
  document.getElementById('ps-level').textContent = lv.level;
  document.getElementById('ps-level2').textContent = lv.level;
  document.getElementById('ps-xp').textContent = lv.xp;
  document.getElementById('ps-xpnext').textContent = lv.xpNext;
  var pct = lv.xpNext > 0 ? Math.min(100, Math.round(lv.xp / lv.xpNext * 100)) : 0;
  document.getElementById('ps-xp-fill').style.width = pct + '%';
  // Значки
  renderBadges('profile-badges-list', currentUser.badges || []);
  // Выделяем текущий аватар
  document.querySelectorAll('.avatar-picker span').forEach(function(s) {
    s.classList.toggle('selected', s.textContent === selectedAvatar);
  });
  showScreen('screen-profile');
}

function selectAvatar(emoji) {
  selectedAvatar = emoji;
  document.getElementById('profile-avatar-display').textContent = emoji;
  document.querySelectorAll('.avatar-picker span').forEach(function(s) {
    s.classList.toggle('selected', s.textContent === emoji);
  });
}

function saveProfile() {
  if (!currentUser) return;
  var newUsername = document.getElementById('profile-username-input').value.trim();
  var bio = document.getElementById('profile-bio-input').value;
  socket.emit('update_profile', {
    userId: currentUser.id,
    newUsername: newUsername,
    avatar: selectedAvatar,
    bio: bio
  });
}

socket.on('profile_result', function(d) {
  if (d.success) {
    currentUser = d.user;
    localStorage.setItem('pvz_user', JSON.stringify(d.user));
    updateUserPanel();
    showToast(d.message, 'success');
    // Обновляем аватар в меню
    document.getElementById('menu-avatar').textContent = d.user.avatar || (d.user.isAdmin ? '👑' : '🎮');
  } else {
    showToast(d.message, 'error');
  }
});

function renderBadges(containerId, badges) {
  var el = document.getElementById(containerId);
  if (!el) return;
  if (!badges || badges.length === 0) {
    el.innerHTML = '<span style="color:rgba(255,255,255,0.4);font-size:13px">Нет значков</span>';
    return;
  }
  var html = '';
  badges.forEach(function(b) {
    html += '<div class="badge-item"><span class="badge-item-emoji">' + b.emoji + '</span><span>' + b.name + '</span></div>';
  });
  el.innerHTML = html;
}

// Просмотр профиля другого игрока
function viewProfile(username, fromScreen) {
  viewProfileFrom = fromScreen || 'leaderboard';
  var backBtn = document.getElementById('view-profile-back-btn');
  if (backBtn) {
    backBtn.onclick = function() { showScreen('screen-' + viewProfileFrom); };
  }
  socket.emit('get_profile', { username: username });
  showScreen('screen-view-profile');
}

socket.on('profile_data', function(d) {
  if (!d.success) { showToast(d.message || 'Игрок не найден', 'error'); return; }
  var p = d.profile;
  document.getElementById('vp-avatar').textContent = p.avatar || '🎮';
  document.getElementById('vp-username').textContent = p.username + (p.isAdmin ? ' 👑' : '');
  document.getElementById('vp-bio').textContent = p.bio || '';
  document.getElementById('vp-wins').textContent = p.wins || 0;
  document.getElementById('vp-losses').textContent = p.losses || 0;
  document.getElementById('vp-coins').textContent = p.coins || 0;
  document.getElementById('vp-level').textContent = p.level || 1;
  document.getElementById('vp-level2').textContent = p.level || 1;
  document.getElementById('vp-xp').textContent = p.xp || 0;
  document.getElementById('vp-xpnext').textContent = p.xpNext || 100;
  var pct = p.xpNext > 0 ? Math.min(100, Math.round((p.xp || 0) / p.xpNext * 100)) : 0;
  document.getElementById('vp-xp-fill').style.width = pct + '%';
  // Значки в шапке
  var badgesRow = document.getElementById('vp-badges-row');
  if (badgesRow && p.badges && p.badges.length > 0) {
    badgesRow.innerHTML = p.badges.slice(0, 5).map(function(b) {
      return '<span title="' + b.name + '" style="font-size:22px">' + b.emoji + '</span>';
    }).join('');
  } else if (badgesRow) { badgesRow.innerHTML = ''; }
  renderBadges('vp-badges-list', p.badges || []);
});

// Обновляем лидерборд с кликом на игрока
function renderLeaderboard() {
  var list = document.getElementById('leaderboard-list');
  if (!leaderboardData.length) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🏆</div><p>Пока нет игроков</p></div>';
    return;
  }
  var sorted = leaderboardData.slice().sort(function(a, b) {
    return leaderSort === 'wins' ? b.wins - a.wins : b.coins - a.coins;
  });
  var html = '';
  sorted.forEach(function(p, i) {
    var rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    var cls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
    html += '<div class="leader-item" onclick="viewProfile(\'' + p.username.replace(/'/g, "\\'") + '\', \'leaderboard\')" style="cursor:pointer">';
    html += '<div class="leader-rank ' + cls + '">' + rank + '</div>';
    html += '<div class="leader-name">' + p.username + (p.isAdmin ? ' 👑' : '') + '</div>';
    html += '<div class="leader-stats"><span>🏆 ' + p.wins + '</span><span>💀 ' + p.losses + '</span><span>🪙 ' + p.coins + '</span></div>';
    html += '</div>';
  });
  list.innerHTML = html;
}

// Обновляем список друзей с кликом на профиль
function renderFriends() {
  var reqSection = document.getElementById('friend-requests-section');
  var reqList = document.getElementById('friend-requests-list');
  if (friendsData.requests && friendsData.requests.length > 0) {
    reqSection.style.display = 'block';
    var html = '';
    friendsData.requests.forEach(function(r) {
      html += '<div class="friend-item" style="display:flex;align-items:center;gap:10px;padding:10px;background:#FFF3E0;border-radius:10px;margin-bottom:8px">';
      html += '<span style="font-size:24px">🎮</span>';
      html += '<div style="flex:1"><strong>' + r.username + '</strong><br><span style="font-size:12px;color:#888">хочет добавить вас в друзья</span></div>';
      html += '<button class="btn btn-success btn-sm" onclick="acceptFriend(\'' + r.id + '\')">✅</button>';
      html += '<button class="btn btn-danger btn-sm" onclick="declineFriend(\'' + r.id + '\')">❌</button>';
      html += '</div>';
    });
    reqList.innerHTML = html;
  } else {
    reqSection.style.display = 'none';
  }

  var list = document.getElementById('friends-list');
  if (!friendsData.friends || friendsData.friends.length === 0) {
    list.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🤝</div><p>У вас пока нет друзей</p><p style="font-size:13px;color:#888">Добавьте друга по нику выше</p></div>';
    return;
  }
  var html = '';
  friendsData.friends.forEach(function(f) {
    html += '<div class="shop-item" style="text-align:left;padding:14px">';
    html += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer" onclick="viewProfile(\'' + f.username.replace(/'/g, "\\'") + '\', \'friends\')">';
    html += '<span style="font-size:28px">' + (f.isAdmin ? '👑' : '🎮') + '</span>';
    html += '<div style="flex:1"><strong style="font-size:15px">' + f.username + '</strong><br>';
    html += '<span style="font-size:12px;color:#888">🏆 ' + (f.wins || 0) + ' побед · 🪙 ' + (f.coins || 0) + ' монет</span></div>';
    html += '</div>';
    html += '<div style="display:flex;gap:6px">';
    html += '<button class="btn btn-primary btn-sm" style="flex:1" onclick="challengeFriend(\'' + f.id + '\',\'' + f.username + '\')">⚔️ Вызвать</button>';
    html += '<button class="btn btn-secondary btn-sm" onclick="viewProfile(\'' + f.username.replace(/'/g, "\\'") + '\', \'friends\')">👤</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="removeFriend(\'' + f.id + '\')">🗑️</button>';
    html += '</div>';
    html += '</div>';
  });
  list.innerHTML = html;
}

// Уведомление о сбросе сезона
socket.on('season_reset', function(data) {
  showToast('🏆 ' + data.message, 'success');
});

// Повышение уровня
socket.on('level_up', function(data) {
  var msg = '🎉 Уровень ' + data.newLevel + '!';
  if (data.rewards && data.rewards.length > 0) {
    msg += ' Награда: ' + data.rewards.map(function(r) { return r.label; }).join(', ');
  }
  showToast(msg, 'success');
  // Обновляем данные пользователя
  if (currentUser) {
    currentUser.wins = (currentUser.wins || 0);
    if (data.rewards) {
      data.rewards.forEach(function(r) {
        if (r.type === 'coins') currentUser.coins = (currentUser.coins || 0) + r.amount;
      });
    }
    localStorage.setItem('pvz_user', JSON.stringify(currentUser));
    updateUserPanel();
  }
});

// ===== ПУТЬ НАГРАД =====
var ALL_LEVEL_REWARDS = [
  { level: 2,  emoji: '🪙', label: '50 монет',                    type: 'coins' },
  { level: 3,  emoji: '🪙', label: '75 монет',                    type: 'coins' },
  { level: 4,  emoji: '🌱', label: 'Горошина-стрелок',            type: 'plant' },
  { level: 5,  emoji: '🪙', label: '100 монет',                   type: 'coins' },
  { level: 6,  emoji: '🌸', label: 'Скин "Розовый горох"',        type: 'skin' },
  { level: 7,  emoji: '🪙', label: '150 монет',                   type: 'coins' },
  { level: 8,  emoji: '❄️', label: 'Снежный горох',               type: 'plant' },
  { level: 9,  emoji: '🪙', label: '200 монет',                   type: 'coins' },
  { level: 10, emoji: '💀', label: 'Скин "Зомби-скелет"',         type: 'skin' },
  { level: 12, emoji: '🪙', label: '250 монет',                   type: 'coins' },
  { level: 15, emoji: '⭐', label: 'Скин "Золотая горошина"',     type: 'skin' },
  { level: 18, emoji: '🪙', label: '300 монет',                   type: 'coins' },
  { level: 20, emoji: '🍒', label: 'Вишнёвая бомба',              type: 'plant' },
  { level: 25, emoji: '🌈', label: 'Скин "Радужный подсолнух"',   type: 'skin' },
  { level: 30, emoji: '🪙', label: '500 монет',                   type: 'coins' },
  { level: 35, emoji: '🥷', label: 'Скин "Зомби-ниндзя"',         type: 'skin' },
  { level: 40, emoji: '🌺', label: 'Огненный цветок',             type: 'plant' },
  { level: 45, emoji: '🔮', label: 'Скин "Кристальная горошина"', type: 'skin' },
  { level: 50, emoji: '🪙', label: '1000 монет',                  type: 'coins' },
  { level: 99, emoji: '🟠', label: 'Рандомный легендарный скин',  type: 'legendary' }
];

function showRewardsPath() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  showScreen('screen-rewards-path');
  renderRewardsPath();
}

function renderRewardsPath() {
  var lv = calcLevelClient(currentUser.wins);
  var curLevel = lv.level;
  var pct = lv.xpNext > 0 ? Math.min(100, Math.round(lv.xp / lv.xpNext * 100)) : 0;

  // Обновляем заголовок
  var lvDisp = document.getElementById('rp-level-display');
  if (lvDisp) lvDisp.textContent = '⭐ Ур. ' + curLevel;

  // Обновляем заголовок страницы
  var pageH2 = document.querySelector('#screen-rewards-path .page-header h2');
  if (pageH2) pageH2.textContent = '🏆 Путь к славе';

  var typeColors = { coins: '#FFD700', plant: '#4CAF50', skin: '#9C27B0', legendary: '#FF9800' };
  var typeLabels = { coins: 'Монеты', plant: 'Растение', skin: 'Скин', legendary: 'Легендарный' };

  var html = '';

  // Инфо-бар с прогрессом
  html += '<div class="rp-info-bar">';
  html += '<div style="font-size:40px">⭐</div>';
  html += '<div class="rp-xp-wrap">';
  html += '<div class="rp-xp-label">Уровень ' + curLevel + ' · ' + lv.xp + ' / ' + lv.xpNext + ' XP</div>';
  html += '<div class="rp-xp-bar"><div class="rp-xp-fill" style="width:' + pct + '%"></div></div>';
  html += '</div>';
  html += '<div style="text-align:right;color:rgba(255,255,255,0.6);font-size:12px">Побед: ' + (currentUser.wins || 0) + '</div>';
  html += '</div>';

  // Легенда
  html += '<div class="rp-legend">';
  html += '<div class="rp-legend-item"><div class="rp-legend-dot" style="background:#4CAF50"></div>Получено</div>';
  html += '<div class="rp-legend-item"><div class="rp-legend-dot" style="background:#FFD700"></div>Доступно сейчас</div>';
  html += '<div class="rp-legend-item"><div class="rp-legend-dot" style="background:rgba(255,255,255,0.2)"></div>Недоступно</div>';
  html += '</div>';

  // Трек наград
  html += '<div class="rp-track">';

  // Начальный узел
  html += '<div class="rp-node rp-claimed">';
  html += '<div class="rp-node-level">1</div>';
  html += '<div class="rp-node-emoji">🎮</div>';
  html += '<div class="rp-node-info"><div class="rp-node-title">Начало пути к славе</div><div class="rp-node-sub">Добро пожаловать в игру!</div></div>';
  html += '<div class="rp-node-status rp-status-claimed">✅ Получено</div>';
  html += '</div>';

  ALL_LEVEL_REWARDS.forEach(function(r, idx) {
    // isClaimed = уровень уже пройден (награда должна быть выдана)
    var isClaimed = curLevel > r.level;
    // isCurrent = награда доступна прямо сейчас (уровень достигнут)
    var isCurrent = curLevel >= r.level && !isClaimed;
    // isLocked = уровень ещё не достигнут
    var isLocked = curLevel < r.level;

    // Коннектор
    html += '<div class="rp-connector' + (isClaimed ? ' done' : '') + '"></div>';

    var nodeClass = isClaimed ? 'rp-claimed' : (isCurrent ? 'rp-current' : 'rp-locked');
    var color = typeColors[r.type] || '#fff';
    var typeLabel = typeLabels[r.type] || r.type;

    html += '<div class="rp-node ' + nodeClass + '">';
    html += '<div class="rp-node-level" style="' + (isClaimed ? 'background:rgba(76,175,80,0.3);color:#81C784' : isCurrent ? 'background:rgba(255,215,0,0.3);color:#FFD700' : '') + '">' + r.level + '</div>';
    html += '<div class="rp-node-emoji">' + r.emoji + '</div>';
    html += '<div class="rp-node-info">';
    html += '<div class="rp-node-title">' + r.label + '</div>';
    html += '<div class="rp-node-sub" style="color:' + color + '">' + typeLabel + ' · Уровень ' + r.level + '</div>';
    html += '</div>';
    if (isClaimed) {
      html += '<div class="rp-node-status rp-status-claimed">✅ Получено</div>';
    } else if (isCurrent) {
      html += '<div class="rp-node-status rp-status-current">🎁 Выдано!</div>';
    } else {
      html += '<div class="rp-node-status rp-status-locked">🔒 Ур. ' + r.level + '</div>';
    }
    html += '</div>';
  });

  html += '</div>'; // rp-track
  document.getElementById('rewards-path-content').innerHTML = html;
}

// ===== BOT GAME =====
var botRole = 'plant';
var botDiff = 'easy';

function showBotMenu() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  document.getElementById('modal-bot').style.display = 'flex';
}

function selectBotRole(role, btn) {
  botRole = role;
  document.getElementById('bot-role-plant').className = 'btn btn-secondary';
  document.getElementById('bot-role-zombie').className = 'btn btn-secondary';
  btn.className = 'btn btn-success';
}

function selectBotDiff(diff, btn) {
  botDiff = diff;
  document.getElementById('bot-diff-easy').className = 'btn btn-secondary';
  document.getElementById('bot-diff-medium').className = 'btn btn-secondary';
  document.getElementById('bot-diff-hard').className = 'btn btn-secondary';
  btn.className = 'btn btn-success';
}

function startBotGame() {
  if (!currentUser) return;
  document.getElementById('modal-bot').style.display = 'none';
  socket.emit('start_bot_game', { userId: currentUser.id, username: currentUser.username, role: botRole, difficulty: botDiff });
}

// ===== SHOP TIMER =====
socket.on('shop_timer', function(data) {
  var el = document.getElementById('shop-timer-display');
  if (!el) return;
  var left = Math.max(0, data.timeLeft);
  var mins = Math.floor(left / 60000);
  var secs = Math.floor((left % 60000) / 1000);
  el.textContent = '🔄 Ротация магазина через: ' + mins + ':' + (secs < 10 ? '0' : '') + secs;
  if (el.textContent.includes('0:00')) el.textContent = '🔄 Магазин обновляется...';
});

// ===== TUTORIAL BOT GAME =====
function startTutorialBotGame() {
  if (!currentUser) { showToast('Войдите в аккаунт', 'error'); return; }
  // Закрываем туториал
  var overlay = document.getElementById('tutorial-overlay');
  if (overlay) overlay.style.display = 'none';
  // Запускаем матч против лёгкого бота за растения
  showToast('🤖 Запускаем тестовый матч...', 'success');
  setTimeout(function() {
    socket.emit('start_bot_game', {
      userId: currentUser.id,
      username: currentUser.username,
      role: 'plant',
      difficulty: 'easy'
    });
  }, 500);
}

// Закрытие по клику на фон
document.getElementById && document.addEventListener('DOMContentLoaded', function() {
  var overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.addEventListener('click', function(e) {
      if (e.target === overlay) {
        overlay.style.display = 'none';
      }
    });
  }
});
