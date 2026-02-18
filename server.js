const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(__dirname, 'db.json');

// ==================== RARITY SYSTEM ====================
const RARITIES = {
  common:    { label: 'Обычная',    color: '#9E9E9E', emoji: '⚪', multiplier: 1.0 },
  rare:      { label: 'Редкая',     color: '#2196F3', emoji: '🔵', multiplier: 1.5 },
  epic:      { label: 'Эпическая',  color: '#9C27B0', emoji: '🟣', multiplier: 2.0 },
  legendary: { label: 'Легендарная',color: '#FF9800', emoji: '🟠', multiplier: 3.0 }
};

// Все возможные товары с редкостью
const ALL_SHOP_ITEMS = [
  // Растения
  { id: 1,  name: 'Горошина-стрелок',  description: 'Базовое атакующее растение',    price: 100, type: 'plant',  emoji: '🌱', rarity: 'common',    gameKey: 'peashooter' },
  { id: 2,  name: 'Подсолнух',          description: 'Генерирует солнце быстрее',      price: 150, type: 'plant',  emoji: '🌻', rarity: 'common',    gameKey: 'sunflower' },
  { id: 3,  name: 'Орех-стена',         description: 'Прочная защитная стена',         price: 120, type: 'plant',  emoji: '🥜', rarity: 'common',    gameKey: 'wallnut' },
  { id: 4,  name: 'Вишнёвая бомба',     description: 'Мощный взрыв по области',        price: 300, type: 'plant',  emoji: '🍒', rarity: 'rare',      gameKey: 'cherrybomb' },
  { id: 5,  name: 'Снежный горох',      description: 'Замораживает зомби',             price: 250, type: 'plant',  emoji: '❄️', rarity: 'rare',      gameKey: 'snowpea' },
  { id: 6,  name: 'Огненный цветок',    description: 'Сжигает всю линию',              price: 500, type: 'plant',  emoji: '🌺', rarity: 'epic',      gameKey: 'fireflower' },
  { id: 7,  name: 'Молния-кактус',      description: 'Бьёт молнией по всем зомби',     price: 800, type: 'plant',  emoji: '🌵', rarity: 'legendary', gameKey: 'cactus' },
  // Зомби
  { id: 8,  name: 'Обычный зомби',      description: 'Базовый зомби',                  price: 80,  type: 'zombie', emoji: '🧟', rarity: 'common',    gameKey: 'basic' },
  { id: 9,  name: 'Зомби-конус',        description: 'Зомби с защитой',                price: 120, type: 'zombie', emoji: '🧟‍♂️', rarity: 'common',  gameKey: 'cone' },
  { id: 10, name: 'Зомби-ведро',        description: 'Очень прочный зомби',            price: 200, type: 'zombie', emoji: '🪣', rarity: 'rare',      gameKey: 'bucket' },
  { id: 11, name: 'Зомби-футболист',    description: 'Очень быстрый зомби',            price: 280, type: 'zombie', emoji: '🏈', rarity: 'rare',      gameKey: 'football' },
  { id: 12, name: 'Зомби-рыцарь',       description: 'Бронированный зомби',            price: 450, type: 'zombie', emoji: '⚔️', rarity: 'epic',      gameKey: 'knight' },
  { id: 13, name: 'Зомби-гигант',       description: 'Огромный и мощный зомби',        price: 700, type: 'zombie', emoji: '👹', rarity: 'legendary', gameKey: 'giant' },
  // Скины для растений
  { id: 14, name: 'Скин "Золотая горошина"',    description: 'Золотой скин горошины',         price: 300,  type: 'skin', emoji: '⭐', rarity: 'rare',      gameKey: 'skin_peashooter_gold',      skinTarget: 'peashooter', skinEmoji: '🌟' },
  { id: 15, name: 'Скин "Радужный подсолнух"',  description: 'Радужный скин подсолнуха',      price: 500,  type: 'skin', emoji: '🌈', rarity: 'epic',      gameKey: 'skin_sunflower_rainbow',    skinTarget: 'sunflower',  skinEmoji: '🌸' },
  { id: 16, name: 'Скин "Алмазный орех"',       description: 'Легендарный алмазный скин',     price: 1000, type: 'skin', emoji: '💎', rarity: 'legendary', gameKey: 'skin_wallnut_diamond',      skinTarget: 'wallnut',    skinEmoji: '💠' },
  { id: 17, name: 'Скин "Огненная вишня"',      description: 'Огненный скин вишни-бомбы',    price: 400,  type: 'skin', emoji: '🔥', rarity: 'rare',      gameKey: 'skin_cherrybomb_fire',      skinTarget: 'cherrybomb', skinEmoji: '💥' },
  { id: 18, name: 'Скин "Ледяной горох"',       description: 'Ледяной скин снежного гороха',  price: 350,  type: 'skin', emoji: '❄️', rarity: 'rare',      gameKey: 'skin_snowpea_ice',          skinTarget: 'snowpea',    skinEmoji: '🫧' },
  { id: 19, name: 'Скин "Дракон-кактус"',       description: 'Легендарный скин кактуса',      price: 900,  type: 'skin', emoji: '🐉', rarity: 'legendary', gameKey: 'skin_cactus_dragon',        skinTarget: 'cactus',     skinEmoji: '🐲' },
  { id: 20, name: 'Скин "Тёмный огонь"',        description: 'Тёмный скин огненного цветка',  price: 600,  type: 'skin', emoji: '🖤', rarity: 'epic',      gameKey: 'skin_fireflower_dark',      skinTarget: 'fireflower', skinEmoji: '🌑' },
  { id: 29, name: 'Скин "Кристальная горошина"',description: 'Кристальный скин горошины',     price: 750,  type: 'skin', emoji: '🔮', rarity: 'epic',      gameKey: 'skin_peashooter_crystal',   skinTarget: 'peashooter', skinEmoji: '💜' },
  { id: 30, name: 'Скин "Солнечный подсолнух"', description: 'Яркий солнечный скин',          price: 400,  type: 'skin', emoji: '☀️', rarity: 'rare',      gameKey: 'skin_sunflower_sun',        skinTarget: 'sunflower',  skinEmoji: '🌞' },
  { id: 31, name: 'Скин "Стальной орех"',       description: 'Металлический скин ореха',      price: 450,  type: 'skin', emoji: '🔩', rarity: 'rare',      gameKey: 'skin_wallnut_steel',        skinTarget: 'wallnut',    skinEmoji: '⚙️' },
  { id: 32, name: 'Скин "Ядерная вишня"',       description: 'Радиоактивный взрыв',           price: 1100, type: 'skin', emoji: '☢️', rarity: 'legendary', gameKey: 'skin_cherrybomb_nuclear',   skinTarget: 'cherrybomb', skinEmoji: '💚' },
  { id: 33, name: 'Скин "Плазменный кактус"',   description: 'Плазменный скин кактуса',       price: 850,  type: 'skin', emoji: '⚡', rarity: 'legendary', gameKey: 'skin_cactus_plasma',        skinTarget: 'cactus',     skinEmoji: '🟡' },
  { id: 34, name: 'Скин "Розовый горох"',       description: 'Милый розовый скин',            price: 200,  type: 'skin', emoji: '🌸', rarity: 'common',    gameKey: 'skin_peashooter_pink',      skinTarget: 'peashooter', skinEmoji: '💗' },
  // Скины для зомби
  { id: 21, name: 'Скин "Зомби-пират"',         description: 'Пиратский скин зомби',          price: 250,  type: 'skin', emoji: '🏴‍☠️', rarity: 'rare',  gameKey: 'skin_basic_pirate',         skinTarget: 'basic',      skinEmoji: '☠️' },
  { id: 22, name: 'Скин "Зомби-ниндзя"',        description: 'Скрытный ниндзя-зомби',         price: 450,  type: 'skin', emoji: '🥷', rarity: 'epic',      gameKey: 'skin_basic_ninja',          skinTarget: 'basic',      skinEmoji: '🗡️' },
  { id: 23, name: 'Скин "Зомби-робот"',          description: 'Механический зомби',            price: 800,  type: 'skin', emoji: '🤖', rarity: 'legendary', gameKey: 'skin_bucket_robot',         skinTarget: 'bucket',     skinEmoji: '⚙️' },
  { id: 24, name: 'Скин "Зомби-клоун"',          description: 'Страшный клоун-зомби',          price: 350,  type: 'skin', emoji: '🤡', rarity: 'rare',      gameKey: 'skin_cone_clown',           skinTarget: 'cone',       skinEmoji: '🎪' },
  { id: 25, name: 'Скин "Зомби-призрак"',        description: 'Призрачный скин зомби',         price: 700,  type: 'skin', emoji: '👻', rarity: 'epic',      gameKey: 'skin_football_ghost',       skinTarget: 'football',   skinEmoji: '💨' },
  { id: 26, name: 'Скин "Зомби-дракон"',         description: 'Легендарный дракон-зомби',      price: 1200, type: 'skin', emoji: '🐲', rarity: 'legendary', gameKey: 'skin_giant_dragon',         skinTarget: 'giant',      skinEmoji: '🔥' },
  { id: 27, name: 'Скин "Зомби-скелет"',         description: 'Классический скелет',           price: 200,  type: 'skin', emoji: '💀', rarity: 'common',    gameKey: 'skin_basic_skeleton',       skinTarget: 'basic',      skinEmoji: '🦴' },
  { id: 28, name: 'Скин "Зомби-вампир"',         description: 'Вампирский скин рыцаря',        price: 550,  type: 'skin', emoji: '🧛', rarity: 'epic',      gameKey: 'skin_knight_vampire',       skinTarget: 'knight',     skinEmoji: '🦇' },
  { id: 35, name: 'Скин "Зомби-астронавт"',      description: 'Космический зомби',             price: 650,  type: 'skin', emoji: '👨‍🚀', rarity: 'epic',   gameKey: 'skin_bucket_astronaut',     skinTarget: 'bucket',     skinEmoji: '🚀' },
  { id: 36, name: 'Скин "Зомби-самурай"',        description: 'Самурайский скин рыцаря',       price: 900,  type: 'skin', emoji: '⛩️', rarity: 'legendary', gameKey: 'skin_knight_samurai',       skinTarget: 'knight',     skinEmoji: '🗾' },
  { id: 37, name: 'Скин "Зомби-мумия"',          description: 'Древняя мумия',                 price: 300,  type: 'skin', emoji: '🏺', rarity: 'rare',      gameKey: 'skin_cone_mummy',           skinTarget: 'cone',       skinEmoji: '📜' },
  { id: 38, name: 'Скин "Зомби-снеговик"',       description: 'Ледяной зомби-снеговик',        price: 280,  type: 'skin', emoji: '⛄', rarity: 'rare',      gameKey: 'skin_basic_snowman',        skinTarget: 'basic',      skinEmoji: '❄️' },
  { id: 39, name: 'Скин "Зомби-демон"',          description: 'Демонический гигант',           price: 1500, type: 'skin', emoji: '😈', rarity: 'legendary', gameKey: 'skin_giant_demon',          skinTarget: 'giant',      skinEmoji: '🔴' },
  { id: 40, name: 'Скин "Зомби-зомби"',          description: 'Двойной зомби-скин',            price: 150,  type: 'skin', emoji: '🧟‍♀️', rarity: 'common', gameKey: 'skin_basic_zombie2',        skinTarget: 'basic',      skinEmoji: '🩸' },
];

