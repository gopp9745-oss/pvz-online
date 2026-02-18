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

function showAdminTab(tabId, btn) {
  document.querySelectorAll('.admin-tab').forEach(function(t) {
    t.style.display = 'none';
  });
  document.querySelectorAll('.admin-nav-btn').forEach(function(b) {
    b.classList.remove('active');
  });
  document.getElementById(tabId).style.display = 'block';
  btn.classList.add('active');
}

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
  if (!promos.length) {
    document.getElementById('promos-table-container').innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎁</div><p>Нет промокодов. Создайте первый!</p></div>';
    return;
  }
  var html = '<table class="data-table"><thead><tr><th>Код</th><th>Награда</th><th>Использований</th><th>Макс.</th><th>Статус</th><th>Действия</th></tr></thead><tbody>';
  promos.forEach(function(p) {
    html += '<tr>';
    html += '<td><strong>' + p.code + '</strong></td>';
    html += '<td>🪙 ' + p.reward + '</td>';
    html += '<td>' + (p.usedCount || 0) + '</td>';
    html += '<td>' + (p.maxUses || '∞') + '</td>';
    html += '<td><span class="badge ' + (p.active ? 'badge-active' : 'badge-inactive') + '">' + (p.active ? '✅ Активен' : '❌ Неактивен') + '</span></td>';
    html += '<td><div class="action-btns">';
    html += '<button class="btn btn-warning btn-sm" onclick="togglePromo(\'' + p.id + '\')">' + (p.active ? '⏸️ Деактивировать' : '▶️ Активировать') + '</button>';
    html += '<button class="btn btn-danger btn-sm" onclick="deletePromo(\'' + p.id + '\')">🗑️ Удалить</button>';
    html += '</div></td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('promos-table-container').innerHTML = html;
}

function renderShopItems() {
  var items = adminData.shopItems || [];
  var html = '<table class="data-table"><thead><tr><th>Товар</th><th>Тип</th><th>Цена</th></tr></thead><tbody>';
  items.forEach(function(item) {
    html += '<tr><td>' + item.emoji + ' ' + item.name + '</td><td>' + item.type + '</td><td>🪙 ' + item.price + '</td></tr>';
  });
  html += '</tbody></table>';
  document.getElementById('shop-table-container').innerHTML = html;
}

function updateStats() {
  var users = adminData.users || [];
  var promos = adminData.promoCodes || [];
  document.getElementById('stat-users').textContent = users.length;
  document.getElementById('stat-promos').textContent = promos.length;
  document.getElementById('stat-total-wins').textContent = users.reduce(function(s, u) { return s + (u.wins || 0); }, 0);
  document.getElementById('stat-total-coins').textContent = users.reduce(function(s, u) { return s + (u.coins || 0); }, 0);

  var top = users.slice().sort(function(a, b) { return b.wins - a.wins; }).slice(0, 5);
  var html = '';
  top.forEach(function(u, i) {
    var rank = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1) + '.';
    html += '<div class="top-player-item"><div class="top-player-rank">' + rank + '</div><div class="top-player-name">' + u.username + (u.isAdmin ? ' 👑' : '') + '</div><div class="top-player-stats">🏆 ' + u.wins + ' | 🪙 ' + u.coins + '</div></div>';
  });
  document.getElementById('top-players-list').innerHTML = html || '<p style="color:#aaa;padding:20px">Нет данных</p>';
}

function createPromo() {
  var code = document.getElementById('new-promo-code').value.trim().toUpperCase();
  var reward = parseInt(document.getElementById('new-promo-reward').value) || 100;
  var maxUses = parseInt(document.getElementById('new-promo-maxuses').value) || 0;
  var res = document.getElementById('promo-create-result');

  if (!code) {
    res.style.display = 'block';
    res.className = 'error-msg';
    res.textContent = 'Введите код промокода';
    return;
  }

  socket.emit('admin_create_promo', { userId: currentAdmin.id, code: code, reward: reward, maxUses: maxUses });
}

socket.on('admin_promo_result', function(d) {
  var res = document.getElementById('promo-create-result');
  res.style.display = 'block';
  res.className = d.success ? 'success-msg' : 'error-msg';
  res.textContent = d.message;
  if (d.success) {
    document.getElementById('new-promo-code').value = '';
    loadAdminData();
  }
  setTimeout(function() { res.style.display = 'none'; }, 4000);
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
