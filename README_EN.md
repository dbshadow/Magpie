# Magpie: Gather Sparks, Build Your Nest

[繁體中文](./README.md) | **English**

Magpie is an internal Prompt Database and sharing platform for organizations. It allows team members to easily share, search, and remix high-quality AI prompts, gathering scattered sparks of inspiration into one central nest, just like a magpie.

![Magpie Logo](./web/public/logo.png)

![Magpie UI](./web/public/screenshot.png)

## ✨ Features

*   **Prompt Discovery**: Explore prompts with an Infinite Scroll masonry layout, supporting title and author search.
*   **Favorites**: Like prompts to save them for quick access in your profile.
*   **Tag Filtering**: Quickly filter specific types of prompts via backend-managed tags.
*   **Smart Filler**: Automatically detects `[variable]` syntax in prompts and generates a fillable form with real-time preview.
*   **Showcase Results**: Support for uploading images or text as example results of the prompt.
*   **Remix & Inherit**: Modify and re-create based on others' prompts; the system automatically tracks the inheritance source.
*   **Localization**: Supports Traditional Chinese and English interface switching.
*   **Access Control**:
    *   **Pending Status**: New users are set to `pending` and must be approved (`active`) by an admin before use.
    *   **Edit/Delete**: Only the original author (or admin) can modify or delete cards.

## 🛠️ Tech Stack

*   **Frontend**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
*   **Utility**: [VueUse](https://vueuse.org/) (Infinite Scroll)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **State Management**: [Pinia](https://pinia.vuejs.org/)
*   **Routing**: [Vue Router](https://router.vuejs.org/)
*   **I18n**: [Vue I18n](https://vue-i18n.intlify.dev/)
*   **Backend & Database**: [PocketBase](https://pocketbase.io/) (Go + SQLite)
*   **Avatar**: [DiceBear API](https://dicebear.com/) (Identicon)

## 🚀 Quick Start (Docker)

This is the recommended way to start the complete environment (Frontend + Backend) with a single command.

### Prerequisites
*   [Docker](https://www.docker.com/) & Docker Compose

### Start Services
```bash
docker-compose up -d --build
```

After startup:
*   **Web App**: [http://localhost:8080](http://localhost:8080)
*   **Admin Dashboard**: [http://localhost:8090/_/](http://localhost:8090/_/)

---

## 💻 Local Development (Manual Setup)

If you need to develop the frontend code, it is recommended to run the frontend locally and connect to PocketBase running in Docker.

### 1. Start Backend (PocketBase)
```bash
docker-compose up -d pocketbase
```
The Backend API will run at `http://127.0.0.1:8090`.

### 2. Initialize Backend Data (First Run)
Go to [http://localhost:8090/_/](http://localhost:8090/_/), create an admin account, and import the `pb_schema.json` file located in the project root.

**Important**: After creating/importing, go to the **Users Collection**, find your account, and change the `status` to `active`, otherwise you won't be able to create prompts.

#### Collection Settings (Reference)
| Collection | Type | Fields | API Rules |
| :--- | :--- | :--- | :--- |
| **users** | Auth | `status` (Select: pending, active), `role` (Select: user, admin), `avatar` (File) | Update: Owner or Admin |
| **prompts** | Base | `title`, `content` (Text), `tags` (JSON), `user` (Rel: users), `parent_id` (Rel: prompts) | Create/View: Active User, Update/Delete: Owner |
| **likes** | Base | `user` (Rel: users), `prompt` (Rel: prompts) | Create/Delete: Owner |

> 💡 **Performance Tip**:
> To ensure fast loading of the "Favorites" tab, make sure to create an index on the `user` field in the `likes` collection.
> ```sql
> CREATE INDEX idx_likes_user ON likes (user)
> ```
> When starting with Docker, the system automatically runs scripts in `pb_migrations` to create this index.

### 3. Start Frontend (Web)
```bash
cd web
npm install
npm run dev
```
The frontend dev server will run at [http://localhost:5173](http://localhost:5173).

## 📁 Project Structure

```
.
├── docker-compose.yml   # Docker deployment config
├── pb_data/             # PocketBase database files (Git Ignored)
├── pb_schema.json       # Database schema definition (for import)
├── web/                 # Frontend project
│   ├── src/
│   │   ├── components/  # Vue Components (Modal, Card, Header)
│   │   ├── views/       # Pages (Home, Login, Register)
│   │   ├── lib/         # PocketBase Client (pocketbase.ts)
│   │   └── ...
│   └── ...
└── ...
```

## 📝 Notes

*   **User Registration**: Newly registered users are `pending` by default. An admin must change their `status` to `active` in the dashboard before they can log in.

## License

MIT
