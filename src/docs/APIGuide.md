
# Voucher API Guide

This document provides instructions for integrating with the Voucher API endpoints.

## Buy Voucher API

This endpoint allows external systems to programmatically purchase and send vouchers via SMS.

### Endpoint

```
POST https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api
```

### Headers

```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

### Request Body

```json
{
  "reference": "TRX-123456",
  "phone_number": "1234567890", 
  "product": "WASSCE",
  "quantity": 1,
  "amount": 10
}
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| reference | string | **Required.** A unique transaction reference |
| phone_number | string | **Required.** Customer's phone number (where SMS will be sent) |
| product | string | **Required.** Voucher type (e.g., "WASSCE", "BECE") |
| quantity | number | **Required.** Number of vouchers to purchase |
| amount | number | **Required.** Total transaction amount |

### Response

#### Success (200 OK)

```json
{
  "success": true,
  "message": "Vouchers sent successfully",
  "transaction_id": "uuid-of-transaction"
}
```

#### Error (4xx/5xx)

```json
{
  "error": "Error message describing what went wrong"
}
```

### Authentication

This API requires an API key for authentication. Contact your administrator to obtain an API key.

### Example Usage

```javascript
const response = await fetch('https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'YOUR_API_KEY'
  },
  body: JSON.stringify({
    reference: "TRX-123456",
    phone_number: "1234567890",
    product: "WASSCE",
    quantity: 2,
    amount: 20
  })
});

const data = await response.json();
console.log(data);
```

### Example Using cURL

```bash
curl -X POST https://iyagntncuhajyktsqtmm.supabase.co/functions/v1/buy-voucher-api \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "reference": "TRX-123456",
    "phone_number": "1234567890",
    "product": "WASSCE",
    "quantity": 1,
    "amount": 10
  }'
```
