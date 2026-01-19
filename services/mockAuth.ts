import type { AuthError, Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

interface MockUser {
  id: string;
  email: string;
  password: string;
  created_at: string;
}

// Simple in-memory storage for demo
let users: MockUser[] = [];
let currentSession: { user: User; session: Session } | null = null;

const STORAGE_KEY = 'clinictrack_users';
const SESSION_KEY = 'clinictrack_session';

// Load from localStorage on init
const loadUsers = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    users = JSON.parse(stored);
  }
};

const saveUsers = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
};

const loadSession = () => {
  const stored = localStorage.getItem(SESSION_KEY);
  if (stored) {
    currentSession = JSON.parse(stored);
  }
};

const saveSession = () => {
  if (currentSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
  } else {
    localStorage.removeItem(SESSION_KEY);
  }
};

// Initialize
loadUsers();
loadSession();

const createMockUser = (email: string, password: string): User => ({
  id: Math.random().toString(36).substr(2, 9),
  app_metadata: {},
  user_metadata: {},
  aud: 'authenticated',
  confirmation_sent_at: new Date().toISOString(),
  recovery_sent_at: '',
  email_change_sent_at: '',
  new_email: '',
  new_phone: '',
  invited_at: '',
  action_link: '',
  email: email,
  phone: '',
  created_at: new Date().toISOString(),
  confirmed_at: new Date().toISOString(),
  email_confirmed_at: new Date().toISOString(),
  phone_confirmed_at: '',
  last_sign_in_at: new Date().toISOString(),
  role: 'authenticated',
  updated_at: new Date().toISOString(),
  identities: [],
  factors: [],
});

const createMockSession = (user: User): Session => ({
  access_token: 'mock_token_' + user.id,
  refresh_token: 'mock_refresh_' + user.id,
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: 'bearer',
  user,
});

export const signUp = async (email: string, password: string): Promise<AuthResult> => {
  console.log('Mock signUp with email:', email);

  // Check if user already exists
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return {
      user: null,
      session: null,
      error: {
        message: 'User already registered',
        status: 422,
        name: 'AuthError',
      } as AuthError,
    };
  }

  // Create new user
  const mockUser = createMockUser(email, password);
  users.push({
    id: mockUser.id,
    email,
    password,
    created_at: mockUser.created_at,
  });
  saveUsers();

  const mockSession = createMockSession(mockUser);
  currentSession = { user: mockUser, session: mockSession };
  saveSession();

  console.log('Mock signUp successful');
  return {
    user: mockUser,
    session: mockSession,
    error: null,
  };
};

export const signIn = async (email: string, password: string): Promise<AuthResult> => {
  console.log('Mock signIn with email:', email);

  const user = users.find(u => u.email === email && u.password === password);
  if (!user) {
    return {
      user: null,
      session: null,
      error: {
        message: 'Invalid login credentials',
        status: 400,
        name: 'AuthError',
      } as AuthError,
    };
  }

  const mockUser = createMockUser(email, password);
  const mockSession = createMockSession(mockUser);
  currentSession = { user: mockUser, session: mockSession };
  saveSession();

  console.log('Mock signIn successful');
  return {
    user: mockUser,
    session: mockSession,
    error: null,
  };
};

export const signOut = async (): Promise<{ error: AuthError | null }> => {
  currentSession = null;
  saveSession();
  return { error: null };
};

export const getSession = async (): Promise<{ session: Session | null; error: AuthError | null }> => {
  return {
    session: currentSession?.session || null,
    error: null,
  };
};

export const onAuthStateChange = (callback: (event: string, session: Session | null) => void) => {
  // Mock subscription - just return current session
  setTimeout(() => callback('SIGNED_IN', currentSession?.session || null), 0);

  return {
    data: {
      subscription: {
        unsubscribe: () => {},
      },
    },
  };
};