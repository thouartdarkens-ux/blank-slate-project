
import React, { useEffect, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { generatePurchaseNotification } from '@/utils/fakeData';

const PurchaseNotifications = () => {
  // Use ref to prevent multiple intervals from being created on re-renders
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    // Function to show the purchase notification toast
    const showPurchaseNotification = () => {
      const { name, location, voucherType, quantity } = generatePurchaseNotification();
      
      toast({
        title: "Recent Purchase",
        description: `${name} from ${location} just purchased ${quantity} ${voucherType} ${quantity === 1 ? 'voucher' : 'vouchers'}.`,
        duration: 5000,
      });
    };

    // Show first notification after a short delay
    const initialDelay = setTimeout(() => {
      showPurchaseNotification();
      
      // Set interval for subsequent notifications (between 30-60 seconds)
      if (intervalRef.current === null) {
        intervalRef.current = window.setInterval(() => {
          showPurchaseNotification();
        }, Math.random() * 30000 + 30000); // Random interval between 30-60 seconds
      }
    }, 10000); // Show first notification after 10 seconds

    // Clean up intervals and timeouts
    return () => {
      clearTimeout(initialDelay);
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PurchaseNotifications;
