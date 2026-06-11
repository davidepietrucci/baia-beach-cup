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
        
        // Elenco utenti staff (con credenziali di fallback equivalenti a quelle attuali)
        const staffUsers = [
          { id: "admin", name: "Administrator", username: "admin", password: process.env.STAFF_PASSWORD_ADMIN || "admin", role: "admin" },
          { id: "staff", name: "Staff Member", username: "staff", password: process.env.STAFF_PASSWORD_STAFF || "staff", role: "staff" },
          { id: "vale", name: "Valentina", username: "vale", password: process.env.STAFF_PASSWORD_VALE || "bvi2026", role: "staff" },
          { id: "davide", name: "Davide", username: "davide", password: process.env.STAFF_PASSWORD_DAVIDE || "bvi2026", role: "staff" },
          { id: "fra.b", name: "Francesco B.", username: "fra.b", password: process.env.STAFF_PASSWORD_FRAB || "Bvi2026", role: "staff" }
        ];

        const matchedUser = staffUsers.find(
          u => u.username === username && u.password === password
        );

        if (matchedUser) {
          return {
            id: matchedUser.id,
            name: matchedUser.name,
            username: matchedUser.username,
            role: matchedUser.role,
          };
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
