# 📦 StoreIt | Production-Grade Cloud Storage

A high-performance file management system built with **Next.js 15** and **Supabase**, featuring **resumable uploads**, **granular security**, and **real-time UI updates**.

[**🌐 Live Demo**](https://storeit-storage.vercel.app) 

https://storeit-storage.vercel.app

---

###  Key Features

* **Resumable File Uploads:** Integrated **TUS Protocol** for **chunked transfers (5MB)**, ensuring reliability even on poor network connections.
* **Secure Access Control:** Robust **Row-Level Security (RLS)** powered by PostgreSQL to manage private and shared files.
* **Advanced Sharing:** **Email-based sharing** and **Public links** with **token rotation** for enhanced security.
* **Optimistic UI:** Real-time feedback and progress bars using **React Dropzone** and **Server Actions**.
* **Temporal Access:** **Time-limited Signed URLs** for secure file previews and downloads.
* **Analytics Dashboard:** Visual insights into storage usage and file activity.

---

### 🏗️ Tech Stack & Architecture

| Layer | Technology | Key Implementation |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 15 (App Router)** | Server Components & **Server Actions** |
| **Backend** | **Supabase** | Auth, PostgreSQL, & Cloud Storage |
| **State** | **React Cache** | Server-side memoization for performance |
| **Optimization** | **Debounced Search** | Efficient querying to reduce database load |
| **Data Flow** | **Revalidation** | Instant UI updates via `revalidatePath()` |

---

#### 1. Clone & Install

git clone 
cd storeit
npm install



#### 2. Environment Setup
Create a .env file in the root directory and add your credentials:

File Content:

NEXT_PUBLIC_SUPABASE_URL=project_url

NEXT_PUBLIC_SUPABASE_ANON_KEY=anon_key

SUPABASE_SERVICE_ROLE_KEY=service_role_key


#### 3. Launch

npm run dev
