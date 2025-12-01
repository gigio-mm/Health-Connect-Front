// Cliente Axios configurado para integração com o backend

import axios from 'axios';
import type { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const API_TIMEOUT = Number(import.meta.env.VITE_API_TIMEOUT) || 10000;

// Cria instância do Axios
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT em todas as requisições
api.interceptors.request.use(
  (config) => {
    // Não adiciona token em requisições de login
    const isLoginRequest = config.url?.includes('/auth/login');

    if (!isLoginRequest) {
      const token = localStorage.getItem('token');

      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Token adicionado à requisição');
      }
    } else {
      console.log('🔓 Requisição de login - sem token');
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Token expirado ou inválido
    if (error.response?.status === 401) {
      // Limpa o token e redireciona para login
      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Evita loop infinito se já estiver na página de login
      if (window.location.pathname !== '/sign-in') {
        window.location.href = '/sign-in';
      }
    }

    // Rate limit (429) - Tenta novamente após delay maior
    if (error.response?.status === 429 && !originalRequest._retry) {
      originalRequest._retry = true;

      console.warn('Rate limit atingido. Aguardando 5 segundos antes de retentativa...');

      // Aguarda 5 segundos antes de tentar novamente
      await new Promise(resolve => setTimeout(resolve, 5000));

      return api(originalRequest);
    }

    return Promise.reject(error);
  }
);

// Helper para tratar erros de API
export const handleApiError = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<{ message?: string; errors?: string[] }>;

    // Rate limit
    if (axiosError.response?.status === 429) {
      return 'Servidor sobrecarregado. Por favor, aguarde 30 segundos e tente novamente.';
    }

    // Erro de resposta do servidor
    if (axiosError.response?.data) {
      const data = axiosError.response.data;

      // Retorna a mensagem de erro do backend
      if (data.message) {
        return data.message;
      }

      // Retorna array de erros formatado
      if (data.errors && Array.isArray(data.errors)) {
        return data.errors.join(', ');
      }
    }

    // Erro de timeout
    if (axiosError.code === 'ECONNABORTED') {
      return 'Tempo de resposta esgotado. Tente novamente.';
    }

    // Erro de rede
    if (axiosError.message === 'Network Error') {
      return 'Erro de conexão. Verifique se o backend está rodando em http://localhost:3001';
    }

    // Erro genérico do Axios
    return axiosError.message;
  }

  // Erro desconhecido
  return 'Erro desconhecido. Tente novamente.';
};

export default api;
