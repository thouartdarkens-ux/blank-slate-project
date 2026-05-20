import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { encryptCheckoutData } from '@/utils/encryption';

const FORMS = [
  { name: 'COE', price: 375 },
  { name: 'KNUST UNDERGRAD', price: 280 },
  { name: 'LEGON UNDERGRAD', price: 240 },
  { name: 'UCC UNDERGRAD', price: 240 },
  { name: 'UEW UNDERGRAD', price: 275 },
  { name: 'UHAS UNDERGRAD', price: 260 },
  { name: 'UPSA UNDERGRAD', price: 275 },
];

const TertiaryForms = () => {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const selectedForm = FORMS.find((f) => f.name === selected);
  const totalAmount = selectedForm ? selectedForm.price * quantity : 0;

  const handleProceed = () => {
    if (!selectedForm) return;
    const checkoutData = {
      type: selectedForm.name,
      quantity,
      amount: parseFloat(totalAmount.toFixed(2)),
      timestamp: new Date().getTime(),
    };
    const encrypted = encryptCheckoutData(checkoutData);
    navigate(`/checkout?data=${encrypted}`);
  };

  return (
    <section id="tertiary-forms" className="py-12">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-white mb-8">
          Buy Tertiary Admission Forms
        </h2>
        <Card className="bg-blue-700/70 backdrop-blur-md border-2 hover:border-blue-400 transition-all">
          <CardHeader>
            <CardTitle className="text-white">Select an Admission Form</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Form Type</label>
              <Select value={selected} onValueChange={setSelected}>
                <SelectTrigger className="w-full bg-white text-black">
                  <SelectValue placeholder="Choose a form" />
                </SelectTrigger>
                <SelectContent>
                  {FORMS.map((f) => (
                    <SelectItem key={f.name} value={f.name}>
                      {f.name} — GH₵ {f.price.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Quantity</label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  setQuantity(!isNaN(v) && v >= 1 ? v : 1);
                }}
                className="bg-white text-black"
              />
            </div>

            {selectedForm && (
              <div className="p-4 rounded-lg bg-blue-500/80">
                <p className="text-white text-sm">Selected: {selectedForm.name}</p>
                <p className="text-3xl font-bold text-white mt-2">
                  GH₵ {totalAmount.toFixed(2)}
                </p>
              </div>
            )}

            <Button
              className="w-full"
              disabled={!selectedForm}
              onClick={handleProceed}
            >
              Proceed to Checkout
            </Button>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default TertiaryForms;
