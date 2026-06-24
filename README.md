<div align="center">

[![React](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_%2B_Realtime-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)

<h1>✅ Finish & Click</h1>
<h3>The project management platform that actually moves with your team.</h3>

<p><em>monday.com-style table view · Kanban board · Real-time collaboration · Enterprise-grade security</em></p>

</div>

---

## 🎯 What Problem Does This Solve?

Modern teams drown in tool sprawl. Spreadsheets for budgets. Kanban apps for tasks. Chat apps for communication. Each in a separate tab, never in sync.

Every switch costs 23 minutes of focus time. Every disconnected tool creates version drift. Every manual status update is a future miscommunication.

**Finish & Click** replaces this chaos with a single, real-time workspace where task management, budget tracking, team collaboration, and project visualization all live together — and update instantly when any team member makes a change.

---

## 👥 Who This Is For

- **Small-to-medium teams** that have outgrown spreadsheets but find Jira/Linear too heavyweight
- **Freelancers and agencies** managing multiple client workspaces simultaneously
- **Developers** who want a reference implementation of a real-time collaborative SaaS with Supabase + React 19
- **Anyone who needs both table and Kanban views** on the same dataset without double-entry

---

## ⚡ Key Benefits

- **One click to switch views:** Every task group is instantly convertible between Table and Kanban — no data migration, no re-entry
- **Real-time by default:** Supabase Realtime means every assignee change, status update, and comment appears instantly for every team member
- **Enterprise security:** Row Level Security policies at the PostgreSQL level — no user can access workspace data they weren't explicitly invited to
- **Drag-and-drop everything:** Task groups, rows, and Kanban cards all support fluid DnD with micro-animations
- **Subtasks with rollup:** Parent task completion percentage auto-calculates from child subtask states
- **One-command setup:** Database schema, RLS policies, and invitation functions are deployed with a single SQL file

---

## 🌟 Features

### 📋 Hybrid Table & Kanban View

The core is a powerful **cell-based task engine** with rich data columns:

| Column Type | What It Tracks |
|---|---|
| 👥 **Assignee** | Team members with profile avatars |
| 🟢 **Status** | Customizable color-coded statuses (To Do / Working / Stuck / Done) |
| ⚠️ **Priority** | Critical / High / Medium / Low |
| ⏳ **Timeline** | Start and end date calendar tracking |
| 💰 **Budget** | Per-task budget inputs with resource totals |
| ⭐ **Rating** | Star-based importance scoring |
| 📝 **Notes** | Quick task descriptions |

Switch to **Kanban view** with one click — all data renders as draggable cards, status columns auto-generated.

### 👥 Supabase-Powered Team Infrastructure
- **Email Invitations:** Workspace owners invite members via email. Registration auto-joins the workspace.
- **Multiple Workspaces:** Create personal and team workspaces, switch with one click.
- **Role Management:** Owner and Member roles with Supabase RLS enforcement.

### 🏗️ Deep Task Hierarchy
- **Subtasks:** Unlimited depth, progress rolls up to parent automatically
- **Comments:** Real-time team discussion with file references inside task detail panels
- **DnD Kit:** Fluid drag-and-drop for groups, rows, and Kanban cards with animations

### 🛡️ Row Level Security (RLS)
PostgreSQL-level RLS policies ensure no user can read, update, or delete data outside their authorized workspaces. Custom RLS functions resolve circular dependency patterns at the database layer.

---

## 🛠️ Technical Architecture

```
Finish & Click
│
├── Frontend (React 19 + TypeScript + Vite 8)
│   ├── State: Zustand (global) + TanStack React Query v5 (server cache)
│   ├── UI: Tailwind CSS v4 · Lucide React icons · Sonner toasts
│   ├── DnD: DnD Kit — groups, rows, Kanban cards
│   └── Real-time: Supabase Realtime subscriptions
│
└── Backend (Supabase)
    ├── Database: PostgreSQL
    │   ├── profiles — synced with auth.users
    │   ├── workspaces — personal or team
    │   ├── workspace_members — role-based access
    │   ├── workspace_invites — email invitation tokens
    │   ├── task_groups — board sections
    │   ├── tasks — cell values (budget, timeline, status, priority)
    │   ├── subtasks — nested task breakdown
    │   └── task_comments — in-task discussions
    ├── Auth: Email/password + Row Level Security
    ├── Realtime: Live database subscriptions
    └── Storage: File attachments
```

**Full Stack:**
- **Frontend:** React 19 · TypeScript · Vite 8 · Zustand · TanStack Query v5 · Tailwind CSS v4
- **Backend:** Supabase (PostgreSQL · Realtime · Auth · Storage)
- **Deployment:** Netlify (pre-configured via `netlify.toml`)

---

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/oguzemirtopuz/finish-and-click.git
cd finish-and-click
npm install
```

### 2. Setup Supabase Database
1. Create a project at [supabase.com](https://supabase.com)
2. Open the **SQL Editor** in your Supabase dashboard
3. Paste the contents of `supabase_setup.sql` and click **Run** — all tables, RLS rules, and functions deploy instantly

### 3. Configure Environment Variables
```env
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 4. Launch Locally
```bash
npm run dev
# → http://localhost:5173
```

### Deploy to Netlify
1. Push to GitHub
2. Import repository into Netlify
3. Add the two environment variables in Netlify settings
4. Click Deploy — live in minutes

---

## 🗺️ Roadmap

- [ ] Live demo deployment
- [ ] Time tracking module
- [ ] Gantt chart view
- [ ] Slack/Discord webhook integrations
- [ ] Mobile-responsive Kanban view improvements
- [ ] CSV import/export

---

## 🤝 Contributing

Contributions welcome. Priority areas:
- Additional column types (formula columns, link/dependency columns)
- Mobile performance optimization
- Accessibility improvements (ARIA labels, keyboard navigation)

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built by <a href="https://github.com/oguzemirtopuz">Oğuz Emir Topuz</a></sub>
  <br/>
  <sub>⭐ If this saved your team from spreadsheet chaos, star the repo.</sub>
</div>
