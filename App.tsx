import { useState, useEffect, useCallback, useRef } from 'react';
import { authAPI, profileAPI, postsAPI, followAPI, messagesAPI, notificationsAPI, notifyAuthorAPI, verificationAPI, searchAPI, adminAPI, playNotificationSound } from './api';

// ==================== TYPES ====================
interface User {
  id: string; username: string; displayName: string; bio: string; avatarUrl: string;
  isVerified: boolean; isAdmin: boolean; notifyAuthors: string[];
  followers: number; following: number; createdAt: string;
}
interface PostAuthor { id: string; username: string; displayName: string; avatarUrl: string; isVerified: boolean; isAdmin: boolean; }
interface Comment { id: string; postId: string; authorId: string; content: string; createdAt: string; author: PostAuthor; }
interface Post { id: string; authorId: string; content: string; likes: string[]; reposts: string[]; createdAt: string; author: PostAuthor; comments: Comment[]; }
interface Notification { id: string; userId: string; fromId: string; type: string; postId: string; isRead: boolean; createdAt: string; from: PostAuthor; }
interface Conversation { partner: PostAuthor & { bio?: string }; lastMessage: any; unreadCount: number; }
interface Message { id: string; fromId: string; toId: string; content: string; isRead: boolean; createdAt: string; }

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return `${s}с`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}м`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}ч`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}д`;
  return new Date(date).toLocaleDateString('ru');
}

// ==================== BADGE ====================
function Badge({ isVerified, isAdmin, size = 16 }: { isVerified: boolean; isAdmin: boolean; size?: number }) {
  if (!isVerified && !isAdmin) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block ml-1 flex-shrink-0">
      <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
        stroke={isAdmin ? '#ef4444' : '#3b82f6'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill={isAdmin ? '#fecaca' : '#dbeafe'} />
    </svg>
  );
}

// ==================== AVATAR ====================
function Avatar({ url, name, size = 40 }: { url?: string; name: string; size?: number }) {
  const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];
  const color = colors[name.charCodeAt(0) % colors.length];
  if (url) return <img src={url} alt={name} style={{ width: size, height: size }} className="rounded-full object-cover" />;
  return (
    <div style={{ width: size, height: size, backgroundColor: color }} className="rounded-full flex items-center justify-center text-white font-bold" >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ==================== AUTH SCREEN ====================
function AuthScreen({ onLogin }: { onLogin: (u: User) => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        const res = await authAPI.register(username, displayName, password);
        localStorage.setItem('netta_user', JSON.stringify(res.user));
        onLogin(res.user);
      } else {
        const res = await authAPI.login(username, password);
        localStorage.setItem('netta_user', JSON.stringify(res.user));
        onLogin(res.user);
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-slate-900 to-purple-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
            <svg width="40" height="40" viewBox="0 0 48 48" fill="white"><path d="M24 4L8 14v20l16 10 16-10V14L24 4zm0 4l12 7.5v15L24 38 12 30.5v-15L24 8z"/><circle cx="24" cy="24" r="6" fill="white"/></svg>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Netta</h1>
          <p className="text-blue-300 mt-2">Социальная сеть нового поколения</p>
        </div>

        <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-slate-700/50">
          <div className="flex mb-6 bg-slate-700/50 rounded-xl p-1">
            <button onClick={() => { setIsRegister(false); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${!isRegister ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Вход</button>
            <button onClick={() => { setIsRegister(true); setError(''); }} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${isRegister ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>Регистрация</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Имя пользователя</label>
              <input value={username} onChange={e => setUsername(e.target.value)} placeholder="username" className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" required />
            </div>
            {isRegister && (
              <div>
                <label className="block text-sm text-slate-400 mb-1.5">Отображаемое имя</label>
                <input value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Ваше имя" className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" required />
              </div>
            )}
            <div>
              <label className="block text-sm text-slate-400 mb-1.5">Пароль</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition" required />
            </div>
            {error && <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50">
              {loading ? 'Загрузка...' : isRegister ? 'Создать аккаунт' : 'Войти'}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-1"><Badge isVerified={true} isAdmin={false} size={14} /> Верификация</div>
              <div className="flex items-center gap-1"><Badge isVerified={true} isAdmin={true} size={14} /> Администратор</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== POST CARD ====================
function PostCard({ post, currentUser, onRefresh }: { post: Post; currentUser: User; onRefresh: () => void }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [busy, setBusy] = useState(false);

  const isLiked = post.likes.includes(currentUser.id);
  const isReposted = post.reposts.includes(currentUser.id);

  const handleLike = async () => { setBusy(true); try { await postsAPI.like(post.id, currentUser.id); onRefresh(); } catch {} setBusy(false); };
  const handleRepost = async () => { setBusy(true); try { await postsAPI.repost(post.id, currentUser.id); onRefresh(); } catch {} setBusy(false); };
  const handleDelete = async () => { if (!confirm('Удалить пост?')) return; try { await postsAPI.delete(post.id, currentUser.id); onRefresh(); } catch {} };
  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setBusy(true);
    try { await postsAPI.comment(post.id, currentUser.id, commentText); setCommentText(''); onRefresh(); } catch {}
    setBusy(false);
  };

  return (
    <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 sm:p-5 border border-slate-700/50 hover:border-slate-600/50 transition-all">
      <div className="flex items-start gap-3">
        <Avatar url={post.author?.avatarUrl} name={post.author?.displayName || '?'} size={44} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 flex-wrap">
            <span className="font-bold text-white text-sm sm:text-base truncate">{post.author?.displayName}</span>
            <Badge isVerified={post.author?.isVerified} isAdmin={post.author?.isAdmin} size={16} />
            <span className="text-slate-500 text-sm truncate">@{post.author?.username}</span>
            <span className="text-slate-600 text-sm">· {timeAgo(post.createdAt)}</span>
          </div>
          <p className="text-slate-200 mt-2 whitespace-pre-wrap break-words text-sm sm:text-base leading-relaxed">{post.content}</p>
          <div className="flex items-center gap-1 sm:gap-4 mt-3 -ml-2">
            <button onClick={() => setShowComments(!showComments)} className="flex items-center gap-1.5 text-slate-500 hover:text-blue-400 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-blue-500/10 transition text-sm">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
              <span>{post.comments.length}</span>
            </button>
            <button onClick={handleRepost} disabled={busy} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg transition text-sm ${isReposted ? 'text-green-400 bg-green-500/10' : 'text-slate-500 hover:text-green-400 hover:bg-green-500/10'}`}>
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 7l-7 7-7-7M5 17l7-7 7 7"/></svg>
              <span>{post.reposts.length}</span>
            </button>
            <button onClick={handleLike} disabled={busy} className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg transition text-sm ${isLiked ? 'text-red-400 bg-red-500/10' : 'text-slate-500 hover:text-red-400 hover:bg-red-500/10'}`}>
              <svg width="18" height="18" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>
              <span>{post.likes.length}</span>
            </button>
            {(post.authorId === currentUser.id || currentUser.isAdmin) && (
              <button onClick={handleDelete} className="flex items-center text-slate-500 hover:text-red-400 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition ml-auto text-sm">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            )}
          </div>
          {showComments && (
            <div className="mt-3 space-y-3 border-t border-slate-700/50 pt-3">
              {post.comments.map(c => (
                <div key={c.id} className="flex items-start gap-2">
                  <Avatar url={c.author?.avatarUrl} name={c.author?.displayName || '?'} size={28} />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-white text-xs">{c.author?.displayName}</span>
                      <Badge isVerified={c.author?.isVerified} isAdmin={c.author?.isAdmin} size={12} />
                      <span className="text-slate-500 text-xs">· {timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-slate-300 text-sm">{c.content}</p>
                  </div>
                </div>
              ))}
              <form onSubmit={handleComment} className="flex gap-2">
                <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Комментарий..." className="flex-1 bg-slate-700/50 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button type="submit" disabled={busy || !commentText.trim()} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-blue-500 disabled:opacity-50 transition">→</button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== FEED ====================
function Feed({ currentUser }: { currentUser: User }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [loading, setLoading] = useState(true);

  const loadPosts = useCallback(async () => {
    try { const p = await postsAPI.getFeed(); setPosts(p); } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadPosts(); const i = setInterval(loadPosts, 5000); return () => clearInterval(i); }, [loadPosts]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPost.trim()) return;
    try { await postsAPI.create(currentUser.id, newPost); setNewPost(''); loadPosts(); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 sm:p-5 border border-slate-700/50">
        <form onSubmit={handlePost}>
          <div className="flex gap-3">
            <Avatar url={currentUser.avatarUrl} name={currentUser.displayName} size={44} />
            <textarea value={newPost} onChange={e => setNewPost(e.target.value)} placeholder="Что нового?" maxLength={500}
              className="flex-1 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none text-base sm:text-lg" rows={3} />
          </div>
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700/50">
            <span className={`text-sm ${newPost.length > 450 ? 'text-red-400' : 'text-slate-500'}`}>{newPost.length}/500</span>
            <button type="submit" disabled={!newPost.trim()} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-2 rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 disabled:opacity-50 transition-all text-sm sm:text-base">Опубликовать</button>
          </div>
        </form>
      </div>
      {loading ? (
        <div className="text-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <svg width="48" height="48" fill="none" stroke="currentColor" className="mx-auto mb-3 opacity-50" viewBox="0 0 24 24"><path strokeWidth="1" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg>
          <p>Пока нет постов. Будьте первым!</p>
        </div>
      ) : posts.map(p => <PostCard key={p.id} post={p} currentUser={currentUser} onRefresh={loadPosts} />)}
    </div>
  );
}

// ==================== PROFILE PAGE ====================
function ProfilePage({ userId, currentUser, onRefreshUser }: { userId: string; currentUser: User; onRefreshUser: () => void }) {
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({ displayName: '', bio: '', avatarUrl: '' });
  const [showVerForm, setShowVerForm] = useState(false);
  const [verStatus, setVerStatus] = useState<any>(null);
  const [verForm, setVerForm] = useState({ fullName: '', reason: '', category: 'blogger', socialLinks: '', documentUrl: '', additionalInfo: '' });
  const [verStep, setVerStep] = useState(1);
  const isOwn = userId === currentUser.id;
  const isNotifying = currentUser.notifyAuthors?.includes(userId);

  const loadProfile = useCallback(async () => {
    try {
      const u = await authAPI.getUser(userId);
      setProfile(u);
      const p = await postsAPI.getUserPosts(userId);
      setPosts(p);
      if (!isOwn) {
        const f = await followAPI.check(currentUser.id, userId);
        setIsFollowing(f.following);
      } else {
        const v = await verificationAPI.getStatus(userId);
        setVerStatus(v);
      }
    } catch {}
  }, [userId, currentUser.id, isOwn]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const handleFollow = async () => { try { const r = await followAPI.toggle(currentUser.id, userId); setIsFollowing(r.following); loadProfile(); } catch {} };
  const handleNotify = async () => { try { await notifyAuthorAPI.toggle(currentUser.id, userId); onRefreshUser(); } catch {} };

  const handleSaveProfile = async () => {
    try { await profileAPI.update(currentUser.id, editData); setEditing(false); loadProfile(); onRefreshUser(); } catch {}
  };

  const handleSubmitVerification = async () => {
    try { await verificationAPI.submit(currentUser.id, verForm); setShowVerForm(false); loadProfile(); } catch {}
  };

  if (!profile) return <div className="text-center py-12"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" /></div>;

  const categories: Record<string, string> = { blogger: 'Блогер', journalist: 'Журналист', musician: 'Музыкант', developer: 'Разработчик', business: 'Бизнес', public_figure: 'Публичная личность', other: 'Другое' };

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-700/50 overflow-hidden">
        <div className="h-24 sm:h-32 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600" />
        <div className="px-4 sm:px-6 pb-5">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3 -mt-10 sm:-mt-12">
            <div className="ring-4 ring-slate-800 rounded-full"><Avatar url={profile.avatarUrl} name={profile.displayName} size={80} /></div>
            <div className="flex-1" />
            {isOwn ? (
              <button onClick={() => { setEditData({ displayName: profile.displayName, bio: profile.bio, avatarUrl: profile.avatarUrl }); setEditing(true); }} className="bg-slate-700 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-slate-600 transition">Редактировать</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleNotify} className={`p-2 rounded-xl transition ${isNotifying ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}`} title="Уведомления о постах">
                  <svg width="20" height="20" fill={isNotifying ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
                </button>
                <button onClick={handleFollow} className={`px-5 py-2 rounded-xl text-sm font-semibold transition ${isFollowing ? 'bg-slate-700 text-white hover:bg-red-600' : 'bg-blue-600 text-white hover:bg-blue-500'}`}>
                  {isFollowing ? 'Отписаться' : 'Подписаться'}
                </button>
              </div>
            )}
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-1">
              <h2 className="text-xl font-bold text-white">{profile.displayName}</h2>
              <Badge isVerified={profile.isVerified} isAdmin={profile.isAdmin} size={20} />
            </div>
            <p className="text-slate-500 text-sm">@{profile.username}</p>
            {profile.bio && <p className="text-slate-300 mt-2 text-sm">{profile.bio}</p>}
            <div className="flex gap-4 mt-3 text-sm">
              <span><b className="text-white">{profile.following}</b> <span className="text-slate-500">подписок</span></span>
              <span><b className="text-white">{profile.followers}</b> <span className="text-slate-500">подписчиков</span></span>
            </div>
          </div>

          {isOwn && !profile.isVerified && !profile.isAdmin && (
            <div className="mt-4">
              {verStatus?.status === 'pending' ? (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                  <h4 className="text-yellow-400 font-semibold flex items-center gap-2"><svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>Заявка на рассмотрении</h4>
                  <p className="text-slate-400 text-sm mt-1">Подана: {new Date(verStatus.submittedAt).toLocaleDateString('ru')}</p>
                  <p className="text-slate-400 text-sm">Рассмотрение до: {new Date(verStatus.reviewDeadline).toLocaleDateString('ru')}</p>
                  <p className="text-yellow-300/70 text-xs mt-2">Ожидайте 3-4 дня. Администратор рассмотрит вашу заявку.</p>
                </div>
              ) : verStatus?.status === 'rejected' ? (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                  <h4 className="text-red-400 font-semibold">Заявка отклонена</h4>
                  {verStatus.rejectReason && <p className="text-slate-400 text-sm mt-1">Причина: {verStatus.rejectReason}</p>}
                  <button onClick={() => setShowVerForm(true)} className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm hover:bg-blue-500 transition">Подать заново</button>
                </div>
              ) : (
                <button onClick={() => setShowVerForm(true)} className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:from-blue-500 hover:to-cyan-500 transition-all flex items-center gap-2">
                  <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                  Запросить верификацию
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setEditing(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-4">Редактировать профиль</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-400 mb-1">Имя</label><input value={editData.displayName} onChange={e => setEditData({ ...editData, displayName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">О себе</label><textarea value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm text-slate-400 mb-1">URL аватара</label><input value={editData.avatarUrl} onChange={e => setEditData({ ...editData, avatarUrl: e.target.value })} placeholder="https://..." className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(false)} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-medium hover:bg-slate-600 transition">Отмена</button>
              <button onClick={handleSaveProfile} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-500 transition">Сохранить</button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Form Modal */}
      {showVerForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowVerForm(false)}>
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-lg border border-slate-700 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-white mb-2">Заявка на верификацию</h3>
            <p className="text-slate-400 text-sm mb-4">Заполните анкету. Рассмотрение займёт 3-4 дня.</p>

            <div className="flex gap-2 mb-6">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full ${s <= verStep ? 'bg-blue-500' : 'bg-slate-700'}`} />
              ))}
            </div>

            {verStep === 1 && (
              <div className="space-y-4">
                <div><label className="block text-sm text-slate-400 mb-1">Полное имя *</label><input value={verForm.fullName} onChange={e => setVerForm({ ...verForm, fullName: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                <div><label className="block text-sm text-slate-400 mb-1">Почему вы хотите верификацию? *</label><textarea value={verForm.reason} onChange={e => setVerForm({ ...verForm, reason: e.target.value })} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" required /></div>
                <button onClick={() => { if (verForm.fullName && verForm.reason) setVerStep(2); }} className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-500 transition">Далее →</button>
              </div>
            )}

            {verStep === 2 && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-400 mb-1">Категория *</label>
                  <select value={verForm.category} onChange={e => setVerForm({ ...verForm, category: e.target.value })} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {Object.entries(categories).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div><label className="block text-sm text-slate-400 mb-1">Ссылки на другие аккаунты</label><input value={verForm.socialLinks} onChange={e => setVerForm({ ...verForm, socialLinks: e.target.value })} placeholder="Instagram, YouTube, Telegram..." className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="flex gap-3">
                  <button onClick={() => setVerStep(1)} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-medium hover:bg-slate-600 transition">← Назад</button>
                  <button onClick={() => setVerStep(3)} className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-500 transition">Далее →</button>
                </div>
              </div>
            )}

            {verStep === 3 && (
              <div className="space-y-4">
                <div><label className="block text-sm text-slate-400 mb-1">Ссылка на документ (по желанию)</label><input value={verForm.documentUrl} onChange={e => setVerForm({ ...verForm, documentUrl: e.target.value })} placeholder="Google Drive, Dropbox..." className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div><label className="block text-sm text-slate-400 mb-1">Дополнительная информация</label><textarea value={verForm.additionalInfo} onChange={e => setVerForm({ ...verForm, additionalInfo: e.target.value })} rows={3} className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-3 text-white resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
                <div className="bg-slate-700/50 rounded-xl p-4 text-sm">
                  <h4 className="text-white font-semibold mb-2">Сводка заявки:</h4>
                  <p className="text-slate-400">Имя: <span className="text-white">{verForm.fullName}</span></p>
                  <p className="text-slate-400">Категория: <span className="text-white">{categories[verForm.category]}</span></p>
                  <p className="text-slate-400">Причина: <span className="text-white">{verForm.reason}</span></p>
                  <p className="text-yellow-400 mt-2 text-xs">⏳ Рассмотрение займёт 3-4 дня</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setVerStep(2)} className="flex-1 bg-slate-700 text-white py-3 rounded-xl font-medium hover:bg-slate-600 transition">← Назад</button>
                  <button onClick={handleSubmitVerification} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 rounded-xl font-semibold hover:from-blue-500 hover:to-purple-500 transition-all">Отправить</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Posts */}
      <h3 className="text-lg font-bold text-white px-1">Посты</h3>
      {posts.length === 0 ? (
        <p className="text-slate-500 text-center py-8">Нет постов</p>
      ) : posts.map(p => <PostCard key={p.id} post={p} currentUser={currentUser} onRefresh={loadProfile} />)}
    </div>
  );
}

// ==================== SEARCH ====================
function SearchPage({ currentUser }: { currentUser: User }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  const handleSearch = async (q: string) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }
    try { const r = await searchAPI.users(q); setResults(r); } catch {}
  };

  if (selectedUser) return <ProfilePage userId={selectedUser} currentUser={currentUser} onRefreshUser={() => {}} />;

  return (
    <div className="space-y-4">
      <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
          <input value={query} onChange={e => handleSearch(e.target.value)} placeholder="Поиск пользователей..." className="w-full bg-slate-700/50 border border-slate-600 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      {results.map(u => (
        <button key={u.id} onClick={() => setSelectedUser(u.id)} className="w-full bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition flex items-center gap-3 text-left">
          <Avatar url={u.avatarUrl} name={u.displayName} size={48} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1"><span className="font-bold text-white truncate">{u.displayName}</span><Badge isVerified={u.isVerified} isAdmin={u.isAdmin} /></div>
            <p className="text-slate-500 text-sm">@{u.username}</p>
            {u.bio && <p className="text-slate-400 text-sm truncate mt-1">{u.bio}</p>}
          </div>
        </button>
      ))}
    </div>
  );
}

