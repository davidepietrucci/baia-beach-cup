import { NextResponse } from "next/server";
import { getTornei, saveTornei, getIscrizioni, saveIscrizioni } from "@/app/utils/db";

export async function POST(request) {
  try {
    const body = await request.json();
    const { 
      torneo, 
      giocatori, 
      tel, 
      email, 
      note, 
      moduloIscrizioneId, 
      risposte,
      checkDuplicateName 
    } = body;

    
    if (!torneo || !giocatori) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti: 'torneo' e 'giocatori' sono richiesti." },
        { status: 400 }
      );
    }

    
    const tornei = await getTornei();
    const matchTorneo = tornei.find(
      t => t.nome.toLowerCase().trim() === torneo.toLowerCase().trim()
    );

    if (!matchTorneo) {
      return NextResponse.json(
        { error: `Il torneo "${torneo}" non è stato trovato nel database.` },
        { status: 404 }
      );
    }

    
    const iscrizioni = await getIscrizioni();

    
    if (checkDuplicateName) {
      const lowerName = String(checkDuplicateName).toLowerCase().trim();
      const lowerTorneo = matchTorneo.nome.toLowerCase().trim();
      const duplicato = iscrizioni.some(
        isc => 
          isc.torneo?.toLowerCase().trim() === lowerTorneo &&
          isc.giocatori?.toLowerCase().includes(lowerName)
      );

      if (duplicato) {
        return NextResponse.json(
          { error: `Sei già iscritto al torneo "${matchTorneo.nome}".` },
          { status: 400 }
        );
      }
    }

    
    const numericIds = iscrizioni.map(i => parseInt(i.id)).filter(id => !isNaN(id));
    const newId = numericIds.length > 0 ? Math.max(...numericIds) + 1 : 100;

    const oggi = new Date();
    const dataFormatted = `${oggi.getDate().toString().padStart(2, "0")}/${(oggi.getMonth() + 1).toString().padStart(2, "0")}/${oggi.getFullYear()}`;

    
    const nuovaIscrizione = {
      id: newId.toString(),
      data: dataFormatted,
      torneo: matchTorneo.nome,
      giocatori: String(giocatori).trim(),
      tel: tel ? String(tel).trim() : "Non inserito",
      email: email ? String(email).trim() : "Non inserita",
      note: note ? String(note).trim() : "",
      stato: "In Attesa",
      quotaPagata: 0,
      ...(moduloIscrizioneId ? { 
        moduloIscrizioneId: String(moduloIscrizioneId),
        risposte: risposte || []
      } : {})
    };

    
    const updatedIscrizioni = [...iscrizioni, nuovaIscrizione];
    await saveIscrizioni(updatedIscrizioni);

    
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
        message: "Iscrizione avvenuta con successo!", 
        data: nuovaIscrizione 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Errore durante la registrazione:", error);
    return NextResponse.json(
      { error: "Errore interno del server durante la registrazione." },
      { status: 500 }
    );
  }
}
