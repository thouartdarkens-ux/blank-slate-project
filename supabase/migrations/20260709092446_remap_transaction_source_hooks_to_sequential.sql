
-- Remap old-format source_hooks in webhook_transactions to the new sequential codes
-- Mapping derived from old format (initials + last 4 digits of phone):

UPDATE webhook_transactions SET source_hook = '001' WHERE source_hook = 'JB8281';
UPDATE webhook_transactions SET source_hook = '003' WHERE source_hook = 'MF3064';
UPDATE webhook_transactions SET source_hook = '004' WHERE source_hook = 'PA6061';
UPDATE webhook_transactions SET source_hook = '004' WHERE source_hook = 'AG6061';

-- Transactions with webhook-function-name source_hooks had no agent code;
-- set to NULL since they don't belong to any affiliate
UPDATE webhook_transactions SET source_hook = NULL WHERE source_hook IN ('NALOWEBHOOK-GENERAL', 'NALOWEBHOOK-KA2334');