// ==================== NOTIFICATIONS ====================
function NotificationsPage({ currentUser }: { currentUser: User }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const load = async () => {
      try { const n = await notificationsAPI.get(currentUser.id); setNotifications(n); await notificationsAPI.markRead(currentUser.id); } catch {}
    };
    load();
  }, [currentUser.id]);

  const typeText: Record<string, string> = { like: 'оценил(а) ваш пост ❤️', comment: 'прокомментировал(а) 💬', repost: 'сделал(а) репост 🔄', follow: 'подписался(-ась) на вас 👋', new_post: 'опубликовал(а) новый пост 📝', message: 'отправил(а) сообщение ✉️' };

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-bold text-white px-1">Уведомления</h2>
      {notifications.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <svg width="48" height="48" fill="none" stroke="currentColor" className="mx-auto mb-3 opacity-50" viewBox="0 0 24 24"><path strokeWidth="1" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
          <p>Нет уведомлений</p>
        </div>
      ) : notifications.map(n => (
        <div key={n.id} className={`flex items-start gap-3 p-4 rounded-2xl border transition ${n.isRead ? 'bg-slate-800/40 border-slate-700/50' : 'bg-blue-500/10 border-blue-500/30'}`}>
          <Avatar url={n.from?.avatarUrl} name={n.from?.displayName || '?'} size={40} />
          <div className="flex-1 min-w-0">
            <p className="text-sm"><span className="text-white font-semibold">{n.from?.displayName}</span>{' '}<span className="text-slate-400">{typeText[n.type] || n.type}</span></p>
            <p className="text-slate-500 text-xs mt-1">{timeAgo(n.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== MESSAGES ====================
function MessagesPage({ currentUser }: { currentUser: User }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [newConvUser, setNewConvUser] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    try { const c = await messagesAPI.getConversations(currentUser.id); setConversations(c); } catch {}
  }, [currentUser.id]);

  useEffect(() => { loadConversations(); }, [loadConversations]);

  const loadMessages = useCallback(async (partnerId: string) => {
    try { const m = await messagesAPI.getMessages(currentUser.id, partnerId); setMessages(m); setTimeout(() => messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }), 100); } catch {}
  }, [currentUser.id]);

  useEffect(() => { if (selectedPartner) { loadMessages(selectedPartner); const i = setInterval(() => loadMessages(selectedPartner), 3000); return () => clearInterval(i); } }, [selectedPartner, loadMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !selectedPartner) return;
    try { await messagesAPI.send(currentUser.id, selectedPartner, newMsg); setNewMsg(''); loadMessages(selectedPartner); } catch {}
  };

  const handleSearchUser = async (q: string) => {
    setNewConvUser(q);
    if (q.length < 2) { setSearchResults([]); return; }
    try { const r = await searchAPI.users(q); setSearchResults(r.filter((u: any) => u.id !== currentUser.id)); } catch {}
  };

  if (selectedPartner) {
    const partner = conversations.find(c => c.partner.id === selectedPartner)?.partner;
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] sm:h-[calc(100vh-8rem)]">
        <div className="flex items-center gap-3 bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 mb-3">
          <button onClick={() => setSelectedPartner(null)} className="text-slate-400 hover:text-white transition">
            <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7"/></svg>
          </button>
          {partner && <Avatar url={partner.avatarUrl} name={partner.displayName} size={36} />}
          <div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-white text-sm">{partner?.displayName || 'Чат'}</span>
              {partner && <Badge isVerified={partner.isVerified} isAdmin={partner.isAdmin} size={14} />}
            </div>
            {partner && <p className="text-slate-500 text-xs">@{partner.username}</p>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-2 px-1">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.fromId === currentUser.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${m.fromId === currentUser.id ? 'bg-blue-600 text-white rounded-br-md' : 'bg-slate-700 text-slate-200 rounded-bl-md'}`}>
                <p>{m.content}</p>
                <p className={`text-xs mt-1 ${m.fromId === currentUser.id ? 'text-blue-200' : 'text-slate-500'}`}>{timeAgo(m.createdAt)}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEnd} />
        </div>
        <form onSubmit={handleSend} className="flex gap-2 mt-3">
          <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="Сообщение..." className="flex-1 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit" disabled={!newMsg.trim()} className="bg-blue-600 text-white px-5 py-3 rounded-xl font-medium hover:bg-blue-500 disabled:opacity-50 transition">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white px-1">Сообщения</h2>
      <div className="bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
        <input value={newConvUser} onChange={e => handleSearchUser(e.target.value)} placeholder="Начать новый диалог..." className="w-full bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        {searchResults.map(u => (
          <button key={u.id} onClick={() => { setSelectedPartner(u.id); setNewConvUser(''); setSearchResults([]); }} className="w-full flex items-center gap-3 p-3 hover:bg-slate-700/50 rounded-xl transition mt-2 text-left">
            <Avatar url={u.avatarUrl} name={u.displayName} size={36} />
            <div><div className="flex items-center gap-1"><span className="text-white text-sm font-medium">{u.displayName}</span><Badge isVerified={u.isVerified} isAdmin={u.isAdmin} size={14} /></div><p className="text-slate-500 text-xs">@{u.username}</p></div>
          </button>
        ))}
      </div>
      {conversations.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <svg width="48" height="48" fill="none" stroke="currentColor" className="mx-auto mb-3 opacity-50" viewBox="0 0 24 24"><path strokeWidth="1" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
          <p>Нет диалогов. Найдите собеседника!</p>
        </div>
      ) : conversations.map(c => (
        <button key={c.partner.id} onClick={() => setSelectedPartner(c.partner.id)} className="w-full bg-slate-800/60 backdrop-blur rounded-2xl p-4 border border-slate-700/50 hover:border-slate-600/50 transition flex items-center gap-3 text-left">
          <div className="relative">
            <Avatar url={c.partner.avatarUrl} name={c.partner.displayName} size={48} />
            {c.unreadCount > 0 && <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{c.unreadCount}</div>}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1"><span className="font-semibold text-white text-sm">{c.partner.displayName}</span><Badge isVerified={c.partner.isVerified} isAdmin={c.partner.isAdmin} size={14} /></div>
            {c.lastMessage && <p className="text-slate-500 text-sm truncate">{c.lastMessage.content}</p>}
          </div>
          {c.lastMessage && <span className="text-slate-600 text-xs flex-shrink-0">{timeAgo(c.lastMessage.createdAt)}</span>}
        </button>
      ))}
    </div>
  );
}

