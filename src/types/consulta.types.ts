// Tipos relacionados a consultas

export type StatusConsulta = 'agendada' | 'confirmada' | 'cancelada' | 'realizada' | 'pendente';

export interface Consulta {
  id: string;
  paciente_id?: string;
  medico_id?: string;
  data_hora: string;
  status: StatusConsulta;
  observacoes?: string;
  criado_em?: string;
  atualizado_em?: string;
  medico?: {
    id: string;
    nome: string;
    especialidade?: string;
    crm?: string;
  };
  paciente?: {
    id: string;
    nome: string;
    cpf?: string;
  };
}

export interface CreateConsultaRequest {
  pacienteId: string;
  medicoId: string;
  dataHora: string;
  observacoes?: string;
}

export interface UpdateConsultaRequest {
  dataHora?: string;
  status?: StatusConsulta;
  observacoes?: string;
}

export interface ConsultaListResponse {
  data: Consulta[];
  total: number;
}

export interface ConsultaResponse {
  data: Consulta;
}
