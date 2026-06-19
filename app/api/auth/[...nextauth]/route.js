import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const { username, password } = credentials || {};
        const normalizedUser = username?.trim().toLowerCase();
        
        // 1. Elenco utenti staff (con credenziali di fallback)
        const fallbackStaff = [
          { id: "admin", name: "Administrator", username: "admin", password: process.env.STAFF_PASSWORD_ADMIN || "admin", role: "admin" },
          { id: "staff", name: "Staff Member", username: "staff", password: process.env.STAFF_PASSWORD_STAFF || "staff", role: "staff" },
          { id: "vale", name: "Valentina", username: "vale", password: process.env.STAFF_PASSWORD_VALE || "baia2026", role: "staff" },
          { id: "davide", name: "Davide", username: "davide", password: process.env.STAFF_PASSWORD_DAVIDE || "baia2026", role: "admin" },
          { id: "fra.b", name: "Francesco B.", username: "fra.b", password: process.env.STAFF_PASSWORD_FRAB || "Baia2026", role: "staff" }
        ];

        let dynamicStaff = [];
        try {
          const { getStaff } = require("@/app/utils/db");
          dynamicStaff = await getStaff();
        } catch (e) {
          console.error("NextAuth authorize read staff error:", e);
        }

        const allStaff = [...fallbackStaff, ...dynamicStaff];
        const matchedStaff = allStaff.find(
          u => u.username === normalizedUser && u.password === password
        );

        if (matchedStaff) {
          return {
            id: matchedStaff.id,
            name: matchedStaff.name,
            username: matchedStaff.username,
            role: matchedStaff.role,
          };
        }

        // 2. Utente atleta mock
        if (normalizedUser === "davide" && password === "baia") {
          return {
            id: "atleta-davide",
            name: "Davide Pietrucci",
            username: "davide",
            email: "davide@example.com",
            role: "atleta",
          };
        }

        // 3. Utenti atleti registrati nel database (con password)
        try {
          const { getUsers } = require("@/app/utils/db");
          const users = await getUsers();
          const matchedAthlete = users.find(
            u => (u.email?.toLowerCase() === normalizedUser || u.nome?.toLowerCase() === normalizedUser) && u.password === password
          );

          if (matchedAthlete) {
            return {
              id: matchedAthlete.id,
              name: `${matchedAthlete.nome} ${matchedAthlete.cognome}`,
              username: matchedAthlete.nome.toLowerCase(),
              email: matchedAthlete.email,
              role: "atleta",
            };
          }
        } catch (e) {
          console.error("NextAuth authorize db read error:", e);
        }

        return null;
      }
    })
  ],
  pages: {
    signIn: '/atleta',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role || "atleta";
        token.username = user.username || user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          role: token.role,
          username: token.username,
        };
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
