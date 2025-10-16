import { Injectable, computed, effect, signal } from '@angular/core';
import { User } from '../models/user.model';
import { createId } from '../utils/id.util';

interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role?: User['role'];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storageKey = 'lexAr-current-user';

  private readonly usersSignal = signal<User[]>([
    {
      id: createId(),
      fullName: 'Zojaira M Ribon',
      email: 'mribon@lexar.com',
      password: 'LexAr2025*',
      role: 'admin',
    },
    {
      id: createId(),
      fullName: 'Juan Pablo Márquez',
      email: 'jmarquez@lexar.com',
      password: 'SecurePass1!',
      role: 'advisor',
    },
  ]);

  private readonly currentUserSignal = signal<User | null>(this.restoreSession());

  readonly currentUser = computed(() => this.currentUserSignal());
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  constructor() {
    effect(() => {
      const user = this.currentUserSignal();
      if (typeof window === 'undefined') {
        return;
      }

      if (user) {
        localStorage.setItem(this.storageKey, JSON.stringify(user));
      } else {
        localStorage.removeItem(this.storageKey);
      }
    });
  }

  login(email: string, password: string): { success: boolean; message?: string } {
    const normalizedEmail = email.trim().toLowerCase();
    const user = this.usersSignal().find(
      (candidate) => candidate.email.toLowerCase() === normalizedEmail && candidate.password === password
    );

    if (!user) {
      return { success: false, message: 'Credenciales no válidas. Verifica tu correo y contraseña.' };
    }

    this.currentUserSignal.set(user);
    return { success: true };
  }

  register(payload: RegisterPayload): { success: boolean; message?: string } {
    const normalizedEmail = payload.email.trim().toLowerCase();

    const emailExists = this.usersSignal().some(
      (candidate) => candidate.email.toLowerCase() === normalizedEmail
    );

    if (emailExists) {
      return { success: false, message: 'Ya existe un usuario registrado con este correo electrónico.' };
    }

    const newUser: User = {
      id: createId(),
      fullName: payload.fullName.trim(),
      email: normalizedEmail,
      password: payload.password,
      role: payload.role ?? 'assistant',
    };

    this.usersSignal.update((users) => [...users, newUser]);
    this.currentUserSignal.set(newUser);

    return { success: true };
  }

  logout(): void {
    this.currentUserSignal.set(null);
  }

  private restoreSession(): User | null {
    if (typeof window === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(this.storageKey);
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as User;
      return parsed ?? null;
    } catch (error) {
      console.error('No fue posible restaurar la sesión almacenada', error);
      return null;
    }
  }
}
