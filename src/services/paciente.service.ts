// Serviço de gerenciamento de pacientes

import api from './api';
import type {
  Paciente,
  CreatePacienteRequest,
  UpdatePacienteRequest,
  PacienteListResponse,
  PacienteResponse,
} from '../types/paciente.types';

export const pacienteService = {
  /**
   * Lista todos os pacientes com paginação
   */
  async list(page: number = 1, limit: number = 10, usuarioId?: string): Promise<PacienteListResponse> {
    const response = await api.get<PacienteListResponse>('/pacientes', {
      params: { page, limit, usuarioId },
    });
    return response.data;
  },

  /**
   * Busca paciente por ID
   */
  async getById(id: string): Promise<Paciente> {
    const response = await api.get<Paciente>(`/pacientes/${id}`);
    return response.data;
  },

  /**
   * Busca dados do paciente logado (próprio usuário)
   */
  async getMe(): Promise<Paciente> {
    try {
      const response = await api.get<Paciente>('/pacientes/me');
      return response.data;
    } catch (error: any) {
      console.error('Erro ao carregar os dados do paciente:', error.response?.status, error.response?.data?.message);
      throw new Error('Não foi possível carregar os dados do paciente. Verifique se você está cadastrado como paciente no sistema.');
    }
  },

  /**
   * Busca paciente por usuario_id (requer permissões de admin)
   */
  async getByUsuarioId(usuarioId: string): Promise<Paciente> {
    const listResponse = await this.list(1, 1, usuarioId);
    if (listResponse.data.length > 0) {
      return listResponse.data[0];
    } else {
      throw new Error('Paciente não encontrado');
    }
  },

  /**
   * Busca paciente por CPF
   */
  async getByCpf(cpf: string): Promise<Paciente | null> {
    try {
      const listResponse = await this.list(1, 100);
      const paciente = listResponse.data.find(p => p.cpf === cpf);
      return paciente || null;
    } catch {
      return null;
    }
  },

  /**
   * Cria novo paciente
   */
  async create(data: CreatePacienteRequest): Promise<Paciente> {
    const response = await api.post<Paciente>('/paciente', data);
    return response.data;
  },

  /**
   * Atualiza paciente existente
   */
  async update(id: number, data: UpdatePacienteRequest): Promise<Paciente> {
    const response = await api.put<Paciente>(`/pacientes/${id}`, data);
    return response.data;
  },

  /**
   * Remove paciente (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/pacientes/${id}`);
  },
};
