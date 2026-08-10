import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { INITIAL_USERS } from '@/lib/mock-data';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'creator@surveydonkey.com' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        const email = String(credentials.email).toLowerCase();
        
        // Find matching user from dataset
        const user = INITIAL_USERS.find((u) => u.email?.toLowerCase() === email);
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        // Demo fallback for instant sign-in
        return {
          id: `usr_${Date.now()}`,
          name: email.split('@')[0],
          email: email,
          role: email.includes('admin') ? 'superadmin' : 'creator',
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'creator';
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = token.role as string;
        (session.user as { role?: string; id?: string }).id = token.sub as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET || 'survey-donkey-super-secret-key-32-chars-minimum',
});
