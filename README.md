# PressPact 📚⚙️

> **A B2B Digital Workflow Platform for the Book Lamination & Print-Finishing Industry**

PressPact is a responsive single-page web application designed to digitize order tracking, sample proof quality approval, yield/waste verification math, and credit control between book-lamination presses and publisher clients.

---

## 🏗️ Tech Stack & Architecture

### **Frontend**
* **Framework:** React 18 (TypeScript) with Vite
* **Styling:** Tailwind CSS v4
* **Components & UI:** Radix UI primitives & Lucide React icons
* **Animations:** Motion (Framer Motion)

### **Backend & Database**
* **Database:** Supabase PostgreSQL (Relational schema for orders, stock, audit logs)
* **API Layer:** Supabase JS Client (`@supabase/supabase-js`) with async service modules
* **Storage:** Supabase Storage (Proof photo upload management)
* **Auth:** Supabase Auth (Role-based access for Press Owner & Publisher)
* **Hosting:** Vercel (Edge CDN static hosting & Serverless APIs)

---

## 📁 Directory Structure

```text
PressPact/
├── src/
│   ├── app/
│   │   ├── components/        # UI components (Press Owner & Publisher views)
│   │   ├── lib/
│   │   │   └── supabase.ts    # Supabase client instantiation
│   │   ├── services/
│   │   │   ├── authService.ts      # Authentication & user profile backend calls
│   │   │   ├── jobService.ts       # Job orders & proof audit log backend calls
│   │   │   ├── stockService.ts     # Film stock inventory backend calls
│   │   │   └── publisherService.ts # Publisher credit hold & notification backend calls
│   │   ├── mockData.ts        # Initial master data fallback
│   │   ├── types.ts           # Core TypeScript interfaces
│   │   └── App.tsx            # Main application layout & state sync
│   └── main.tsx               # React application entry point
├── supabase/
│   ├── schema.sql             # Relational DDL tables, profiles, indexes, triggers
│   ├── seed.sql               # Initial pilot seed data
│   └── README.md              # Database setup & SQL execution guide
├── SRS.md                     # Software Requirements Specification (IEEE 830)
└── package.json               # Dependencies and build scripts
```

---

## 🗄️ Database Setup

For detailed instructions on initializing the PostgreSQL schema, indexes, and initial seed data on Supabase, refer to the [Supabase Database Setup Guide](file:///home/tashar/PressPact/supabase/README.md).

---

## 🚀 Free Vercel Deployment Instructions

Follow these simple steps to deploy PressPact for free on Vercel:

### **Step 1: Push Repository to GitHub**
Ensure all commits are pushed to your GitHub repository.

### **Step 2: Import Project into Vercel**
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select your `PressPact` GitHub repository.

### **Step 3: Configure Build Settings & Environment Variables**
* **Framework Preset:** `Vite`
* **Build Command:** `npm run build`
* **Output Directory:** `dist`
* **Environment Variables:**
  * `VITE_SUPABASE_URL`: Your Supabase Project URL (`https://your-project.supabase.co`)
  * `VITE_SUPABASE_ANON_KEY`: Your Supabase Anon API Key

### **Step 4: Deploy**
Click **Deploy**. Vercel will build and host your app with global Edge CDN performance in seconds.
