
import { useEffect } from 'react';

export const useGoogleTagManager = () => {
  useEffect(() => {
    // Load the gtag.js script asynchronously if it doesn't exist
    if (!document.querySelector('script[src*="googletagmanager"]')) {
      const script = document.createElement('script');
      script.src = "https://www.googletagmanager.com/gtag/js?id=G-5YYR8DSX07";
      script.async = true;
      document.head.appendChild(script);
    }

    // Initialize the dataLayer
    window.dataLayer = window.dataLayer || [];

    // Define the gtag function
    function gtag(...args: any[]): void {
      window.dataLayer.push(args);
    }

    // Call gtag to initialize with the current date
    gtag('js', new Date());

    // Configure gtag with the tracking ID
    gtag('config', 'G-5YYR8DSX07');
  }, []);
};
