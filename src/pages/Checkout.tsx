import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { decryptCheckoutData } from '@/utils/encryption';

interface CheckoutState {
  type: string;
  quantity: number;
  amount: number;
  timestamp: number;
  isTertiary?: boolean;
}

interface PaymentFormData {
  email: string;
  mobileNumber: string;
  fullName?: string;
}

declare global {
  interface Window {
    PaystackPop?: any;
  }
}

const PAYSTACK_PUBLIC_KEY = 'pk_test_d1de6089b6f223b03f7ef0e854ba92784b1b0cc3';

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checkoutDetails, setCheckoutDetails] = useState<CheckoutState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<PaymentFormData>();

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search);
      const encryptedData = searchParams.get('data');

      if (!encryptedData) {
        toast.error('No checkout data found');
        navigate('/');
        return;
      }

      const parsedData = decryptCheckoutData(encryptedData) as CheckoutState;

      if (!parsedData || !parsedData.type || !parsedData.quantity || !parsedData.amount) {
        toast.error('Invalid checkout data');
        navigate('/');
        return;
      }

      const now = new Date().getTime();
      const expirationTime = 30 * 60 * 1000;

      if (parsedData.timestamp && (now - parsedData.timestamp) > expirationTime) {
        toast.error('Checkout session expired. Please start again.');
        navigate('/');
        return;
      }

      setCheckoutDetails(parsedData);
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Failed to retrieve checkout data:', error);
      toast.error('Invalid checkout data');
      navigate('/');
    }
  }, [location.search, navigate]);

  const onSubmit = (data: PaymentFormData) => {
    if (!checkoutDetails) return;
    if (!window.PaystackPop) {
      toast.error('Payment library not loaded. Please refresh and try again.');
      return;
    }

    setIsProcessing(true);

    const handler = window.PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: data.email,
      amount: Math.round(checkoutDetails.amount * 100),
      currency: 'GHS',
      metadata: {
        product_type: checkoutDetails.type,
        quantity: checkoutDetails.quantity,
        amount: checkoutDetails.amount,
        mobile_number: data.mobileNumber,
        full_name: data.fullName,
        timestamp: checkoutDetails.timestamp,
        custom_fields: [
          {
            display_name: 'Product',
            variable_name: 'product_type',
            value: checkoutDetails.type,
          },
          {
            display_name: 'Quantity',
            variable_name: 'quantity',
            value: String(checkoutDetails.quantity),
          },
          {
            display_name: 'Mobile Number',
            variable_name: 'mobile_number',
            value: data.mobileNumber,
          },
          ...(data.fullName
            ? [{
                display_name: 'Full Name',
                variable_name: 'full_name',
                value: data.fullName,
              }]
            : []),
        ],
      },
      onClose: () => {
        setIsProcessing(false);
        toast.info('Payment window closed');
      },
      callback: (response: any) => {
        setIsProcessing(false);
        if (response?.reference) {
          localStorage.setItem('paymentReference', response.reference);
        }
        window.location.href = checkoutDetails.isTertiary
          ? `${window.location.origin}/`
          : `${window.location.origin}/payment-success`;
      },
    });

    handler.openIframe();
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
                {isProcessing ? 'Processing...' : 'Pay with Paystack'}
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
