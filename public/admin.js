 var socket = io();
var currentAdmin = null;
var adminData = { users: [], promoCodes: [], shopItems: [] };
var coinTargetId = null;

function showToast(msg, type) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.style.display = 'block';
  t.className = 'toast ' + (type || 'success');
  setTimeout(function() { t.style.display = 'none'; }, 3000);
}

window.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('pvz_user');
  if (!saved) { window.location.href = '/'; return; }
  try {
    currentAdmin = JSON.parse(saved);
    if (!currentAdmin.isAdmin) {
      alert('Нет доступа! Вы не являетесь администратором.');
      window.location.href = '/';
      return;
    }
    document.getElementById('admin-user-info').textContent = '👑 ' + currentAdmin.username;
    loadAdminData();
  } catch(e) { window.location.href = '/'; }
});

function loadAdminData() {
  if (!currentAdmin) return;
  socket.emit('admin_get_data', { userId: currentAdmin.id });
}

socket.on('admin_data', function(d) {
  if (!d.success) { alert(d.message); window.location.href = '/'; return; }
  adminData = d;
  renderUsers();
  renderPromos();
  renderShopItems();
  renderModerators();
  updateStats();
});


function renderUsers() {
  var users = adminData.users || [];
  if (!users.length) {
    document.getElementById('users-table-container').innerHTML = '<div class="empty-state"><div class="empty-state-icon">👥</div><p>Нет пользователей</p></div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Игрок</th><th>Роль</th><th>Монеты</th><th>Победы</th><th>Поражения</th><th>Действия</th></tr></thead><tbody>';
  users.forEach(function(u) {
    html += '<tr>';
    html += '<td>' + u.username + '</td>';
    html += '<td><span class="badge ' + (u.isAdmin ? 'badge-admin' : 'badge-user') + '">' + (u.isAdmin ? '👑 Админ' : '👤 Игрок') + '</span></td>';
    html += '<td>🪙 ' + u.coins + '</td>';
    html += '<td>🏆 ' + u.wins + '</td>';
    html += '<td>💀 ' + u.losses + '</td>';
    html += '<td><div class="action-btns">';
    html += '<button class="btn btn-warning btn-sm" onclick="openGiveCoins(\'' + u.id + '\',\'' + u.username + '\')">🪙 Монеты</button>';
    if (!u.isAdmin) {
      html += '<button class="btn btn-purple btn-sm" onclick="setAdmin(\'' + u.id + '\',true)">👑 Сделать админом</button>';
    } else if (u.id !== currentAdmin.id) {
      html += '<button class="btn btn-secondary btn-sm" onclick="setAdmin(\'' + u.id + '\',false)">❌ Снять права</button>';
    }
    if (u.id !== currentAdmin.id) {
      html += '<button class="btn btn-danger btn-sm" onclick="deleteUser(\'' + u.id + '\',\'' + u.username + '\')">🗑️ Удалить</button>';
    }
    html += '</div></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('users-table-container').innerHTML = html;
}

function filterUsers() {
  var q = document.getElementById('user-search').value.toLowerCase();
  var rows = document.querySelectorAll('#users-table-container tbody tr');
  rows.forEach(function(r) {
    r.style.display = r.cells[0].textContent.toLowerCase().includes(q) ? '' : 'none';
  });
}

function renderPromos() {
  var promos = adminData.promoCodes || [];
  var el = document.getElementById('promos-list');
  if (!el) return;
  if (!promos.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F381;</div><p>No promo codes. Create the first one!</p></div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Code</th><th>Reward</th><th>Used</th><th>Max</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  promos.forEach(function(p) {
    var rewardStr = '';
    if (p.rewards && p.rewards.length) {
      rewardStr = p.rewards.map(function(r) {
        if (r.type === 'coins') return '&#x1FA99; ' + r.amount;
        if (r.type === 'crystals') return '&#x1F48E; ' + r.amount;
        if (r.type === 'box') return '&#x1F4E6; ' + r.boxType;
        return '?';
      }).join(' + ');
    } else {
      rewardStr = '&#x1FA99; ' + (p.reward || 0);
    }
    html += '<tr>';
    html += '<td><strong>' + p.code + '</strong></td>';
    html += '<td>' + rewardStr + '</td>';
    html += '<td>' + (p.usedCount || 0) + '</td>';
    html += '<td>' + (p.maxUses || '&#x221E;') + '</td>';
    html += '<td><span class="badge ' + (p.active ? 'badge-active' : 'badge-inactive') + '">' + (p.active ? '&#x2705; Active' : '&#x274C; Inactive') + '</span></td>';
    html += '<td><div class="action-btns">';
    html += '<button class="btn btn-warning btn-sm" onclick="togglePromo(\'' + p.id + '\')">' + (p.active ? 'Pause' : 'Resume') + '</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deletePromo(\'' + p.id + '\')">&#x1F5D1; Delete</button>';
    html += '</div></td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function renderShopItems() {
  var items = adminData.shopItems || [];
  var el = document.getElementById('shop-items-list');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">&#x1F6D2;</div><p>No shop items</p></div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Item</th><th>Type</th><th>Rarity</th><th>Price</th></tr></thead><tbody>';
  items.forEach(function(item) {
    html += '<tr><td>' + (item.emoji || '') + ' ' + item.name + '</td><td>' + item.type + '</td><td>' + (item.rarity || 'common') + '</td><td>&#x1FA99; ' + item.price + '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function updateStats() {
  // Stats elements may not exist in current HTML - skip gracefully
  var users = adminData.users || [];
  var promos = adminData.promoCodes || [];
  var setEl = function(id, val) { var e = document.getElementById(id); if (e) e.textContent = val; };
  setEl('stat-users', users.length);
  setEl('stat-promos', promos.length);
  setEl('stat-total-wins', users.reduce(function(s, u) { return s + (u.wins || 0); }, 0));
  setEl('stat-total-coins', users.reduce(function(s, u) { return s + (u.coins || 0); }, 0));
  var topEl = document.getElementById('top-players-list');
  if (topEl) {
    var top = users.slice().sort(function(a, b) { return b.wins - a.wins; }).slice(0, 5);
    var html = '';
    top.forEach(function(u, i) {
      var rank = i === 0 ? '&#x1F947;' : i === 1 ? '&#x1F948;' : i === 2 ? '&#x1F949;' : (i + 1) + '.';
      html += '<div class="top-player-item"><div class="top-player-rank">' + rank + '</div><div class="top-player-name">' + u.username + (u.isAdmin ? ' &#x1F451;' : '') + '</div><div class="top-player-stats">&#x1F3C6; ' + u.wins + ' | &#x1FA99; ' + u.coins + '</div></div>';
    });
    topEl.innerHTML = html || '<p style="color:#aaa;padding:20px">No data</p>';
  }
}

function createPromo() {
  var code = document.getElementById('promo-code').value.trim().toUpperCase();
  var reward = parseInt(document.getElementById('promo-reward').value) || 100;
  var maxUses = parseInt(document.getElementById('promo-uses').value) || 0;
  if (!code) { showToast('Enter promo code!', 'error'); return; }
  socket.emit('admin_create_promo', { userId: currentAdmin.id, code: code, reward: reward, maxUses: maxUses });
}

socket.on('admin_promo_result_legacy', function(d) {
  // legacy handler - replaced by new one below
});

socket.on('admin_action_result', function(d) {
  showToast(d.message, d.success ? 'success' : 'error');
  if (d.success) {
    loadAdminData();
    closeModal('modal-coins');
  }
});

function setAdmin(targetId, value) {
  if (!confirm(value ? 'Назначить администратором?' : 'Снять права администратора?')) return;
  socket.emit('admin_set_admin', { userId: currentAdmin.id, targetId: targetId, value: value });
}

function deleteUser(targetId, username) {
  if (!confirm('Удалить пользователя ' + username + '? Это действие необратимо!')) return;
  socket.emit('admin_delete_user', { userId: currentAdmin.id, targetId: targetId });
}

function togglePromo(promoId) {
  socket.emit('admin_toggle_promo', { userId: currentAdmin.id, promoId: promoId });
}

function deletePromo(promoId) {
  if (!confirm('Удалить промокод?')) return;
  socket.emit('admin_delete_promo', { userId: currentAdmin.id, promoId: promoId });
}

function openGiveCoins(targetId, username) {
  coinTargetId = targetId;
  document.getElementById('modal-coins-username').textContent = username;
  document.getElementById('modal-coins').style.display = 'flex';
}

function confirmGiveCoins() {
  var amount = parseInt(document.getElementById('modal-coins-amount').value) || 0;
  if (amount <= 0) { showToast('Введите положительную сумму', 'error'); return; }
  socket.emit('admin_give_coins', { userId: currentAdmin.id, targetId: coinTargetId, amount: amount });
}

function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

// ===== MODERATOR FUNCTIONS =====

function renderModerators() {
  var list = document.getElementById('mods-list');
  if (!list) return;
  var mods = (adminData.users || []).filter(function(u) { return u.isModerator && !u.isAdmin; });
  if (!mods.length) {
    list.innerHTML = '<div style="color:#aaa;text-align:center;padding:20px;">No active moderators</div>';
    return;
  }
  list.innerHTML = '';
  mods.forEach(function(u) {
    var left = u.moderatorExpires ? Math.max(0, u.moderatorExpires - Date.now()) : 0;
    var h = Math.floor(left / 3600000);
    var m = Math.floor((left % 3600000) / 60000);
    var perms = (u.moderatorPerms || []).join(', ') || 'none';
    var expired = left <= 0;
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.05);border-radius:10px;padding:12px 16px;margin-bottom:8px;border:1px solid ' + (expired ? '#f44336' : '#FF9800') + ';';
    row.innerHTML =
      '<span style="font-size:20px;">&#x1F6E1;</span>' +
      '<div style="flex:1">' +
        '<div style="font-weight:700;color:#fff;">' + u.username + '</div>' +
        '<div style="font-size:12px;color:#aaa;">Perms: ' + perms + '</div>' +
        '<div style="font-size:12px;color:' + (expired ? '#f44336' : '#FF9800') + ';">' +
          (expired ? '&#x26D4; Expired' : '&#x23F0; ' + h + 'h ' + m + 'm left') +
        '</div>' +
      '</div>' +
      '<button class="btn btn-danger btn-sm" onclick="revokeModerator(\'' + u.id + '\', \'' + u.username + '\')">&#x274C; Revoke</button>';
    list.appendChild(row);
  });

  // Fill user select
  var sel = document.getElementById('mod-target');
  if (sel) {
    sel.innerHTML = '<option value="">Select user...</option>';
    (adminData.users || []).filter(function(u) { return !u.isAdmin && !u.isModerator; }).forEach(function(u) {
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.username + ' (' + u.wins + ' wins)';
      sel.appendChild(opt);
    });
  }
}

function createModerator() {
  var targetId = document.getElementById('mod-target').value;
  var hours = parseInt(document.getElementById('mod-hours').value) || 24;
  if (!targetId) { showToast('Select a user!', 'error'); return; }

  var perms = [];
  if (document.getElementById('perm-view_users').checked) perms.push('view_users');
  if (document.getElementById('perm-give_coins').checked) perms.push('give_coins');
  if (document.getElementById('perm-create_promo').checked) perms.push('create_promo');
  if (document.getElementById('perm-view_promos').checked) perms.push('view_promos');

  if (!perms.length) { showToast('Select at least one permission!', 'error'); return; }

  socket.emit('admin_create_moderator', {
    userId: currentAdmin.id,
    targetId: targetId,
    hours: hours,
    perms: perms
  });
}

function revokeModerator(targetId, username) {
  if (!confirm('Revoke moderator rights from ' + username + '?')) return;
  socket.emit('admin_revoke_moderator', { userId: currentAdmin.id, targetId: targetId });
}

// ==================== GIFTS / SALES ====================
var sgRewards = [];
var pv2Rewards = [];

function showAdminTab(tabId, btn) {
  document.querySelectorAll('.admin-tab').forEach(function(t) { t.style.display = 'none'; });
  document.querySelectorAll('.admin-nav-btn').forEach(function(b) { b.classList.remove('active'); });
  var tab = document.getElementById(tabId);
  if (tab) tab.style.display = 'block';
  if (btn) btn.classList.add('active');
  if (tabId === 'tab-gifts') loadGifts();
  if (tabId === 'tab-crystals') loadCrystalsTab();
}

function loadGifts() {
  socket.emit('get_shop_gifts');
}

socket.on('shop_gifts_data', function(gifts) {
  var el = document.getElementById('admin-gifts-list');
  if (!el) return;
  if (!gifts || !gifts.length) {
    el.innerHTML = '<div class="loading">No active gifts</div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Title</th><th>Rewards</th><th>Claimed</th><th>Expires</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  gifts.forEach(function(g) {
    var rewardDesc = (g.rewards || []).map(function(r) {
      if (r.type === 'coins') return '🪙' + r.amount;
      if (r.type === 'crystals') return '💎' + r.amount;
      if (r.type === 'box') return '📦' + r.boxType;
      return '?';
    }).join(' + ');
    var expires = g.expiresAt ? new Date(g.expiresAt).toLocaleString() : 'Forever';
    var status = g.active ? '<span class="badge-active">Active</span>' : '<span class="badge-inactive">Inactive</span>';
    html += '<tr>';
    html += '<td>' + g.title + '</td>';
    html += '<td>' + rewardDesc + '</td>';
    html += '<td>' + (g.claimedCount || 0) + '</td>';
    html += '<td>' + expires + '</td>';
    html += '<td>' + status + '</td>';
    html += '<td><div class="action-btns">';
    html += '<button class="btn btn-warning btn-sm" onclick="toggleShopGift(\'' + g.id + '\')">' + (g.active ? 'Pause' : 'Resume') + '</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deleteShopGift(\'' + g.id + '\')">Delete</button>';
    html += '</div></td>';
    html += '</tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
});

function updateGiftAllFields() {
  var type = document.getElementById('gift-all-type').value;
  document.getElementById('gift-all-amount-wrap').style.display = (type === 'box') ? 'none' : 'block';
  document.getElementById('gift-all-box-wrap').style.display = (type === 'box') ? 'block' : 'none';
}

function giftAll() {
  if (!currentAdmin) return;
  var type = document.getElementById('gift-all-type').value;
  var rewards = [];
  if (type === 'coins') {
    var amount = parseInt(document.getElementById('gift-all-amount').value) || 100;
    rewards = [{ type: 'coins', amount: amount }];
  } else if (type === 'crystals') {
    var amount = parseInt(document.getElementById('gift-all-amount').value) || 50;
    rewards = [{ type: 'crystals', amount: amount }];
  } else if (type === 'box') {
    var boxType = document.getElementById('gift-all-box').value;
    rewards = [{ type: 'box', boxType: boxType }];
  }
  if (!rewards.length) { showToast('Select reward type!', 'error'); return; }
  if (!confirm('Gift ' + JSON.stringify(rewards) + ' to ALL players?')) return;
  socket.emit('admin_gift_all', { userId: currentAdmin.id, rewards: rewards });
}

socket.on('admin_gift_result', function(d) {
  showToast(d.message, d.success ? 'success' : 'error');
  var els = ['gift-all-result', 'sg-result', 'crystal-result', 'pv2-result'];
  els.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && el.style.display !== 'none') {
      el.className = d.success ? 'success-msg' : 'error-msg';
      el.textContent = d.message;
      el.style.display = 'block';
    }
  });
  if (d.success) loadGifts();
});

// Shop Gift rewards builder
function addGiftReward(type) {
  var id = 'sg-r-' + Date.now();
  var html = '<div id="' + id + '" style="display:flex;gap:8px;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:8px">';
  html += '<span style="color:#aaa;font-size:13px">' + (type === 'coins' ? '🪙 Coins:' : type === 'crystals' ? '💎 Crystals:' : '📦 Box:') + '</span>';
  if (type === 'box') {
    html += '<select class="input-field" id="' + id + '-box" style="flex:1"><option value="skin_box">🎁 Skin Box</option><option value="plant_box">🌱 Plant Box</option><option value="crystal_box">💎 Crystal Box</option></select>';
  } else {
    html += '<input type="number" class="input-field" id="' + id + '-amt" value="100" min="1" style="flex:1">';
  }
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'' + id + '\').remove()">✕</button>';
  html += '</div>';
  document.getElementById('sg-rewards-list').insertAdjacentHTML('beforeend', html);
}

function createShopGift() {
  if (!currentAdmin) return;
  var title = document.getElementById('sg-title').value.trim();
  var desc = document.getElementById('sg-desc').value.trim();
  var duration = parseInt(document.getElementById('sg-duration').value) || 0;
  if (!title) { showToast('Enter a title!', 'error'); return; }

  var rewards = [];
  document.querySelectorAll('#sg-rewards-list > div').forEach(function(row) {
    var id = row.id;
    var boxSel = document.getElementById(id + '-box');
    var amtInp = document.getElementById(id + '-amt');
    if (boxSel) {
      rewards.push({ type: 'box', boxType: boxSel.value });
    } else if (amtInp) {
      var label = row.querySelector('span').textContent;
      var type = label.includes('Coins') ? 'coins' : 'crystals';
      rewards.push({ type: type, amount: parseInt(amtInp.value) || 100 });
    }
  });

  if (!rewards.length) { showToast('Add at least one reward!', 'error'); return; }

  socket.emit('admin_create_shop_gift', {
    userId: currentAdmin.id,
    title: title,
    description: desc,
    rewards: rewards,
    durationMinutes: duration > 0 ? duration : null
  });
}

function toggleShopGift(giftId) {
  socket.emit('admin_toggle_shop_gift', { userId: currentAdmin.id, giftId: giftId });
}

function deleteShopGift(giftId) {
  if (!confirm('Delete this gift?')) return;
  socket.emit('admin_delete_shop_gift', { userId: currentAdmin.id, giftId: giftId });
}

// ==================== CRYSTALS ====================
function loadCrystalsTab() {
  if (!adminData) return;
  // Заполняем select игроков
  var sel = document.getElementById('crystal-target');
  if (sel) {
    sel.innerHTML = '<option value="">Select player...</option>';
    (adminData.users || []).forEach(function(u) {
      var opt = document.createElement('option');
      opt.value = u.id;
      opt.textContent = u.username + ' (💎' + (u.crystals || 0) + ')';
      sel.appendChild(opt);
    });
  }
  // Таблица кристаллов
  var tbl = document.getElementById('crystals-table');
  if (tbl) {
    var sorted = (adminData.users || []).slice().sort(function(a, b) { return (b.crystals || 0) - (a.crystals || 0); });
    var html = '<table class="data-table"><thead><tr><th>#</th><th>Player</th><th>💎 Crystals</th><th>🪙 Coins</th><th>Actions</th></tr></thead><tbody>';
    sorted.forEach(function(u, i) {
      html += '<tr><td>' + (i + 1) + '</td><td>' + u.username + (u.isAdmin ? ' 👑' : '') + '</td>';
      html += '<td style="color:#64B5F6;font-weight:700">💎 ' + (u.crystals || 0) + '</td>';
      html += '<td>🪙 ' + (u.coins || 0) + '</td>';
      html += '<td><button class="btn btn-info btn-sm" onclick="quickGiveCrystals(\'' + u.id + '\',\'' + u.username + '\')">+ Crystals</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table>';
    tbl.innerHTML = html;
  }
}

function giveCrystals() {
  if (!currentAdmin) return;
  var targetId = document.getElementById('crystal-target').value;
  var amount = parseInt(document.getElementById('crystal-amount').value) || 50;
  if (!targetId) { showToast('Select a player!', 'error'); return; }
  socket.emit('admin_give_crystals', { userId: currentAdmin.id, targetId: targetId, amount: amount });
}

function quickGiveCrystals(targetId, username) {
  var amount = parseInt(prompt('Give crystals to ' + username + ':', '50'));
  if (!amount || amount <= 0) return;
  socket.emit('admin_give_crystals', { userId: currentAdmin.id, targetId: targetId, amount: amount });
}

// ==================== PROMOS V2 ====================
function addPromoReward(type) {
  var id = 'pv2-r-' + Date.now();
  var html = '<div id="' + id + '" style="display:flex;gap:8px;align-items:center;background:rgba(255,255,255,0.05);padding:8px;border-radius:8px">';
  html += '<span style="color:#aaa;font-size:13px">' + (type === 'coins' ? '🪙 Coins:' : type === 'crystals' ? '💎 Crystals:' : '📦 Box:') + '</span>';
  if (type === 'box') {
    html += '<select class="input-field" id="' + id + '-box" style="flex:1"><option value="skin_box">🎁 Skin Box</option><option value="plant_box">🌱 Plant Box</option><option value="crystal_box">💎 Crystal Box</option></select>';
  } else {
    html += '<input type="number" class="input-field" id="' + id + '-amt" value="100" min="1" style="flex:1">';
  }
  html += '<button class="btn btn-danger btn-sm" onclick="document.getElementById(\'' + id + '\').remove()">✕</button>';
  html += '</div>';
  document.getElementById('pv2-rewards-list').insertAdjacentHTML('beforeend', html);
}

function createPromoV2() {
  if (!currentAdmin) return;
  var code = document.getElementById('pv2-code').value.trim().toUpperCase();
  var maxUses = parseInt(document.getElementById('pv2-uses').value) || 0;
  if (!code) { showToast('Enter a promo code!', 'error'); return; }

  var rewards = [];
  document.querySelectorAll('#pv2-rewards-list > div').forEach(function(row) {
    var id = row.id;
    var boxSel = document.getElementById(id + '-box');
    var amtInp = document.getElementById(id + '-amt');
    if (boxSel) {
      rewards.push({ type: 'box', boxType: boxSel.value });
    } else if (amtInp) {
      var label = row.querySelector('span').textContent;
      var type = label.includes('Coins') ? 'coins' : 'crystals';
      rewards.push({ type: type, amount: parseInt(amtInp.value) || 100 });
    }
  });

  if (!rewards.length) { showToast('Add at least one reward!', 'error'); return; }

  socket.emit('admin_create_promo_v2', {
    userId: currentAdmin.id,
    code: code,
    rewards: rewards,
    maxUses: maxUses > 0 ? maxUses : null
  });
}

socket.on('admin_promo_result', function(d) {
  showToast(d.message, d.success ? 'success' : 'error');
  var el = document.getElementById('pv2-result');
  if (el) {
    el.className = d.success ? 'success-msg' : 'error-msg';
    el.textContent = d.message;
    el.style.display = 'block';
  }
  if (d.success) loadAdminData();
});
