import React from 'react';
import { Link } from 'react-router-dom';
import Phase1Dashboard from '../components/Phase1Dashboard';

export default function DevDiagnostics() {
  return (
    <div>
      <div className="bg-[#17231C] text-white py-2 px-4 text-xs flex items-center justify-between">
        <span>⚠️ Internal Developer Diagnostics Terminal (Not Visible to Public Customers)</span>
        <Link to="/" className="text-[#94D3AE] hover:underline font-semibold">
          &larr; Return to SaaS Homepage
        </Link>
      </div>
      <Phase1Dashboard />
    </div>
  );
}

