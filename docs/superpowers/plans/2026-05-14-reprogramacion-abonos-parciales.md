# Reprogramacion de Abonos Parciales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cuando un cliente haga un abono parcial, la cuota original deje de aparecer como cobro pendiente y el saldo restante se convierta en una nueva cuota automática al final del préstamo.

**Architecture:** El backend toma la decisión de reprogramar el saldo dentro de `registerPayment`, para que la regla sea única y auditable. Las rutas de cobros y las vistas de préstamo/estado de cuenta consumen estados nuevos para distinguir entre cuotas activas, pagadas y reprogramadas sin mezclar historial con trabajo pendiente.

**Tech Stack:** TypeScript, Express 5, Prisma, React 18, Astro 6, PDFKit, Tailwind CSS v4

---

### Task 1: Persistir la reprogramacion parcial

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/services/payment-distribution.service.ts`
- Modify: `backend/src/controllers/cobros.controller.ts`

- [ ] **Step 1: Update the schema for reprogrammed installments**

Add installment state support for `reprogramada` and a way to link the generated carry-forward installment back to the original one. Also add payment metadata so the API can report how much saldo was reprogrammed.

- [ ] **Step 2: Implement the partial-payment branch in `registerPayment`**

When the payment is smaller than the installment balance, keep the current interest-first distribution, mark the original installment as reprogrammed, and create a new future installment for the remaining saldo.

- [ ] **Step 3: Keep the existing full-payment and overpayment paths unchanged**

Full payments should still close the installment normally. Overpayments should still flow through the current excedente logic to the next cuota.

- [ ] **Step 4: Run the backend build**

Run: `cd backend && npm run build`

Expected: TypeScript compiles with the new model and transaction changes.

---

### Task 2: Clean up active cobros responses

**Files:**
- Modify: `backend/src/controllers/cobros.controller.ts`
- Modify: `backend/src/controllers/clients.controller.ts`
- Modify: `backend/src/controllers/loans.controller.ts`

- [ ] **Step 1: Exclude reprogrammed installments from the active route**

Update `/api/cobros/hoy` so it only returns installments that are still operationally pending. Reprogrammed items should stay in history endpoints, but not in the daily collection list.

- [ ] **Step 2: Expose the reprogrammed state in loan and client detail responses**

Make `/api/loans/:id` and `/api/clients/:id` include the new state and the generated future installment so the UI can explain what happened after a partial payment.

- [ ] **Step 3: Run a focused smoke check against the API**

Run the backend locally and verify that a partial payment changes the installment state and creates a new future installment in the response payload.

Expected: `/api/cobros/hoy` no longer shows the original cuota; detail endpoints still do.

---

### Task 3: Update the cobrador UI

**Files:**
- Modify: `frontend/src/components/CobrosDia.tsx`

- [ ] **Step 1: Hide reprogrammed cuotas from the active list**

Only render items that are still actionable in the route of the day. A quota that was partially paid and reprogrammed should not keep showing as a current task.

- [ ] **Step 2: Show a clear confirmation after partial payment**

Replace the ambiguous "tiene abono" state with a clearer message that the saldo was reprogrammed to the next cuota.

- [ ] **Step 3: Keep manual distribution and preview behavior intact**

Do not change the waterfall preview or manual distribution form beyond the new post-payment messaging.

- [ ] **Step 4: Run the frontend build**

Run: `cd frontend && npm run build`

Expected: The cobrador screen still builds and the new state handling compiles.

---

### Task 4: Update history, statement, and receipt surfaces

**Files:**
- Modify: `frontend/src/components/LoanDetailPage.tsx`
- Modify: `frontend/src/components/AccountStatementPage.tsx`
- Modify: `backend/src/services/pdf.service.ts`

- [ ] **Step 1: Show the reprogrammed badge in loan history views**

Label the original cuota as reprogrammed and show the new generated cuota as a normal pending installment.

- [ ] **Step 2: Keep the account statement audit-friendly**

Make the statement show the original payment, the redistributed amounts, and the created future cuota so the user can explain the balance to the client.

- [ ] **Step 3: Add a short note to the payment receipt when saldo was reprogrammed**

If the payment caused a new future cuota, include that in the PDF receipt so the printed proof matches the app state.

- [ ] **Step 4: Re-run both builds**

Run:
- `cd backend && npm run build`
- `cd frontend && npm run build`

Expected: Both history surfaces compile after the new state labels and receipt text.

---

### Task 5: End-to-end verification

**Files:**
- None

- [ ] **Step 1: Seed or pick a loan with upcoming cuotas**

Use an existing test loan so the partial-payment path is easy to reproduce.

- [ ] **Step 2: Register a partial payment from `/cobros`**

Pay less than the cuota total and confirm the original cuota disappears from the active route.

- [ ] **Step 3: Verify the history surfaces**

Open the loan detail and account statement views and confirm the original cuota is preserved as reprogrammed and the new future cuota appears at the end.

- [ ] **Step 4: Confirm the receipt text**

Download the payment receipt and verify it matches the reprogrammed saldo behavior.

