
import React from 'react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BannerProps {
  className?: string;
}

const Banner = ({
  className
}: BannerProps) => {
  return (
    <Alert variant="default" className={cn("w-full bg-green-700 text-white border-none rounded-none text-center py-4", className)}>
      <AlertDescription className="flex items-center justify-center gap-6 font-medium text-xl md:text-2xl max-w-full">
        <img 
          src="/lovable-uploads/d3f8382d-d689-4d90-91dd-b29f997b25ff.png" 
          alt="MOVA Consult Logo" 
          className="h-12 md:h-16 rounded-full flex-shrink-0"
        />
        <span className="text-white text-center flex-1">
          WASSCE & BECE Voucher Portal
        </span> 
        <a 
          href="https://movaeduconsult.blogspot.com/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex-shrink-0"
        >
          <Button className="bg-white hover:bg-white text-black">
            LEARN MORE <ExternalLink className="ml-1" size={16} />
          </Button>
        </a>
      </AlertDescription>
    </Alert>
  );
};

export default Banner;
