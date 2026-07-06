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
  isTertiary?: boolean;
}

interface PaymentFormData {
  email: string;
  mobileNumber: string;
  fullName?: string;
}

const getProductId = (type: string): string => {
  const t = type.toLowerCase();
  if (t.includes('bece')) return 'OuwclNa2V';
  if (t.includes('wassce')) return 'DN0X1U1JL';
  return 'DN0X1U1JL';
};

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

  const onSubmit = async (data: PaymentFormData) => {
    if (!checkoutDetails) return;
    setIsProcessing(true);

    try {
      const redirectUrl = checkoutDetails.isTertiary
        ? `${window.location.origin}/`
        : `${window.location.origin}/payment-success`;

      const { data: res, error } = await supabase.functions.invoke('generate-payment-link', {
        body: {
          amount: checkoutDetails.amount,
          product_id: getProductId(checkoutDetails.type),
          customer_name: data.fullName || data.email,
          customer_email: data.email,
          customer_phone: data.mobileNumber,
          quantity: checkoutDetails.quantity,
          voucher_type: checkoutDetails.type,
          redirect_url: redirectUrl,
        },
      });

      if (error) throw new Error(error.message);

      const paymentLink = res?.data?.payment_link || res?.payment_link;
      if (!paymentLink) {
        throw new Error('No payment link returned');
      }

      window.location.href = paymentLink;
    } catch (err) {
      setIsProcessing(false);
      console.error('Payment link error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to start payment');
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
              {checkoutDetails.isTertiary && (
                <>
                  <div className="rounded-md bg-blue-50 border border-blue-200 p-3 text-sm text-blue-900">
                    Contact 0557956020 if you need assistance with filling the forms
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      type="text"
                      {...register('fullName', { required: 'Full name is required' })}
                      placeholder="Enter your full name"
                    />
                    {errors.fullName && (
                      <p className="text-sm text-red-500">{errors.fullName.message}</p>
                    )}
                  </div>
                </>
              )}
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
