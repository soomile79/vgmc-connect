import React from 'react';

interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: 'light' | 'dark';
}

export const Logo: React.FC<LogoProps> = ({ className = "", showText = true, variant = 'dark' }) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* 
        NOTE: To use your specific image file:
        1. Place your logo.png in the public folder
        2. Uncomment the img tag below and remove the SVG part
      */}
      {/* <img src="/logo.png" alt="VGMC Logo" className="w-10 h-10 object-contain" /> */}

      {/* Vector Fallback Logo */}
      <div className="relative flex items-center justify-center w-10 h-10 shrink-0">
         <div className="absolute inset-0 bg-brand-500 rounded-xl opacity-20 rotate-3"></div>
         <div className="relative w-10 h-10 bg-brand-500 rounded-xl flex items-center justify-center shadow-lg shadow-brand-200 text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
              <path d="M12 4v16m-8-8h16" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 4a8 8 0 0 0-8 8v8h16v-8a8 8 0 0 0-8-8z" strokeOpacity="0.5" strokeWidth="1.5"/>
            </svg>
         </div>
      </div>
      
      {showText && (
        <div className="flex flex-col items-start select-none">
          <h1 className={`font-extrabold text-lg leading-none tracking-tight ${variant === 'dark' ? 'text-slate-800' : 'text-white'}`}>
            밴쿠버지구촌교회
          </h1>
          <p className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${variant === 'dark' ? 'text-slate-500' : 'text-brand-100'}`}>
            Vancouver Global Mission Church
          </p>
        </div>
      )}
    </div>
  );
};

export default Logo;