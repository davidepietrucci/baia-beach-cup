export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { 
  getTornei, saveTornei, 
  getIscrizioni, saveIscrizioni, 
  getGironi, saveGironi, 
  getBracket, saveBracket,
  getNotifiche, saveNotifiche,
  getCountdown, saveCountdown,
  getSponsors, saveSponsors,
  getMvp, saveMvp
} from "@/app/utils/db";


async function getAuthAndRole(req) {
  try {
    const clerkUser = await currentUser();
    if (clerkUser) {
      const isDavide = clerkUser.username === "davide" || clerkUser.firstName?.toLowerCase() === "davide" || clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase().includes("davide");
      const userRole = isDavide ? "admin" : (clerkUser.publicMetadata?.role || "staff");
      return { isAuth: true, role: userRole };
    }
  } catch (e) {
    console.error("Errore lettura utente Clerk:", e);
  }

  return { isAuth: false, role: null };
}


export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

    
    if (type === "iscrizioni") {
      const { isAuth } = await getAuthAndRole(req);
      
      if (!isAuth) {
        return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
      }
    }

    let data = null;
    if (type === "tornei") data = await getTornei();
    else if (type === "iscrizioni") data = await getIscrizioni();
    else if (type === "gironi") data = await getGironi(slug);
    else if (type === "bracket") data = await getBracket(slug);
    else if (type === "notifiche") data = await getNotifiche();
    else if (type === "countdown") data = await getCountdown();
    else if (type === "sponsors") data = await getSponsors();
    else if (type === "mvp") data = await getMvp();
    else {
      return NextResponse.json({ error: "Tipo database non valido" }, { status: 400 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("Errore nell'API GET database:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}


export async function POST(req) {
  try {
    const { isAuth, role } = await getAuthAndRole(req);
    const body = await req.json();
    const { type, data, slug } = body;

    if (!isAuth) {
      return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
    }

    
    if (type === "tornei" || type === "gironi" || type === "bracket" || type === "iscrizioni" || type === "notifiche" || type === "countdown" || type === "sponsors" || type === "mvp") {
      if (role !== "admin" && role !== "staff") {
        return NextResponse.json({ error: "Accesso negato: richiesto ruolo Staff" }, { status: 403 });
      }
      if (type === "tornei") await saveTornei(data);
      if (type === "gironi") await saveGironi(slug, data);
      if (type === "bracket") await saveBracket(slug, data);
      if (type === "iscrizioni") await saveIscrizioni(data);
      if (type === "notifiche") await saveNotifiche(data);
      if (type === "countdown") await saveCountdown(data);
      if (type === "sponsors") await saveSponsors(data);
      if (type === "mvp") await saveMvp(data);
    } 
    else {
      return NextResponse.json({ error: "Tipo database non valido o non supportato" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Errore nell'API POST database:", error);
    return NextResponse.json({ error: "Errore interno del server" }, { status: 500 });
  }
}
