# 🚀 Finish & Click — Modern Project & Task Management Platform (monday.com Clone) 📊

[![React 19](https://img.shields.io/badge/React-19.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![Vite 8](https://img.shields.io/badge/Vite-8.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vite.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4.0-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Netlify](https://img.shields.io/badge/Netlify-00C8C5?style=for-the-badge&logo=netlify&logoColor=white)](https://netlify.com)

**Finish & Click** is a hybrid, asynchronous, and real-time project management platform that combines a **monday.com-style table view** with a **classic Kanban board view**, allowing teams and individual users to manage their workflows, budgets, and tasks under one roof.

Powered by a **Supabase** serverless database backend and a modern **React 19 + Vite 8** frontend architecture, the application offers a complete SaaS experience with drag-and-drop cells, subtask support, a team invitation mechanism, and advanced security layers.

---

## 🌟 Advanced Features and Modules

### 📋 1. Hybrid monday.com Table & Kanban View
*   **Interactive Table Cells:** Built on monday.com's popular cell structure, featuring dynamic data columns:
    *   👥 **Assignee:** Assign team members to tasks, complete with profile avatars and user mapping.
    *   🟢 **Status:** Customizable, color-coded statuses like *To Do*, *Working on it*, *Stuck*, and *Done*.
    *   ⚠️ **Priority:** Task classification with *Critical*, *High*, *Medium*, and *Low* levels.
    *   ⏳ **Timeline:** Calendar tracking featuring task start and end dates.
    *   💰 **Budget:** Task-based budget inputs and resource calculations.
    *   ⭐ **Rating:** Star-based importance rating system.
    *   📝 **Notes:** Quick descriptions and task-focused note areas.
*   **Kanban View:** Instantly convert all table data into Kanban cards with a single click and easily update statuses using drag-and-drop functionality.

### 👥 2. Supabase-Powered Team & Invitation Infrastructure
*   **RPC Invitation Function (`invite_user_by_email`):** Workspace owners can invite team members by email. When the invited member registers, the invitation is matched and they are automatically added to the workspace.
*   **Multiple Workspaces:** Users can create personal workspaces and switch between their team workspaces with a single click.
*   **Role Management:** Restrict workspace permissions using *Owner* and *Member* roles.

### 🏗️ 3. Deep Task Hierarchy & Drag and Drop
*   **Advanced DND Kit (`@dnd-kit/sortable`):** Fluidly drag and drop task groups, rows, and Kanban cards with micro-animations.
*   **Subtasks:** Add unlimited subtasks under parent tasks, and synchronize their progress (`ProgressCell`) with the parent task.
*   **Comments Module:** Team members can comment in real-time and provide file references directly in the task details panel.

### 🛡️ 4. Maximum Security with Row Level Security (RLS)
*   **Security Protocols (Postgres RLS):** Thanks to RLS policies defined on Supabase, no user can read, update, or delete workspace data, tasks, or comments without proper authorization.
*   **Circular Dependency Solution:** High-performance and secure data queries are achieved using custom RLS functions at the PostgreSQL level.

---

## 🛠️ Technological Stack

*   **Frontend Core:** React 19, TypeScript, Vite 8, Zustand (Global State Management), TanStack React Query v5 (Data Caching).
*   **Styling & UI:** Tailwind CSS v4 (Ultra-fast next-gen compiler), Lucide React (Sleek icon pack), Sonner (Modern Toast notifications).
*   **Backend & DB:** Supabase (PostgreSQL, Realtime, Auth, Storage, Edge Functions).
*   **Deployment:** Netlify (`netlify.toml` integration ready).

---

## 📋 Database Schema (Supabase Schema)

The PostgreSQL database structure required for the application is provided in the `supabase_setup.sql` file. The file includes the following tables and triggers:
1.  **`profiles`**: User profiles synchronized with the auth.users table.
2.  **`workspaces`**: Personal or team-based workspaces.
3.  **`workspace_members`**: Members and their roles within a workspace.
4.  **`workspace_invites`**: Pending email-based workspace invitations.
5.  **`task_groups`**: Boards grouping tasks (e.g., *This Week*, *Next Month*).
6.  **`tasks`**: Main tasks containing monday.com cell values (budget, timeline, status, priority).
7.  **`subtasks`**: Subtask breakdowns tied to parent tasks.
8.  **`task_comments`**: In-task team discussions.

---

## 🚀 Complete Installation and Setup

### 1. Clone or Download the Repository
```bash
git clone https://github.com/OguzEmir177/finish-and-click.git
cd finish-and-click
```

### 2. Install Required Dependencies
```bash
npm install
```

### 3. Setup Supabase
1. Create a new project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Paste the contents of `supabase_setup.sql` from your project folder and click **Run**. All tables, RLS rules, and invitation functions will be created in seconds.

### 4. Configure Environment Variables
Create a `.env` file in the root directory of the project and add your Supabase credentials:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 5. Launch the Application Locally
```bash
npm run dev
```
*   **Address:** You can open [http://localhost:5173](http://localhost:5173) in your browser to start using the platform!

---

## ⚡ Deploying on Netlify

This project is pre-configured to be deployed on Netlify with a single click (`netlify.toml`).
1. Upload your project to GitHub.
2. Log in to your Netlify account and choose this repository using **"Import from Git"**.
3. Go to the **Environment Variables** settings in Netlify and add the `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` variables.
4. Click **Deploy Site**. Your site will be live in minutes!

---

## 👤 About the Developer

This project is developed by **Oğuz Emir Topuz**.

*   **Age:** 14
*   **Interests & Passions:** A football enthusiast and an advanced software developer.
*   **What He Does:** Works on SaaS applications, modern and elegant websites, and 3D games.
*   **Contact & Portfolio:** [My GitHub Profile](https://github.com/OguzEmir177)

---

⭐ If you like this project, don't forget to give it a star! Development is ongoing.
