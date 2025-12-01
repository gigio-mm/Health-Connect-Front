// Serviço de gerenciamento de agenda

import api from './api';
import type { 
  AgendaSlot, 
  AgendaListResponse,
  CreateAgendaSlotData,
  CreateMultipleSlotsData
} from '../types/agenda.types';

export const agendaService = {
  /**
   * Lista todos os slots de agenda com paginação e filtros
   */
  async list(
    medico_id: string | number,
    data_inicio: string,
    data_fim: string,
    page: number = 1,
    limit: number = 100 // Aumentar o limite para buscar todos os slots de um dia
  ): Promise<AgendaListResponse> {
    const response = await api.get<AgendaListResponse>('/agenda', {
      params: { medico_id: String(medico_id), data_inicio, data_fim, page, limit },
    });
    return response.data;
  },

  /**
   * Cria múltiplos slots de agenda usando endpoint bulk do backend
   */
  async createMultipleSlots(data: CreateMultipleSlotsData): Promise<{ created: number; slots: AgendaSlot[] }> {
    const response = await api.post<{ created: number; slots: AgendaSlot[] }>(
      '/agenda/slots/bulk',
      data
    );
    return response.data;
  },

  /**
   * Bloqueia ou desbloqueia um slot
   */
  async updateSlotStatus(id: string, status: 'BLOQUEADO' | 'DISPONIVEL'): Promise<AgendaSlot> {
    const response = await api.patch<AgendaSlot>(`/agenda/${id}/status`, { status });
    return response.data;
  },

  /**
   * Deleta um slot de agenda (apenas se estiver disponível)
   */
  async deleteSlot(id: number): Promise<void> {
    await api.delete(`/agenda/${id}`);
  },
};
