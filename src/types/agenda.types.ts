// D:\teste2\ProjDevWebFront\src\types\agenda.types.ts

export interface AgendaSlot {
  id: string;
  inicio: string; // ou Date
  fim: string;    // ou Date
  status: 'DISPONIVEL' | 'OCUPADO' | 'BLOQUEADO';
  medico_id: string;
  consulta?: {
    id: string;
    paciente: {
      usuario: {
        nome: string;
      };
    };
  };
}

export interface AgendaListResponse {
  data: AgendaSlot[];
  metadata: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}

export interface CreateAgendaSlotData {
  medico_id: number;
  inicio: string; // ISO string - data e hora de início
  fim: string; // ISO string - data e hora de fim
  status?: 'DISPONIVEL' | 'BLOQUEADO'; // Opcional, default DISPONIVEL
}

export interface CreateMultipleSlotsData {
  medico_id: string; // ObjectId do MongoDB (24 caracteres hexadecimais)
  dates: string[]; // Array de datas ISO (YYYY-MM-DD)
  days: number[]; // Dias da semana (0-6, onde 0=Dom)
  times: string[]; // Horários no formato "HH:mm"
  duration: number; // Duração em minutos (15-120)
}
