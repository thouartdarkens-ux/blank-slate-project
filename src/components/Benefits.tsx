
import React from 'react';
import { Check } from 'lucide-react';

const Benefits = () => {
  return (
    <div className="py-16 bg-transparent">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Why Choose Our Service</h2>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {[
            {
              title: "Instant Delivery",
              description: "Get your voucher code immediately after payment"
            },
            {
              title: "Secure Payment",
              description: "Safe and encrypted transaction process"
            },
            {
              title: "Contact Us",
              description: "Phone: +233557856020/+23358848199 Email:help@buycheckerpins.com"
            }
          ].map((benefit) => (
            <div key={benefit.title} className="flex flex-col items-center text-center bg-black bg-opacity-50 p-6 rounded-lg backdrop-blur-sm">
              <div className="rounded-full bg-green-100 p-3 mb-4">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-white">{benefit.title}</h3>
              <p className="text-gray-200">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Benefits;
