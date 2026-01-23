# Magpie 採集靈光，築夢成巢

**繁體中文** | [English](./README_EN.md)

Magpie 是一個企業內部的 Prompt (AI 指令) 分享與管理平台。它讓團隊成員可以輕鬆地分享、搜尋、混搭 (Remix) 高品質的 AI 指令，如同喜鵲築巢般，將四處採集的靈光匯聚一處。

![Magpie Logo](./web/public/logo.png)

![Magpie UI](./web/public/screenshot.png)

## ✨ 功能特色

*   **Prompt 探索**：無限捲動 (Infinite Scroll) 的瀑布流瀏覽體驗，支援標題與作者搜尋。
*   **收藏與管理**：使用者可以收藏 (Like) 喜歡的 Prompt，並在個人檔案頁面快速查看。
*   **分類過濾**：透過後端管理的標籤 (Tags) 快速篩選特定類型的指令。
*   **智慧填空 (Smart Filler)**：自動偵測 Prompt 中的 `[variable]` 變數，並產生填空表單，即時預覽完整指令。
*   **成果展示**：支援上傳圖片或文字作為 Prompt 的執行成果範例。
*   **混搭與繼承 (Remix)**：基於他人的 Prompt 進行修改與再創作，系統會自動記錄繼承來源。
*   **多國語言**：支援繁體中文與英文介面切換。
*   **權限管理**：
    *   **Pending 狀態**：新註冊使用者需經管理員審核 (Active) 後才可使用。
    *   **編輯/刪除**：只有作者本人 (或管理員) 可修改或刪除卡片。

## 🛠️ 技術架構

*   **Frontend**: [Vue 3](https://vuejs.org/) + [TypeScript](https://www.typescriptlang.org/)
*   **Utility**: [VueUse](https://vueuse.org/) (Infinite Scroll)
*   **Build Tool**: [Vite](https://vitejs.dev/)
*   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
*   **State Management**: [Pinia](https://pinia.vuejs.org/)
*   **Routing**: [Vue Router](https://router.vuejs.org/)
*   **I18n**: [Vue I18n](https://vue-i18n.intlify.dev/)
*   **Backend & Database**: [PocketBase](https://pocketbase.io/) (Go + SQLite)
*   **Avatar**: [DiceBear API](https://dicebear.com/) (Identicon)

## 🚀 快速開始 (Docker)

這是最推薦的啟動方式，只需一行指令即可啟動包含前端與後端的完整環境。

### 前置需求
*   [Docker](https://www.docker.com/) & Docker Compose

### 啟動服務
```bash
docker-compose up -d --build
```

啟動後：
*   **前端網頁**: [http://localhost:8080](http://localhost:8080)
*   **後端管理介面**: [http://localhost:8090/_/](http://localhost:8090/_/)

---

## 💻 本地開發指南 (Manual Setup)

如果你需要開發前端程式碼，建議在本機執行前端，並連線到 Docker 中的 PocketBase。

### 1. 啟動後端 (PocketBase)
```bash
docker-compose up -d pocketbase
```
後端 API 將運行於 `http://127.0.0.1:8090`。

### 2. 初始化後端資料 (首次執行)
進入 [http://localhost:8090/_/](http://localhost:8090/_/) 建立管理員帳號，並匯入專案根目錄的 `pb_schema.json`。

**重要**：建立或匯入後，請至 Users Collection 找到你的帳號，將 `status` 改為 `active`，否則無法新增 Prompt。

#### Collections 設定 (參考)
| Collection | Type | Fields | API Rules |
| :--- | :--- | :--- | :--- |
| **users** | Auth | `status` (Select: pending, active), `role` (Select: user, admin), `avatar` (File) | Update: Owner or Admin |
| **prompts** | Base | `title`, `content` (Text), `tags` (JSON), `user` (Rel: users), `parent_id` (Rel: prompts) | Create/View: Active User, Update/Delete: Owner |
| **likes** | Base | `user` (Rel: users), `prompt` (Rel: prompts) | Create/Delete: Owner |

> 💡 **效能優化提示**：
> 為了確保「收藏」分頁的載入速度，請務必在 `likes` collection 中為 `user` 欄位建立索引 (Index)。
> ```sql
> CREATE INDEX idx_likes_user ON likes (user)
> ```
> 使用 Docker 啟動時，系統會自動載入 `pb_migrations` 目錄下的腳本來建立此索引。

### 3. 啟動前端 (Web)
```bash
cd web
npm install
npm run dev
```
前端開發伺服器將運行於 [http://localhost:5173](http://localhost:5173)。

## 📁 專案結構

```
.
├── docker-compose.yml   # Docker 部署設定
├── pb_data/             # PocketBase 資料庫檔案 (Git Ignored)
├── pb_schema.json       # 資料庫結構定義檔 (用於匯入)
├── web/                 # 前端專案
│   ├── src/
│   │   ├── components/  # Vue 元件 (Modal, Card, Header)
│   │   ├── views/       # 頁面 (Home, Login, Register)
│   │   ├── lib/         # PocketBase Client (pocketbase.ts)
│   │   └── ...
│   └── ...
└── ...
```

## 📝 注意事項

*   **使用者註冊**：新註冊的使用者預設狀態為 `pending`，必須由管理員在後台將 `status` 改為 `active` 才能登入使用。

## License

MIT
