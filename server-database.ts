import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'netta.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, displayName TEXT NOT NULL,
      password TEXT NOT NULL, bio TEXT DEFAULT '', avatarUrl TEXT DEFAULT '',
      isVerified INTEGER DEFAULT 0, isAdmin INTEGER DEFAULT 0,
      notifyAuthors TEXT DEFAULT '[]', createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY, authorId TEXT NOT NULL, content TEXT NOT NULL,
      likes TEXT DEFAULT '[]', reposts TEXT DEFAULT '[]', createdAt TEXT NOT NULL,
      FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY, postId TEXT NOT NULL, authorId TEXT NOT NULL,
      content TEXT NOT NULL, createdAt TEXT NOT NULL,
      FOREIGN KEY (postId) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS follows (
      followerId TEXT NOT NULL, followingId TEXT NOT NULL, createdAt TEXT NOT NULL,
      PRIMARY KEY (followerId, followingId),
      FOREIGN KEY (followerId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (followingId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, fromId TEXT NOT NULL, toId TEXT NOT NULL,
      content TEXT NOT NULL, isRead INTEGER DEFAULT 0, createdAt TEXT NOT NULL,
      FOREIGN KEY (fromId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (toId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, fromId TEXT NOT NULL,
      type TEXT NOT NULL, postId TEXT DEFAULT '', isRead INTEGER DEFAULT 0, createdAt TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS verification_requests (
      id TEXT PRIMARY KEY, userId TEXT NOT NULL, fullName TEXT NOT NULL,
      reason TEXT NOT NULL, category TEXT NOT NULL, socialLinks TEXT DEFAULT '',
      documentUrl TEXT DEFAULT '', additionalInfo TEXT DEFAULT '',
      status TEXT DEFAULT 'pending', rejectReason TEXT DEFAULT '',
      submittedAt TEXT NOT NULL, reviewDeadline TEXT NOT NULL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(authorId);
    CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(createdAt);
    CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(postId);
    CREATE INDEX IF NOT EXISTS idx_messages_to ON messages(toId);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(userId);
  `);

  const admin = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hashedPass = bcrypt.hashSync('mjrz53bhuti!@', 10);
    db.prepare('INSERT INTO users (id,username,displayName,password,bio,avatarUrl,isVerified,isAdmin,createdAt) VALUES (?,?,?,?,?,?,?,?,?)')
      .run(uuid(), 'admin', 'Администратор Netta', hashedPass, 'Официальный администратор платформы Netta', '', 1, 1, new Date().toISOString());
  }
  console.log('✅ Database initialized');
}

function sanitizeUser(user: any) {
  const { password, ...safe } = user;
  const followers = db.prepare('SELECT COUNT(*) as c FROM follows WHERE followingId = ?').get(user.id) as any;
  const following = db.prepare('SELECT COUNT(*) as c FROM follows WHERE followerId = ?').get(user.id) as any;
  return { ...safe, isVerified: !!user.isVerified, isAdmin: !!user.isAdmin, notifyAuthors: JSON.parse(user.notifyAuthors || '[]'), followers: followers.c, following: following.c };
}

function enrichPost(post: any) {
  const author = db.prepare('SELECT id,username,displayName,avatarUrl,isVerified,isAdmin FROM users WHERE id = ?').get(post.authorId) as any;
  const comments = db.prepare('SELECT c.*,u.username,u.displayName,u.avatarUrl,u.isVerified,u.isAdmin FROM comments c JOIN users u ON c.authorId=u.id WHERE c.postId=? ORDER BY c.createdAt ASC').all(post.id) as any[];
  return {
    ...post, likes: JSON.parse(post.likes || '[]'), reposts: JSON.parse(post.reposts || '[]'),
    author: author ? { id: author.id, username: author.username, displayName: author.displayName, avatarUrl: author.avatarUrl, isVerified: !!author.isVerified, isAdmin: !!author.isAdmin } : null,
    comments: comments.map((c: any) => ({ id: c.id, postId: c.postId, authorId: c.authorId, content: c.content, createdAt: c.createdAt, author: { username: c.username, displayName: c.displayName, avatarUrl: c.avatarUrl, isVerified: !!c.isVerified, isAdmin: !!c.isAdmin } }))
  };
}

export function registerUser(username: string, displayName: string, password: string) {
  if (db.prepare('SELECT id FROM users WHERE username = ?').get(username)) return { error: 'Имя пользователя уже занято' };
  const id = uuid(); const hashedPass = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id,username,displayName,password,bio,avatarUrl,isVerified,isAdmin,notifyAuthors,createdAt) VALUES (?,?,?,?,\'\',\'\',0,0,\'[]\',?)').run(id, username, displayName, hashedPass, new Date().toISOString());
  return { user: getUserById(id) };
}

export function loginUser(username: string, password: string) {
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any;
  if (!user) return { error: 'Пользователь не найден' };
  if (!bcrypt.compareSync(password, user.password)) return { error: 'Неверный пароль' };
  return { user: sanitizeUser(user) };
}

export function getUserById(id: string) { const u = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any; return u ? sanitizeUser(u) : null; }
export function getUserByUsername(username: string) { const u = db.prepare('SELECT * FROM users WHERE username = ?').get(username) as any; return u ? sanitizeUser(u) : null; }

export function updateProfile(userId: string, updates: { displayName?: string; bio?: string; avatarUrl?: string }) {
  const s: string[] = []; const v: any[] = [];
  if (updates.displayName !== undefined) { s.push('displayName=?'); v.push(updates.displayName); }
  if (updates.bio !== undefined) { s.push('bio=?'); v.push(updates.bio); }
  if (updates.avatarUrl !== undefined) { s.push('avatarUrl=?'); v.push(updates.avatarUrl); }
  if (s.length === 0) return getUserById(userId);
  v.push(userId); db.prepare(`UPDATE users SET ${s.join(',')} WHERE id=?`).run(...v);
  return getUserById(userId);
}

export function createPost(authorId: string, content: string) {
  const id = uuid(); const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO posts (id,authorId,content,likes,reposts,createdAt) VALUES (?,?,?,\'[]\',\'[]\',?)').run(id, authorId, content, createdAt);
  const allUsers = db.prepare('SELECT id,notifyAuthors FROM users WHERE id!=?').all(authorId) as any[];
  for (const u of allUsers) {
    const list = JSON.parse(u.notifyAuthors || '[]');
    if (list.includes(authorId)) db.prepare('INSERT INTO notifications (id,userId,fromId,type,postId,isRead,createdAt) VALUES (?,?,?,?,?,0,?)').run(uuid(), u.id, authorId, 'new_post', id, createdAt);
  }
  return getPostById(id);
}

export function getPostById(postId: string) { const p = db.prepare('SELECT * FROM posts WHERE id=?').get(postId) as any; return p ? enrichPost(p) : null; }
export function getFeed(page = 1, limit = 20) { return (db.prepare('SELECT * FROM posts ORDER BY createdAt DESC LIMIT ? OFFSET ?').all(limit, (page - 1) * limit) as any[]).map(enrichPost); }
export function getUserPosts(userId: string) { return (db.prepare('SELECT * FROM posts WHERE authorId=? ORDER BY createdAt DESC').all(userId) as any[]).map(enrichPost); }

export function deletePost(postId: string, userId: string) {
  const post = db.prepare('SELECT authorId FROM posts WHERE id=?').get(postId) as any;
  if (!post) return { error: 'Пост не найден' };
  const user = db.prepare('SELECT isAdmin FROM users WHERE id=?').get(userId) as any;
  if (post.authorId !== userId && !user?.isAdmin) return { error: 'Нет прав' };
  db.prepare('DELETE FROM posts WHERE id=?').run(postId); return { success: true };
}

export function toggleLike(postId: string, userId: string) {
  const post = db.prepare('SELECT likes,authorId FROM posts WHERE id=?').get(postId) as any;
  if (!post) return { error: 'Не найден' };
  const likes: string[] = JSON.parse(post.likes || '[]');
  const idx = likes.indexOf(userId);
  if (idx >= 0) likes.splice(idx, 1);
  else { likes.push(userId); if (post.authorId !== userId) db.prepare('INSERT INTO notifications (id,userId,fromId,type,postId,isRead,createdAt) VALUES (?,?,?,?,?,0,?)').run(uuid(), post.authorId, userId, 'like', postId, new Date().toISOString()); }
  db.prepare('UPDATE posts SET likes=? WHERE id=?').run(JSON.stringify(likes), postId); return { likes };
}

export function toggleRepost(postId: string, userId: string) {
  const post = db.prepare('SELECT reposts,authorId FROM posts WHERE id=?').get(postId) as any;
  if (!post) return { error: 'Не найден' };
  const reposts: string[] = JSON.parse(post.reposts || '[]');
  const idx = reposts.indexOf(userId);
  if (idx >= 0) reposts.splice(idx, 1);
  else { reposts.push(userId); if (post.authorId !== userId) db.prepare('INSERT INTO notifications (id,userId,fromId,type,postId,isRead,createdAt) VALUES (?,?,?,?,?,0,?)').run(uuid(), post.authorId, userId, 'repost', postId, new Date().toISOString()); }
  db.prepare('UPDATE posts SET reposts=? WHERE id=?').run(JSON.stringify(reposts), postId); return { reposts };
}

export function addComment(postId: string, authorId: string, content: string) {
  const id = uuid(); const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO comments (id,postId,authorId,content,createdAt) VALUES (?,?,?,?,?)').run(id, postId, authorId, content, createdAt);
  const post = db.prepare('SELECT authorId FROM posts WHERE id=?').get(postId) as any;
  if (post && post.authorId !== authorId) db.prepare('INSERT INTO notifications (id,userId,fromId,type,postId,isRead,createdAt) VALUES (?,?,?,?,?,0,?)').run(uuid(), post.authorId, authorId, 'comment', postId, createdAt);
  return getPostById(postId);
}

export function toggleFollow(followerId: string, followingId: string) {
  if (followerId === followingId) return { error: 'Нельзя подписаться на себя' };
  const existing = db.prepare('SELECT * FROM follows WHERE followerId=? AND followingId=?').get(followerId, followingId);
  if (existing) { db.prepare('DELETE FROM follows WHERE followerId=? AND followingId=?').run(followerId, followingId); return { following: false }; }
  db.prepare('INSERT INTO follows (followerId,followingId,createdAt) VALUES (?,?,?)').run(followerId, followingId, new Date().toISOString());
  db.prepare('INSERT INTO notifications (id,userId,fromId,type,postId,isRead,createdAt) VALUES (?,?,?,?,?,0,?)').run(uuid(), followingId, followerId, 'follow', '', new Date().toISOString());
  return { following: true };
}

export function isFollowing(followerId: string, followingId: string) { return !!db.prepare('SELECT * FROM follows WHERE followerId=? AND followingId=?').get(followerId, followingId); }

export function sendMessage(fromId: string, toId: string, content: string) {
  const id = uuid(); const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO messages (id,fromId,toId,content,isRead,createdAt) VALUES (?,?,?,?,0,?)').run(id, fromId, toId, content, createdAt);
  db.prepare('INSERT INTO notifications (id,userId,fromId,type,postId,isRead,createdAt) VALUES (?,?,?,?,?,0,?)').run(uuid(), toId, fromId, 'message', '', createdAt);
  return { id, fromId, toId, content, isRead: false, createdAt };
}

export function getConversations(userId: string) {
  const rows = db.prepare('SELECT DISTINCT CASE WHEN fromId=? THEN toId ELSE fromId END as partnerId FROM messages WHERE fromId=? OR toId=?').all(userId, userId, userId) as any[];
  return rows.map((r: any) => {
    const partner = db.prepare('SELECT id,username,displayName,avatarUrl,isVerified,isAdmin FROM users WHERE id=?').get(r.partnerId) as any;
    const lastMsg = db.prepare('SELECT * FROM messages WHERE (fromId=? AND toId=?) OR (fromId=? AND toId=?) ORDER BY createdAt DESC LIMIT 1').get(userId, r.partnerId, r.partnerId, userId) as any;
    const unread = db.prepare('SELECT COUNT(*) as c FROM messages WHERE fromId=? AND toId=? AND isRead=0').get(r.partnerId, userId) as any;
    return { partner: partner ? { ...partner, isVerified: !!partner.isVerified, isAdmin: !!partner.isAdmin } : null, lastMessage: lastMsg, unreadCount: unread.c };
  }).filter(c => c.partner);
}

export function getMessages(userId: string, partnerId: string) {
  db.prepare('UPDATE messages SET isRead=1 WHERE fromId=? AND toId=?').run(partnerId, userId);
  return (db.prepare('SELECT * FROM messages WHERE (fromId=? AND toId=?) OR (fromId=? AND toId=?) ORDER BY createdAt ASC').all(userId, partnerId, partnerId, userId) as any[]).map((m: any) => ({ ...m, isRead: !!m.isRead }));
}

export function getUnreadCount(userId: string) { return (db.prepare('SELECT COUNT(*) as c FROM messages WHERE toId=? AND isRead=0').get(userId) as any).c; }

export function getNotifications(userId: string) {
  return (db.prepare('SELECT n.*,u.username,u.displayName,u.avatarUrl,u.isVerified,u.isAdmin FROM notifications n JOIN users u ON n.fromId=u.id WHERE n.userId=? ORDER BY n.createdAt DESC LIMIT 50').all(userId) as any[])
    .map((n: any) => ({ id: n.id, userId: n.userId, fromId: n.fromId, type: n.type, postId: n.postId, isRead: !!n.isRead, createdAt: n.createdAt, from: { username: n.username, displayName: n.displayName, avatarUrl: n.avatarUrl, isVerified: !!n.isVerified, isAdmin: !!n.isAdmin } }));
}

export function markNotificationsRead(userId: string) { db.prepare('UPDATE notifications SET isRead=1 WHERE userId=?').run(userId); }
export function getUnreadNotifications(userId: string) { return (db.prepare('SELECT COUNT(*) as c FROM notifications WHERE userId=? AND isRead=0').get(userId) as any).c; }

export function toggleNotifyAuthor(userId: string, authorId: string) {
  const user = db.prepare('SELECT notifyAuthors FROM users WHERE id=?').get(userId) as any;
  if (!user) return { error: 'Не найден' };
  const list: string[] = JSON.parse(user.notifyAuthors || '[]');
  const idx = list.indexOf(authorId);
  if (idx >= 0) list.splice(idx, 1); else list.push(authorId);
  db.prepare('UPDATE users SET notifyAuthors=? WHERE id=?').run(JSON.stringify(list), userId);
  return { notifyAuthors: list };
}

export function submitVerification(userId: string, data: any) {
  if (db.prepare('SELECT id FROM verification_requests WHERE userId=? AND status=?').get(userId, 'pending')) return { error: 'Заявка уже подана' };
  const id = uuid();
  db.prepare('INSERT INTO verification_requests (id,userId,fullName,reason,category,socialLinks,documentUrl,additionalInfo,status,submittedAt,reviewDeadline) VALUES (?,?,?,?,?,?,?,?,\'pending\',?,?)')
    .run(id, userId, data.fullName, data.reason, data.category, data.socialLinks || '', data.documentUrl || '', data.additionalInfo || '', new Date().toISOString(), new Date(Date.now() + (3 + Math.random()) * 86400000).toISOString());
  return { success: true };
}

export function getVerificationStatus(userId: string) { return db.prepare('SELECT * FROM verification_requests WHERE userId=? ORDER BY submittedAt DESC LIMIT 1').get(userId) as any || null; }
export function getAllVerificationRequests() { return db.prepare('SELECT vr.*,u.username,u.displayName,u.avatarUrl FROM verification_requests vr JOIN users u ON vr.userId=u.id ORDER BY vr.submittedAt DESC').all() as any[]; }

export function approveVerification(requestId: string) {
  const r = db.prepare('SELECT userId FROM verification_requests WHERE id=?').get(requestId) as any;
  if (!r) return { error: 'Не найдена' };
  db.prepare('UPDATE verification_requests SET status=? WHERE id=?').run('approved', requestId);
  db.prepare('UPDATE users SET isVerified=1 WHERE id=?').run(r.userId);
  return { success: true };
}

export function rejectVerification(requestId: string, reason: string) {
  db.prepare('UPDATE verification_requests SET status=?,rejectReason=? WHERE id=?').run('rejected', reason, requestId);
  return { success: true };
}

export function searchUsers(query: string) {
  const q = `%${query}%`;
  return (db.prepare('SELECT id,username,displayName,avatarUrl,isVerified,isAdmin,bio FROM users WHERE username LIKE ? OR displayName LIKE ? LIMIT 20').all(q, q) as any[])
    .map((u: any) => ({ ...u, isVerified: !!u.isVerified, isAdmin: !!u.isAdmin }));
}

export function getAllUsers() { return (db.prepare('SELECT * FROM users ORDER BY createdAt DESC').all() as any[]).map(sanitizeUser); }

export function deleteUser(userId: string, adminId: string) {
  const admin = db.prepare('SELECT isAdmin FROM users WHERE id=?').get(adminId) as any;
  if (!admin?.isAdmin) return { error: 'Нет прав' };
  if ((db.prepare('SELECT isAdmin FROM users WHERE id=?').get(userId) as any)?.isAdmin) return { error: 'Нельзя удалить админа' };
  db.prepare('DELETE FROM users WHERE id=?').run(userId); return { success: true };
}

export function toggleUserVerification(userId: string, adminId: string) {
  const admin = db.prepare('SELECT isAdmin FROM users WHERE id=?').get(adminId) as any;
  if (!admin?.isAdmin) return { error: 'Нет прав' };
  const user = db.prepare('SELECT isVerified FROM users WHERE id=?').get(userId) as any;
  if (!user) return { error: 'Не найден' };
  db.prepare('UPDATE users SET isVerified=? WHERE id=?').run(user.isVerified ? 0 : 1, userId);
  return { success: true };
}

export function getStats() {
  return {
    users: (db.prepare('SELECT COUNT(*) as c FROM users').get() as any).c,
    posts: (db.prepare('SELECT COUNT(*) as c FROM posts').get() as any).c,
    messages: (db.prepare('SELECT COUNT(*) as c FROM messages').get() as any).c,
    verified: (db.prepare('SELECT COUNT(*) as c FROM users WHERE isVerified=1').get() as any).c,
    pendingVerifications: (db.prepare('SELECT COUNT(*) as c FROM verification_requests WHERE status=?').get('pending') as any).c,
  };
}

export default db;
