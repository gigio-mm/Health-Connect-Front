// Serviços de médicos

import api from './api';
import type {
  Medico,
  CreateMedicoRequest,
  UpdateMedicoRequest,
  MedicoListResponse,
  HorarioAtendimento,
  TimeSlot,
  AvailableSlotsResponse
} from '../types/medico.types';

export const medicoService = {
  /**
   * Lista todos os médicos com paginação
   */
  async list(page: number = 1, limit: number = 10): Promise<MedicoListResponse> {
    const response = await api.get<MedicoListResponse>('/medicos', {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * Busca médico por ID
   */
  async getById(id: string): Promise<Medico> {
    const response = await api.get<Medico>(`/medicos/${id}`);
    return response.data;
  },

  /**
   * Busca perfil do médico logado (retorna ObjectId do MongoDB)
   */
  async getProfile(): Promise<Medico> {
    const response = await api.get<Medico>('/medicos/profile');
    return response.data;
  },

  /**
   * Busca médico por CRM
   */
  async getByCrm(crm: string): Promise<Medico | null> {
    try {
      const listResponse = await this.list(1, 100); // Busca até 100 médicos
      const medico = listResponse.data.find(m => m.crm === crm);
      return medico || null;
    } catch {
      return null;
    }
  },

  /**
   * Cria novo médico
   */
  async create(data: CreateMedicoRequest): Promise<Medico> {
    const response = await api.post<Medico>('/medicos', data);
    return response.data;
  },

  /**
   * Atualiza médico existente
   */
  async update(id: string, data: UpdateMedicoRequest): Promise<Medico> {
    const response = await api.put<Medico>(`/medicos/${id}`, data);
    return response.data;
  },

  /**
   * Remove médico (soft delete)
   */
  async delete(id: number): Promise<void> {
    await api.delete(`/medicos/${id}`);
  },

  /**
   * Vincula especialidade ao médico
   */
  async addEspecialidade(medicoId: number, especialidadeId: number): Promise<void> {
    await api.post(`/medicos/${medicoId}/especialidades`, {
      especialidade_id: especialidadeId,
    });
  },

  /**
   * Remove vínculo entre médico e especialidade
   */
  async removeEspecialidade(medicoId: number, especialidadeId: number): Promise<void> {
    await api.delete(`/medicos/${medicoId}/especialidades/${especialidadeId}`);
  },

  /**
   * Busca horários de atendimento do médico
   */
  async getHorarios(medicoId: string): Promise<HorarioAtendimento[]> {
    try {
      const response = await api.get<{ horarios: HorarioAtendimento[] }>(`/medicos/${medicoId}/horarios`);
      return response.data.horarios || [];
    } catch (error) {
      console.error('Erro ao buscar horários do médico:', error);
      return [];
    }
  },

  /**
   * Busca slots disponíveis do médico para uma data específica
   */
  async getAvailableSlots(medicoId: string, date: string): Promise<TimeSlot[]> {
    try {
      const response = await api.get<any>(`/medicos/${medicoId}/slots`, {
        params: { date }
      });
      
      // Verificar se a resposta tem slots
      if (!response.data.slots || !Array.isArray(response.data.slots)) {
        return [];
      }

      // Transformar formato do backend para o formato esperado pelo frontend
      const slots: TimeSlot[] = response.data.slots.map((slot: any) => {
        // Extrair hora do campo 'inicio' (formato: "2025-12-02T08:00:00.000Z")
        const inicioDate = new Date(slot.inicio);
        const hour = inicioDate.getUTCHours().toString().padStart(2, '0');
        const minute = inicioDate.getUTCMinutes().toString().padStart(2, '0');
        const timeString = `${hour}:${minute}`;

        return {
          time: timeString,
          available: slot.status === 'DISPONIVEL',
          datetime: slot.inicio
        };
      });

      return slots;
    } catch (error) {
      console.error('Erro ao buscar slots disponíveis:', error);
      // Se o endpoint não existir, gerar slots localmente
      return this.generateSlotsLocally(medicoId, date);
    }
  },

  /**
   * Gera slots localmente caso o backend não tenha o endpoint
   */
  async generateSlotsLocally(medicoId: string, date: string): Promise<TimeSlot[]> {
    try {
      // Busca o médico e seus horários separadamente
      const medico = await this.getById(medicoId);
      const horarios = await this.getHorarios(medicoId);

      if (horarios.length === 0) {
        console.log('Médico sem horários cadastrados');
        return [];
      }

      // Determina o dia da semana da data selecionada
      const selectedDate = new Date(date + 'T00:00:00');
      const dayOfWeek = selectedDate.getDay();

      // Filtra horários para o dia da semana
      const horariosDay = horarios.filter(h => h.dia_semana === dayOfWeek && h.ativo !== false);
      
      if (horariosDay.length === 0) {
        return [];
      }

      // Gera slots para cada horário do dia
      const allSlots: TimeSlot[] = [];
      
      for (const horario of horariosDay) {
        const slots = this.generateTimeSlots(
          horario.hora_inicio,
          horario.hora_fim,
          medico.duracao_minutos || 30,
          date
        );
        allSlots.push(...slots);
      }

      // Busca consultas já agendadas para verificar disponibilidade
      // Por enquanto, retorna todos como disponíveis
      return allSlots.sort((a, b) => a.time.localeCompare(b.time));
    } catch (error) {
      console.error('Erro ao gerar slots localmente:', error);
      return [];
    }
  },

  /**
   * Gera slots de tempo baseado no horário de início, fim e duração
   */
  generateTimeSlots(startTime: string, endTime: string, duration: number, date: string): TimeSlot[] {
    const slots: TimeSlot[] = [];
    
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);
    
    let currentMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    
    while (currentMinutes + duration <= endMinutes) {
      const hour = Math.floor(currentMinutes / 60);
      const minute = currentMinutes % 60;
      const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      slots.push({
        time: timeString,
        available: true,
        datetime: `${date}T${timeString}:00`
      });
      
      currentMinutes += duration;
    }
    
    return slots;
  },
};
