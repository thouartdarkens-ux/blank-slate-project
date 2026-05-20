import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { decryptCheckoutData } from '@/utils/encryption';
import { supabase } from '@/integrations/supabase/client';

interface CheckoutState {
  type: string;
  quantity: number;
  amount: number;
  timestamp: number;
}

interface PaymentFormData {
  email: string;
  name: string;
  mobileNumber: string;
}

/**
 * Checkout component for processing customer payments
 * 
 * This component:
 * 1. Collects customer information (name, email, and mobile number)
 * 2. Generates a reference ID
 * 3. Redirects to external payment gateway
 */
const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutState | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>();

  // Extract and decrypt checkout data from URL
  useEffect(() => {
    try {
      // Get encrypted data from URL
      const searchParams = new URLSearchParams(location.search);
      const encryptedData = searchParams.get('data');
      
      if (!encryptedData) {
        toast.error('No checkout data found');
        navigate('/');
        return;
      }
      
      // Decrypt the data
      const parsedData = decryptCheckoutData(encryptedData) as CheckoutState;
      
      // Validate the data
      if (!parsedData || !parsedData.type || !parsedData.quantity || !parsedData.amount) {
        toast.error('Invalid checkout data');
        navigate('/');
        return;
      }
      
      // Check if the checkout data has expired (30 minutes)
      const now = new Date().getTime();
      const expirationTime = 30 * 60 * 1000; // 30 minutes in milliseconds
      
      if (parsedData.timestamp && (now - parsedData.timestamp) > expirationTime) {
        toast.error('Checkout session expired. Please start again.');
        navigate('/');
        return;
      }
      
      // Set the checkout details
      setCheckoutDetails(parsedData);
      
      // Clear URL parameters after processing to further enhance security
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Failed to retrieve checkout data:', error);
      toast.error('Invalid checkout data');
      navigate('/');
    }
  }, [location.search, navigate]);

  // Map voucher types to their respective product IDs
  const getProductId = (voucherType: string) => {
    switch(voucherType) {
      case 'BECE':
        return 'OuwclNa2V';
      case 'WASSCE':
        return 'DN0X1U1JL';
      default:
        return 'GrqHE2LKw'; // Default product ID
    }
  };

  const generateReference = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const [isProcessing, setIsProcessing] = useState(false);

  const onSubmit = async (data: PaymentFormData) => {
    try {
      setIsProcessing(true);

      const productId = getProductId(checkoutDetails!.type);

      const { data: responseData, error } = await supabase.functions.invoke('generate-payment-link', {
        body: {
          amount: checkoutDetails!.amount,
          product_id: productId,
          customer_name: data.name,
          customer_email: data.email,
          customer_phone: data.mobileNumber,
          quantity: checkoutDetails!.quantity,
          voucher_type: checkoutDetails!.type,
          redirect_url: `${window.location.origin}/payment-success`,
        },
      });

      if (error) {
        console.error('Edge function error:', error);
        toast.error('Failed to initiate payment. Please try again.');
        return;
      }

      const paymentLink = responseData?.data?.payment_link;
      if (!paymentLink) {
        console.error('No payment link in response:', responseData);
        toast.error('Failed to get payment link. Please try again.');
        return;
      }

      // Store transaction reference for success page
      if (responseData?.data?.client_transaction_id) {
        localStorage.setItem('paymentReference', responseData.data.client_transaction_id);
      }

      console.log('Redirecting to payment link:', paymentLink);
      window.location.href = paymentLink;
    } catch (error) {
      console.error('Payment initiation error:', error);
      toast.error('Failed to initiate payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!checkoutDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Checkout</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">No checkout details found.</p>
            <Button onClick={() => navigate('/')}>Return to Home</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="container mx-auto px-4">
        <Card className="mx-auto max-w-2xl">
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <p className="text-lg font-semibold">{checkoutDetails.type} Voucher</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{checkoutDetails.quantity}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">Total Amount:</span>
                  <span className="text-xl font-bold text-green-600">
                    GH₵ {checkoutDetails.amount}
                  </span>
                </div>
              </div>
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  {...register('name', { required: 'Name is required' })}
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', { required: 'Email is required' })}
                  placeholder="Enter your email"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobileNumber">Mobile Number</Label>
                <Input
                  id="mobileNumber"
                  type="tel"
                  {...register('mobileNumber', { required: 'Mobile number is required' })}
                  placeholder="Enter your mobile number"
                />
                {errors.mobileNumber && (
                  <p className="text-sm text-red-500">{errors.mobileNumber.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                {isProcessing ? 'Processing...' : 'Proceed to Payment'}
              </Button>
              
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
                type="button"
              >
                Cancel Order
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Checkout;
