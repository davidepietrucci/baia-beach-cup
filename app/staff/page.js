"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function StaffLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && (session?.user?.role === "admin" || session?.user?.role === "staff")) {
      router.push("/staff/dashboard");
    }
  }, [session, status, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError("Credenziali errate. Riprova.");
      } else {
        router.push("/staff/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Si è verificato un errore durante l'accesso.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{backgroundColor: "#f0f4ff"}}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-t-4" style={{borderColor: "#0a1628"}}>
        
        {/* Intestazione */}
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="BVI Logo" width={80} height={80} className="object-contain" priority />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2" style={{color: "#0a1628"}}>Area Staff</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">Accesso riservato agli organizzatori BVI</p>
        
        {/* Form di Login */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          
          {error && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 rounded-lg text-sm text-center font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Utente</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" 
              placeholder="Inserisci l'utente" 
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-900 bg-white" 
              placeholder="••••••••" 
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full py-3 mt-4 rounded-lg font-semibold text-[#0a1628] transition-all shadow-md hover:opacity-90" 
            style={{backgroundColor: "#FFD700"}}
          >
            Accedi allo Staff
          </button>
        </form>

        {/* Link utili */}
        <div className="mt-4 text-center border-t border-gray-100 pt-4">
          <a href="/" className="text-sm font-medium hover:underline text-gray-400">← Torna alla selezione</a>
        </div>
      </div>
    </main>
  );
}
