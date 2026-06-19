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
  const fromName = process.env.SMTP_FROM_NAME || "Baia Beach Cup";
  
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
      <h3 style="color: #0D3D31; margin-top: 20px;">Dettagli compilati nel modulo:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 14px;">
        <thead>
          <tr style="background-color: #f4f7fe; text-align: left;">
            <th style="padding: 10px; border: 1px solid #ddd; color: #0D3D31;">Domanda</th>
            <th style="padding: 10px; border: 1px solid #ddd; color: #0D3D31;">Risposta</th>
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
      <div style="text-align: center; border-bottom: 3px solid #C3562B; padding-bottom: 25px; margin-bottom: 25px;">
        <h2 style="color: #0D3D31; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Baia Beach Cup TORNEI</h2>
        <p style="color: #888; margin: 5px 0 0 0; font-size: 13px; font-weight: 600; text-transform: uppercase; tracking-wider: 1px;">Conferma Iscrizione Torneo 🏆</p>
      </div>
      
      <p style="font-size: 15px; line-height: 1.6; color: #555;">Ciao,</p>
      <p style="font-size: 15px; line-height: 1.6; color: #555;">ti confermiamo che la tua iscrizione per il seguente torneo è stata registrata con successo:</p>
      
      <div style="background-color: #f4f7f6; padding: 20px; border-radius: 12px; margin: 25px 0; border-left: 5px solid #0D3D31;">
        <h3 style="color: #0D3D31; margin: 0 0 10px 0; font-size: 18px; font-weight: 800;">${torneo}</h3>
        <p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Giocatori/Squadra:</strong> ${giocatori}</p>
        ${data ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Data Gara:</strong> ${data}</p>` : ''}
        ${quota !== undefined ? `<p style="margin: 6px 0; font-size: 14px; color: #444;"><strong>Quota:</strong> €${quota}</p>` : ''}
      </div>
      
      ${risposteHtml}
      
      

      <div style="margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center; color: #94a3b8; font-size: 11px; line-height: 1.5;">
        <p>Questa è una notifica automatica. Si prega di non rispondere direttamente a questa email.</p>
        <p>© ${new Date().getFullYear()} Baia Beach Cup. Tutti i diritti riservati.</p>
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
    subject: `Conferma Iscrizione Torneo: ${torneo}`,
    htmlContent,
    plainTextSummary
  });
}
