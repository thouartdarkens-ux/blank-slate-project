# Application Guide: Voucher Management System

This document provides a comprehensive overview of the application, explaining how each page works, where to find key components, and how to integrate with external services.

## Table of Contents
1. [Application Overview](#application-overview)
2. [Pages & Features](#pages--features)
3. [Integration Points](#integration-points)
4. [Key Element IDs](#key-element-ids)
5. [External Services Integration](#external-services-integration)
6. [Database Setup](#database-setup)

## Application Overview

This application is a Voucher and Inventory Management System built with React, Tailwind CSS, and Shadcn UI components. It's designed to help businesses manage their vouchers, track inventory, process transactions, and communicate with customers.

## Pages & Features

### Dashboard (`src/pages/DashboardPage.tsx`)
- **Purpose**: Provides an overview of key metrics and recent transactions
- **Features**:
  - Displays key statistics (revenue, sales, active vouchers, customers)
  - Shows sales trend chart
  - Lists recent transactions
  - Tab-based navigation between overview and transactions

### Transactions (`src/pages/TransactionsPage.tsx`)
- **Purpose**: Manages and displays all transactions
- **Features**:
  - Searchable transaction list
  - Filter by status (completed, pending, failed)
  - Exportable transaction data
  - Detailed transaction information with status indicators

### Inventory (`src/pages/VouchersPage.tsx`)
- **Purpose**: Manages voucher inventory
- **Features**:
  - Import voucher data via CSV/Excel
  - Search and filter vouchers
  - View voucher status (available, used)
  - Reset inventory data
  - Download template for bulk imports

### Alerts (`src/pages/AlertsPage.tsx`)
- **Purpose**: Notification center for system events
- **Features**:
  - View alerts for purchases, inventory status, and system updates
  - Filter alerts by type
  - Mark alerts as read
  - Displays timing and details of each alert

### Bulk Messages (`src/pages/BulkMessagesPage.tsx`)
- **Purpose**: Send SMS or email to multiple recipients
- **Features**:
  - Manual entry of recipients or CSV upload
  - Support for both SMS and email
  - Template-based messaging with personalization
  - Character counting for SMS messages

### User Management (`src/pages/ProfilePage.tsx`)
- **Purpose**: Manage user accounts
- **Features**:
  - View existing users
  - Add new users
  - Delete users
  - Basic user information management

### Reports (`src/pages/ReportsPage.tsx`)
- **Purpose**: Analytics and data visualization
- **Features**:
  - Revenue trend charts
  - Voucher usage statistics
  - Transaction volume analysis
  - Status distribution reports

## Integration Points

### Connecting to a Database

The application is designed to work with a database backend. Here's how to connect each section:

1. **User Management**:
   ```javascript
   // In ProfilePage.tsx, replace the useState with a database query:
   // Example with Supabase:
   const [users, setUsers] = useState<User[]>([]);
   
   useEffect(() => {
     const fetchUsers = async () => {
       const { data, error } = await supabase
         .from('users')
         .select('*');
       
       if (error) {
         toast({
           title: "Error fetching users",
           description: error.message,
           variant: "destructive"
         });
         return;
       }
       
       setUsers(data);
     };
     
     fetchUsers();
   }, []);
   
   // For adding users:
   const handleAddUser = async () => {
     // Validate required fields
     if (!newUser.name || !newUser.email) {
       // Show error toast
       return;
     }
     
     const { data, error } = await supabase
       .from('users')
       .insert([newUser])
       .select();
     
     if (error) {
       // Show error toast
       return;
     }
     
     setUsers([...users, data[0]]);
     // Reset form and close dialog
   };
   
   // For deleting users:
   const handleDeleteUser = async (userId) => {
     const { error } = await supabase
       .from('users')
       .delete()
       .eq('id', userId);
     
     if (error) {
       // Show error toast
       return;
     }
     
     setUsers(users.filter(user => user.id !== userId));
     // Show success toast
   };
   ```

2. **Inventory Management**:
   ```javascript
   // In VouchersPage.tsx:
   useEffect(() => {
     const fetchInventory = async () => {
       const { data, error } = await supabase
         .from('vouchers')
         .select('*');
       
       if (error) {
         // Show error toast
         return;
       }
       
       setInventoryData(data);
     };
     
     fetchInventory();
   }, []);
   ```

3. **Transactions**:
   ```javascript
   // In TransactionsPage.tsx:
   useEffect(() => {
     const fetchTransactions = async () => {
       const { data, error } = await supabase
         .from('transactions')
         .select('*')
         .order('created_at', { ascending: false });
       
       if (error) {
         // Show error toast
         return;
       }
       
       setAllTransactions(data);
     };
     
     fetchTransactions();
   }, []);
   ```

### Payment Gateway Integration (Stripe)

To connect the Transactions tab with a payment gateway like Stripe:

1. **Setup Webhook Endpoint**:
   Create a webhook endpoint in your backend (e.g., using Supabase Edge Functions):

   ```javascript
   // Example Supabase Edge Function for Stripe webhook:
   import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
   import Stripe from 'https://esm.sh/stripe@11.1.0';

   const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'), {
     apiVersion: '2022-11-15',
   });

   serve(async (req) => {
     const signature = req.headers.get('stripe-signature');
     const body = await req.text();
     
     try {
       // Verify webhook signature
       const event = stripe.webhooks.constructEvent(
         body,
         signature,
         Deno.env.get('STRIPE_WEBHOOK_SECRET')
       );
       
       // Handle different event types
       switch (event.type) {
         case 'payment_intent.succeeded':
           // Create transaction record
           const paymentIntent = event.data.object;
           const { data, error } = await supabaseClient
             .from('transactions')
             .insert([
               {
                 id: paymentIntent.id,
                 customer: paymentIntent.customer,
                 amount: (paymentIntent.amount / 100).toFixed(2),
                 status: 'completed',
                 date: new Date().toISOString(),
                 voucher: paymentIntent.metadata.voucher || null,
               },
             ]);
           
           // Also update voucher status if applicable
           if (paymentIntent.metadata.voucher) {
             await supabaseClient
               .from('vouchers')
               .update({ isAvailable: false })
               .eq('serialCode', paymentIntent.metadata.voucher);
           }
           
           // Create alert for new purchase
           await supabaseClient
             .from('alerts')
             .insert([
               {
                 message: `Purchase completed: Order #${paymentIntent.id.substring(0, 8)}`,
                 type: 'purchase',
                 status: 'new',
                 createdAt: new Date().toISOString(),
                 details: `Customer purchased for $${(paymentIntent.amount / 100).toFixed(2)}`
               },
             ]);
           
           break;
         
         case 'payment_intent.payment_failed':
           // Handle failed payment
           const failedPayment = event.data.object;
           await supabaseClient
             .from('transactions')
             .insert([
               {
                 id: failedPayment.id,
                 customer: failedPayment.customer,
                 amount: (failedPayment.amount / 100).toFixed(2),
                 status: 'failed',
                 date: new Date().toISOString(),
               },
             ]);
           
           break;
       }
       
       return new Response(JSON.stringify({ received: true }), {
         status: 200,
         headers: { "Content-Type": "application/json" },
       });
     } catch (err) {
       return new Response(
         JSON.stringify({ error: err.message }),
         { status: 400, headers: { "Content-Type": "application/json" } }
       );
     }
   });
   ```

2. **Frontend Integration**:
   Add a checkout function in your application:

   ```javascript
   // Example checkout function
   const handleCheckout = async (productId, voucherId) => {
     try {
       const { data, error } = await supabaseClient
         .functions
         .invoke('create-checkout', {
           body: {
             productId,
             voucherId,
           },
         });
       
       if (error) throw error;
       
       // Redirect to Stripe checkout
       window.location.href = data.url;
     } catch (error) {
       console.error('Error creating checkout session:', error);
       toast({
         title: 'Checkout Error',
         description: error.message,
         variant: 'destructive',
       });
     }
   };
   ```

### SMS Service Integration

To integrate the SMS service with the Bulk Messages page:

1. **Using Twilio**:
   ```javascript
   // In BulkMessagesPage.tsx
   
   const sendSMS = async (phoneNumbers, message) => {
     try {
       // Call Supabase edge function to send SMS
       const { data, error } = await supabase
         .functions
         .invoke('send-sms', {
           body: {
             phoneNumbers: phoneNumbers.split(',').map(num => num.trim()),
             message,
           },
         });
       
       if (error) throw error;
       
       toast({
         title: 'SMS Sent',
         description: `Messages sent to ${data.count} recipients`,
       });
     } catch (error) {
       toast({
         title: 'Error',
         description: error.message,
         variant: 'destructive',
       });
     }
   };
   
   // For the handleSendMessages function:
   const handleSendMessages = () => {
     if (messageType === 'sms') {
       sendSMS(phoneNumbers, message);
     } else {
       sendEmail(phoneNumbers, message);
     }
   };
   ```

2. **Supabase Edge Function for SMS**:
   ```javascript
   // Example Supabase Edge Function for Twilio SMS
   import { serve } from "https://deno.land/std@0.131.0/http/server.ts";
   import twilio from 'https://esm.sh/twilio';

   serve(async (req) => {
     try {
       const { phoneNumbers, message } = await req.json();
       
       const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
       const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
       const twilioNumber = Deno.env.get('TWILIO_PHONE_NUMBER');
       
       const client = twilio(accountSid, authToken);
       
       const results = await Promise.all(
         phoneNumbers.map(async (phoneNumber) => {
           try {
             const message = await client.messages.create({
               body: message,
               from: twilioNumber,
               to: phoneNumber,
             });
             
             return { success: true, phoneNumber, sid: message.sid };
           } catch (error) {
             return { success: false, phoneNumber, error: error.message };
           }
         })
       );
       
       const successCount = results.filter(r => r.success).length;
       
       return new Response(
         JSON.stringify({ success: true, count: successCount, results }),
         { status: 200, headers: { "Content-Type": "application/json" } }
       );
     } catch (error) {
       return new Response(
         JSON.stringify({ success: false, error: error.message }),
         { status: 400, headers: { "Content-Type": "application/json" } }
       );
     }
   });
   ```

### Functional Alerts System

To implement a functional alert system:

1. **Create Alerts Database Table**:
   ```sql
   CREATE TABLE alerts (
     id SERIAL PRIMARY KEY,
     message TEXT NOT NULL,
     type TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     details TEXT
   );
   ```

2. **Automated Alert Generation**:
   ```javascript
   // Example function to generate low inventory alert
   const checkInventoryLevels = async () => {
     const { data, error } = await supabase
       .from('vouchers')
       .select('*')
       .eq('isAvailable', true)
       .group('batchNumber');
     
     if (error) {
       console.error('Error checking inventory:', error);
       return;
     }
     
     // Check for low inventory
     for (const batch of data) {
       if (batch.count < 10) {  // Threshold for low inventory
         // Create alert
         await supabase
           .from('alerts')
           .insert([
             {
               message: `Low inventory alert: Batch ${batch.batchNumber}`,
               type: 'inventory',
               status: 'new',
               details: `Only ${batch.count} vouchers remaining`,
             },
           ]);
       }
     }
   };
   ```

3. **Real-time Alert Updates**:
   ```javascript
   // In AlertsPage.tsx
   useEffect(() => {
     // Initial fetch
     fetchAlerts();
     
     // Set up real-time subscription
     const alertsSubscription = supabase
       .channel('alerts-changes')
       .on(
         'postgres_changes',
         { event: 'INSERT', schema: 'public', table: 'alerts' },
         (payload) => {
           setAlerts(prev => [payload.new, ...prev]);
         }
       )
       .subscribe();
     
     return () => {
       supabase.removeChannel(alertsSubscription);
     };
   }, []);
   ```

## Key Element IDs

Here are the key element IDs used throughout the application:

### Auth and User Management
- **User Form**:
  - `name`: User name input field
  - `email`: User email input field
  - `phone`: User phone input field
  - `department`: User department input field

### Inventory Management
- **Voucher Import**:
  - `inventory-file`: File input for CSV/Excel upload
  - `serial-code`: Serial code input field
  - `pin`: PIN input field

### Bulk Messages
- **Message Form**:
  - `message-type`: Select for SMS/Email
  - `recipients`: Input for recipients
  - `message-content`: Textarea for message
  - `csv-file`: File input for CSV upload
  - `message-template`: Textarea for message template

### Application Setup
- **Database Configuration**:
  - Create a Supabase project and update the credentials in your environment
  - Set up the following tables:
    - `users`: For user management
    - `vouchers`: For inventory management
    - `transactions`: For transaction history
    - `alerts`: For system notifications

## External Services Integration

### Payment Processing (Stripe)
1. Create a Stripe account
2. Get your API keys from the Stripe Dashboard
3. Set up the following environment variables in your Supabase project:
   - `STRIPE_SECRET_KEY`: Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET`: Your webhook signing secret
