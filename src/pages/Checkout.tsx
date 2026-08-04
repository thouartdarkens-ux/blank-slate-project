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
}

interface PaymentFormData {
  email: string;
  mobileNumber: string;
}

const MOOLRE_API_USER = 'movaconsult';
const MOOLRE_PUBLIC_KEY =
  'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyaWQiOjEwODE1NCwiZXhwIjoxOTU2NTQ1OTk5fQ.clDRhYtPhcBAZhXDo-sIkSNiFEEbHWUTB770KdW8XY0';
const MOOLRE_ACCOUNT_NUMBER = '10815406066348';
const MOOLRE_CALLBACK_URL =
  'https://ngqlvcbkbxoqpdvmofto.supabase.co/functions/v1/moolre-webhook';
const MOOLRE_EMBED_LINK_URL = 'https://api.moolre.com/embed/link';

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

    const externalRef = `MOV${Date.now()}${Math.random().toString(36).slice(2, 8)}`;

    try {
      const response = await fetch(MOOLRE_EMBED_LINK_URL, {
        method: 'POST',
        headers: {
          'X-API-USER': MOOLRE_API_USER,
          'X-API-PUBKEY': MOOLRE_PUBLIC_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 1,
          amount: String(checkoutDetails.amount),
          email: data.email,
          externalref: externalRef,
          callback: MOOLRE_CALLBACK_URL,
          redirect: `${window.location.origin}/`,
          reusable: '0',
          currency: 'GHS',
          accountnumber: MOOLRE_ACCOUNT_NUMBER,
          metadata: {
            product_type: checkoutDetails.type,
            quantity: checkoutDetails.quantity,
            amount: checkoutDetails.amount,
            mobile_number: data.mobileNumber,
            email: data.email,
            timestamp: checkoutDetails.timestamp,
          },
        }),
      });

      const result = await response.json();

      if (result?.status === 1 && result?.data?.authorization_url) {
        localStorage.setItem('paymentReference', result.data.reference || externalRef);
        window.location.href = result.data.authorization_url;
      } else {
        setIsProcessing(false);
        console.error('Moolre link generation failed:', result);
        toast.error(result?.message || 'Failed to generate payment link');
      }
    } catch (err: any) {
      setIsProcessing(false);
      console.error('Moolre error:', err);
      toast.error(err?.message || 'Payment failed to initialize');
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
                {isProcessing ? 'Processing...' : 'Pay with Moolre'}
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
