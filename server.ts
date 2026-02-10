import express from 'express';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import {
  initDatabase, registerUser, loginUser, getUserById, getUserByUsername,
  updateProfile, createPost, getFeed, getUserPosts, deletePost, toggleLike,
  toggleRepost, addComment, toggleFollow, isFollowing,
  sendMessage, getConversations, getMessages, getUnreadCount,
  getNotifications, markNotificationsRead, getUnreadNotifications,
  toggleNotifyAuthor, submitVerification, getVerificationStatus,
  getAllVerificationRequests, approveVerification, rejectVerification,
  searchUsers, getAllUsers, deleteUser, toggleUserVerification, getStats
} from './server-database.js';

const app = express();
const PORT = parseInt(process.env.PORT || '3001');

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(process.cwd(), 'dist')));

// AUTH
app.post('/api/auth/register', (req, res) => {
  const { username, displayName, password } = req.body;
  if (!username || !displayName || !password) return res.status(400).json({ error: 'Заполните все поля' });
  if (username.length < 3) return res.status(400).json({ error: 'Имя пользователя минимум 3 символа' });
  if (password.length < 6) return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  const result = registerUser(username.toLowerCase().trim(), displayName.trim(), password);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Заполните все поля' });
  const result = loginUser(username.toLowerCase().trim(), password);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/users/:id', (req, res) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  res.json(user);
});

app.get('/api/users/username/:username', (req, res) => {
  const user = getUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'Не найден' });
  res.json(user);
});

// PROFILE
app.put('/api/profile/:userId', (req, res) => { res.json(updateProfile(req.params.userId, req.body)); });

// POSTS
app.post('/api/posts', (req, res) => {
  const { authorId, content } = req.body;
  if (!authorId || !content) return res.status(400).json({ error: 'Пустой пост' });
  if (content.length > 500) return res.status(400).json({ error: 'Максимум 500 символов' });
  res.json(createPost(authorId, content.trim()));
});

app.get('/api/posts', (req, res) => {
  res.json(getFeed(parseInt(req.query.page as string) || 1, parseInt(req.query.limit as string) || 20));
});

app.get('/api/posts/user/:userId', (req, res) => { res.json(getUserPosts(req.params.userId)); });

app.delete('/api/posts/:postId', (req, res) => {
  const result = deletePost(req.params.postId, req.body.userId);
  if ('error' in result) return res.status(403).json(result);
  res.json(result);
});

app.post('/api/posts/:postId/like', (req, res) => {
  const result = toggleLike(req.params.postId, req.body.userId);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/posts/:postId/repost', (req, res) => {
  const result = toggleRepost(req.params.postId, req.body.userId);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

app.post('/api/posts/:postId/comment', (req, res) => {
  const { authorId, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Пустой комментарий' });
  res.json(addComment(req.params.postId, authorId, content.trim()));
});

// FOLLOWS
app.post('/api/follow', (req, res) => {
  const result = toggleFollow(req.body.followerId, req.body.followingId);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/follow/check/:followerId/:followingId', (req, res) => {
  res.json({ following: isFollowing(req.params.followerId, req.params.followingId) });
});

// MESSAGES
app.post('/api/messages', (req, res) => {
  const { fromId, toId, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Пустое сообщение' });
  res.json(sendMessage(fromId, toId, content.trim()));
});

app.get('/api/messages/conversations/:userId', (req, res) => { res.json(getConversations(req.params.userId)); });
app.get('/api/messages/:userId/:partnerId', (req, res) => { res.json(getMessages(req.params.userId, req.params.partnerId)); });
app.get('/api/messages/unread/:userId', (req, res) => { res.json({ count: getUnreadCount(req.params.userId) }); });

// NOTIFICATIONS
app.get('/api/notifications/:userId', (req, res) => { res.json(getNotifications(req.params.userId)); });
app.post('/api/notifications/read/:userId', (req, res) => { markNotificationsRead(req.params.userId); res.json({ success: true }); });
app.get('/api/notifications/unread/:userId', (req, res) => { res.json({ count: getUnreadNotifications(req.params.userId) }); });

// NOTIFY AUTHORS
app.post('/api/notify-author', (req, res) => {
  const result = toggleNotifyAuthor(req.body.userId, req.body.authorId);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

// VERIFICATION
app.post('/api/verification', (req, res) => {
  const { userId, ...data } = req.body;
  const result = submitVerification(userId, data);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/verification/:userId', (req, res) => { res.json(getVerificationStatus(req.params.userId)); });
app.get('/api/verification', (req, res) => { res.json(getAllVerificationRequests()); });
app.post('/api/verification/:requestId/approve', (req, res) => {
  const result = approveVerification(req.params.requestId);
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});
app.post('/api/verification/:requestId/reject', (req, res) => {
  const result = rejectVerification(req.params.requestId, req.body.reason || '');
  if ('error' in result) return res.status(400).json(result);
  res.json(result);
});

// SEARCH
app.get('/api/search', (req, res) => {
  const q = (req.query.q as string) || '';
  if (q.length < 2) return res.json([]);
  res.json(searchUsers(q));
});

// ADMIN
app.get('/api/admin/users', (req, res) => { res.json(getAllUsers()); });
app.delete('/api/admin/users/:userId', (req, res) => {
  const result = deleteUser(req.params.userId, req.body.adminId);
  if ('error' in result) return res.status(403).json(result);
  res.json(result);
});
app.post('/api/admin/verify/:userId', (req, res) => {
  const result = toggleUserVerification(req.params.userId, req.body.adminId);
  if ('error' in result) return res.status(403).json(result);
  res.json(result);
});
app.get('/api/admin/stats', (req, res) => { res.json(getStats()); });

// SPA fallback
app.get('*', (req, res) => { res.sendFile(path.join(process.cwd(), 'dist', 'index.html')); });

initDatabase();
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Netta server running on port ${PORT}`);
  console.log(`📁 Database stored in ./data/netta.db`);
});