4. Create a webhook endpoint in Stripe Dashboard pointing to your Supabase Edge Function
5. Implement the webhook handler as shown above

### SMS Service (Twilio)
1. Create a Twilio account
2. Get your Account SID and Auth Token from the Twilio Dashboard
3. Set up the following environment variables:
   - `TWILIO_ACCOUNT_SID`: Your Twilio account SID
   - `TWILIO_AUTH_TOKEN`: Your Twilio auth token
   - `TWILIO_PHONE_NUMBER`: Your Twilio phone number
4. Implement the edge function as shown above

### Email Service (SendGrid)
1. Create a SendGrid account
2. Get your API key from the SendGrid Dashboard
3. Set up the following environment variable:
   - `SENDGRID_API_KEY`: Your SendGrid API key
4. Implement an edge function similar to the SMS example, but using SendGrid's API

## Database Setup

To fully connect this application to a database, follow these steps:

1. **Create a Supabase Project**:
   - Go to [Supabase](https://supabase.com/) and create a new project
   - Note your project URL and anon/public key

2. **Set Up Tables**:
   Execute the following SQL to create your database structure:

   ```sql
   -- Users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     name TEXT NOT NULL,
     email TEXT UNIQUE NOT NULL,
     phone TEXT,
     department TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Vouchers table
   CREATE TABLE vouchers (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     serial_code TEXT UNIQUE NOT NULL,
     pin TEXT NOT NULL,
     is_available BOOLEAN NOT NULL DEFAULT TRUE,
     expiry_date DATE NOT NULL,
     batch_number TEXT,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Transactions table
   CREATE TABLE transactions (
     id TEXT PRIMARY KEY,
     customer TEXT NOT NULL,
     amount TEXT NOT NULL,
     status TEXT NOT NULL,
     voucher TEXT REFERENCES vouchers(serial_code),
     date TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Alerts table
   CREATE TABLE alerts (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     message TEXT NOT NULL,
     type TEXT NOT NULL,
     status TEXT NOT NULL DEFAULT 'new',
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     details TEXT
   );
   ```

3. **Connect Your Application**:
   ```javascript
   import { createClient } from '@supabase/supabase-js'

   const supabaseUrl = 'YOUR_SUPABASE_URL'
   const supabaseKey = 'YOUR_SUPABASE_KEY'
   const supabase = createClient(supabaseUrl, supabaseKey)
   
   // Now you can use `supabase` throughout your application
   ```

4. **Set Up Edge Functions**:
   - Create edge functions in Supabase for:
     - Stripe webhook handler
     - SMS sending
     - Email sending
     - Inventory checks
   - Deploy your functions and note their URLs

5. **Set Environment Variables**:
   In your Supabase project, set all necessary environment variables for your edge functions:
   - Stripe keys
   - Twilio credentials
   - SendGrid API key
   - Any other service credentials

By following this setup, you'll have a fully functional application with database persistence, payment processing, and communication capabilities.

## Troubleshooting

- **Database Connection Issues**: Verify your Supabase URL and key are correct
- **Payment Processing Errors**: Check Stripe Dashboard for logs
- **SMS/Email Sending Failures**: Verify API credentials and check service dashboards
- **Alert System Not Working**: Ensure the real-time subscription is set up correctly

## SMS Integration with Arkesel

### Setting Up Arkesel SMS

To integrate Arkesel SMS with your application:

1. Create an account on [Arkesel](https://arkesel.com)
2. Get your API key from your Arkesel dashboard
3. Add your API key to your Supabase Edge Function secrets

### API Endpoint and Payload Structure

The base URL for Arkesel SMS API is: `https://sms.arkesel.com/api/v2/sms/send`

#### Sample Payload for SMS:
```json
{
  "sender": "YourSenderID",
  "message": "Your message content",
  "recipients": ["233200000000", "233200000001"],
  "sandbox": false
}
```

#### Required Headers:
```
'api-key': 'YOUR_ARKESEL_API_KEY'
'Content-Type': 'application/json'
```

### Response Format:
```json
{
  "code": 200,
  "message": "Successfully sent",
  "data": {
    "message_id": "b63d9c52-fb54-4a3d-89b8-c4dd6e2823a4",
    "status": "success",
    "message_parts": 1,
    "credits_used": 1
  }
}
```

### Implementation Example:

```typescript
interface ArkeselSMSPayload {
  sender: string;
  message: string;
  recipients: string[];
  sandbox?: boolean;
}

const sendSMS = async (payload: ArkeselSMSPayload) => {
  const response = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
    method: 'POST',
    headers: {
      'api-key': process.env.ARKESEL_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return response.json();
};
```

### Error Handling

Common error codes:
- 401: Invalid API key
- 402: Insufficient credits
- 403: Invalid sender ID
- 422: Validation error (e.g., invalid phone numbers)

### Best Practices

1. Always validate phone numbers before sending
2. Use environment variables for API keys
3. Implement proper error handling
4. Keep track of SMS credits
5. Log all SMS activities for auditing
6. Use sandbox mode for testing
