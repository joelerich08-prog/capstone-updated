# Demo Checklist

## 1. One Day Before Defense

- Confirm Node.js and XAMPP/PHP run on the exact laptop you will use on April 17, 2026.
- Open the project in `c:\xampp\htdocs\capstone-redo`.
- Verify `.env.local` points to `http://localhost/capstone-redo`.
- Run `npm install` only if dependencies are missing.
- Run `npm run typecheck`.
- Run `npm run build`.
- Start the app with `npm run dev`.
- Confirm the site opens at `http://localhost:3000`.
- Confirm the PHP API is reachable through XAMPP at `http://localhost/capstone-redo/api/...`.
- Make sure your database is imported and matches `schema.sql`.

## 2. Demo-Day Startup

- Start Apache in XAMPP before opening the app.
- Open a terminal in `c:\xampp\htdocs\capstone-redo`.
- Run `npm run dev`.
- Wait until Next shows the local URL and no startup errors.
- Open `http://localhost:3000`.
- Keep the terminal open during the whole defense.

## 3. Core Flow Rehearsal

- Login as `admin` and open dashboard, users, inventory, reports, and settings.
- Login as `stockman` and open receiving, breakdown, transfer, adjustments, expiry, and suppliers.
- Login as `cashier` and open POS, orders, and transactions.
- Open customer shop, add items to cart, place an order, and view order tracking.
- Create a manual order from admin or cashier screens.
- Complete one POS sale and confirm inventory changes update.
- Receive stock with batch/expiry data and confirm it appears in expiry management.
- Dispose an expiring batch and confirm inventory updates.

## 4. Data To Prepare

- Prepare at least 3 users: admin, stockman, cashier.
- Prepare at least 5 products with categories and suppliers.
- Prepare at least 1 batch close to expiry for the expiry demo.
- Prepare at least 1 customer order already in the system.
- Prepare at least 1 completed transaction for reports/dashboard screens.

## 5. Backup Plan

- Keep one terminal already running `npm run dev` before the panel arrives.
- Keep XAMPP Apache running the whole time.
- Do not rebuild while `npm run dev` is still running.
- If port `3000` is busy, stop old Node processes first, then restart `npm run dev`.
- If the UI has an issue, show the already working flows you rehearsed instead of improvising new ones.

## 6. Final Confidence Check

- No TypeScript errors: `npm run typecheck`
- App builds successfully: `npm run build`
- App starts successfully: `npm run dev`
- Apache is running
- Database is loaded
- Demo accounts are ready
