import React from 'react';
import { useGoogleTagManager } from '@/hooks/useGoogleTagManager';

const PaymentSuccess = () => {
  useGoogleTagManager();
  
  return (
    <div>
      <h1>Payment Successful!</h1>
      <p>Thank you for your purchase.</p>
    </div>
  );
};

export default PaymentSuccess;
