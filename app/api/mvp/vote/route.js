import { NextResponse } from "next/server";
import { voteMvpAtomic } from "@/app/utils/db";

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

    // Esegui la votazione atomica con transazione
    const result = await voteMvpAtomic(candidateId);

    if (!result.success) {
      const errorMsg = result.error || "Errore durante la registrazione del voto.";
      let status = 500;
      if (errorMsg.includes("non trovata") || errorMsg.includes("non trovato")) status = 404;
      else if (errorMsg.includes("non sono attualmente attive") || errorMsg.includes("non attive")) status = 400;

      return NextResponse.json(
        { error: errorMsg },
        { status: status }
      );
    }

    return NextResponse.json(
      { 
        success: true, 
        message: "Voto registrato con successo!", 
        data: result.data 
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
