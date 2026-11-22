import React from 'react';

interface BrandLogoProps {
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({className = 'w-8 h-8'}) => {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="64" height="64" rx="16" className="fill-brand-600 dark:fill-brand-800" />
      <path
        d="M35.5 13C30.8 13.7 27.2 17.7 27.2 22.6C27.2 28.1 31.6 32.5 37.1 32.5C39.5 32.5 41.8 31.6 43.5 30.1C42 33.8 38.3 36.4 34 36.4C28.1 36.4 23.4 31.7 23.4 25.8C23.4 19.2 28.8 13.5 35.5 13Z"
        className="fill-accent"
      />
      <circle cx="39.5" cy="20.5" r="1.4" className="fill-accent-200" />
      <path
        d="M15 36.5C15 34.8 16.3 33.5 18 33.5C23.2 33.5 28.1 35 32 37.7C35.9 35 40.8 33.5 46 33.5C47.7 33.5 49 34.8 49 36.5V47.2C49 48.6 47.9 49.7 46.5 49.7C41.4 49.7 36.4 51 32 53.2C27.6 51 22.6 49.7 17.5 49.7C16.1 49.7 15 48.6 15 47.2V36.5Z"
        className="fill-brand-50"
      />
      <path d="M32 37.7V53.2" className="stroke-brand-600" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
};
