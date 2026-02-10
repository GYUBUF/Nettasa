# 🌐 Netta — Социальная сеть

## 📁 Структура файлов (без вложенных папок!)

```
netta/
├── index.html           ← Главная HTML страница
├── package.json         ← Зависимости
├── tsconfig.json        ← Настройки TypeScript
├── vite.config.ts       ← Настройки сборки
├── .gitignore           ← Что не загружать в Git
├── server.ts            ← Express сервер (для Render.com)
├── server-database.ts   ← SQLite база данных (для Render.com)
├── README.md            ← Этот файл
│
├── public/
│   ├── favicon.svg      ← Иконка сайта
│   └── manifest.json    ← PWA манифест
│
└── src/
    ├── main.tsx         ← Точка входа React
    ├── App.tsx          ← Главный компонент (ВСЁ приложение)
    ├── api.ts           ← API клиент (localStorage + сервер)
    └── index.css        ← Стили
```

## 🔐 Аккаунт администратора

- **Логин:** `admin`
- **Пароль:** `mjrz53bhuti!@`

## 🚀 Как загрузить на GitHub

### Через терминал (рекомендуется):

```bash
# 1. Скачай все файлы проекта в папку netta/

# 2. Открой терминал в этой папке и выполни:
git init
git add .
git commit -m "Netta social network"
git branch -M main
git remote add origin https://github.com/ТВОЙ_ЛОГИН/netta.git
git push -u origin main
```

### Через веб-интерфейс GitHub:

1. Создай новый репозиторий на github.com
2. Нажми "uploading an existing file"
3. Перетащи ВСЕ файлы (index.html, package.json, tsconfig.json, vite.config.ts, .gitignore, server.ts, server-database.ts, README.md)
4. Потом создай папку `src/` через "Create new file" → напиши `src/main.tsx` и вставь содержимое
5. Повтори для `src/App.tsx`, `src/api.ts`, `src/index.css`
6. Повтори для `public/favicon.svg`, `public/manifest.json`

## 🌍 Деплой на Render.com

1. Зайди на [dashboard.render.com](https://dashboard.render.com)
2. **New +** → **Web Service**
3. Подключи свой GitHub репозиторий `netta`
4. Заполни:

| Поле | Значение |
|------|----------|
| **Name** | `netta` |
| **Branch** | `main` |
| **Runtime** | `Node` |
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npx tsx server.ts` |

5. Добавь **Disk** (чтобы данные не терялись):
   - Mount Path: `/data`
   - Size: `1 GB`

6. Нажми **Deploy** — через 2-3 минуты получишь ссылку!

## ✨ Возможности

- 📝 Посты до 500 символов
- ❤️ Лайки, репосты, комментарии
- 👥 Подписки и подписчики
- ✉️ Личные сообщения
- 🔔 Уведомления со звуком
- 🔵 Верификация (анкета + 3-4 дня ожидания)
- 🔴 Панель администратора
- 🔍 Поиск пользователей
- 📱 Работает на телефоне, планшете и компьютере
