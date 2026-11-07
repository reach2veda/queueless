import React, { useState } from 'react';
import { Eye, EyeOff, Lock } from 'lucide-react';
import Input from './Input';

export default function PasswordInput({
  label = 'Password',
  error,
  helperText,
  id = 'password',
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <Input
      id={id}
      label={label}
      type={showPassword ? 'text' : 'password'}
      error={error}
      helperText={helperText}
      leftIcon={<Lock className="w-4 h-4" />}
      rightIcon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-[#66736B] hover:text-[#17231C] p-1 rounded-md transition-colors focus:outline-none"
          tabIndex={-1}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      }
      {...props}
    />
  );
}

