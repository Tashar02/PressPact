# PressPact Database Setup Guide (Supabase PostgreSQL)

Follow these steps to set up the relational database schema and initial seed data for PressPact on Supabase.

---

## 🚀 Setup Steps

### **Step 1: Create a Supabase Project**
1. Go to [https://supabase.com](https://supabase.com) and log in or sign up.
2. Click **New Project**.
3. Set Project Name to `PressPact`.
4. Choose a Database Password and select your nearest region.
5. Click **Create new project** and wait ~1 minute for deployment.

---

### **Step 2: Execute Database Schema SQL**
1. In your Supabase Dashboard, click on **SQL Editor** from the left navigation menu.
2. Click **New Query**.
3. Copy the entire contents of [`schema.sql`](file:///home/tashar/PressPact/supabase/schema.sql) and paste it into the editor.
4. Click **Run** (or `Ctrl + Enter` / `Cmd + Enter`).
5. Confirm you see `Success. No rows returned.` in the results pane.

---

### **Step 3: Insert Initial Seed Data**
1. Click **New Query** again in the SQL Editor.
2. Copy the entire contents of [`seed.sql`](file:///home/tashar/PressPact/supabase/seed.sql) and paste it.
3. Click **Run**.
4. Confirm seed rows have been inserted.

---

### **Step 4: Copy API Credentials**
1. In the Supabase Dashboard, go to **Project Settings** -> **API**.
2. Find:
   * **Project URL** (e.g. `https://xyzcompany.supabase.co`)
   * **anon / public Key** (e.g. `eyJhbGciOi...`)
3. Keep these ready for your local `.env` file and Vercel environment settings.

---

### **Step 5: Create Storage Bucket for Quality Proofs**
1. In your Supabase Dashboard, click on **Storage** from the left sidebar.
2. Click **New Bucket**.
3. Name the bucket: `proofs`
4. Toggle **Public bucket** to `ON` (enables press and publisher to view uploaded sample photos).
5. Click **Save bucket**.