// ==================== ADMIN PANEL ====================
function AdminPanel({ currentUser }: { currentUser: User }) {
  const [tab, setTab] = useState<'users' | 'verification' | 'stats'>('stats');
  const [users, setUsers] = useState<User[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [expandedReq, setExpandedReq] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = useCallback(async () => {
    try {
      const [u, r, s] = await Promise.all([adminAPI.getUsers(), verificationAPI.getAll(), adminAPI.getStats()]);
      setUsers(u); setRequests(r); setStats(s);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const categories: Record<string, string> = { blogger: 'Блогер', journalist: 'Журналист', musician: 'Музыкант', developer: 'Разработчик', business: 'Бизнес', public_figure: 'Публичная личность', other: 'Другое' };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-white px-1 flex items-center gap-2">
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
        Панель администратора
      </h2>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {(['stats', 'users', 'verification'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition ${tab === t ? 'bg-blue-600 text-white' : 'bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700/50'}`}>
            {t === 'stats' ? '📊 Статистика' : t === 'users' ? '👥 Пользователи' : '✅ Верификация'}
          </button>
        ))}
      </div>

      {tab === 'stats' && stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[{ label: 'Пользователи', value: stats.users, icon: '👥' }, { label: 'Посты', value: stats.posts, icon: '📝' }, { label: 'Сообщения', value: stats.messages, icon: '✉️' }, { label: 'Верифицированы', value: stats.verified, icon: '✅' }, { label: 'Заявки', value: stats.pendingVerifications, icon: '⏳' }].map(s => (
            <div key={s.label} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold text-white">{s.value}</div>
              <div className="text-slate-500 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && users.map(u => (
        <div key={u.id} className="bg-slate-800/60 rounded-2xl p-4 border border-slate-700/50 flex items-center gap-3">
          <Avatar url={u.avatarUrl} name={u.displayName} size={40} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1"><span className="font-semibold text-white text-sm truncate">{u.displayName}</span><Badge isVerified={u.isVerified} isAdmin={u.isAdmin} /></div>
            <p className="text-slate-500 text-xs">@{u.username}</p>
          </div>
          {!u.isAdmin && (
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={async () => { await adminAPI.toggleVerify(u.id, currentUser.id); load(); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${u.isVerified ? 'bg-yellow-500/20 text-yellow-400' : 'bg-blue-500/20 text-blue-400'}`}>
                {u.isVerified ? 'Снять ✓' : 'Дать ✓'}
              </button>
              <button onClick={async () => { if (confirm(`Удалить @${u.username}?`)) { await adminAPI.deleteUser(u.id, currentUser.id); load(); } }} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition">✕</button>
            </div>
          )}
        </div>
      ))}

      {tab === 'verification' && (
        requests.length === 0 ? (
          <p className="text-center py-8 text-slate-500">Нет заявок</p>
        ) : requests.map(r => (
          <div key={r.id} className="bg-slate-800/60 rounded-2xl border border-slate-700/50 overflow-hidden">
            <button onClick={() => setExpandedReq(expandedReq === r.id ? null : r.id)} className="w-full p-4 flex items-center gap-3 text-left hover:bg-slate-700/30 transition">
              <Avatar url={r.avatarUrl} name={r.displayName} size={40} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1"><span className="font-semibold text-white text-sm">{r.displayName}</span></div>
                <p className="text-slate-500 text-xs">@{r.username} · {categories[r.category] || r.category}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${r.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : r.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                {r.status === 'pending' ? '⏳ Ожидает' : r.status === 'approved' ? '✅ Одобрена' : '❌ Отклонена'}
              </span>
            </button>
            {expandedReq === r.id && (
              <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div><span className="text-slate-500">Имя:</span> <span className="text-white">{r.fullName}</span></div>
                  <div><span className="text-slate-500">Категория:</span> <span className="text-white">{categories[r.category] || r.category}</span></div>
                  <div className="sm:col-span-2"><span className="text-slate-500">Причина:</span> <span className="text-white">{r.reason}</span></div>
                  {r.socialLinks && <div className="sm:col-span-2"><span className="text-slate-500">Ссылки:</span> <span className="text-white">{r.socialLinks}</span></div>}
                  {r.documentUrl && <div className="sm:col-span-2"><span className="text-slate-500">Документ:</span> <a href={r.documentUrl} className="text-blue-400 underline" target="_blank">{r.documentUrl}</a></div>}
                  {r.additionalInfo && <div className="sm:col-span-2"><span className="text-slate-500">Доп. инфо:</span> <span className="text-white">{r.additionalInfo}</span></div>}
                  <div><span className="text-slate-500">Подана:</span> <span className="text-white">{new Date(r.submittedAt).toLocaleDateString('ru')}</span></div>
                  <div><span className="text-slate-500">Дедлайн:</span> <span className="text-white">{new Date(r.reviewDeadline).toLocaleDateString('ru')}</span></div>
                </div>
                {r.status === 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <button onClick={async () => { await verificationAPI.approve(r.id); load(); }} className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-500 transition">✅ Одобрить</button>
                    <div className="flex-1 flex gap-2">
                      <input value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Причина отказа..." className="flex-1 bg-slate-700 border border-slate-600 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500" />
                      <button onClick={async () => { await verificationAPI.reject(r.id, rejectReason); setRejectReason(''); load(); }} className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-500 transition">❌ Отказ</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ==================== MAIN APP ====================
type Page = 'feed' | 'search' | 'notifications' | 'messages' | 'profile' | 'admin' | 'user';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [page, setPage] = useState<Page>('feed');
  const [viewUserId] = useState('');
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [unreadMsgs, setUnreadMsgs] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevNotifs = useRef(0);

  useEffect(() => {
    const saved = localStorage.getItem('netta_user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        // Refresh user data from server
        authAPI.getUser(u.id).then((fresh: User) => { setUser(fresh); localStorage.setItem('netta_user', JSON.stringify(fresh)); }).catch(() => { localStorage.removeItem('netta_user'); setUser(null); });
      } catch { localStorage.removeItem('netta_user'); }
    }
    setLoading(false);
  }, []);

  // Poll unread counts
  useEffect(() => {
    if (!user) return;
    const poll = async () => {
      try {
        const [n, m] = await Promise.all([notificationsAPI.getUnread(user.id), messagesAPI.getUnread(user.id)]);
        setUnreadNotifs(n.count);
        setUnreadMsgs(m.count);
        if (n.count > prevNotifs.current && prevNotifs.current >= 0) {
          playNotificationSound();
        }
        prevNotifs.current = n.count;
      } catch {}
    };
    poll();
    const i = setInterval(poll, 5000);
    return () => clearInterval(i);
  }, [user]);

  const refreshUser = async () => {
    if (!user) return;
    try { const fresh = await authAPI.getUser(user.id); setUser(fresh); localStorage.setItem('netta_user', JSON.stringify(fresh)); } catch {}
  };

  const handleLogout = () => { localStorage.removeItem('netta_user'); setUser(null); setPage('feed'); prevNotifs.current = 0; };

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 animate-pulse">
          <svg width="32" height="32" viewBox="0 0 48 48" fill="white"><path d="M24 4L8 14v20l16 10 16-10V14L24 4zm0 4l12 7.5v15L24 38 12 30.5v-15L24 8z"/><circle cx="24" cy="24" r="6" fill="white"/></svg>
        </div>
        <p className="text-slate-500">Загрузка Netta...</p>
      </div>
    </div>
  );

  if (!user) return <AuthScreen onLogin={setUser} />;

  const navItems = [
    { key: 'feed' as Page, label: 'Лента', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg> },
    { key: 'search' as Page, label: 'Поиск', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg> },
    { key: 'notifications' as Page, label: 'Уведомления', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>, badge: unreadNotifs },
    { key: 'messages' as Page, label: 'Сообщения', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, badge: unreadMsgs },
    { key: 'profile' as Page, label: 'Профиль', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg> },
  ];

  if (user.isAdmin) navItems.push({ key: 'admin' as Page, label: 'Админ', icon: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>, badge: 0 });

  const renderPage = () => {
    switch (page) {
      case 'feed': return <Feed currentUser={user} />;
      case 'search': return <SearchPage currentUser={user} />;
      case 'notifications': return <NotificationsPage currentUser={user} />;
      case 'messages': return <MessagesPage currentUser={user} />;
      case 'profile': return <ProfilePage userId={user.id} currentUser={user} onRefreshUser={refreshUser} />;
      case 'admin': return user.isAdmin ? <AdminPanel currentUser={user} /> : <Feed currentUser={user} />;
      case 'user': return <ProfilePage userId={viewUserId} currentUser={user} onRefreshUser={refreshUser} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 xl:w-72 flex-col bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 p-4 z-30">
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg width="20" height="20" viewBox="0 0 48 48" fill="white"><path d="M24 4L8 14v20l16 10 16-10V14L24 4zm0 4l12 7.5v15L24 38 12 30.5v-15L24 8z"/><circle cx="24" cy="24" r="6" fill="white"/></svg>
          </div>
          <span className="text-xl font-black text-white tracking-tight">Netta</span>
        </div>
        <nav className="flex-1 space-y-1">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setPage(item.key)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${page === item.key ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
              {item.icon}
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">{item.badge > 9 ? '9+' : item.badge}</span> : null}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-800 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <Avatar url={user.avatarUrl} name={user.displayName} size={36} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1"><span className="text-white text-sm font-semibold truncate">{user.displayName}</span><Badge isVerified={user.isVerified} isAdmin={user.isAdmin} size={14} /></div>
              <p className="text-slate-500 text-xs truncate">@{user.username}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
            Выйти
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64 xl:ml-72">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-20 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 48 48" fill="white"><path d="M24 4L8 14v20l16 10 16-10V14L24 4zm0 4l12 7.5v15L24 38 12 30.5v-15L24 8z"/><circle cx="24" cy="24" r="6" fill="white"/></svg>
            </div>
            <span className="text-lg font-black text-white">Netta</span>
          </div>
          <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 transition p-2">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
          </button>
        </div>

        <main className="max-w-2xl mx-auto px-3 sm:px-4 py-4 pb-24 lg:pb-8">
          {renderPage()}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-800 z-30 safe-area-bottom">
        <div className="flex justify-around items-center py-2 px-2 max-w-lg mx-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setPage(item.key)} className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${page === item.key ? 'text-blue-400' : 'text-slate-500'}`}>
              {item.icon}
              <span className="text-[10px] font-medium">{item.label}</span>
              {item.badge ? <span className="absolute -top-1 -right-0.5 w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">{item.badge > 9 ? '9+' : item.badge}</span> : null}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
