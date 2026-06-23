import { NextResponse } from "next/server";
import { getMvp, saveMvp } from "@/app/utils/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json(
        { error: "ID del candidato mancante." },
        { status: 400 }
      );
    }

    // Carica la configurazione MVP corrente
    const mvpData = await getMvp();

    // Controlla se le votazioni sono attive
    if (!mvpData || !mvpData.attivo) {
      return NextResponse.json(
        { error: "Le votazioni per l'MVP non sono attualmente attive." },
        { status: 400 }
      );
    }

    // Trova il candidato e incrementa il voto
    let candidateFound = false;
    const updatedCandidati = mvpData.candidati.map(c => {
      if (String(c.id) === String(candidateId)) {
        candidateFound = true;
        return { ...c, voti: (c.voti || 0) + 1 };
      }
      return c;
    });

    if (!candidateFound) {
      return NextResponse.json(
        { error: "Candidato non trovato nel database." },
        { status: 404 }
      );
    }

    const updatedMvp = {
      ...mvpData,
      candidati: updatedCandidati
    };

    // Salva l'MVP con il voto aggiornato
    await saveMvp(updatedMvp);

    return NextResponse.json(
      { 
        success: true, 
        message: "Voto registrato con successo!", 
        data: updatedMvp 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Errore durante la registrazione del voto MVP:", error);
    return NextResponse.json(
      { error: "Errore interno del server durante il voto." },
      { status: 500 }
    );
  }
}
