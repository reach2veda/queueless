import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  leftIcon = null,
  rightIcon = null,
  className = '',
  type = 'button',
  onClick,
  ...props
}) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100 select-none';

  const variants = {
    primary:
      'bg-[#16834A] text-white hover:bg-[#11643A] focus:ring-[#16834A]/40 shadow-sm hover:shadow',
    secondary:
      'bg-[#EAF6EE] text-[#11643A] hover:bg-[#d8eedf] focus:ring-[#16834A]/30',
    outline:
      'border border-[#E3EAE5] bg-white text-[#17231C] hover:bg-[#F3FAF5] hover:border-[#16834A]/30 focus:ring-[#16834A]/30 shadow-sm',
    ghost:
      'text-[#66736B] hover:text-[#17231C] hover:bg-[#F3FAF5] focus:ring-[#16834A]/20',
    danger:
      'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500/30 shadow-sm',
  };

  const sizes = {
    sm: 'text-xs px-3 py-1.5 space-x-1.5',
    md: 'text-sm px-4 py-2.5 space-x-2',
    lg: 'text-base px-5 py-3 space-x-2.5',
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>Loading...</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

