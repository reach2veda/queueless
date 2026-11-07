import React from 'react';

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  type = 'text',
  required = false,
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <div className="flex justify-between items-center">
          <label htmlFor={inputId} className="block text-xs font-semibold text-[#17231C]">
            {label}
            {required && <span className="text-rose-500 ml-0.5">*</span>}
          </label>
        </div>
      )}

      <div className="relative rounded-xl shadow-soft-sm">
        {leftIcon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#66736B]">
            {leftIcon}
          </div>
        )}

        <input
          id={inputId}
          type={type}
          required={required}
          className={`w-full rounded-xl border bg-white text-[#17231C] text-sm placeholder:text-[#66736B]/60 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#16834A]/25 focus:border-[#16834A] ${
            leftIcon ? 'pl-10' : 'pl-3.5'
          } ${rightIcon ? 'pr-10' : 'pr-3.5'} py-2.5 ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200 text-rose-900 bg-rose-50/20'
              : 'border-[#E3EAE5] hover:border-[#16834A]/40'
          } ${className}`}
          {...props}
        />

        {rightIcon && (
          <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-[#66736B]">
            {rightIcon}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-600 font-medium">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-[#66736B]">{helperText}</p>
      ) : null}
    </div>
  );
}

