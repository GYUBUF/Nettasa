// =============================================
// Netta — Unified Data Layer
// Works LOCALLY (localStorage) when no server,
// Works via API when deployed on Render.com
// =============================================

const BASE = '/api';
let USE_SERVER = false;

async function checkServer(): Promise<boolean> {
  try {
    const res = await fetch(`${BASE}/admin/stats`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch { return false; }
}

(async () => {
  USE_SERVER = await checkServer();
  if (USE_SERVER) console.log('🌐 Netta: Connected to server API');
  else { console.log('💾 Netta: Running in local mode (localStorage)'); initLocalDB(); }
})();

// ==================== LOCAL DATABASE ====================

interface LUser {
  id: string; username: string; displayName: string; password: string;
  bio: string; avatarUrl: string; isVerified: boolean; isAdmin: boolean;
  notifyAuthors: string[]; createdAt: string;
}
interface LPost { id: string; authorId: string; content: string; likes: string[]; reposts: string[]; createdAt: string; }
interface LComment { id: string; postId: string; authorId: string; content: string; createdAt: string; }
interface LFollow { followerId: string; followingId: string; createdAt: string; }
interface LMessage { id: string; fromId: string; toId: string; content: string; isRead: boolean; createdAt: string; }
interface LNotification { id: string; userId: string; fromId: string; type: string; postId: string; isRead: boolean; createdAt: string; }
interface LVerification {
  id: string; userId: string; fullName: string; reason: string; category: string;
  socialLinks: string; documentUrl: string; additionalInfo: string;
  status: string; rejectReason: string; submittedAt: string; reviewDeadline: string;
}
interface LDB {
  users: LUser[]; posts: LPost[]; comments: LComment[]; follows: LFollow[];
  messages: LMessage[]; notifications: LNotification[]; verifications: LVerification[];
}

const SK = 'netta_local_db';
function loadDB(): LDB {
  try { const r = localStorage.getItem(SK); if (r) return JSON.parse(r); } catch {}
  return { users: [], posts: [], comments: [], follows: [], messages: [], notifications: [], verifications: [] };
}
function saveDB(db: LDB) { localStorage.setItem(SK, JSON.stringify(db)); }
function uid(): string {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
}
function initLocalDB() {
  const db = loadDB();
  if (!db.users.find(u => u.username === 'admin')) {
    db.users.push({
      id: uid(), username: 'admin', displayName: 'Администратор Netta',
      password: 'mjrz53bhuti!@', bio: 'Официальный администратор платформы Netta',
      avatarUrl: '', isVerified: true, isAdmin: true, notifyAuthors: [], createdAt: new Date().toISOString()
    });
    saveDB(db);
  }
}
function getAuthor(db: LDB, id: string) {
  const u = db.users.find(x => x.id === id);
  if (!u) return { id, username: '?', displayName: '?', avatarUrl: '', isVerified: false, isAdmin: false };
  return { id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, isVerified: u.isVerified, isAdmin: u.isAdmin };
}
function enrichPost(db: LDB, p: LPost) {
  const comments = db.comments.filter(c => c.postId === p.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map(c => ({ ...c, author: getAuthor(db, c.authorId) }));
  return { ...p, author: getAuthor(db, p.authorId), comments };
}
function safeUser(db: LDB, u: LUser) {
  return {
    id: u.id, username: u.username, displayName: u.displayName, bio: u.bio, avatarUrl: u.avatarUrl,
    isVerified: u.isVerified, isAdmin: u.isAdmin, notifyAuthors: u.notifyAuthors || [],
    followers: db.follows.filter(f => f.followingId === u.id).length,
    following: db.follows.filter(f => f.followerId === u.id).length,
    createdAt: u.createdAt
  };
}

// ==================== SERVER REQUEST ====================

async function req(url: string, options?: RequestInit) {
  const res = await fetch(`${BASE}${url}`, {
    ...options, headers: { 'Content-Type': 'application/json', ...options?.headers },
  });
  if (!res.ok) {
    let msg = 'Ошибка сервера';
    try { const d = await res.json(); msg = d.error || msg; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

// ==================== AUTH ====================

export const authAPI = {
  register: async (username: string, displayName: string, password: string) => {
    if (USE_SERVER) return req('/auth/register', { method: 'POST', body: JSON.stringify({ username, displayName, password }) });
    const db = loadDB();
    const un = username.toLowerCase().trim();
    if (un.length < 3) throw new Error('Имя пользователя минимум 3 символа');
    if (password.length < 6) throw new Error('Пароль минимум 6 символов');
    if (db.users.find(u => u.username === un)) throw new Error('Имя пользователя уже занято');
    const user: LUser = { id: uid(), username: un, displayName: displayName.trim(), password, bio: '', avatarUrl: '', isVerified: false, isAdmin: false, notifyAuthors: [], createdAt: new Date().toISOString() };
    db.users.push(user); saveDB(db);
    return { user: safeUser(db, user) };
  },
  login: async (username: string, password: string) => {
    if (USE_SERVER) return req('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
    const db = loadDB(); const un = username.toLowerCase().trim();
    const user = db.users.find(u => u.username === un);
    if (!user) throw new Error('Пользователь не найден');
    if (user.password !== password) throw new Error('Неверный пароль');
    return { user: safeUser(db, user) };
  },
  getUser: async (id: string) => {
    if (USE_SERVER) return req(`/users/${id}`);
    const db = loadDB(); const user = db.users.find(u => u.id === id);
    if (!user) throw new Error('Не найден'); return safeUser(db, user);
  },
};

// ==================== PROFILE ====================

export const profileAPI = {
  update: async (userId: string, updates: { displayName?: string; bio?: string; avatarUrl?: string }) => {
    if (USE_SERVER) return req(`/profile/${userId}`, { method: 'PUT', body: JSON.stringify(updates) });
    const db = loadDB(); const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('Не найден');
    if (updates.displayName !== undefined) user.displayName = updates.displayName;
    if (updates.bio !== undefined) user.bio = updates.bio;
    if (updates.avatarUrl !== undefined) user.avatarUrl = updates.avatarUrl;
    saveDB(db); return safeUser(db, user);
  },
};

// ==================== POSTS ====================

export const postsAPI = {
  create: async (authorId: string, content: string) => {
    if (USE_SERVER) return req('/posts', { method: 'POST', body: JSON.stringify({ authorId, content }) });
    const db = loadDB();
    const post: LPost = { id: uid(), authorId, content: content.trim(), likes: [], reposts: [], createdAt: new Date().toISOString() };
    db.posts.push(post);
    for (const u of db.users) {
      if (u.id !== authorId && u.notifyAuthors?.includes(authorId)) {
        db.notifications.push({ id: uid(), userId: u.id, fromId: authorId, type: 'new_post', postId: post.id, isRead: false, createdAt: post.createdAt });
      }
    }
    saveDB(db); return enrichPost(db, post);
  },
  getFeed: async (page = 1) => {
    if (USE_SERVER) return req(`/posts?page=${page}`);
    const db = loadDB();
    return [...db.posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice((page - 1) * 20, page * 20).map(p => enrichPost(db, p));
  },
  getUserPosts: async (userId: string) => {
    if (USE_SERVER) return req(`/posts/user/${userId}`);
    const db = loadDB();
    return db.posts.filter(p => p.authorId === userId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(p => enrichPost(db, p));
  },
  delete: async (postId: string, userId: string) => {
    if (USE_SERVER) return req(`/posts/${postId}`, { method: 'DELETE', body: JSON.stringify({ userId }) });
    const db = loadDB(); const idx = db.posts.findIndex(p => p.id === postId);
    if (idx < 0) throw new Error('Пост не найден');
    const post = db.posts[idx]; const user = db.users.find(u => u.id === userId);
    if (post.authorId !== userId && !user?.isAdmin) throw new Error('Нет прав');
    db.posts.splice(idx, 1); db.comments = db.comments.filter(c => c.postId !== postId); saveDB(db);
    return { success: true };
  },
  like: async (postId: string, userId: string) => {
    if (USE_SERVER) return req(`/posts/${postId}/like`, { method: 'POST', body: JSON.stringify({ userId }) });
    const db = loadDB(); const post = db.posts.find(p => p.id === postId);
    if (!post) throw new Error('Пост не найден');
    const idx = post.likes.indexOf(userId);
    if (idx >= 0) post.likes.splice(idx, 1);
    else {
      post.likes.push(userId);
      if (post.authorId !== userId) db.notifications.push({ id: uid(), userId: post.authorId, fromId: userId, type: 'like', postId, isRead: false, createdAt: new Date().toISOString() });
    }
    saveDB(db); return { likes: post.likes };
  },
  repost: async (postId: string, userId: string) => {
    if (USE_SERVER) return req(`/posts/${postId}/repost`, { method: 'POST', body: JSON.stringify({ userId }) });
    const db = loadDB(); const post = db.posts.find(p => p.id === postId);
    if (!post) throw new Error('Пост не найден');
    const idx = post.reposts.indexOf(userId);
    if (idx >= 0) post.reposts.splice(idx, 1);
    else {
      post.reposts.push(userId);
      if (post.authorId !== userId) db.notifications.push({ id: uid(), userId: post.authorId, fromId: userId, type: 'repost', postId, isRead: false, createdAt: new Date().toISOString() });
    }
    saveDB(db); return { reposts: post.reposts };
  },
  comment: async (postId: string, authorId: string, content: string) => {
    if (USE_SERVER) return req(`/posts/${postId}/comment`, { method: 'POST', body: JSON.stringify({ authorId, content }) });
    const db = loadDB(); const post = db.posts.find(p => p.id === postId);
    if (!post) throw new Error('Пост не найден');
    const comment: LComment = { id: uid(), postId, authorId, content: content.trim(), createdAt: new Date().toISOString() };
    db.comments.push(comment);
    if (post.authorId !== authorId) db.notifications.push({ id: uid(), userId: post.authorId, fromId: authorId, type: 'comment', postId, isRead: false, createdAt: comment.createdAt });
    saveDB(db); return enrichPost(db, post);
  },
};

// ==================== FOLLOW ====================

export const followAPI = {
  toggle: async (followerId: string, followingId: string) => {
    if (USE_SERVER) return req('/follow', { method: 'POST', body: JSON.stringify({ followerId, followingId }) });
    const db = loadDB(); if (followerId === followingId) throw new Error('Нельзя');
    const idx = db.follows.findIndex(f => f.followerId === followerId && f.followingId === followingId);
    if (idx >= 0) { db.follows.splice(idx, 1); saveDB(db); return { following: false }; }
    db.follows.push({ followerId, followingId, createdAt: new Date().toISOString() });
    db.notifications.push({ id: uid(), userId: followingId, fromId: followerId, type: 'follow', postId: '', isRead: false, createdAt: new Date().toISOString() });
    saveDB(db); return { following: true };
  },
  check: async (followerId: string, followingId: string) => {
    if (USE_SERVER) return req(`/follow/check/${followerId}/${followingId}`);
    const db = loadDB(); return { following: db.follows.some(f => f.followerId === followerId && f.followingId === followingId) };
  },
};

// ==================== MESSAGES ====================

export const messagesAPI = {
  send: async (fromId: string, toId: string, content: string) => {
    if (USE_SERVER) return req('/messages', { method: 'POST', body: JSON.stringify({ fromId, toId, content }) });
    const db = loadDB();
    const msg: LMessage = { id: uid(), fromId, toId, content: content.trim(), isRead: false, createdAt: new Date().toISOString() };
    db.messages.push(msg);
    db.notifications.push({ id: uid(), userId: toId, fromId, type: 'message', postId: '', isRead: false, createdAt: msg.createdAt });
    saveDB(db); return msg;
  },
  getConversations: async (userId: string) => {
    if (USE_SERVER) return req(`/messages/conversations/${userId}`);
    const db = loadDB(); const ids = new Set<string>();
    db.messages.forEach(m => { if (m.fromId === userId) ids.add(m.toId); if (m.toId === userId) ids.add(m.fromId); });
    return Array.from(ids).map(pid => {
      const partner = getAuthor(db, pid);
      const msgs = db.messages.filter(m => (m.fromId === userId && m.toId === pid) || (m.fromId === pid && m.toId === userId))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const unreadCount = db.messages.filter(m => m.fromId === pid && m.toId === userId && !m.isRead).length;
      return { partner, lastMessage: msgs[0] || null, unreadCount };
    }).sort((a, b) => {
      const at = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
      const bt = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
      return bt - at;
    });
  },
  getMessages: async (userId: string, partnerId: string) => {
    if (USE_SERVER) return req(`/messages/${userId}/${partnerId}`);
    const db = loadDB();
    db.messages.forEach(m => { if (m.fromId === partnerId && m.toId === userId) m.isRead = true; }); saveDB(db);
    return db.messages.filter(m => (m.fromId === userId && m.toId === partnerId) || (m.fromId === partnerId && m.toId === userId))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },
  getUnread: async (userId: string) => {
    if (USE_SERVER) return req(`/messages/unread/${userId}`);
    const db = loadDB(); return { count: db.messages.filter(m => m.toId === userId && !m.isRead).length };
  },
};

// ==================== NOTIFICATIONS ====================

export const notificationsAPI = {
  get: async (userId: string) => {
    if (USE_SERVER) return req(`/notifications/${userId}`);
    const db = loadDB();
    return db.notifications.filter(n => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 50).map(n => ({ ...n, from: getAuthor(db, n.fromId) }));
  },
  markRead: async (userId: string) => {
    if (USE_SERVER) return req(`/notifications/read/${userId}`, { method: 'POST' });
    const db = loadDB(); db.notifications.forEach(n => { if (n.userId === userId) n.isRead = true; }); saveDB(db);
    return { success: true };
  },
  getUnread: async (userId: string) => {
    if (USE_SERVER) return req(`/notifications/unread/${userId}`);
    const db = loadDB(); return { count: db.notifications.filter(n => n.userId === userId && !n.isRead).length };
  },
};

// ==================== NOTIFY AUTHORS ====================

export const notifyAuthorAPI = {
  toggle: async (userId: string, authorId: string) => {
    if (USE_SERVER) return req('/notify-author', { method: 'POST', body: JSON.stringify({ userId, authorId }) });
    const db = loadDB(); const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('Не найден');
    if (!user.notifyAuthors) user.notifyAuthors = [];
    const idx = user.notifyAuthors.indexOf(authorId);
    if (idx >= 0) user.notifyAuthors.splice(idx, 1); else user.notifyAuthors.push(authorId);
    saveDB(db); return { notifyAuthors: user.notifyAuthors };
  },
};

// ==================== VERIFICATION ====================

export const verificationAPI = {
  submit: async (userId: string, data: any) => {
    if (USE_SERVER) return req('/verification', { method: 'POST', body: JSON.stringify({ userId, ...data }) });
    const db = loadDB();
    if (db.verifications.find(v => v.userId === userId && v.status === 'pending')) throw new Error('Заявка уже подана');
    const ver: LVerification = {
      id: uid(), userId, fullName: data.fullName, reason: data.reason, category: data.category,
      socialLinks: data.socialLinks || '', documentUrl: data.documentUrl || '', additionalInfo: data.additionalInfo || '',
      status: 'pending', rejectReason: '', submittedAt: new Date().toISOString(),
      reviewDeadline: new Date(Date.now() + (3 + Math.random()) * 86400000).toISOString()
    };
    db.verifications.push(ver); saveDB(db); return { success: true };
  },
  getStatus: async (userId: string) => {
    if (USE_SERVER) return req(`/verification/${userId}`);
    const db = loadDB();
    const vers = db.verifications.filter(v => v.userId === userId).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return vers[0] || null;
  },
  getAll: async () => {
    if (USE_SERVER) return req('/verification');
    const db = loadDB();
    return db.verifications.map(v => {
      const u = db.users.find(x => x.id === v.userId);
      return { ...v, username: u?.username || '?', displayName: u?.displayName || '?', avatarUrl: u?.avatarUrl || '' };
    }).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  },
  approve: async (requestId: string) => {
    if (USE_SERVER) return req(`/verification/${requestId}/approve`, { method: 'POST' });
    const db = loadDB(); const ver = db.verifications.find(v => v.id === requestId);
    if (!ver) throw new Error('Не найдена'); ver.status = 'approved';
    const user = db.users.find(u => u.id === ver.userId); if (user) user.isVerified = true;
    saveDB(db); return { success: true };
  },
  reject: async (requestId: string, reason: string) => {
    if (USE_SERVER) return req(`/verification/${requestId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
    const db = loadDB(); const ver = db.verifications.find(v => v.id === requestId);
    if (!ver) throw new Error('Не найдена'); ver.status = 'rejected'; ver.rejectReason = reason || '';
    saveDB(db); return { success: true };
  },
};

// ==================== SEARCH ====================

export const searchAPI = {
  users: async (q: string) => {
    if (USE_SERVER) return req(`/search?q=${encodeURIComponent(q)}`);
    const db = loadDB(); const query = q.toLowerCase();
    return db.users.filter(u => u.username.includes(query) || u.displayName.toLowerCase().includes(query))
      .slice(0, 20).map(u => ({ id: u.id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, isVerified: u.isVerified, isAdmin: u.isAdmin, bio: u.bio }));
  },
};

// ==================== ADMIN ====================

export const adminAPI = {
  getUsers: async () => {
    if (USE_SERVER) return req('/admin/users');
    const db = loadDB(); return db.users.map(u => safeUser(db, u));
  },
  deleteUser: async (userId: string, adminId: string) => {
    if (USE_SERVER) return req(`/admin/users/${userId}`, { method: 'DELETE', body: JSON.stringify({ adminId }) });
    const db = loadDB(); const admin = db.users.find(u => u.id === adminId);
    if (!admin?.isAdmin) throw new Error('Нет прав');
    if (db.users.find(u => u.id === userId)?.isAdmin) throw new Error('Нельзя удалить админа');
    db.users = db.users.filter(u => u.id !== userId);
    db.posts = db.posts.filter(p => p.authorId !== userId);
    db.comments = db.comments.filter(c => c.authorId !== userId);
    db.follows = db.follows.filter(f => f.followerId !== userId && f.followingId !== userId);
    db.messages = db.messages.filter(m => m.fromId !== userId && m.toId !== userId);
    db.notifications = db.notifications.filter(n => n.userId !== userId && n.fromId !== userId);
    db.verifications = db.verifications.filter(v => v.userId !== userId);
    saveDB(db); return { success: true };
  },
  toggleVerify: async (userId: string, adminId: string) => {
    if (USE_SERVER) return req(`/admin/verify/${userId}`, { method: 'POST', body: JSON.stringify({ adminId }) });
    const db = loadDB(); const admin = db.users.find(u => u.id === adminId);
    if (!admin?.isAdmin) throw new Error('Нет прав');
    const user = db.users.find(u => u.id === userId); if (!user) throw new Error('Не найден');
    user.isVerified = !user.isVerified; saveDB(db); return { success: true };
  },
  getStats: async () => {
    if (USE_SERVER) return req('/admin/stats');
    const db = loadDB();
    return { users: db.users.length, posts: db.posts.length, messages: db.messages.length, verified: db.users.filter(u => u.isVerified).length, pendingVerifications: db.verifications.filter(v => v.status === 'pending').length };
  },
};

// ==================== NOTIFICATION SOUND ====================

export function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.frequency.setValueAtTime(880, ctx.currentTime);
    o.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    g.gain.setValueAtTime(0.3, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.3);
  } catch {}
}
