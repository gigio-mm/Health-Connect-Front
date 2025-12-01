// Serviço de gerenciamento de horários de atendimento dos médicos

import api from './api';
import type { HorarioAtendimento, UpdateHorariosRequest, HorariosResponse } from '../types/medico.types';

export const horarioService = {
  /**
   * Lista todos os horários de atendimento de um médico
   * GET /api/medicos/:id/horarios
   * 
   * @param medicoId - ID do médico (ObjectId MongoDB)
   * @returns Array de horários ativos ordenados por dia_semana e hora_inicio
   */
  async getHorarios(medicoId: string): Promise<HorarioAtendimento[]> {
    try {
      const response = await api.get<HorariosResponse>(`/medicos/${medicoId}/horarios`);
      return response.data.horarios || [];
    } catch (error) {
      console.error('Erro ao buscar horários do médico:', error);
      throw error;
    }
  },

  /**
   * Atualiza todos os horários de atendimento de um médico
   * PUT /api/medicos/:id/horarios
   * 
   * ⚠️ IMPORTANTE: Este endpoint SUBSTITUI todos os horários existentes.
   * Horários antigos são desativados e novos são criados.
   * 
   * @param medicoId - ID do médico (ObjectId MongoDB)
   * @param horarios - Array completo de horários a serem configurados
   * @returns Array de novos horários criados
   */
  async updateHorarios(medicoId: string, horarios: Omit<HorarioAtendimento, 'id' | 'medico_id' | 'ativo' | 'criado_em' | 'atualizado_em'>[]): Promise<HorarioAtendimento[]> {
    try {
      const response = await api.put<HorariosResponse>(`/medicos/${medicoId}/horarios`, {
        horarios_atendimento: horarios
      });
      return response.data.horarios || [];
    } catch (error) {
      console.error('Erro ao atualizar horários do médico:', error);
      throw error;
    }
  },

  /**
   * Busca médicos disponíveis em um determinado dia/horário
   * GET /api/horarios/disponiveis?dia_semana=1&hora=10:00
   * 
   * @param diaSemana - Dia da semana (0=Domingo, 1=Segunda, ..., 6=Sábado)
   * @param hora - Hora no formato "HH:mm"
   * @returns Array de médicos disponíveis
   */
  async getMedicosDisponiveis(diaSemana: number, hora: string): Promise<any[]> {
    try {
      const response = await api.get('/horarios/disponiveis', {
        params: { dia_semana: diaSemana, hora }
      });
      return response.data.medicos || [];
    } catch (error) {
      console.error('Erro ao buscar médicos disponíveis:', error);
      throw error;
    }
  },

  /**
   * Agrupa horários por dia da semana para melhor visualização
   * 
   * @param horarios - Array de horários
   * @returns Objeto com horários agrupados por dia
   */
  agruparPorDia(horarios: HorarioAtendimento[]): Record<number, HorarioAtendimento[]> {
    return horarios.reduce((acc, horario) => {
      if (!acc[horario.dia_semana]) {
        acc[horario.dia_semana] = [];
      }
      acc[horario.dia_semana].push(horario);
      return acc;
    }, {} as Record<number, HorarioAtendimento[]>);
  },

  /**
   * Valida formato de hora (HH:mm)
   */
  validarHora(hora: string): boolean {
    return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(hora);
  },

  /**
   * Valida que hora_fim > hora_inicio
   */
  validarIntervalo(inicio: string, fim: string): boolean {
    return inicio < fim;
  },

  /**
   * Valida dia da semana
   */
  validarDia(dia: number): boolean {
    return dia >= 0 && dia <= 6;
  },
};
