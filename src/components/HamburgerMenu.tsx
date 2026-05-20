import React, { useState } from 'react';
import { Menu, X, Phone, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PreviousChecks from '@/components/PreviousChecks';
import AggregateCalculator from '@/components/AggregateCalculator';
const HamburgerMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  return <div className="fixed top-4 left-4 z-50">
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          
        </SheetTrigger>
        <SheetContent side="left" className="w-full max-w-md p-0">
          <SheetHeader className="p-6 pb-0">
            <SheetTitle>Menu</SheetTitle>
          </SheetHeader>
          <div className="p-6 h-full overflow-auto">
            <Tabs defaultValue="previous-checks" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="previous-checks" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Previous Checks
                </TabsTrigger>
                <TabsTrigger value="calculator" className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Calculator
                </TabsTrigger>
              </TabsList>
              <TabsContent value="previous-checks" className="mt-4">
                <PreviousChecks />
              </TabsContent>
              <TabsContent value="calculator" className="mt-4">
                <AggregateCalculator />
              </TabsContent>
            </Tabs>
          </div>
        </SheetContent>
      </Sheet>
    </div>;
};
export default HamburgerMenu;