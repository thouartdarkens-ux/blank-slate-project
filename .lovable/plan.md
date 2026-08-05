

## Pending Transactions Retry Feature

### What This Does
Adds a dedicated section on the Transactions page showing pending transactions that have an amount greater than zero. Each row will have a "Process" button that retries the voucher fulfillment. On success, the transaction is marked as completed.

### How It Works

1. A new "Pending Transactions" card appears above the main transaction list (only when there are qualifying pending transactions)
2. The card header includes a "Process All" button to retry all pending transactions at once
3. Each row has an individual "Retry" button to process a single transaction
4. When retried, the system calls the existing `buy-voucher-api/check-pending` endpoint (for all) or a new single-transaction retry flow
5. On success, the transaction status updates to "completed" and the UI refreshes

### Changes

**1. New Component: `src/components/transactions/PendingTransactionsTable.tsx`**
- Displays a table filtered to pending/awaiting_inventory transactions with amount > 0
- Columns: Reference, Phone, Product, Quantity, Amount, Date, Status, Action
- Each row has a "Retry" button
- Header has a "Process All" button
- Shows loading state during processing

**2. Update `src/pages/TransactionsPage.tsx`**
- Import and render `PendingTransactionsTable` above the tabs section
- Pass the pending transactions (filtered: status is "pending" or "awaiting_inventory", amount > 0) and a retry handler
- The retry handler for individual transactions will call a new edge function endpoint

**3. New Edge Function Endpoint: `buy-voucher-api/retry-single`**
- Add a new path handler in `buy-voucher-api/index.ts` for `/retry-single`
- Accepts a `transaction_id` in the request body
- Fetches the transaction from the database
- Validates it is still pending/awaiting_inventory and amount > 0
- Calls the existing `fulfillTransaction()` logic to process it
- Returns success/failure response

**4. New Utility: `src/utils/retrySingleTransaction.ts`**
- A function that calls `supabase.functions.invoke('buy-voucher-api/retry-single', { body: { transaction_id } })`
- Returns success/failure result

### Technical Details

- The pending transactions table only shows transactions where `status` is `"pending"` or `"awaiting_inventory"` AND `amount > 0`
- Individual retry calls the existing `fulfillTransaction()` function already in `buy-voucher-api`
- "Process All" reuses the existing `processPendingTransactions()` utility (calls `/check-pending`)
- The `fulfillTransaction` function already handles: fetching vouchers, sending SMS, moving to sold_vouchers, deleting from inventory, and updating status
- The edge function path `/retry-single` will be added alongside the existing `/check-pending` path handler

