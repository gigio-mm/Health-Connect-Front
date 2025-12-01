// Tipos relacionados a médicos

export type Especialidade = {
  id: string;
  nome: string;
  codigo: string;
  ativo: boolean;
}

export type HorarioAtendimento = {
  id?: string;
  medico_id?: string;
  dia_semana: number; // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  hora_inicio: string; // HH:mm (formato "08:00")
  hora_fim: string; // HH:mm (formato "18:00")
  ativo?: boolean;
  criado_em?: Date | string;
  atualizado_em?: Date | string;
}

export type TimeSlot = {
  time: string; // HH:mm
  available: boolean;
  datetime: string; // ISO datetime
}

export type Medico = {
  id: string;
  nome: string;
  telefone: string;
  crm: string;
  duracao_minutos: number;
  usuario_id: string;
  usuario: {
    id: string;
    nome: string;
    email: string;
    ativo: boolean;
  };
  especialidades: Especialidade[];
  horarios_atendimento?: HorarioAtendimento[];
}

export type CreateMedicoRequest = {
  email: string;
  senha: string;
  nome: string;
  cpf: string;
  telefone: string;
  crm: string;
  duracao_minutos: number;
}

export type UpdateMedicoRequest = {
  nome?: string;
  email?: string;
  telefone?: string;
  crm?: string;
  duracao_minutos?: number;
  ativo?: boolean;
}

export type AvailableSlotsResponse = {
  slots: TimeSlot[];
  date: string;
  medico_id: string;
}

export type MedicoListResponse = {
  data: Medico[];
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

// Tipos para API de horários
export type HorariosResponse = {
  message: string;
  horarios: HorarioAtendimento[];
}

export type UpdateHorariosRequest = {
  horarios_atendimento: Omit<HorarioAtendimento, 'id' | 'medico_id' | 'ativo' | 'criado_em' | 'atualizado_em'>[];
}
