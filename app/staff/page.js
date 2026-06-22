"use client";

import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

export default function StaffLogin() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{backgroundColor: "#f4f7f6"}}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-t-4 flex flex-col items-center" style={{borderColor: "#295dab"}}>
        
        {/* Intestazione */}
        <div className="flex justify-center mb-6">
          <Image src="/logo_v2.png" alt="Baia Beach Cup Logo" width={80} height={80} className="object-contain" priority />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2" style={{color: "#295dab"}}>Area Staff</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">Accesso riservato agli organizzatori Baia Beach Cup</p>
        
        {/* Form di Login di Clerk */}
        <SignIn 
          routing="hash"
          signUpUrl="/staff/register" 
          forceRedirectUrl="/staff/dashboard" 
          appearance={{
            elements: {
              formButtonPrimary: 'bg-[#C3562B] hover:bg-opacity-90 text-white font-semibold transition-all shadow-md',
              card: 'border-0 shadow-none p-0',
              rootBox: 'w-full'
            }
          }}
        />

        {/* Link utili */}
        <div className="mt-6 text-center border-t border-gray-100 pt-4 w-full">
          <a href="/" className="text-sm font-medium hover:underline text-gray-400">← Torna alla selezione</a>
        </div>
      </div>
    </main>
  );
}
