// Serviço de gerenciamento de consultas

import api from './api';
import type {
  Consulta,
  CreateConsultaRequest,
  UpdateConsultaRequest,
  ConsultaListResponse,
  ConsultaResponse,
} from '../types/consulta.types';

export const consultaService = {
  /**
   * Lista todas as consultas
   */
  async list(): Promise<Consulta[]> {
    const response = await api.get<ConsultaListResponse>('/consultas');
    return response.data.data;
  },

  /**
   * Lista consultas do paciente logado
   */
  async getMyConsultas(): Promise<Consulta[]> {
    try {
      const response = await api.get<ConsultaListResponse>('/consultas');
      return response.data.data;
    } catch (error: any) {
      console.log('Endpoint /consultas falhou.');
      throw new Error('Não foi possível carregar suas consultas. Entre em contato com o suporte.');
    }
  },

  /**
   * Lista consultas de um paciente específico (requer permissões de admin)
   */
  async listByPaciente(pacienteId: string): Promise<Consulta[]> {
    const response = await api.get<ConsultaListResponse>(`/consultas?paciente_id=${pacienteId}`);
    return response.data.data;
  },

  /**
   * Lista consultas de um médico específico
   */
  async listByMedico(medicoId: string): Promise<Consulta[]> {
    const response = await api.get<ConsultaListResponse>(`/consultas?medico_id=${medicoId}`);
    return response.data.data;
  },

  /**
   * Busca consulta por ID
   */
  async getById(id: string): Promise<Consulta> {
    const response = await api.get<Consulta>(`/consultas/${id}`);
    return response.data;
  },

  /**
   * Cria nova consulta
   */
  async create(data: CreateConsultaRequest): Promise<Consulta> {
    const response = await api.post<Consulta>('/consultas', data);
    return response.data;
  },

  /**
   * Atualiza consulta existente
   */
  async update(id: string, data: UpdateConsultaRequest): Promise<Consulta> {
    const response = await api.put<Consulta>(`/consultas/${id}`, data);
    return response.data;
  },

  /**
   * Cancela uma consulta
   */
  async cancel(id: string): Promise<Consulta> {
    const response = await api.patch<Consulta>(`/consultas/${id}/cancelar`);
    return response.data;
  },

  /**
   * Confirma uma consulta
   */
  async confirm(id: string): Promise<Consulta> {
    const response = await api.patch<Consulta>(`/consultas/${id}/confirmar`);
    return response.data;
  },

  /**
   * Remove consulta
   */
  async delete(id: string): Promise<void> {
    await api.delete(`/consultas/${id}`);
  },
};
