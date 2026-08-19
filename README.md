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
* **Storage:** Supabase Storage (Proof photo upload management)
* **Auth:** Supabase Auth (Role-based access for Press Owner & Publisher)
* **Hosting:** Vercel (Edge CDN static hosting & Serverless APIs)

---

## 📁 Directory Structure

```text
PressPact/
├── src/
│   ├── app/
│   │   ├── components/     # UI components (Press Owner & Publisher views)
│   │   ├── mockData.ts        # Initial dataset definitions
│   │   ├── types.ts           # Core TypeScript interfaces
│   │   └── App.tsx            # Main application layout & role state
│   └── main.tsx               # React application entry point
├── SRS.md                     # Software Requirements Specification (IEEE 830)
└── package.json               # Dependencies and build scripts
```
