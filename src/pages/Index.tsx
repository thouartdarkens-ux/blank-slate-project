
import React from 'react';
import Hero from '@/components/Hero';
import VoucherTypes from '@/components/VoucherTypes';
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
        <VoucherTypes />
        <VoucherHistory />
        <Benefits />
        <PurchaseNotifications />
      </div>
    </div>
  );
};

export default Index;
