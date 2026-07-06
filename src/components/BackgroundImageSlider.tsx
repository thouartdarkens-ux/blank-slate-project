
import React, { useState, useEffect } from 'react';

const images = [
  '/lovable-uploads/e48fc3c9-70f2-4dba-819a-442f4ccd7ef0.png',
  '/lovable-uploads/b7800c9e-b9d9-4947-83d3-604d45269e96.png',
  '/lovable-uploads/d945af7f-f699-4773-8122-3b133583f878.png',
];

const BackgroundImageSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 15000); // Change image every 15 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 w-full h-full z-[-1]">
      {images.map((image, index) => (
        <div
          key={image}
          className="absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url(${image})`,
            opacity: index === currentIndex ? 1 : 0,
          }}
        />
      ))}
      <div className="absolute inset-0 bg-black bg-opacity-40" /> {/* Reduced opacity overlay */}
    </div>
  );
};

export default BackgroundImageSlider;
