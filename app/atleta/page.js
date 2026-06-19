"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";

export default function AtletaLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "atleta") {
      router.push("/atleta/dashboard");
    }
  }, [session, status, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false
      });

      if (res?.error) {
        setError("Username o password errati");
      } else {
        router.push("/atleta/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("Errore durante il login.");
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4" style={{backgroundColor: "#f4f7f6"}}>
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full border-t-4" style={{borderColor: "#C3562B"}}>
        
        {/* Intestazione */}
        <div className="flex justify-center mb-6">
          <Image src="/logo.png" alt="Baia Beach Cup Logo" width={80} height={80} className="object-contain" priority />
        </div>
        <h2 className="text-2xl font-bold text-center mb-2" style={{color: "#0D3D31"}}>Portale Atleta</h2>
        <p className="text-center text-gray-500 mb-6 text-sm">Accedi per gestire le tue iscrizioni ai tornei</p>
        
        {/* Form di Login */}
        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username o Email</label>
            <input 
              type="text" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D3D31] text-gray-900 bg-white" 
              placeholder="es. davide" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input 
              type="password" 
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#0D3D31] text-gray-900 bg-white" 
              placeholder="••••••••" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center font-medium mt-1">{error}</p>}
          
          <button 
            type="submit"
            className="w-full py-3 mt-2 rounded-lg font-semibold text-white transition-all shadow-md hover:opacity-90 block text-center" 
            style={{backgroundColor: "#0D3D31"}}
          >
            Accedi
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <hr className="w-full border-gray-200" />
          <span className="px-3 text-sm text-gray-400 bg-white">oppure</span>
          <hr className="w-full border-gray-200" />
        </div>

        <button 
          onClick={() => signIn('google', { callbackUrl: '/atleta/dashboard' })}
          className="w-full mt-6 py-3 rounded-lg font-semibold text-gray-700 bg-white border border-gray-300 shadow-sm hover:bg-gray-50 transition-all flex items-center justify-center gap-3"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Accedi con Google
        </button>

        {/* Link utili */}
        <div className="mt-6 text-center text-sm text-gray-500">
          Non hai un account? <a href="/atleta/registrati" className="font-semibold hover:underline" style={{color: "#0D3D31"}}>Registrati ora</a>
        </div>
        <div className="mt-4 text-center border-t border-gray-100 pt-4">
          <a href="/" className="text-sm font-medium hover:underline text-gray-400">← Torna alla selezione</a>
        </div>
      </div>
    </main>
  );
}
