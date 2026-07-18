# Payout Management System

A robust Node.js backend for managing user payouts, affiliate sales, advance payments, reconciliation, and withdrawals. This system provides a comprehensive, race-condition-safe solution for handling financial transactions with a strict audit trail.

## Overview

Designed to handle complex payout workflows for affiliate/commission-based platforms. It guarantees idempotency, enforces atomic database locks to prevent race conditions during withdrawals and job executions, and maintains a strict double-entry-style immutable ledger.

### Core Guarantees
- **Idempotent Advance Payouts:** The 10% advance job uses atomic claims and can be run concurrently without ever double-paying a sale.
- **Central Ledger:** Every single balance mutation goes through a single writer (`ledgerService.js`), maintaining a full audit trail (`Transaction` model).
- **Race-Safe Withdrawals:** Two simultaneous withdrawal requests for the same user will never both succeed, strictly enforcing the 24-hour cooldown.
- **One-Time Reconciliation:** Sales can only be reconciled (approved/rejected) once.
- **Clean Reversals:** A failed, cancelled, or rejected withdrawal automatically credits the amount back to the user via a ledger entry.

---

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose)
- **Environment:** dotenv
- **Testing:** Jest, MongoDB Memory Server, Supertest
- **Development:** Nodemon

---

## Project Structure

```text
.
├── src/
│   ├── app.js                         # Express app factory
│   ├── config/
│   │   ├── constants.js               # Enums, statuses, rates (Single Source of Truth)
│   │   ├── db.js                      # MongoDB connection with exponential backoff
│   │   └── env.js                     # Environment variable loader
│   ├── models/
│   │   ├── User.js                    # User balances
│   │   ├── Sale.js                    # Affiliate sales & advance tracking
│   │   ├── Payout.js                  # Payout records (Advances, Withdrawals)
│   │   └── Transaction.js             # Immutable ledger
│   ├── controllers/
│   │   ├── jobController.js
│   │   ├── payoutController.js
│   │   ├── saleController.js
│   │   ├── userController.js
│   │   └── withdrawalController.js
│   ├── services/
│   │   ├── ledgerService.js           # ONLY module allowed to mutate User.balance
│   │   ├── payoutReversalService.js   # Handles webhook/status updates
│   │   ├── reconciliationService.js   # Calculates final payout adjustments
│   │   └── withdrawalService.js       # Atomic 24h cooldown locking
│   ├── routes/
│   │   ├── jobRoutes.js
│   │   ├── payoutRoutes.js
│   │   ├── saleRoutes.js
│   │   ├── userRoutes.js
│   │   └── withdrawalRoutes.js
│   ├── middlewares/
│   │   └── errorHandler.js            # Central error formatter
│   ├── errors/
│   │   └── AppError.js                # Custom error classes (NotFound, Conflict, etc.)
│   ├── utils/
│   │   ├── apiResponse.js             # Canonical success response wrapper
│   │   └── catchAsync.js              # Route wrapper for async error passing
│   └── tests/
│       ├── fixtures/                  # Shared test setup and object factories
│       ├── integration/               # E2E full flow tests (Supertest)
│       └── unit/                      # Unit tests for services and models
├── server.js                          # Entry point
├── jest.config.js
└── package.json
```

---

## Data Models

### User
Tracks users and their balances.
- `name`: String
- `balance`: Number
- `lastWithdrawalAt`: Date

### Sale
Records individual sales, their approval status, and any advances paid.
- `status`: `'pending' | 'approved' | 'rejected'`
- `advanceStatus`: `'none' | 'paid'`
- `earning`: Number
- `advanceAmount`: Number

### Payout
Tracks all payouts to users (both automated advances and manual withdrawals).
- `type`: `'advance' | 'adjustment' | 'withdrawal'`
- `status`: `'pending' | 'success' | 'failed' | 'cancelled' | 'rejected'`
- `amount`: Number

### Transaction
Maintains an immutable ledger for every balance update, ensuring complete auditability.
- `type`: `'advance_credit' | 'final_adjustment' | 'withdrawal_debit' | 'reversal_credit'`
- `amount`: Number
- `balanceAfter`: Number (Snapshots the balance exactly at the time of transaction)

---

## API Endpoints

### System
- `GET /health` - Server health status

### Jobs
- `POST /api/jobs/advance-payout` - Triggers the advance payout processing job (Idempotent).

### Admin / Reconciliation
- `POST /api/admin/sales/:id/reconcile` - Reconcile a pending sale (`status: 'approved' | 'rejected'`). Computes final adjustment minus advance paid.

### Users & Withdrawals
- `GET /api/users/:id/balance` - Get user balance and last withdrawal timestamp.
- `GET /api/users/:id/transactions` - Get paginated ledger history (`?page=1&limit=20`).
- `POST /api/users/:id/withdraw` - Request a withdrawal. Enforces a 24-hour cooldown.

### Webhooks (Payouts)
- `POST /api/payouts/:id/status` - Update payout status. A `FAILED` withdrawal triggers an automatic reversal credit to restore the user's balance.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB 4.4+ (or MongoDB Atlas)
- npm

### Installation

Clone the repository:
```bash
git clone https://github.com/pran-ekaiva006/Payout-Management.git
cd Payout-Management
```

Install dependencies:
```bash
npm install
```

Create a `.env` file at the root:
```env
NODE_ENV=development
PORT=3000
MONGO_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/payout-system
```

---

## Running the Application

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

---

## Running Tests

The test suite provides 100% core logic coverage, including high-concurrency race condition proofs and an end-to-end integration flow replicating the exact assignment requirements.

```bash
npm test
```
*(Tests utilize `mongodb-memory-server` and run entirely in isolation without needing a live database.)*

---

## Error Handling & Response Format

All responses strictly follow canonical JSON shapes. Controllers never build responses manually.

**Success Response:**
```json
{
  "success": true,
  "data": { ...payload }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_BALANCE",
    "message": "Insufficient balance for withdrawal"
  }
}
```

### Custom Error Types
Handled globally by `errorHandler.js`:
- `NotFoundError` (404)
- `ValidationError` (400)
- `ConflictError` (409) - E.g. `WITHDRAWAL_COOLDOWN_ACTIVE` or `SALE_ALREADY_RECONCILED`
- `InsufficientBalanceError` (400)

---

## Author
Created by **pran-ekaiva006**.
