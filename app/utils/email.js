import nodemailer from "nodemailer";

/**
 * Helper interno per gestire le diverse modalità di invio (Resend API, Brevo API, SMTP, Mock)
 */
async function sendMailHelper({ email, subject, htmlContent, plainTextSummary }) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "iscrizioni.tornei@beachvolleyinstitute.it";
  const fromName = process.env.SMTP_FROM_NAME || "BVI Tornei";
  
  const resendApiKey = process.env.RESEND_API_KEY;
  const brevoApiKey = process.env.BREVO_API_KEY;

  const isSMTPConfigured = !!(host && user && pass);

  if (resendApiKey) {
    try {
      console.log(`[EMAIL] Tentativo invio tramite Resend API a ${email}...`);
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${fromName} <${from}>`,
          to: [email],
          subject: subject,
          html: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Resend API error (${response.status}): ${errorText}`);
      }

      const resData = await response.json();
      console.log(`[EMAIL] Inviata con successo tramite Resend a ${email}: ${resData.id}`);
      return { success: true, messageId: resData.id };
    } catch (error) {
      console.error(`[EMAIL ERROR] Invio fallito tramite Resend a ${email}:`, error);
      return { success: false, error: error.message };
    }
  } else if (brevoApiKey) {
    try {
      console.log(`[EMAIL] Tentativo invio tramite Brevo API a ${email}...`);
      const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          "accept": "application/json",
          "api-key": brevoApiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          sender: {
            name: fromName,
            email: from,
          },
          to: [
            {
              email: email,
            },
          ],
          subject: subject,
          htmlContent: htmlContent,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Brevo API error (${response.status}): ${errorText}`);
      }

      const resData = await response.json();
      console.log(`[EMAIL] Inviata con successo tramite Brevo a ${email}: ${resData.messageId}`);
      return { success: true, messageId: resData.messageId };
    } catch (error) {
      console.error(`[EMAIL ERROR] Invio fallito tramite Brevo a ${email}:`, error);
      return { success: false, error: error.message };
    }
  } else if (isSMTPConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });

      const info = await transporter.sendMail({
        from: `"${fromName}" <${from}>`,
        to: email,
        subject: subject,
        html: htmlContent,
      });

      console.log(`[EMAIL] Inviata con successo tramite SMTP a ${email}: ${info.messageId}`);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[EMAIL ERROR] Invio fallito tramite SMTP a ${email}:`, error);
      return { success: false, error: error.message };
    }
  } else {
    // Logger per ambiente di sviluppo locale o se non configurato
    console.log("\n=================================================");
    console.log("📨 [MOCK EMAIL] Servizio non configurato. Dettagli email:");
    console.log(`A: ${email}`);
    console.log(`Oggetto: ${subject}`);
    if (plainTextSummary) {
      console.log(plainTextSummary);
    }
    console.log("=================================================\n");
    return { success: true, isMock: true };
  }
}

/**
 * Invia un'email di conferma per la ricezione dell'iscrizione al torneo
 */
