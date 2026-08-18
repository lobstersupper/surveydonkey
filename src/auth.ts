import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { surveyRepository } from '@/lib/repository';

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
        const email = String(credentials.email).toLowerCase().trim();

        // 1. Look up user in persistent repository
        const user = await surveyRepository.getUserByEmail(email);
        if (user) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        }

        // 2. Fallback creation for quick sign-in in dev / test environments
        const role = email.includes('admin')
          ? 'superadmin'
          : email.includes('sarah') || email.includes('respondent')
          ? 'respondent'
          : 'creator';

        const name =
          role === 'superadmin'
            ? 'Super Admin'
            : role === 'respondent'
            ? 'Sarah Connor'
            : email.split('@')[0];

        return {
          id: `usr_${Date.now()}`,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          email: email,
          role: role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role || 'creator';
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string; id?: string }).role = (token.role as string) || 'creator';
        (session.user as { role?: string; id?: string }).id = (token.id as string) || (token.sub as string);
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
