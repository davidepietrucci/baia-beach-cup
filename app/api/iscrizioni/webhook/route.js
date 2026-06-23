import { NextResponse } from "next/server";
import { getTornei, saveTornei, getIscrizioni, saveIscrizioni } from "@/app/utils/db";

export async function POST(request) {
  try {
    // Verifica token di sicurezza (Webhook API Key)
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get("secret") || request.headers.get("x-webhook-secret");
    const expectedSecret = process.env.WEBHOOK_SECRET || "baia_beach_cup_forms_secret_2026";

    if (!secret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: "Accesso non autorizzato. Chiave segreta del webhook non valida." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { torneo, giocatori, tel, email, note } = body;

    // Validazione campi obbligatori
    if (!torneo || !giocatori) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti: 'torneo' e 'giocatori' sono richiesti." },
        { status: 400 }
      );
    }

    // Carica tornei per associare correttamente l'iscrizione
    const tornei = await getTornei();
    
    const cleanStr = (s) => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
    
    // 1. Cerca corrispondenza esatta (case insensitive e trim)
    let matchTorneo = tornei.find(
      t => t.nome.toLowerCase().trim() === torneo.toLowerCase().trim()
    );

    // 2. Cerca corrispondenza rimuovendo spazi e caratteri speciali (es. "Pink Party - Maschile" e "Pink Party Maschile")
    if (!matchTorneo) {
      matchTorneo = tornei.find(
        t => cleanStr(t.nome) === cleanStr(torneo)
      );
    }

    // 3. Cerca corrispondenza parziale (sotto-stringa)
    if (!matchTorneo) {
      matchTorneo = tornei.find(
        t => t.nome.toLowerCase().trim().includes(torneo.toLowerCase().trim()) ||
             torneo.toLowerCase().trim().includes(t.nome.toLowerCase().trim())
      );
    }

    if (!matchTorneo) {
      return NextResponse.json(
        { error: `Torneo '${torneo}' non trovato nel database.` },
        { status: 404 }
      );
    }

    // Carica iscrizioni correnti
    const iscrizioni = await getIscrizioni();
    
    // Genera un nuovo ID numerico progressivo
    const numericIds = iscrizioni.map(i => parseInt(i.id)).filter(id => !isNaN(id));
    const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 100;
    
    const oggi = new Date();
    const dataFormatted = `${oggi.getDate().toString().padStart(2, '0')}/${(oggi.getMonth() + 1).toString().padStart(2, '0')}/${oggi.getFullYear()}`;

    // Crea l'iscrizione
    const nuovaIscrizione = {
      id: newId.toString(),
      data: dataFormatted,
      torneo: matchTorneo.nome,
      giocatori: giocatori ? String(giocatori).trim() : "",
      tel: tel ? String(tel).trim() : "Non inserito",
      email: email ? String(email).trim() : "Non inserita",
      note: note ? String(note).trim() : "Importato tramite webhook Google Forms",
      stato: "In Attesa",
      quotaPagata: 0
    };

    // Salva l'iscrizione
    const updatedIscrizioni = [...iscrizioni, nuovaIscrizione];
    await saveIscrizioni(updatedIscrizioni);

    // Incrementa contatore iscritti del torneo
    const updatedTornei = tornei.map(t => {
      if (String(t.id) === String(matchTorneo.id)) {
        return { ...t, iscritti: (t.iscritti || 0) + 1 };
      }
      return t;
    });
    await saveTornei(updatedTornei);



    return NextResponse.json(
      { 
        success: true, 
        message: "Iscrizione importata con successo!", 
        data: nuovaIscrizione 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Errore nel webhook delle iscrizioni:", error);
    return NextResponse.json(
      { error: "Errore interno del server durante il salvataggio." },
      { status: 500 }
    );
  }
}
