// Serviços de autenticação

import api from './api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  Usuario
} from '../types/auth.types';

// Controle de requisições em progresso para evitar duplicatas
let loginInProgress = false;
let loginPromise: Promise<LoginResponse> | null = null;

export const authService = {
  /**
   * Realiza login do usuário com proteção contra múltiplas requisições
   */
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    // Se já existe uma requisição de login em andamento, retorna a mesma promise
    if (loginInProgress && loginPromise) {
      return loginPromise;
    }

    loginInProgress = true;
    loginPromise = (async () => {
      try {
        // Limpa tokens antigos antes de fazer login
        console.log('🔐 Tentando login com:', { email: credentials.email });
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Aguarda 1 segundo antes de fazer a requisição
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📤 Enviando requisição para:', api.defaults.baseURL + '/auth/login');
        const response = await api.post<LoginResponse>('/auth/login', credentials);
        console.log('✅ Login bem-sucedido!', response.data);
        return response.data;
      } catch (error: any) {
        console.error('❌ Erro no login:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message,
          data: error.response?.data
        });
        throw error;
      } finally {
        loginInProgress = false;
        loginPromise = null;
      }
    })();

    return loginPromise;
  },

  /**
   * Registra novo usuário (PACIENTE, MEDICO ou ADMIN)
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register-unified', data);
    return response.data;
  },

  /**
   * Registra novo médico (endpoint público)
   */
  async registerMedico(data: {
    email: string;
    senha: string;
    nome: string;
    cpf: string;
    telefone: string;
    crm: string;
    duracao_minutos?: number;
    horarios_atendimento?: Array<{
      dia_semana: number;
      hora_inicio: string;
      hora_fim: string;
    }>;
  }): Promise<RegisterResponse> {
    const response = await api.post<RegisterResponse>('/auth/register-medico', data);
    return response.data;
  },

  /**
   * Busca perfil do usuário autenticado
   */
  async getPerfil(): Promise<Usuario> {
    const response = await api.get<Usuario>('/auth/perfil');
    return response.data;
  },

  /**
   * Armazena token e dados do usuário no localStorage
   */
  saveAuth(token: string, user: Usuario): void {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },

  /**
   * Remove token e dados do usuário do localStorage
   */
  clearAuth(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  /**
   * Recupera token do localStorage
   */
  getToken(): string | null {
    return localStorage.getItem('token');
  },

  /**
   * Recupera usuário do localStorage
   */
  getUser(): Usuario | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr) as Usuario;
    } catch {
      return null;
    }
  },

  /**
   * Atualiza perfil do usuário
   */
  async updatePerfil(data: Partial<Usuario>): Promise<Usuario> {
    const response = await api.put<Usuario>('/auth/perfil', data);

    // Atualiza os dados no localStorage
    const currentUser = this.getUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...response.data };
      this.saveAuth(this.getToken() || '', updatedUser);
    }

    return response.data;
  },

  /**
   * Verifica se a senha atual está correta
   */
  async verifyCurrentPassword(currentPassword: string): Promise<boolean> {
    try {
      const response = await api.post<{ valid: boolean }>('/auth/verify-password', {
        senha: currentPassword,
      });
      return response.data.valid;
    } catch (error) {
      return false;
    }
  },

  /**
   * Altera senha do usuário
   */
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    // Verifica se a senha atual está correta antes de tentar alterar
    const isValidPassword = await this.verifyCurrentPassword(currentPassword);
    
    if (!isValidPassword) {
      throw new Error('Senha atual incorreta');
    }

    await api.put('/auth/senha', {
      senha_atual: currentPassword,
      senha_nova: newPassword,
    });
  },
};