// Ротация магазина - текущие товары
let currentShopRotation = [];
let lastShopRotation = 0;

function getShopRotation() {
  const now = Date.now();
  if (now - lastShopRotation > 5 * 60 * 1000 || currentShopRotation.length === 0) {
    rotateShop();
  }
  return currentShopRotation;
}

function rotateShop() {
  // Выбираем товары по редкости: 4 common, 3 rare, 2 epic, 1 legendary
  const byRarity = { common: [], rare: [], epic: [], legendary: [] };
  for (const item of ALL_SHOP_ITEMS) {
    byRarity[item.rarity].push(item);
  }
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);
  currentShopRotation = [
    ...shuffle(byRarity.common).slice(0, 4),
    ...shuffle(byRarity.rare).slice(0, 3),
    ...shuffle(byRarity.epic).slice(0, 2),
    ...shuffle(byRarity.legendary).slice(0, 1)
  ];
  lastShopRotation = Date.now();
  console.log('🔄 Магазин обновлён:', currentShopRotation.map(i => i.name).join(', '));
}

// Инициализация ротации
rotateShop();
setInterval(rotateShop, 5 * 60 * 1000);

// ==================== DATABASE ====================
function loadDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initial = {
      users: [],
      promoCodes: [],
      customShopItems: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!data.customShopItems) data.customShopItems = [];
  if (!data.shopGifts) data.shopGifts = [];
  // Миграция: добавляем crystals пользователям
  if (data.users) {
    data.users.forEach(u => { if (u.crystals === undefined) u.crystals = 0; });
  }
  return data;
}

function saveDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

let db = loadDB();

// ==================== GAME STATE ====================
const waitingPlayers = [];
const activeGames = {};

// ==================== MIDDLEWARE ====================
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Bypass tunnel confirmation pages (localtunnel + ngrok)
app.use((req, res, next) => {
  res.setHeader('bypass-tunnel-reminder', 'true');
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});