export async function sendConfirmationEmail({ email, torneo, giocatori, data, quota, note, risposte }) {
  // Genera risposte custom in formato tabellare HTML
  const risposteHtml = risposte && risposte.length > 0
    ? `
      <h3 style="color: #0a1628; margin-top: 20px;">Dettagli compilati nel modulo:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f4f7fe; text-align: left;">
            <th style="padding: 10px; border: 1px solid #ddd; color: #0a1628;">Domanda</th>
            <th style="padding: 10px; border: 1px solid #ddd; color: #0a1628;">Risposta</th>
          </tr>
        </thead>
        <tbody>
          ${risposte.map(r => `
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold; background-color: #fafafa; color: #555;">${r.label}</td>
              <td style="padding: 10px; border: 1px solid #ddd; color: #333;">${r.valore || "—"}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `
    : '';

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; border: 1px solid #eef2f6; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #333;">
      <div style="text-align: center; border-bottom: 3px solid #FFD700; padding-bottom: 25px; margin-bottom: 25px;">
        <h2 style="color: #0a1628; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">BVI TORNEI</h2>
        <p style="color: #888; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; tracking-wider: 1px;">Conferma Ricezione Iscrizione 📝</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #555;">Ciao,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #555;">ti confermiamo che abbiamo ricevuto correttamente la richiesta di iscrizione per il seguente torneo:</p>
      
      <div style="background-color: #f0f4ff; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0a1628;">
        <h3 style="color: #0a1628; margin: 0 0 10px 0; font-size: 18px; font-weight: 800;">${torneo}</h3>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Giocatori/Squadra:</strong> ${giocatori}</p>
        ${data ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Data Gara:</strong> ${data}</p>` : ''}
        ${quota !== undefined ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Quota:</strong> €${quota}</p>` : ''}
        <p style="margin: 12px 0 0 0; font-size: 12px; color: #d97706; font-weight: 700; text-transform: uppercase; tracking-wider: 0.5px;">⚠️ Richiesta in attesa di approvazione dello staff</p>
      </div>
      
      ${risposteHtml}
      
      ${note ? `
        <h3 style="color: #0a1628; margin-top: 25px; font-size: 15px; font-weight: 700;">Note o Richieste allo Staff:</h3>
        <p style="background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; font-style: italic; margin: 10px 0; font-size: 14px; color: #555;">${note}</p>
      ` : ''}

      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
        <p>Questa è una notifica automatica. Si prega di non rispondere direttamente a questa email.</p>
        <p>© ${new Date().getFullYear()} Beach Volley Institute. Tutti i diritti riservati.</p>
      </div>
    </div>
  `;

  let plainTextSummary = `Torneo: ${torneo}\nGiocatori: ${giocatori}`;
  if (risposte && risposte.length > 0) {
    plainTextSummary += "\nRisposte custom:";
    risposte.forEach(r => { plainTextSummary += `\n  - ${r.label}: ${r.valore}`; });
  }

  return sendMailHelper({
    email,
    subject: `Richiesta Iscrizione Ricevuta: ${torneo}`,
    htmlContent,
    plainTextSummary
  });
}

/**
 * Invia un'email di approvazione dell'iscrizione al torneo
 */
export async function sendApprovalEmail({ email, torneo, giocatori, data, quota }) {
  const baseUrl = (process.env.NEXTAUTH_URL && !process.env.NEXTAUTH_URL.includes("localhost"))
    ? process.env.NEXTAUTH_URL.replace(/\/$/, "")
    : "https://www.beachvolleyinstitute.it";
  
  const gironiUrl = `${baseUrl}/gironi?tour=${encodeURIComponent(torneo)}`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px 20px; border: 1px solid #eef2f6; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.03); color: #333;">
      <div style="text-align: center; border-bottom: 3px solid #FFD700; padding-bottom: 25px; margin-bottom: 25px;">
        <h2 style="color: #0a1628; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">BVI TORNEI</h2>
        <p style="color: #888; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; tracking-wider: 1px;">Iscrizione Confermata! 🎉</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #555;">Ciao,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #555;">ti comunichiamo che la tua iscrizione per il seguente torneo è stata **confermata con successo** dallo staff:</p>
      
      <div style="background-color: #f0fff4; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #22c55e;">
        <h3 style="color: #15803d; margin: 0 0 10px 0; font-size: 18px; font-weight: 800;">Iscrizione Confermata ✅</h3>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Torneo:</strong> ${torneo}</p>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Giocatori/Squadra:</strong> ${giocatori}</p>
        ${data ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Data Gara:</strong> ${data}</p>` : ''}
        ${quota !== undefined ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Quota:</strong> €${quota}</p>` : ''}
      </div>

      <div style="background-color: #f8fafc; padding: 15px; border-radius: 10px; border: 1px solid #e2e8f0; margin: 25px 0; display: flex; align-items: center;">
        <div style="font-size: 24px; margin-right: 15px;">💬</div>
        <div style="font-size: 14px; color: #475569; line-height: 1.5;">
          <strong>Gruppo WhatsApp:</strong> Verrai aggiunto a breve al gruppo WhatsApp dedicato al torneo per rimanere aggiornato su orari e gironi.
        </div>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${gironiUrl}" style="background-color: #0a1628; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block; font-size: 14px; box-shadow: 0 4px 6px rgba(10, 22, 40, 0.15);">
          Visualizza i Gironi del Torneo 📊
        </a>
      </div>

      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
        <p>Questa è una notifica automatica. Si prega di non rispondere direttamente a questa email.</p>
        <p>© ${new Date().getFullYear()} Beach Volley Institute. Tutti i diritti riservati.</p>
      </div>
    </div>
  `;

  return sendMailHelper({
    email,
    subject: `Iscrizione Confermata: ${torneo}`,
    htmlContent,
    plainTextSummary: `Iscrizione confermata per ${torneo} (${giocatori}). WhatsApp group & Gironi URL: ${gironiUrl}`
  });
}
