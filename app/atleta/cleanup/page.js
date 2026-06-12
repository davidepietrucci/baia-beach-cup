"use client";

import { useState, useEffect } from "react";
import { getIscrizioni, saveIscrizioni } from "@/app/utils/db";

export default function CleanupPage() {
  const [iscrizioni, setIscrizioni] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState([]);

  useEffect(() => {
    getIscrizioni().then((data) => {
      setIscrizioni(data);
      setLoading(false);
    });
  }, []);

  const handleDelete = async (id) => {
    const nuova = iscrizioni.filter((i) => i.id !== id);
    await saveIscrizioni(nuova);
    setIscrizioni(nuova);
    setDeleted((prev) => [...prev, id]);
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <p className="font-mono text-gray-500">Caricamento...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6">
          <p className="text-red-700 font-bold text-sm">⚠️ Pagina di manutenzione — usa solo per correggere dati, poi naviga via.</p>
        </div>

        <h1 className="text-2xl font-black text-gray-800 mb-2">Gestione Iscrizioni</h1>
        <p className="text-sm text-gray-500 mb-6">Trovate <strong>{iscrizioni.length}</strong> iscrizioni nel database.</p>

        {iscrizioni.length === 0 ? (
          <p className="text-gray-400 text-center py-12">Nessuna iscrizione nel database.</p>
        ) : (
          <div className="space-y-3">
            {iscrizioni.map((isc) => (
              <div
                key={isc.id}
                className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200 flex items-start justify-between gap-4"
              >
                <div className="flex-1 min-w-0 font-mono text-xs space-y-1">
                  <p><span className="text-gray-400">ID:</span> <strong>{isc.id}</strong></p>
                  <p><span className="text-gray-400">Torneo:</span> <strong>{isc.torneo}</strong></p>
                  <p><span className="text-gray-400">Giocatori:</span> <strong>{isc.giocatori}</strong></p>
                  <p><span className="text-gray-400">Stato:</span> <strong>{isc.stato}</strong></p>
                  <p><span className="text-gray-400">Data:</span> {isc.data}</p>
                </div>
                <button
                  onClick={() => handleDelete(isc.id)}
                  className="shrink-0 px-4 py-2 bg-red-500 text-white rounded-xl font-black text-xs uppercase hover:bg-red-600 active:scale-95 transition-all"
                >
                  🗑️ Elimina
                </button>
              </div>
            ))}
          </div>
        )}

        {deleted.length > 0 && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-green-700 font-bold text-sm">✅ Eliminati {deleted.length} record: {deleted.join(", ")}</p>
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/atleta/dashboard" className="text-sm font-bold text-blue-500 underline">
            ← Torna alla dashboard atleta
          </a>
        </div>
      </div>
    </div>
  );
}
