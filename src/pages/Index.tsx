
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { TrendingUp } from 'lucide-react';
import Hero from '@/components/Hero';
import VoucherTypes from '@/components/VoucherTypes';
import TertiaryForms from '@/components/TertiaryForms';
import Benefits from '@/components/Benefits';
import Banner from '@/components/Banner';
import PurchaseNotifications from '@/components/PurchaseNotifications';
import VoucherHistory from '@/components/VoucherHistory';
import BackgroundImageSlider from '@/components/BackgroundImageSlider';
import HamburgerMenu from '@/components/HamburgerMenu';
import { useGoogleTagManager } from '@/hooks/useGoogleTagManager';

const Index = () => {
  useGoogleTagManager();
  
  return (
    <div className="min-h-screen w-full overflow-x-hidden relative">
      <BackgroundImageSlider />
      <div className="relative z-10 w-full">
        <HamburgerMenu />
        <Banner />
        <Hero />
        <div className="flex justify-center px-4 pb-4">
          <Button
            asChild
            size="lg"
            className="bg-green-700 hover:bg-green-800 text-white border border-green-500/50 shadow-lg"
          >
            <Link to="/affiliate">
              <TrendingUp className="w-4 h-4 mr-2" /> Become an Affiliate & Earn
            </Link>
          </Button>
        </div>
        <VoucherTypes />
        <TertiaryForms />
        <VoucherHistory />
        <Benefits />
        <PurchaseNotifications />
      </div>
    </div>
  );
};

export default Index;