// ==================== SOCKET.IO ====================
io.on('connection', (socket) => {
  console.log('Подключился:', socket.id);

  // --- AUTH ---
  socket.on('register', (data) => {
    const { username, password } = data;
    db = loadDB();

    if (!username || !password) {
      return socket.emit('register_result', { success: false, message: 'Заполните все поля' });
    }
    if (username.length < 3) {
      return socket.emit('register_result', { success: false, message: 'Имя минимум 3 символа' });
    }
    if (password.length < 4) {
      return socket.emit('register_result', { success: false, message: 'Пароль минимум 4 символа' });
    }

    const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (exists) {
      return socket.emit('register_result', { success: false, message: 'Пользователь уже существует' });
    }

    const hash = bcrypt.hashSync(password, 10);
    const newUser = {
      id: uuidv4(),
      username,
      password: hash,
      coins: 100,
      wins: 0,
      losses: 0,
      isAdmin: false, // права выдаются только через админ панель
      inventory: [],
      createdAt: new Date().toISOString()
    };
    db.users.push(newUser);
    saveDB(db);

    const safeNewUser = { ...newUser };
    delete safeNewUser.password;
    socket.emit('register_result', { success: true, message: 'Регистрация успешна!', user: safeNewUser, isNew: true });
  });

  socket.on('login', (data) => {
    const { username, password } = data;
    db = loadDB();

    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) {
      return socket.emit('login_result', { success: false, message: 'Пользователь не найден' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      return socket.emit('login_result', { success: false, message: 'Неверный пароль' });
    }

    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('login_result', { success: true, user: safeUser });
  });

  // --- LEADERBOARD ---
  socket.on('get_leaderboard', () => {
    db = loadDB();
    const sorted = db.users
      .map(u => ({ username: u.username, wins: u.wins, losses: u.losses, coins: u.coins }))
      .sort((a, b) => b.wins - a.wins || b.coins - a.coins)
      .slice(0, 20);
    socket.emit('leaderboard_data', sorted);
  });

  // --- SHOP ---
  socket.on('get_shop', () => {
    db = loadDB();
    const rotation = getShopRotation();
    // Добавляем кастомные товары от админа
    const customItems = (db.customShopItems || []).map(i => ({ ...i, isCustom: true }));
    socket.emit('shop_data', [...rotation, ...customItems]);
    // Отправляем время до следующей ротации
    const nextRotation = lastShopRotation + 5 * 60 * 1000;
    socket.emit('shop_timer', { nextRotation, timeLeft: Math.max(0, nextRotation - Date.now()) });
  });

  socket.on('buy_item', (data) => {
    const { userId, itemId } = data;
    db = loadDB();

    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('buy_result', { success: false, message: 'Пользователь не найден' });

    // Ищем во ВСЕХ товарах (не только в ротации) + кастомных
    const customItems = db.customShopItems || [];
    const allItems = [...ALL_SHOP_ITEMS, ...customItems];
    const item = allItems.find(i => i.id === itemId);
    if (!item) return socket.emit('buy_result', { success: false, message: 'Товар не найден' });

    if ((user.inventory || []).includes(itemId)) {
      return socket.emit('buy_result', { success: false, message: 'Уже куплено' });
    }

    if (user.coins < item.price) {
      return socket.emit('buy_result', { success: false, message: 'Недостаточно монет' });
    }

    user.coins -= item.price;
    if (!user.inventory) user.inventory = [];
    user.inventory.push(itemId);
    saveDB(db);

    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('buy_result', { success: true, message: `Куплено: ${item.name}`, user: safeUser });
  });

  // --- UPGRADE PLANT ---
  socket.on('upgrade_plant', (data) => {
    const { userId, gameKey, cost } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('upgrade_result', { success: false, message: 'Пользователь не найден' });

    const PLANT_MAX_LEVELS = { peashooter: 5, sunflower: 5, wallnut: 5 };
    const maxLevel = PLANT_MAX_LEVELS[gameKey] || 5;

    if (!user.plantLevels) user.plantLevels = {};
    const currentLevel = user.plantLevels[gameKey] || 1;

    if (currentLevel >= maxLevel) {
      return socket.emit('upgrade_result', { success: false, message: 'Максимальный уровень!' });
    }
    if (user.coins < cost) {
      return socket.emit('upgrade_result', { success: false, message: 'Недостаточно монет' });
    }

    user.coins -= cost;
    user.plantLevels[gameKey] = currentLevel + 1;
    saveDB(db);

    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('upgrade_result', {
      success: true,
      message: `${gameKey} прокачан до уровня ${currentLevel + 1}! 🌟`,
      user: safeUser
    });
  });

  // --- GET ALL SHOP ITEMS (для инвентаря) ---
  socket.on('get_all_items', () => {
    db = loadDB();
    const customItems = (db.customShopItems || []).map(i => ({ ...i, isCustom: true }));
    socket.emit('all_items_data', [...ALL_SHOP_ITEMS, ...customItems]);
  });

  // --- PROMO CODES ---
  socket.on('use_promo', (data) => {
    const { userId, code } = data;
    db = loadDB();

    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('promo_result', { success: false, message: 'Пользователь не найден' });

    const promo = db.promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return socket.emit('promo_result', { success: false, message: 'Промокод не найден' });

    if (!promo.active) return socket.emit('promo_result', { success: false, message: 'Промокод уже использован или деактивирован' });

    if (promo.usedBy && promo.usedBy.includes(userId)) {
      return socket.emit('promo_result', { success: false, message: 'Вы уже использовали этот промокод' });
    }

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      return socket.emit('promo_result', { success: false, message: 'Промокод исчерпан' });
    }

    user.coins += promo.reward;
    if (!promo.usedBy) promo.usedBy = [];
    promo.usedBy.push(userId);
    promo.usedCount = (promo.usedCount || 0) + 1;

    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      promo.active = false;
    }

    saveDB(db);

    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('promo_result', { success: true, message: `Получено ${promo.reward} монет!`, user: safeUser });
  });

  // --- ADMIN ---
  socket.on('admin_get_data', (data) => {
    const { userId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_data', { success: false, message: 'Нет доступа' });
    }

    const safeUsers = db.users.map(u => {
      const s = { ...u };
      delete s.password;
      return s;
    });

    socket.emit('admin_data', {
      success: true,
      users: safeUsers,
      promoCodes: db.promoCodes,
      shopItems: [...ALL_SHOP_ITEMS, ...(db.customShopItems || [])],
      customShopItems: db.customShopItems || []
    });
  });

  socket.on('admin_create_promo', (data) => {
    const { userId, code, reward, maxUses } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_promo_result', { success: false, message: 'Нет доступа' });
    }

    const exists = db.promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (exists) {
      return socket.emit('admin_promo_result', { success: false, message: 'Промокод уже существует' });
    }

    const newPromo = {
      id: uuidv4(),
      code: code.toUpperCase(),
      reward: parseInt(reward) || 100,
      maxUses: parseInt(maxUses) || null,
      usedCount: 0,
      usedBy: [],
      active: true,
      createdAt: new Date().toISOString()
    };

    db.promoCodes.push(newPromo);
    saveDB(db);

    socket.emit('admin_promo_result', { success: true, message: `Промокод ${newPromo.code} создан!`, promo: newPromo });
  });

  socket.on('admin_delete_promo', (data) => {
    const { userId, promoId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }

    db.promoCodes = db.promoCodes.filter(p => p.id !== promoId);
    saveDB(db);
    socket.emit('admin_action_result', { success: true, message: 'Промокод удалён' });
  });

  socket.on('admin_toggle_promo', (data) => {
    const { userId, promoId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }

    const promo = db.promoCodes.find(p => p.id === promoId);
    if (promo) {
      promo.active = !promo.active;
      saveDB(db);
    }
    socket.emit('admin_action_result', { success: true, message: 'Статус промокода изменён' });
  });

  socket.on('admin_set_admin', (data) => {
    const { userId, targetId, value } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }

    const target = db.users.find(u => u.id === targetId);
    if (target) {
      target.isAdmin = value;
      if (!value) {
        // Снимаем и модераторские права
        delete target.isModerator;
        delete target.moderatorExpires;
        delete target.moderatorPerms;
      }
      saveDB(db);
    }
    socket.emit('admin_action_result', { success: true, message: `Права изменены для ${target ? target.username : '?'}` });
  });

  // --- ВРЕМЕННЫЙ МОДЕРАТОР ---
  socket.on('admin_create_moderator', (data) => {
    const { userId, targetId, hours, perms } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }
    const target = db.users.find(u => u.id === targetId);
    if (!target) {
      return socket.emit('admin_action_result', { success: false, message: 'Пользователь не найден' });
    }
    if (target.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Пользователь уже является администратором' });
    }
    const durationHours = Math.min(parseInt(hours) || 24, 720); // макс 30 дней
    target.isModerator = true;
    target.moderatorExpires = Date.now() + durationHours * 60 * 60 * 1000;
    target.moderatorPerms = perms || ['view_users', 'give_coins'];
    saveDB(db);
    socket.emit('admin_action_result', { 
      success: true, 
      message: `${target.username} назначен модератором на ${durationHours}ч. Права: ${target.moderatorPerms.join(', ')}` 
    });
  });

  socket.on('admin_revoke_moderator', (data) => {
    const { userId, targetId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }
    const target = db.users.find(u => u.id === targetId);
    if (target) {
      delete target.isModerator;
      delete target.moderatorExpires;
      delete target.moderatorPerms;
      saveDB(db);
    }
    socket.emit('admin_action_result', { success: true, message: `Права модератора сняты с ${target ? target.username : '?'}` });
  });

  // --- МОДЕРАТОР: получить данные (урезанные) ---
  socket.on('mod_get_data', (data) => {
    const { userId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    
    // Проверяем права модератора
    if (!user) return socket.emit('mod_data', { success: false, message: 'Нет доступа' });
    
    // Проверяем не истёк ли срок
    if (user.isModerator && user.moderatorExpires && Date.now() > user.moderatorExpires) {
      user.isModerator = false;
      delete user.moderatorExpires;
      delete user.moderatorPerms;
      saveDB(db);
      return socket.emit('mod_data', { success: false, message: 'Срок модератора истёк' });
    }
    
    if (!user.isAdmin && !user.isModerator) {
      return socket.emit('mod_data', { success: false, message: 'Нет доступа' });
    }

    const perms = user.isAdmin ? ['all'] : (user.moderatorPerms || []);
    const safeUsers = db.users.map(u => {
      const s = { id: u.id, username: u.username, coins: u.coins, wins: u.wins, losses: u.losses, isAdmin: u.isAdmin, isModerator: u.isModerator, moderatorExpires: u.moderatorExpires };
      return s;
    });

    socket.emit('mod_data', {
      success: true,
      perms,
      users: safeUsers,
      promoCodes: perms.includes('all') || perms.includes('view_promos') ? db.promoCodes : [],
      expiresAt: user.moderatorExpires || null
    });
  });

  // --- МОДЕРАТОР: выдать монеты (если есть право) ---
  socket.on('mod_give_coins', (data) => {
    const { userId, targetId, amount } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('mod_action_result', { success: false, message: 'Нет доступа' });
    
    // Проверяем срок
    if (user.isModerator && user.moderatorExpires && Date.now() > user.moderatorExpires) {
      return socket.emit('mod_action_result', { success: false, message: 'Срок модератора истёк' });
    }
    
    const hasRight = user.isAdmin || (user.isModerator && (user.moderatorPerms || []).includes('give_coins'));
    if (!hasRight) return socket.emit('mod_action_result', { success: false, message: 'Нет права выдавать монеты' });
    
    const maxCoins = user.isAdmin ? 99999 : 500; // модератор может выдать макс 500 монет
    const coins = Math.min(parseInt(amount) || 0, maxCoins);
    
    const target = db.users.find(u => u.id === targetId);
    if (target) {
      target.coins += coins;
      saveDB(db);
    }
    socket.emit('mod_action_result', { success: true, message: `Выдано ${coins} монет игроку ${target ? target.username : '?'}` });
  });

  // --- МОДЕРАТОР: создать промокод (если есть право) ---
  socket.on('mod_create_promo', (data) => {
    const { userId, code, reward, maxUses } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('mod_action_result', { success: false, message: 'Нет доступа' });
    
    if (user.isModerator && user.moderatorExpires && Date.now() > user.moderatorExpires) {
      return socket.emit('mod_action_result', { success: false, message: 'Срок модератора истёк' });
    }
    
    const hasRight = user.isAdmin || (user.isModerator && (user.moderatorPerms || []).includes('create_promo'));
    if (!hasRight) return socket.emit('mod_action_result', { success: false, message: 'Нет права создавать промокоды' });
    
    const maxReward = user.isAdmin ? 99999 : 200; // модератор макс 200 монет в промокоде
    const exists = db.promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (exists) return socket.emit('mod_action_result', { success: false, message: 'Промокод уже существует' });
    
    const newPromo = {
      id: uuidv4(),
      code: code.toUpperCase(),
      reward: Math.min(parseInt(reward) || 100, maxReward),
      maxUses: parseInt(maxUses) || null,
      usedCount: 0,
      usedBy: [],
      active: true,
      createdBy: user.username,
      createdAt: new Date().toISOString()
    };
    db.promoCodes.push(newPromo);
    saveDB(db);
    socket.emit('mod_action_result', { success: true, message: `Промокод ${newPromo.code} создан (макс. ${maxReward} монет)!` });
  });

  socket.on('admin_give_coins', (data) => {
    const { userId, targetId, amount } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }

    const target = db.users.find(u => u.id === targetId);
    if (target) {
      target.coins += parseInt(amount) || 0;
      saveDB(db);
    }
    socket.emit('admin_action_result', { success: true, message: `Выдано ${amount} монет игроку ${target ? target.username : '?'}` });
  });

  socket.on('admin_delete_user', (data) => {
    const { userId, targetId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    }
    if (userId === targetId) {
      return socket.emit('admin_action_result', { success: false, message: 'Нельзя удалить себя' });
    }
    db.users = db.users.filter(u => u.id !== targetId);
    saveDB(db);
    socket.emit('admin_action_result', { success: true, message: 'Пользователь удалён' });
  });

  // --- ADMIN: ADD SHOP ITEM ---
  socket.on('admin_add_shop_item', (data) => {
    const { userId, name, description, price, type, emoji, rarity, gameKey } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_shop_result', { success: false, message: 'Нет доступа' });
    }
    if (!name || !price || !type || !emoji) {
      return socket.emit('admin_shop_result', { success: false, message: 'Заполните все поля' });
    }
    const validRarities = ['common', 'rare', 'epic', 'legendary'];
    const itemRarity = validRarities.includes(rarity) ? rarity : 'common';
    const newItem = {
      id: 'custom_' + uuidv4(),
      name: name.trim(),
      description: description || '',
      price: parseInt(price) || 100,
      type,
      emoji,
      rarity: itemRarity,
      gameKey: gameKey || null,
      isCustom: true,
      createdAt: new Date().toISOString()
    };
    if (!db.customShopItems) db.customShopItems = [];
    db.customShopItems.push(newItem);
    saveDB(db);
    socket.emit('admin_shop_result', { success: true, message: `Товар "${newItem.name}" добавлен в магазин!` });
  });

  socket.on('admin_delete_shop_item', (data) => {
    const { userId, itemId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_shop_result', { success: false, message: 'Нет доступа' });
    }
    db.customShopItems = (db.customShopItems || []).filter(i => i.id !== itemId);
    saveDB(db);
    socket.emit('admin_shop_result', { success: true, message: 'Товар удалён из магазина' });
  });

  // ==================== CRYSTALS ====================
  socket.on('admin_give_crystals', (data) => {
    const { userId, targetId, amount } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });
    const target = db.users.find(u => u.id === targetId);
    if (!target) return socket.emit('admin_action_result', { success: false, message: 'Игрок не найден' });
    if (!target.crystals) target.crystals = 0;
    target.crystals += parseInt(amount) || 0;
    saveDB(db);
    socket.emit('admin_action_result', { success: true, message: `Выдано ${amount} кристаллов игроку ${target.username}` });
    // Уведомляем игрока если онлайн
    for (const [sid, s] of io.sockets.sockets) {
      if (s.userId === targetId) {
        const safeTarget = { ...target }; delete safeTarget.password;
        s.emit('fresh_user_data', { success: true, user: safeTarget });
        s.emit('gift_received', { type: 'crystals', amount: parseInt(amount), message: `Вы получили ${amount} 💎 кристаллов от администратора!` });
      }
    }
  });

  // ==================== LOOT BOXES ====================
  // Ящик 1: скины (skin_box), Ящик 2: растения (plant_box), Ящик 3: кристаллы (crystal_box)
  const LOOT_BOXES = {
    skin_box:    { id: 'skin_box',    name: '🎁 Ящик скинов',     emoji: '🎁', description: 'Случайный скин любой редкости', price: 300, type: 'box', rarity: 'rare' },
    plant_box:   { id: 'plant_box',   name: '🌱 Ящик растений',   emoji: '📦', description: 'Случайное растение любой редкости', price: 250, type: 'box', rarity: 'rare' },
    crystal_box: { id: 'crystal_box', name: '💎 Ящик кристаллов', emoji: '💎', description: 'От 10 до 100 кристаллов случайно', price: 200, type: 'box', rarity: 'epic' }
  };

  socket.on('open_loot_box', (data) => {
    const { userId, boxType } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('box_result', { success: false, message: 'Пользователь не найден' });

    // Проверяем что ящик есть в инвентаре
    if (!user.inventory) user.inventory = [];
    const boxIdx = user.inventory.indexOf(boxType);
    if (boxIdx === -1) return socket.emit('box_result', { success: false, message: 'Ящик не найден в инвентаре' });

    // Убираем ящик из инвентаря
    user.inventory.splice(boxIdx, 1);

    let reward = null;
    if (boxType === 'skin_box') {
      const skins = ALL_SHOP_ITEMS.filter(i => i.type === 'skin');
      const notOwned = skins.filter(i => !user.inventory.includes(i.id));
      if (notOwned.length > 0) {
        // Взвешенный рандом по редкости
        const weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
        const pool = [];
        notOwned.forEach(i => { for (let w = 0; w < (weights[i.rarity] || 10); w++) pool.push(i); });
        const item = pool[Math.floor(Math.random() * pool.length)];
        user.inventory.push(item.id);
        reward = { type: 'skin', item, message: `🎉 Выпал скин: ${item.emoji} ${item.name} (${item.rarity})!` };
      } else {
        user.coins += 200;
        reward = { type: 'coins', amount: 200, message: '🪙 Все скины уже есть! Получено 200 монет.' };
      }
    } else if (boxType === 'plant_box') {
      const plants = ALL_SHOP_ITEMS.filter(i => i.type === 'plant');
      const notOwned = plants.filter(i => !user.inventory.includes(i.id));
      if (notOwned.length > 0) {
        const weights = { common: 50, rare: 30, epic: 15, legendary: 5 };
        const pool = [];
        notOwned.forEach(i => { for (let w = 0; w < (weights[i.rarity] || 10); w++) pool.push(i); });
        const item = pool[Math.floor(Math.random() * pool.length)];
        user.inventory.push(item.id);
        reward = { type: 'plant', item, message: `🎉 Выпало растение: ${item.emoji} ${item.name} (${item.rarity})!` };
      } else {
        user.coins += 150;
        reward = { type: 'coins', amount: 150, message: '🪙 Все растения уже есть! Получено 150 монет.' };
      }
    } else if (boxType === 'crystal_box') {
      const amount = Math.floor(Math.random() * 91) + 10; // 10-100
      if (!user.crystals) user.crystals = 0;
      user.crystals += amount;
      reward = { type: 'crystals', amount, message: `💎 Выпало ${amount} кристаллов!` };
    } else {
      return socket.emit('box_result', { success: false, message: 'Неизвестный тип ящика' });
    }

    saveDB(db);
    const safeUser = { ...user }; delete safeUser.password;
    socket.emit('box_result', { success: true, reward, user: safeUser });
  });

  // ==================== SHOP GIFTS (акции от админа) ====================
  socket.on('get_shop_gifts', () => {
    db = loadDB();
    const now = Date.now();
    // Фильтруем просроченные
    const active = (db.shopGifts || []).filter(g => g.active && (!g.expiresAt || g.expiresAt > now));
    socket.emit('shop_gifts_data', active);
  });

  socket.on('claim_shop_gift', (data) => {
    const { userId, giftId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('gift_claim_result', { success: false, message: 'Пользователь не найден' });

    const now = Date.now();
    const gift = (db.shopGifts || []).find(g => g.id === giftId);
    if (!gift) return socket.emit('gift_claim_result', { success: false, message: 'Подарок не найден' });
    if (!gift.active) return socket.emit('gift_claim_result', { success: false, message: 'Акция завершена' });
    if (gift.expiresAt && gift.expiresAt < now) {
      gift.active = false;
      saveDB(db);
      return socket.emit('gift_claim_result', { success: false, message: 'Акция истекла' });
    }
    if (!gift.claimedBy) gift.claimedBy = [];
    if (gift.claimedBy.includes(userId)) return socket.emit('gift_claim_result', { success: false, message: 'Вы уже получили этот подарок' });

    // Выдаём награды
    const rewards = gift.rewards || [];
    const messages = [];
    for (const r of rewards) {
      if (r.type === 'coins') {
        user.coins += r.amount;
        messages.push(`🪙 ${r.amount} монет`);
      } else if (r.type === 'crystals') {
        if (!user.crystals) user.crystals = 0;
        user.crystals += r.amount;
        messages.push(`💎 ${r.amount} кристаллов`);
      } else if (r.type === 'box') {
        if (!user.inventory) user.inventory = [];
        user.inventory.push(r.boxType);
        messages.push(`📦 ${LOOT_BOXES[r.boxType] ? LOOT_BOXES[r.boxType].name : r.boxType}`);
      } else if (r.type === 'item') {
        if (!user.inventory) user.inventory = [];
        if (!user.inventory.includes(r.itemId)) {
          user.inventory.push(r.itemId);
          const item = ALL_SHOP_ITEMS.find(i => i.id === r.itemId);
          messages.push(item ? `${item.emoji} ${item.name}` : `Предмет #${r.itemId}`);
        } else {
          user.coins += 100;
          messages.push('🪙 100 монет (предмет уже есть)');
        }
      }
    }

    gift.claimedBy.push(userId);
    gift.claimedCount = (gift.claimedCount || 0) + 1;
    saveDB(db);

    const safeUser = { ...user }; delete safeUser.password;
    socket.emit('gift_claim_result', { success: true, message: `🎁 Получено: ${messages.join(', ')}!`, user: safeUser });
  });

  // ADMIN: создать подарок/акцию в магазине
  socket.on('admin_create_shop_gift', (data) => {
    const { userId, title, description, rewards, durationMinutes } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_gift_result', { success: false, message: 'Нет доступа' });
    if (!title || !rewards || !rewards.length) return socket.emit('admin_gift_result', { success: false, message: 'Заполните название и награды' });

    const expiresAt = durationMinutes ? Date.now() + parseInt(durationMinutes) * 60 * 1000 : null;
    const newGift = {
      id: uuidv4(),
      title: title.trim(),
      description: description || '',
      rewards,
      active: true,
      expiresAt,
      claimedBy: [],
      claimedCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: user.username
    };
    if (!db.shopGifts) db.shopGifts = [];
    db.shopGifts.push(newGift);
    saveDB(db);

    socket.emit('admin_gift_result', { success: true, message: `Акция "${newGift.title}" создана!`, gift: newGift });
    // Уведомляем всех онлайн-игроков
    io.emit('new_shop_gift', newGift);
  });

  socket.on('admin_delete_shop_gift', (data) => {
    const { userId, giftId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_gift_result', { success: false, message: 'Нет доступа' });
    db.shopGifts = (db.shopGifts || []).filter(g => g.id !== giftId);
    saveDB(db);
    socket.emit('admin_gift_result', { success: true, message: 'Акция удалена' });
    io.emit('shop_gifts_updated');
  });

  socket.on('admin_toggle_shop_gift', (data) => {
    const { userId, giftId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_gift_result', { success: false, message: 'Нет доступа' });
    const gift = (db.shopGifts || []).find(g => g.id === giftId);
    if (gift) { gift.active = !gift.active; saveDB(db); }
    socket.emit('admin_gift_result', { success: true, message: 'Статус акции изменён' });
    io.emit('shop_gifts_updated');
  });

  // ADMIN: раздать подарок всем игрокам сразу
  socket.on('admin_gift_all', (data) => {
    const { userId, rewards } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_gift_result', { success: false, message: 'Нет доступа' });
    if (!rewards || !rewards.length) return socket.emit('admin_gift_result', { success: false, message: 'Укажите награды' });

    let count = 0;
    for (const u of db.users) {
      for (const r of rewards) {
        if (r.type === 'coins') { u.coins += r.amount; }
        else if (r.type === 'crystals') { if (!u.crystals) u.crystals = 0; u.crystals += r.amount; }
        else if (r.type === 'box') { if (!u.inventory) u.inventory = []; u.inventory.push(r.boxType); }
      }
      count++;
    }
    saveDB(db);

    const rewardDesc = rewards.map(r => r.type === 'coins' ? `🪙${r.amount}` : r.type === 'crystals' ? `💎${r.amount}` : `📦${r.boxType}`).join(', ');
    socket.emit('admin_gift_result', { success: true, message: `Подарок выдан ${count} игрокам: ${rewardDesc}` });
    // Уведомляем всех онлайн
    io.emit('gift_received', { type: 'all', message: `🎁 Администратор раздал подарки всем игрокам: ${rewardDesc}!` });
  });

  // ==================== UPDATED PROMO (multi-reward) ====================
  socket.on('admin_create_promo_v2', (data) => {
    const { userId, code, rewards, maxUses } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_promo_result', { success: false, message: 'Нет доступа' });

    const exists = db.promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (exists) return socket.emit('admin_promo_result', { success: false, message: 'Промокод уже существует' });

    // rewards = массив: [{type:'coins',amount:100},{type:'box',boxType:'skin_box'},{type:'crystals',amount:50}]
    const newPromo = {
      id: uuidv4(),
      code: code.toUpperCase(),
      reward: 0, // legacy
      rewards: rewards || [],
      maxUses: parseInt(maxUses) || null,
      usedCount: 0,
      usedBy: [],
      active: true,
      createdAt: new Date().toISOString()
    };
    // Для обратной совместимости — если есть монеты, пишем в reward
    const coinsReward = (rewards || []).find(r => r.type === 'coins');
    if (coinsReward) newPromo.reward = coinsReward.amount;

    db.promoCodes.push(newPromo);
    saveDB(db);
    socket.emit('admin_promo_result', { success: true, message: `Промокод ${newPromo.code} создан!`, promo: newPromo });
  });

  // Обновлённый use_promo с поддержкой multi-reward
  socket.on('use_promo_v2', (data) => {
    const { userId, code } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('promo_result', { success: false, message: 'Пользователь не найден' });

    const promo = db.promoCodes.find(p => p.code.toLowerCase() === code.toLowerCase());
    if (!promo) return socket.emit('promo_result', { success: false, message: 'Промокод не найден' });
    if (!promo.active) return socket.emit('promo_result', { success: false, message: 'Промокод деактивирован' });
    if (promo.usedBy && promo.usedBy.includes(userId)) return socket.emit('promo_result', { success: false, message: 'Вы уже использовали этот промокод' });
    if (promo.maxUses && promo.usedCount >= promo.maxUses) return socket.emit('promo_result', { success: false, message: 'Промокод исчерпан' });

    const messages = [];
    const rewardsList = promo.rewards && promo.rewards.length > 0 ? promo.rewards : [{ type: 'coins', amount: promo.reward || 0 }];

    for (const r of rewardsList) {
      if (r.type === 'coins') {
        user.coins += r.amount || 0;
        messages.push(`🪙 ${r.amount} монет`);
      } else if (r.type === 'crystals') {
        if (!user.crystals) user.crystals = 0;
        user.crystals += r.amount || 0;
        messages.push(`💎 ${r.amount} кристаллов`);
      } else if (r.type === 'box') {
        if (!user.inventory) user.inventory = [];
        user.inventory.push(r.boxType);
        const box = LOOT_BOXES[r.boxType];
        messages.push(box ? `${box.emoji} ${box.name}` : `📦 Ящик`);
      }
    }

    if (!promo.usedBy) promo.usedBy = [];
    promo.usedBy.push(userId);
    promo.usedCount = (promo.usedCount || 0) + 1;
    if (promo.maxUses && promo.usedCount >= promo.maxUses) promo.active = false;

    saveDB(db);
    const safeUser = { ...user }; delete safeUser.password;
    socket.emit('promo_result', { success: true, message: `Получено: ${messages.join(', ')}!`, user: safeUser });
  });

  // --- BOT GAME ---
  socket.on('start_bot_game', (data) => {
    const { userId, username, role, difficulty } = data;
    const gameId = 'bot_' + uuidv4();

    // Определяем сложность по уровню игрока если не задана явно
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    let autoDiff = difficulty;
    if (!autoDiff || autoDiff === 'auto') {
      const lv = calcLevel(user ? user.wins : 0).level;
      if (lv <= 10) autoDiff = 'easy';
      else if (lv <= 40) autoDiff = 'medium';
      else autoDiff = 'hard';
    }

    const botName = autoDiff === 'hard' ? '🤖 Бот (Сложный)' : autoDiff === 'medium' ? '🤖 Бот (Средний)' : '🤖 Бот (Лёгкий)';

    const humanPlayer = { socketId: socket.id, userId, username };
    const botPlayer = { socketId: 'bot', userId: 'bot_' + gameId, username: botName };

    let plantPlayer, zombiePlayer;
    if (role === 'plant') {
      plantPlayer = humanPlayer;
      zombiePlayer = botPlayer;
    } else {
      plantPlayer = botPlayer;
      zombiePlayer = humanPlayer;
    }

    const gameState = createGameState(gameId, plantPlayer, zombiePlayer);
    gameState.isBot = true;
    gameState.botRole = role === 'plant' ? 'zombie' : 'plant';
    gameState.botDifficulty = autoDiff;
    gameState.humanUserId = userId;
    activeGames[gameId] = gameState;

    socket.join(gameId);
    socket.emit('game_start', {
      gameId,
      role,
      opponent: botName,
      isBot: true,
      difficulty: autoDiff,
      gameState: getClientState(gameState, role)
    });
  });


  // --- CLAIM ADMIN (если нет ни одного админа) ---
  socket.on('claim_admin', (data) => {
    const { userId, secretCode } = data;
    const ADMIN_SECRET = 'PVZADMIN2024';
    db = loadDB();
    
    if (secretCode !== ADMIN_SECRET) {
      return socket.emit('claim_admin_result', { success: false, message: 'Неверный секретный код' });
    }
    
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return socket.emit('claim_admin_result', { success: false, message: 'Пользователь не найден' });
    }
    
    if (user.isAdmin) {
      return socket.emit('claim_admin_result', { success: false, message: 'Вы уже администратор' });
    }
    
    user.isAdmin = true;
    saveDB(db);
    
    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('claim_admin_result', { success: true, message: 'Вы получили права администратора!', user: safeUser });
  });

  // --- MATCHMAKING ---
  socket.on('find_game', (data) => {
    const { userId, username } = data;
    console.log(`🔍 find_game: ${username} (${userId}), queue: ${waitingPlayers.length}`);

    // Убираем из очереди если уже есть
    const idx = waitingPlayers.findIndex(p => p.userId === userId);
    if (idx !== -1) waitingPlayers.splice(idx, 1);

    waitingPlayers.push({ socketId: socket.id, userId, username });
    socket.emit('waiting_for_opponent');
    console.log(`⏳ Queue size: ${waitingPlayers.length}`);

    if (waitingPlayers.length >= 2) {
      const player1 = waitingPlayers.shift();
      const player2 = waitingPlayers.shift();

      const gameId = uuidv4();
      const gameState = createGameState(gameId, player1, player2);
      activeGames[gameId] = gameState;

      console.log(`🎮 Game started: ${gameId}, plant: ${player1.username}, zombie: ${player2.username}`);

      const p1Socket = io.sockets.sockets.get(player1.socketId);
      const p2Socket = io.sockets.sockets.get(player2.socketId);

      if (p1Socket) {
        p1Socket.join(gameId);
        p1Socket.emit('game_start', {
          gameId,
          role: 'plant',
          opponent: player2.username,
          gameState: getClientState(gameState, 'plant')
        });
        console.log(`✅ Sent game_start to plant: ${player1.username}`);
      } else {
        console.log(`❌ p1Socket not found for ${player1.username}`);
      }
      if (p2Socket) {
        p2Socket.join(gameId);
        p2Socket.emit('game_start', {
          gameId,
          role: 'zombie',
          opponent: player1.username,
          gameState: getClientState(gameState, 'zombie')
        });
        console.log(`✅ Sent game_start to zombie: ${player2.username}`);
      } else {
        console.log(`❌ p2Socket not found for ${player2.username}`);
      }
    }
  });

  socket.on('cancel_search', (data) => {
    const { userId } = data;
    const idx = waitingPlayers.findIndex(p => p.userId === userId);
    if (idx !== -1) waitingPlayers.splice(idx, 1);
    socket.emit('search_cancelled');
  });

  // --- GAME ACTIONS ---
  socket.on('place_plant', (data) => {
    const { gameId, userId, plantType, col, row } = data;
    const game = activeGames[gameId];
    if (!game) {
      return socket.emit('action_error', { message: 'Игра не найдена' });
    }
    if (game.phase !== 'playing') {
      return socket.emit('action_error', { message: 'Игра не активна' });
    }
    if (game.plantPlayer.userId !== userId) {
      return socket.emit('action_error', { message: 'Вы играете за зомби!' });
    }

    const cost = getPlantCost(plantType);
    if (game.plantSun < cost) {
      return socket.emit('action_error', { message: 'Недостаточно солнца! Нужно ' + cost });
    }

    const cellKey = `${col}_${row}`;
    if (game.grid[cellKey]) {
      return socket.emit('action_error', { message: 'Клетка занята!' });
    }

    game.plantSun -= cost;
    const hp = getPlantHP(plantType);
    game.grid[cellKey] = { type: plantType, hp: hp, maxHp: hp, col: parseInt(col), row: parseInt(row) };

    io.to(gameId).emit('game_update', getFullGameState(game));
  });

  socket.on('send_zombie', (data) => {
    const { gameId, userId, zombieType, lane } = data;
    const game = activeGames[gameId];
    if (!game) return socket.emit('action_error', { message: 'Игра не найдена' });
    if (game.phase !== 'playing') return;

    // Проверяем что этот игрок - зомби
    if (game.zombiePlayer.userId !== userId) {
      return socket.emit('action_error', { message: 'Вы играете за растения, а не за зомби!' });
    }

    const cost = getZombieCost(zombieType);
    if (game.zombieBrains < cost) {
      return socket.emit('action_error', { message: `Недостаточно мозгов! Нужно ${cost}` });
    }

    game.zombieBrains -= cost;
    const zombie = {
      id: uuidv4(),
      type: zombieType,
      hp: getZombieHP(zombieType),
      maxHp: getZombieHP(zombieType),
      lane: parseInt(lane),
      col: 8.5,
      speed: getZombieSpeed(zombieType)
    };
    game.zombies.push(zombie);

    io.to(gameId).emit('game_update', getFullGameState(game));
  });

  socket.on('disconnect', () => {
    console.log('Отключился:', socket.id);

    // Убираем из очереди
    const idx = waitingPlayers.findIndex(p => p.socketId === socket.id);
    if (idx !== -1) waitingPlayers.splice(idx, 1);

    // Проверяем активные игры - даём 15 секунд на переподключение
    for (const gameId in activeGames) {
      const game = activeGames[gameId];
      if (game.plantPlayer.socketId === socket.id || game.zombiePlayer.socketId === socket.id) {
        if (game.phase === 'playing') {
          console.log(`⏳ Player disconnected from game ${gameId}, waiting 15s for reconnect...`);
          // Помечаем время отключения
          if (game.plantPlayer.socketId === socket.id) {
            game.plantPlayer.disconnectedAt = Date.now();
          } else {
            game.zombiePlayer.disconnectedAt = Date.now();
          }
          // Даём 15 секунд на переподключение
          setTimeout(() => {
            const g = activeGames[gameId];
            if (!g || g.phase !== 'playing') return;
            // Проверяем что игрок не переподключился
            if (g.plantPlayer.disconnectedAt && Date.now() - g.plantPlayer.disconnectedAt >= 14000) {
              console.log(`❌ Plant player did not reconnect, ending game`);
              endGame(gameId, 'zombie', 'disconnect');
            } else if (g.zombiePlayer.disconnectedAt && Date.now() - g.zombiePlayer.disconnectedAt >= 14000) {
              console.log(`❌ Zombie player did not reconnect, ending game`);
              endGame(gameId, 'plant', 'disconnect');
            }
          }, 15000);
        }
      }
    }
  });

  socket.on('leave_game', (data) => {
    const { gameId, userId } = data;
    const game = activeGames[gameId];
    if (!game) return;

    if (game.phase === 'playing') {
      const winner = game.plantPlayer.userId === userId ? 'zombie' : 'plant';
      endGame(gameId, winner, 'surrender');
    }
  });

  // --- REJOIN GAME ---
  socket.on('rejoin_game', (data) => {
    const { gameId, userId } = data;
    const game = activeGames[gameId];
    if (!game) {
      console.log(`rejoin_game: game ${gameId} not found`);
      return;
    }
    socket.join(gameId);
    // Обновляем socketId игрока и сбрасываем disconnectedAt
    if (game.plantPlayer.userId === userId) {
      game.plantPlayer.socketId = socket.id;
      delete game.plantPlayer.disconnectedAt;
      console.log(`✅ Plant player rejoined: ${game.plantPlayer.username}`);
    }
    if (game.zombiePlayer.userId === userId) {
      game.zombiePlayer.socketId = socket.id;
      delete game.zombiePlayer.disconnectedAt;
      console.log(`✅ Zombie player rejoined: ${game.zombiePlayer.username}`);
    }
    socket.emit('game_update', getFullGameState(game));
  });

  // --- BUFFS ---
  socket.on('activate_buff', (data) => {
    const { gameId, userId, role, buffType } = data;
    const game = activeGames[gameId];
    if (!game || game.phase !== 'playing') return;

    // Проверяем что игрок в этой игре
    const isPlant = game.plantPlayer.userId === userId;
    const isZombie = game.zombiePlayer.userId === userId;
    if (!isPlant && !isZombie) return;

    const BUFF_COOLDOWNS = {
      sun_boost: 45, double_dmg: 60, shield: 90,
      brain_boost: 45, speed_boost: 60, horde: 30
    };
    const BUFF_DURATIONS = {
      sun_boost: 30, double_dmg: 20, shield: 15,
      brain_boost: 30, speed_boost: 20, horde: 10
    };

    // Проверяем кулдаун
    if (!game.buffCooldowns) game.buffCooldowns = {};
    const cdKey = userId + '_' + buffType;
    const now = Date.now();
    if (game.buffCooldowns[cdKey] && now < game.buffCooldowns[cdKey]) {
      const left = Math.ceil((game.buffCooldowns[cdKey] - now) / 1000);
      return socket.emit('buff_error', { message: 'Бафф на кулдауне! Осталось ' + left + 'с' });
    }

    const duration = BUFF_DURATIONS[buffType] || 20;
    const cooldown = BUFF_COOLDOWNS[buffType] || 45;
    game.buffCooldowns[cdKey] = now + cooldown * 1000;

    // Применяем бафф
    if (!game.activeBuffs) game.activeBuffs = {};
    game.activeBuffs[buffType] = { expires: now + duration * 1000, role: isPlant ? 'plant' : 'zombie' };

    // Немедленный эффект
    if (buffType === 'sun_boost') game.plantSun = Math.min(game.plantSun + 50, 500);
    if (buffType === 'brain_boost') game.zombieBrains = Math.min(game.zombieBrains + 40, 500);
    if (buffType === 'horde') game.freeZombie = true;

    io.to(gameId).emit('buff_activated', {
      buffType, duration, cooldown,
      activatedBy: isPlant ? 'plant' : 'zombie'
    });
    io.to(gameId).emit('game_update', getFullGameState(game));
  });

  // --- FRIENDS ---
  socket.on('get_friends', (data) => {
    const { userId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('friends_data', { success: false, message: 'Пользователь не найден' });

    const friends = (user.friends || []).map(fId => {
      const f = db.users.find(u => u.id === fId);
      if (!f) return null;
      return { id: f.id, username: f.username, wins: f.wins, coins: f.coins, isAdmin: f.isAdmin };
    }).filter(Boolean);

    const requests = (user.friendRequests || []).map(fId => {
      const f = db.users.find(u => u.id === fId);
      if (!f) return null;
      return { id: f.id, username: f.username };
    }).filter(Boolean);

    socket.emit('friends_data', { success: true, friends, requests });
  });

  socket.on('send_friend_request', (data) => {
    const { userId, targetUsername } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('friend_result', { success: false, message: 'Пользователь не найден' });

    const target = db.users.find(u => u.username.toLowerCase() === targetUsername.toLowerCase());
    if (!target) return socket.emit('friend_result', { success: false, message: 'Игрок не найден' });
    if (target.id === userId) return socket.emit('friend_result', { success: false, message: 'Нельзя добавить себя' });

    if (!user.friends) user.friends = [];
    if (!target.friendRequests) target.friendRequests = [];

    if (user.friends.includes(target.id)) return socket.emit('friend_result', { success: false, message: 'Уже в друзьях' });
    if (target.friendRequests.includes(userId)) return socket.emit('friend_result', { success: false, message: 'Запрос уже отправлен' });

    // Если target уже отправил запрос нам — сразу принимаем
    if ((user.friendRequests || []).includes(target.id)) {
      user.friends.push(target.id);
      if (!target.friends) target.friends = [];
      target.friends.push(userId);
      user.friendRequests = (user.friendRequests || []).filter(id => id !== target.id);
      saveDB(db);
      // Уведомляем обоих
      socket.emit('friend_result', { success: true, message: `${target.username} теперь ваш друг!` });
      // Уведомляем target если онлайн
      for (const [sid, s] of io.sockets.sockets) {
        if (s.userId === target.id) {
          s.emit('friend_accepted', { username: user.username });
        }
      }
      return;
    }

    target.friendRequests.push(userId);
    saveDB(db);
    socket.emit('friend_result', { success: true, message: `Запрос отправлен игроку ${target.username}` });

    // Уведомляем target если онлайн
    for (const [sid, s] of io.sockets.sockets) {
      if (s.userId === target.id) {
        s.emit('friend_request_received', { id: userId, username: user.username });
      }
    }
  });

  socket.on('accept_friend', (data) => {
    const { userId, fromId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    const from = db.users.find(u => u.id === fromId);
    if (!user || !from) return socket.emit('friend_result', { success: false, message: 'Пользователь не найден' });

    if (!user.friends) user.friends = [];
    if (!from.friends) from.friends = [];

    user.friends.push(fromId);
    from.friends.push(userId);
    user.friendRequests = (user.friendRequests || []).filter(id => id !== fromId);
    saveDB(db);

    socket.emit('friend_result', { success: true, message: `${from.username} добавлен в друзья!` });
    socket.emit('friends_data', {
      success: true,
      friends: user.friends.map(fId => {
        const f = db.users.find(u => u.id === fId);
        return f ? { id: f.id, username: f.username, wins: f.wins, coins: f.coins } : null;
      }).filter(Boolean),
      requests: (user.friendRequests || []).map(fId => {
        const f = db.users.find(u => u.id === fId);
        return f ? { id: f.id, username: f.username } : null;
      }).filter(Boolean)
    });

    // Уведомляем from
    for (const [sid, s] of io.sockets.sockets) {
      if (s.userId === fromId) {
        s.emit('friend_accepted', { username: user.username });
      }
    }
  });

  socket.on('decline_friend', (data) => {
    const { userId, fromId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    user.friendRequests = (user.friendRequests || []).filter(id => id !== fromId);
    saveDB(db);
    socket.emit('friend_result', { success: true, message: 'Запрос отклонён' });
  });

  socket.on('remove_friend', (data) => {
    const { userId, friendId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    const friend = db.users.find(u => u.id === friendId);
    if (user) user.friends = (user.friends || []).filter(id => id !== friendId);
    if (friend) friend.friends = (friend.friends || []).filter(id => id !== userId);
    saveDB(db);
    socket.emit('friend_result', { success: true, message: 'Друг удалён' });
  });

  // --- FRIENDLY BATTLE ---
  socket.on('challenge_friend', (data) => {
    const { userId, username, friendId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return;
    if (!(user.friends || []).includes(friendId)) {
      return socket.emit('challenge_result', { success: false, message: 'Этот игрок не в вашем списке друзей' });
    }

    // Сохраняем userId в socket для поиска
    socket.userId = userId;

    // Ищем сокет друга
    let found = false;
    for (const [sid, s] of io.sockets.sockets) {
      if (s.userId === friendId) {
        s.emit('friend_challenge', { fromId: userId, fromUsername: username });
        socket.emit('challenge_result', { success: true, message: 'Вызов отправлен! Ждём ответа...' });
        found = true;
        break;
      }
    }
    if (!found) {
      socket.emit('challenge_result', { success: false, message: 'Друг сейчас не в сети' });
    }
  });

  socket.on('accept_challenge', (data) => {
    const { userId, username, fromId } = data;
    socket.userId = userId;

    // Ищем сокет инициатора
    let fromSocket = null;
    for (const [sid, s] of io.sockets.sockets) {
      if (s.userId === fromId) { fromSocket = s; break; }
    }
    if (!fromSocket) {
      return socket.emit('challenge_result', { success: false, message: 'Соперник уже не в сети' });
    }

    db = loadDB();
    const fromUser = db.users.find(u => u.id === fromId);
    const toUser = db.users.find(u => u.id === userId);

    const gameId = 'friendly_' + uuidv4();
    const player1 = { socketId: fromSocket.id, userId: fromId, username: fromUser ? fromUser.username : 'Игрок1' };
    const player2 = { socketId: socket.id, userId, username: toUser ? toUser.username : 'Игрок2' };

    const gameState = createGameState(gameId, player1, player2);
    gameState.isFriendly = true; // дружеский бой — без наград
    activeGames[gameId] = gameState;

    fromSocket.join(gameId);
    socket.join(gameId);

    fromSocket.emit('game_start', {
      gameId, role: 'plant', opponent: player2.username,
      isFriendly: true, gameState: getClientState(gameState, 'plant')
    });
    socket.emit('game_start', {
      gameId, role: 'zombie', opponent: player1.username,
      isFriendly: true, gameState: getClientState(gameState, 'zombie')
    });
  });

  socket.on('decline_challenge', (data) => {
    const { fromId, username } = data;
    for (const [sid, s] of io.sockets.sockets) {
      if (s.userId === fromId) {
        s.emit('challenge_declined', { username });
        break;
      }
    }
  });

  // --- PROFILE ---
  socket.on('update_profile', (data) => {
    const { userId, newUsername, avatar, bio } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('profile_result', { success: false, message: 'Пользователь не найден' });

    // Смена ника
    if (newUsername && newUsername !== user.username) {
      if (newUsername.length < 3) return socket.emit('profile_result', { success: false, message: 'Ник минимум 3 символа' });
      if (newUsername.length > 20) return socket.emit('profile_result', { success: false, message: 'Ник максимум 20 символов' });
      const exists = db.users.find(u => u.username.toLowerCase() === newUsername.toLowerCase() && u.id !== userId);
      if (exists) return socket.emit('profile_result', { success: false, message: 'Этот ник уже занят' });
      user.username = newUsername.trim();
    }
    if (avatar !== undefined) user.avatar = avatar;
    if (bio !== undefined) user.bio = bio.slice(0, 150);
    saveDB(db);

    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('profile_result', { success: true, message: 'Профиль обновлён!', user: safeUser });
  });

  socket.on('get_profile', (data) => {
    const { username } = data;
    db = loadDB();
    const user = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
    if (!user) return socket.emit('profile_data', { success: false, message: 'Игрок не найден' });
    const level = calcLevel(user.wins);
    socket.emit('profile_data', {
      success: true,
      profile: {
        id: user.id,
        username: user.username,
        avatar: user.avatar || '🎮',
        bio: user.bio || '',
        wins: user.wins || 0,
        losses: user.losses || 0,
        coins: user.coins || 0,
        isAdmin: user.isAdmin || false,
        badges: user.badges || [],
        level: level.level,
        xp: level.xp,
        xpNext: level.xpNext,
        createdAt: user.createdAt
      }
    });
  });

  // --- LEADERBOARD RESET (admin) ---
  socket.on('admin_reset_leaderboard', (data) => {
    const { userId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return socket.emit('admin_action_result', { success: false, message: 'Нет доступа' });

    const season = (db.season || 0) + 1;
    const seasonBadges = {
      1: { id: 'season1_top1', emoji: '🥇', name: 'Чемпион Сезона 1', desc: '1-е место в сезоне 1' },
      2: { id: 'season1_top2', emoji: '🥈', name: 'Серебро Сезона 1', desc: '2-е место в сезоне 1' },
      3: { id: 'season1_top3', emoji: '🥉', name: 'Бронза Сезона 1', desc: '3-е место в сезоне 1' }
    };

    // Топ-3 получают значки
    const sorted = db.users.slice().sort((a, b) => (b.wins || 0) - (a.wins || 0));
    for (let i = 0; i < Math.min(3, sorted.length); i++) {
      const u = sorted[i];
      if (!u.badges) u.badges = [];
      const badge = { ...seasonBadges[i + 1], season, earnedAt: new Date().toISOString() };
      u.badges.push(badge);
      u.coins += (3 - i) * 200; // 600, 400, 200 монет
    }

    // Сбрасываем wins/losses у всех
    for (const u of db.users) {
      u.wins = 0;
      u.losses = 0;
    }

    db.season = season;
    saveDB(db);
    socket.emit('admin_action_result', { success: true, message: `Сезон ${season} завершён! Лидерборд сброшен. Топ-3 получили значки.` });
    io.emit('season_reset', { season, message: `🏆 Сезон ${season} завершён! Начинается новый сезон!` });
  });

  // Сохраняем userId в socket при подключении
  socket.on('set_user_id', (data) => {
    socket.userId = data.userId;
  });

  // Получить свежие данные пользователя (вызывается при загрузке меню)
  socket.on('get_fresh_user', (data) => {
    const { userId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user) return socket.emit('fresh_user_data', { success: false });
    const safeUser = { ...user };
    delete safeUser.password;
    socket.emit('fresh_user_data', { success: true, user: safeUser });
  });

  // --- EVENTS ---
  socket.on('get_events', () => {
    db = loadDB();
    socket.emit('events_data', db.events || []);
  });

  socket.on('admin_create_event', (data) => {
    const { userId, name, description, targetWins, reward } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) {
      return socket.emit('admin_event_result', { success: false, message: 'Нет доступа' });
    }
    if (!name || !targetWins || !reward) {
      return socket.emit('admin_event_result', { success: false, message: 'Заполните все поля' });
    }
    const newEvent = {
      id: uuidv4(),
      name: name.trim(),
      description: description || '',
      targetWins: parseInt(targetWins),
      reward: parseInt(reward),
      currentWins: 0,
      active: true,
      completed: false,
      participants: [], // userId тех кто уже получил награду
      createdAt: new Date().toISOString()
    };
    if (!db.events) db.events = [];
    db.events.push(newEvent);
    saveDB(db);
    socket.emit('admin_event_result', { success: true, message: `Событие "${newEvent.name}" создано!` });
    io.emit('events_data', db.events);
  });

  socket.on('admin_delete_event', (data) => {
    const { userId, eventId } = data;
    db = loadDB();
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.isAdmin) return;
    db.events = (db.events || []).filter(e => e.id !== eventId);
    saveDB(db);
    socket.emit('admin_event_result', { success: true, message: 'Событие удалено' });
    io.emit('events_data', db.events);
  });
});

// ==================== LEVEL SYSTEM ====================
function calcLevel(wins) {
  const xp = (wins || 0) * 100;
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpForLevel = (level - 1) * (level - 1) * 100;
  const xpNext = level * level * 100;
  return { level, xp, xpForLevel, xpNext };
}

// Путь наград за уровни
const LEVEL_REWARDS = {
  2:  { type: 'coins', amount: 50,  label: '🪙 50 монет' },
  3:  { type: 'coins', amount: 75,  label: '🪙 75 монет' },
  4:  { type: 'plant', itemId: 1,   label: '🌱 Горошина-стрелок' },
  5:  { type: 'coins', amount: 100, label: '🪙 100 монет' },
  6:  { type: 'skin',  itemId: 34,  label: '🌸 Скин "Розовый горох"' },
  7:  { type: 'coins', amount: 150, label: '🪙 150 монет' },
  8:  { type: 'plant', itemId: 5,   label: '❄️ Снежный горох' },
  9:  { type: 'coins', amount: 200, label: '🪙 200 монет' },
  10: { type: 'skin',  itemId: 27,  label: '💀 Скин "Зомби-скелет"' },
  12: { type: 'coins', amount: 250, label: '🪙 250 монет' },
  15: { type: 'skin',  itemId: 14,  label: '⭐ Скин "Золотая горошина"' },
  18: { type: 'coins', amount: 300, label: '🪙 300 монет' },
  20: { type: 'plant', itemId: 4,   label: '🍒 Вишнёвая бомба' },
  25: { type: 'skin',  itemId: 15,  label: '🌈 Скин "Радужный подсолнух"' },
  30: { type: 'coins', amount: 500, label: '🪙 500 монет' },
  35: { type: 'skin',  itemId: 22,  label: '🥷 Скин "Зомби-ниндзя"' },
  40: { type: 'plant', itemId: 6,   label: '🌺 Огненный цветок' },
  45: { type: 'skin',  itemId: 29,  label: '🔮 Скин "Кристальная горошина"' },
  50: { type: 'coins', amount: 1000, label: '🪙 1000 монет' },
  // Максимальный уровень — рандомный легендарный скин
  99: { type: 'legendary_random', label: '🟠 Рандомный легендарный скин' }
};

const MAX_LEVEL = 99;

function grantLevelRewards(user, newLevel) {
  const rewards = [];
  const reward = LEVEL_REWARDS[newLevel];
  if (!reward) return rewards;

  if (reward.type === 'coins') {
    user.coins += reward.amount;
    rewards.push({ type: 'coins', amount: reward.amount, label: reward.label });
  } else if (reward.type === 'plant' || reward.type === 'skin') {
    if (!user.inventory) user.inventory = [];
    if (!user.inventory.includes(reward.itemId)) {
      user.inventory.push(reward.itemId);
      rewards.push({ type: reward.type, itemId: reward.itemId, label: reward.label });
    } else {
      // Уже есть — даём монеты вместо
      user.coins += 100;
      rewards.push({ type: 'coins', amount: 100, label: '🪙 100 монет (замена)' });
    }
  } else if (reward.type === 'legendary_random') {
    // Рандомный легендарный скин
    const legendaryItems = ALL_SHOP_ITEMS.filter(i => i.rarity === 'legendary' && i.type === 'skin');
    const notOwned = legendaryItems.filter(i => !(user.inventory || []).includes(i.id));
    if (notOwned.length > 0) {
      const item = notOwned[Math.floor(Math.random() * notOwned.length)];
      if (!user.inventory) user.inventory = [];
      user.inventory.push(item.id);
      rewards.push({ type: 'legendary_skin', itemId: item.id, label: item.emoji + ' ' + item.name });
    } else {
      user.coins += 500;
      rewards.push({ type: 'coins', amount: 500, label: '🪙 500 монет (все легендарные уже есть)' });
    }
  }

  return rewards;
}

// ==================== GAME LOGIC ====================
function createGameState(gameId, player1, player2) {
  return {
    gameId,
    plantPlayer: { ...player1 },
    zombiePlayer: { ...player2 },
    phase: 'playing',
    plantSun: 50,
    zombieBrains: 50,
    grid: {},
    zombies: [],
    tick: 0,
    plantHP: 100,
    startTime: Date.now()
  };
}

function getPlantCost(type) {
  const costs = { peashooter: 100, sunflower: 50, cherrybomb: 150, wallnut: 50, snowpea: 175 };
  return costs[type] || 100;
}

function getPlantHP(type) {
  const hp = { peashooter: 100, sunflower: 80, cherrybomb: 50, wallnut: 300, snowpea: 100 };
  return hp[type] || 100;
}

function getZombieCost(type) {
  const costs = { basic: 50, cone: 75, bucket: 100, football: 125 };
  return costs[type] || 50;
}

function getZombieHP(type) {
  const hp = { basic: 3, cone: 5, bucket: 8, football: 10 };
  return hp[type] || 3;
}

function getZombieSpeed(type) {
  const speed = { basic: 1, cone: 1, bucket: 0.8, football: 1.5 };
  return speed[type] || 1;
}

function getClientState(game, role) {
  return {
    gameId: game.gameId,
    phase: game.phase,
    plantSun: game.plantSun,
    zombieBrains: game.zombieBrains,
    grid: game.grid,
    zombies: game.zombies,
    plantHP: game.plantHP,
    tick: game.tick,
    myRole: role
  };
}

function getFullGameState(game) {
  return {
    phase: game.phase,
    plantSun: game.plantSun,
    zombieBrains: game.zombieBrains,
    grid: game.grid,
    zombies: game.zombies,
    plantHP: game.plantHP,
    tick: game.tick
  };
}

function endGame(gameId, winnerRole, reason) {
  const game = activeGames[gameId];
  if (!game) return;

  game.phase = 'ended';

  const winnerId = winnerRole === 'plant' ? game.plantPlayer.userId : game.zombiePlayer.userId;
  const loserId = winnerRole === 'plant' ? game.zombiePlayer.userId : game.plantPlayer.userId;

  console.log(`🏁 endGame: gameId=${gameId} winner=${winnerRole} reason=${reason} isBot=${game.isBot} isFriendly=${game.isFriendly}`);
  console.log(`   plantPlayer.userId=${game.plantPlayer.userId} zombiePlayer.userId=${game.zombiePlayer.userId}`);
  console.log(`   winnerId=${winnerId} loserId=${loserId}`);

  db = loadDB();
  const winner = db.users.find(u => u.id === winnerId);
  const loser = db.users.find(u => u.id === loserId);

  console.log(`   winner found: ${winner ? winner.username : 'NOT FOUND'} loser found: ${loser ? loser.username : 'NOT FOUND'}`);

  // Награды за бота зависят от сложности
  const BOT_REWARDS = { easy: { coins: 15, wins: 1 }, medium: { coins: 30, wins: 1 }, hard: { coins: 50, wins: 1 } };
  const botReward = BOT_REWARDS[game.botDifficulty || 'easy'];
  const pvpReward = 50;
  // Честная победа — только если зомби дошли до базы (hp) или таймер (timeout)
  // Сдача (surrender) и дисконнект (disconnect) — без наград победителю
  const isHonestWin = (reason === 'hp' || reason === 'timeout');
  const isRanked = !game.isFriendly && isHonestWin;

  console.log(`   isRanked=${isRanked} isHonestWin=${isHonestWin} reason=${reason} pvpReward=${pvpReward}`);

  if (winner && isRanked) {
    if (game.isBot) {
      // Победа над ботом — монеты и победа по сложности
      if (winner.id === game.humanUserId) {
        winner.wins++;
        winner.coins += botReward.coins;
        console.log(`   ✅ Bot win: +${botReward.coins} coins, wins=${winner.wins}`);
      }
    } else {
      winner.wins++;
      winner.coins += pvpReward;
      console.log(`   ✅ PvP win: +${pvpReward} coins, wins=${winner.wins} for ${winner.username}`);
    }
  } else {
    console.log(`   ❌ No reward: winner=${!!winner} isRanked=${isRanked} reason=${reason}`);
  }
  // Поражение засчитывается только при честной игре
  if (loser && isRanked && !game.isBot) { loser.losses++; }

  // Проверяем награды за уровень для победителя
  let levelUpRewards = [];
  if (winner && isRanked) {
    const oldLevel = calcLevel(winner.wins - 1).level;
    const newLevel = calcLevel(winner.wins).level;
    console.log(`   Level check: oldLevel=${oldLevel} newLevel=${newLevel}`);
    if (newLevel > oldLevel) {
      levelUpRewards = grantLevelRewards(winner, newLevel);
      console.log(`   🎉 Level up! Rewards: ${JSON.stringify(levelUpRewards)}`);
    }
  }

  const reward = game.isBot ? botReward.coins : pvpReward;

  // Обновляем события
  if (!game.isBot) {
    const events = db.events || [];
    for (const event of events) {
      if (!event.active || event.completed) continue;
      event.currentWins = (event.currentWins || 0) + 1;
      if (event.currentWins >= event.targetWins) {
        event.completed = true;
        event.active = false;
        // Выдаём награду всем игрокам у кого есть хотя бы 1 победа
        for (const u of db.users) {
          if (u.wins > 0 && !event.participants.includes(u.id)) {
            u.coins += event.reward;
            event.participants.push(u.id);
          }
        }
        io.emit('event_completed', { event, reward: event.reward });
        console.log(`🎉 Событие "${event.name}" завершено! Награда выдана.`);
      }
    }
    db.events = events;
  }

  saveDB(db);

  // Отправляем level_up победителю если он поднял уровень
  if (levelUpRewards.length > 0 && winner) {
    const winnerSocketId = winnerRole === 'plant' ? game.plantPlayer.socketId : game.zombiePlayer.socketId;
    const winnerSocket = io.sockets.sockets.get(winnerSocketId);
    const newLvl = calcLevel(winner.wins).level;
    if (winnerSocket) {
      winnerSocket.emit('level_up', {
        newLevel: newLvl,
        rewards: levelUpRewards
      });
    }
  }

  io.to(gameId).emit('game_over', {
    winner: winnerRole,
    reason,
    reward: isRanked ? reward : 0,
    isFriendly: !!game.isFriendly,
    isBot: !!game.isBot,
    levelUpRewards,
    plantPlayer: game.plantPlayer.username,
    zombiePlayer: game.zombiePlayer.username
  });

  setTimeout(() => {
    delete activeGames[gameId];
  }, 5000);
}

// ==================== GAME TICK ====================
setInterval(() => {
  for (const gameId in activeGames) {
    const game = activeGames[gameId];
    if (game.phase !== 'playing') continue;

    game.tick++;

    // Генерация ресурсов
    if (game.tick % 5 === 0) {
      game.plantSun = Math.min(game.plantSun + 25, 500);
      game.zombieBrains = Math.min(game.zombieBrains + 20, 500);

      // Подсолнухи дают дополнительное солнце
      for (const key in game.grid) {
        if (game.grid[key].type === 'sunflower') {
          game.plantSun = Math.min(game.plantSun + 10, 500);
        }
      }
    }

    // Движение зомби
    if (game.tick % 3 === 0) {
      for (const zombie of game.zombies) {
        zombie.col -= zombie.speed;

        // Проверка столкновения с растениями
        const cellKey = `${Math.floor(zombie.col)}_${zombie.lane}`;
        if (game.grid[cellKey]) {
          const plant = game.grid[cellKey];
          plant.hp--;
          if (plant.hp <= 0) {
            delete game.grid[cellKey];
          }
          zombie.col = Math.floor(zombie.col) + 0.5; // Стоп перед растением
        }

        // Зомби дошёл до конца
        if (zombie.col <= 0) {
          game.plantHP -= 20;
          zombie.col = -1; // Помечаем для удаления
        }
      }

      // Удаляем зомби дошедших до конца
      game.zombies = game.zombies.filter(z => z.col > 0);

      // Стрельба растений
      for (const key in game.grid) {
        const plant = game.grid[key];
        if (plant.type === 'peashooter' || plant.type === 'snowpea') {
          // Ищем зомби в той же линии
          const zombiesInLane = game.zombies.filter(z => z.lane === plant.row && z.col > plant.col);
          if (zombiesInLane.length > 0) {
            const target = zombiesInLane.reduce((a, b) => a.col < b.col ? a : b);
            target.hp -= 1;
            if (plant.type === 'snowpea') target.speed = Math.max(0.3, target.speed * 0.8);
            if (target.hp <= 0) {
              game.zombies = game.zombies.filter(z => z.id !== target.id);
            }
          }
        }

        // Вишнёвая бомба - взрывается сразу
        if (plant.type === 'cherrybomb') {
          const nearbyZombies = game.zombies.filter(z =>
            Math.abs(z.col - plant.col) <= 1.5 && Math.abs(z.lane - plant.row) <= 1
          );
          for (const z of nearbyZombies) {
            z.hp -= 10;
          }
          game.zombies = game.zombies.filter(z => z.hp > 0);
          delete game.grid[key];
        }
      }

      // Проверка победы/поражения
      if (game.plantHP <= 0) {
        endGame(gameId, 'zombie', 'hp');
        continue;
      }

    // Таймер 3 минуты — если растения продержались, они побеждают
    const elapsed = Date.now() - game.startTime;
    if (elapsed >= 3 * 60 * 1000) {
      endGame(gameId, 'plant', 'timeout');
      continue;
    }
    }

    // Логика бота
    if (game.isBot && game.tick % 8 === 0) {
      runBotLogic(game);
    }

    // Отправляем обновление каждые 2 тика
    if (game.tick % 2 === 0) {
      io.to(gameId).emit('game_update', getFullGameState(game));
    }
  }
}, 1000);

// ==================== BOT LOGIC ====================
function runBotLogic(game) {
  const diff = game.botDifficulty || 'easy';
  const interval = diff === 'hard' ? 1 : diff === 'medium' ? 2 : 4;
  if (game.tick % (8 * interval) !== 0) return;

  if (game.botRole === 'zombie') {
    // Бот играет за зомби
    if (game.zombieBrains >= 50) {
      const types = diff === 'hard' ? ['cone', 'bucket', 'football'] : diff === 'medium' ? ['basic', 'cone'] : ['basic'];
      const type = types[Math.floor(Math.random() * types.length)];
      const cost = getZombieCost(type);
      if (game.zombieBrains >= cost) {
        game.zombieBrains -= cost;
        // Выбираем линию с наименьшим количеством растений
        const laneCounts = [0, 1, 2, 3, 4].map(lane => {
          return Object.values(game.grid).filter(p => p.row === lane).length;
        });
        const minLane = laneCounts.indexOf(Math.min(...laneCounts));
        game.zombies.push({
          id: uuidv4(), type, hp: getZombieHP(type), maxHp: getZombieHP(type),
          lane: minLane, col: 8.5, speed: getZombieSpeed(type)
        });
      }
    }
  } else {
    // Бот играет за растения
    if (game.plantSun >= 50) {
      const types = diff === 'hard' ? ['peashooter', 'sunflower', 'wallnut', 'snowpea'] : diff === 'medium' ? ['peashooter', 'sunflower', 'wallnut'] : ['peashooter', 'sunflower'];
      const type = types[Math.floor(Math.random() * types.length)];
      const cost = getPlantCost(type);
      if (game.plantSun >= cost) {
        // Ищем свободную клетку
        for (let col = 1; col <= 5; col++) {
          for (let row = 0; row < 5; row++) {
            const key = `${col}_${row}`;
            if (!game.grid[key]) {
              game.plantSun -= cost;
              game.grid[key] = { type, hp: getPlantHP(type), col, row };
              return;
            }
          }
        }
      }
    }
  }
}

// ==================== AUTO-CREATE RELEASE EVENT ====================
(function ensureReleaseEvent() {
  const d = loadDB();
  if (!d.events) d.events = [];
  const exists = d.events.find(e => e.name && e.name.includes('Релиз'));
  if (!exists) {
    // Создаём событие с фиксированным endsAt — 7 дней с момента первого создания
    const endsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    d.events.push({
      id: 'release_event_2024',
      name: '🚀 Релиз игры',
      description: 'Отмечаем запуск! Любая PvP победа засчитывается!',
      targetWins: 100,
      reward: 500,
      currentWins: 0,
      active: true,
      completed: false,
      participants: [],
      endsAt,
      createdAt: new Date().toISOString()
    });
    saveDB(d);
    console.log('🎉 Событие "Релиз игры" создано! Заканчивается: ' + new Date(endsAt).toLocaleString());
  } else if (!exists.endsAt) {
    // Событие уже есть, но без endsAt (старая версия) — добавляем
    exists.endsAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
    saveDB(d);
    console.log('🔧 Добавлен endsAt к существующему событию: ' + new Date(exists.endsAt).toLocaleString());
  } else {
    console.log('✅ Событие "Релиз игры" активно. Заканчивается: ' + new Date(exists.endsAt).toLocaleString());
  }
})();

// ==================== START ====================
const os = require('os');
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal && iface.address.startsWith('192.168.')) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`🌱 Сервер запущен!`);
  console.log(`💻 На этом компьютере: http://localhost:${PORT}`);
  console.log(`📱 С телефона (та же сеть Wi-Fi): http://${localIP}:${PORT}`);
  console.log(`📊 База данных: ${DB_FILE}`);
});
