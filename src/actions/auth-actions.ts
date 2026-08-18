'use server';

import { surveyRepository } from '@/lib/repository';

export interface RegisterAccountInput {
  name: string;
  email: string;
  password?: string;
  role?: 'creator' | 'respondent';
}

export async function registerAccountAction(input: RegisterAccountInput) {
  try {
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password?.trim() || 'password123';
    const role = input.role || 'creator';

    if (!name || name.length < 2) {
      return { success: false, error: 'Please enter a valid name (at least 2 characters).' };
    }

    if (!email || !email.includes('@') || !email.includes('.')) {
      return { success: false, error: 'Please provide a valid email address.' };
    }

    if (password && password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const res = await surveyRepository.createUser({
      name,
      email,
      password,
      role,
    });

    if (!res.success || !res.user) {
      return { success: false, error: res.error || 'Failed to create account.' };
    }

    return {
      success: true,
      user: {
        id: res.user.id,
        name: res.user.name,
        email: res.user.email,
        role: res.user.role,
      },
    };
  } catch (error) {
    console.error('registerAccountAction error:', error);
    return { success: false, error: 'Internal server error while registering account.' };
  }
}
