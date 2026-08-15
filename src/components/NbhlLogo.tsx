import React from 'react';

interface NbhlLogoProps {
  variant?: 'full' | 'header' | 'login' | 'monogram';
  className?: string;
}

export const NbhlLogo: React.FC<NbhlLogoProps> = ({ variant = 'full', className = '' }) => {
  if (variant === 'login') {
    return (
      <div className={`flex flex-col items-center justify-center text-center ${className}`}>
        <img
          src="/nbhl-logo.svg"
          alt="NIJOBHUMI HOME LAND - Building Dreams, Growing Wealth Daily."
          className="w-full max-w-[340px] md:max-w-[380px] h-auto drop-shadow-[0_10px_20px_rgba(212,175,55,0.25)] hover:scale-[1.02] transition-transform duration-300"
        />
      </div>
    );
  }

  if (variant === 'header') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <img
          src="/nbhl-logo.svg"
          alt="NBHL Logo"
          className="h-[52px] sm:h-[60px] w-auto drop-shadow-[0_4px_12px_rgba(0,0,0,0.5)]"
        />
      </div>
    );
  }

  if (variant === 'monogram') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-400 via-amber-600 to-amber-900 p-0.5 shadow-lg shadow-amber-900/30">
          <div className="w-full h-full bg-[#1A1200] rounded-[6px] flex items-center justify-center border border-amber-400/40">
            <span className="font-['Cinzel'] font-black text-amber-300 text-xs tracking-wider">NBHL</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/nbhl-logo.svg"
        alt="NIJOBHUMI HOME LAND Logo"
        className="w-full h-auto max-w-[450px] drop-shadow-[0_8px_20px_rgba(0,0,0,0.4)]"
      />
    </div>
  );
};

export default NbhlLogo;
