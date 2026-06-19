import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { 
  getTornei, saveTornei, 
  getIscrizioni, saveIscrizioni, 
  getUsers, saveUsers, 
  getModuli, saveModuli, 
  getGironi, saveGironi, 
  getBracket, saveBracket,
  getNotifiche, saveNotifiche,
  getStaff, saveStaff
} from "@/app/utils/db";
import { sendApprovalEmail } from "@/app/utils/email";

// 1. GET: Gestisce le letture del database controllando i permessi di lettura
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

    // Controlliamo l'autenticazione per le letture sensibili
    if (type === "users" || type === "iscrizioni" || type === "staff") {
      const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
      if (!token) {
        return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
      }
      if ((type === "users" || type === "staff") && token.role !== "admin") {
        return NextResponse.json({ error: "Accesso negato: richiesto ruolo Admin" }, { status: 403 });
      }
    }

    let data = null;
    if (type === "tornei") data = await getTornei();
    else if (type === "iscrizioni") data = await getIscrizioni();
    else if (type === "users") data = await getUsers();
    else if (type === "staff") data = await getStaff();
    else if (type === "moduli") data = await getModuli();
    else if (type === "gironi") data = await getGironi(slug);
    else if (type === "bracket") data = await getBracket(slug);
    else if (type === "notifiche") data = await getNotifiche();
    else {
      return NextResponse.json({ error: "Tipo database non valido" }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Errore nell'API GET database:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}

// 2. POST: Gestisce le scritture sicure sul database verificando l'autenticazione ed il ruolo lato server
export async function POST(req) {
  try {
    const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
    const body = await req.json();
    const { type, data, slug } = body;

    // Se non c'è una sessione, blocca la scrittura.
    // Eccezione: registrazione atleta (type === 'users' e non è presente una sessione)
    const isRegistration = (type === "users" && !token);

    if (!token && !isRegistration) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    const role = token?.role;

    // Controllo dei permessi di scrittura lato server
    if (type === "moduli" || type === "staff") {
      if (role !== "admin") {
        return NextResponse.json({ error: "Accesso negato: richiesto ruolo Admin" }, { status: 403 });
      }
      if (type === "moduli") await saveModuli(data);
      if (type === "staff") await saveStaff(data);
    } 
    else if (type === "tornei" || type === "gironi" || type === "bracket" || type === "iscrizioni" || type === "notifiche") {
      if (role !== "admin" && role !== "staff") {
        return NextResponse.json({ error: "Accesso negato: richiesto ruolo Staff" }, { status: 403 });
      }
      if (type === "tornei") await saveTornei(data);
      if (type === "gironi") await saveGironi(slug, data);
      if (type === "bracket") await saveBracket(slug, data);
      if (type === "iscrizioni") {
        const oldIscrizioni = await getIscrizioni();
        await saveIscrizioni(data);

        // Rileva transizioni verso lo stato "Approvata" per inviare l'email di notifica
        for (const nuova of data) {
          if (nuova.stato === "Approvata") {
            const vecchia = oldIscrizioni.find(o => o.id === nuova.id);
            const eraInAttesa = vecchia && vecchia.stato === "In Attesa";
            const haEmail = nuova.email && nuova.email.trim() !== "" && nuova.email.toLowerCase() !== "non inserita" && nuova.email.toLowerCase() !== "non inserito";
            
            if (eraInAttesa && haEmail) {
              try {
                const torneiList = await getTornei();
                const matchTorneo = torneiList.find(t => t.nome.toLowerCase().trim() === nuova.torneo.toLowerCase().trim());
                
                // Esegue l'invio asincrono senza bloccare la risposta HTTP del client
                sendApprovalEmail({
                  email: nuova.email.trim(),
                  torneo: nuova.torneo,
                  giocatori: nuova.giocatori,
                  data: matchTorneo?.data,
                  quota: matchTorneo?.quota
                }).catch(err => console.error("Errore asincrono invio email approvazione:", err));
              } catch (err) {
                console.error("Errore durante la preparazione dell'invio dell'email di approvazione:", err);
              }
            }
          }
        }
      }
      if (type === "notifiche") await saveNotifiche(data);
    } 
    else if (type === "users") {
      if (isRegistration) {
        await saveUsers(data);
      } else if (role === "admin") {
        await saveUsers(data);
      } else {
        return NextResponse.json({ error: "Accesso negato" }, { status: 403 });
      }
    } 
    else {
      return NextResponse.json({ error: "Tipo database non valido" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore nell'API POST database:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
