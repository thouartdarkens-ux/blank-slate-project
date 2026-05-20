
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { WassceVoucherCard } from './vouchers/WassceVoucherCard';
import { BeceVoucherCard } from './vouchers/BeceVoucherCard';
import { BulkVoucherCard } from './vouchers/BulkVoucherCard';
import type { VoucherType } from '@/types/voucher';
import { fetchVoucherTypes } from '@/services/voucherTypeService';
import { encryptCheckoutData } from '@/utils/encryption';

const VoucherTypes = () => {
  const navigate = useNavigate();
  const [wasscQuantity, setWasscQuantity] = useState([1]);
  const [beceQuantity, setBeceQuantity] = useState([1]);
  const [bulkType, setBulkType] = useState('WASSCE');
  const [bulkQuantity, setBulkQuantity] = useState('');

  const {
    data: voucherTypesResponse,
    isLoading
  } = useQuery({
    queryKey: ['voucherTypes'],
    queryFn: fetchVoucherTypes
  });

  const getVoucherInfo = (name: string): VoucherType => {
    // Access the data property from the response correctly
    const foundVoucher = voucherTypesResponse?.success && voucherTypesResponse.data ? voucherTypesResponse.data.find(v => v.name === name) : undefined;

    // Return a complete VoucherType object with all required properties
    return foundVoucher || {
      id: '',
      name: name,
      price: 0,
      bulk_price: 0,
      stock: 0,
      description: null
    };
  };

  const handleBuy = (type: string, quantity: number, amount: number) => {
    // Create checkout data object
    const checkoutData = {
      type,
      quantity,
      amount: parseFloat(amount.toFixed(2)),
      timestamp: new Date().getTime() // Add timestamp for security
    };
    
    // Encrypt the checkout data to prevent tampering
    const encryptedData = encryptCheckoutData(checkoutData);
    
    // Navigate to checkout with encrypted data in the URL
    navigate(`/checkout?data=${encryptedData}`);
  };

  const handleBulkBuy = () => {
    const quantity = parseInt(bulkQuantity);
    if (!quantity || quantity < 20) return;
    const voucherInfo = getVoucherInfo(bulkType);
    const price = voucherInfo.bulk_price || voucherInfo.price;
    const amount = price * quantity;
    handleBuy(bulkType, quantity, amount);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-[400px]">Loading...</div>;
  }

  const wasscInfo = getVoucherInfo('WASSCE');
  const beceInfo = getVoucherInfo('BECE');

  return <div id="vouchers" className="bg-transparent py-[6px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Available Vouchers</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          <WassceVoucherCard voucherInfo={wasscInfo} quantity={wasscQuantity} onQuantityChange={setWasscQuantity} onBuy={handleBuy} />
          <BeceVoucherCard voucherInfo={beceInfo} quantity={beceQuantity} onQuantityChange={setBeceQuantity} onBuy={handleBuy} />
          <BulkVoucherCard bulkType={bulkType} bulkQuantity={bulkQuantity} voucherInfo={getVoucherInfo(bulkType)} onTypeChange={setBulkType} onQuantityChange={setBulkQuantity} onBuy={handleBulkBuy} />
        </div>
      </div>
    </div>;
};

export default VoucherTypes;
