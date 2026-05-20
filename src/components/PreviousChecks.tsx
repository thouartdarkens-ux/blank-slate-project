
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Phone } from 'lucide-react';

const PreviousChecks = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [checks, setChecks] = useState<any[]>([]);

  const handleSearch = async () => {
    if (!phoneNumber.trim()) return;
    
    setIsLoading(true);
    console.log('Searching for checks with phone number:', phoneNumber);
    
    // Simulate API call - replace with actual implementation
    setTimeout(() => {
      setChecks([
        {
          id: 1,
          date: '2024-01-15',
          type: 'WASSCE',
          status: 'Completed',
          reference: 'WSC2024001'
        },
        {
          id: 2,
          date: '2024-01-10',
          type: 'BECE',
          status: 'Completed',
          reference: 'BCE2024001'
        }
      ]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-sm font-medium">Phone Number</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="Enter your phone number"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button 
            onClick={handleSearch} 
            disabled={isLoading || !phoneNumber.trim()}
            className="px-4"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading && (
        <div className="text-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-sm text-gray-600 mt-2">Searching for your previous checks...</p>
        </div>
      )}

      {checks.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm">Previous Checks</h3>
          {checks.map((check) => (
            <Card key={check.id} className="p-3">
              <CardHeader className="p-0 pb-2">
                <CardTitle className="text-sm">{check.type} Check</CardTitle>
                <CardDescription className="text-xs">
                  Reference: {check.reference}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">{check.date}</span>
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    {check.status}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {checks.length === 0 && phoneNumber && !isLoading && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-600">No previous checks found for this phone number.</p>
        </div>
      )}
    </div>
  );
};

export default PreviousChecks;
