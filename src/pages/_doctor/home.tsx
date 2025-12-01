import React, { useState, useEffect } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../components/ui/card"
import { Calendar, Clock, User } from 'lucide-react'
import { consultaService } from '@/services/consulta.service'
import { medicoService } from '@/services/medico.service'
import type { Consulta } from '@/types/consulta.types'
import { toast } from 'sonner'

export const Route = createFileRoute('/_doctor/home')({
  component: HomePage,
})

function HomePage() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [medicoId, setMedicoId] = useState<string>('');

  // Busca consultas do médico logado
  useEffect(() => {
    const fetchConsultas = async () => {
      try {
        setIsLoading(true);

        // Primeiro busca o perfil do médico
        const medico = await medicoService.getProfile();
        setMedicoId(medico.id.toString());

        // Depois busca as consultas do médico
        const todasConsultas = await consultaService.listByMedico(medico.id.toString());

        // Filtra consultas de hoje e futuras, ordenadas por data
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const consultasFiltradas = todasConsultas
          .filter(c => {
            const dataConsulta = new Date(c.data_hora);
            dataConsulta.setHours(0, 0, 0, 0);
            return dataConsulta >= hoje && c.status !== 'cancelada';
          })
          .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());

        setConsultas(consultasFiltradas);
      } catch (err) {
        console.error('Erro ao buscar consultas:', err);
        toast.error('Erro ao carregar consultas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchConsultas();
  }, []);

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      agendada: { label: 'Agendada', className: 'bg-blue-100 text-blue-800' },
      confirmada: { label: 'Confirmada', className: 'bg-green-100 text-green-800' },
      realizada: { label: 'Realizada', className: 'bg-gray-100 text-gray-800' },
      cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
    };

    const config = statusMap[status] || { label: status, className: 'bg-gray-100 text-gray-800' };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  };

  if (isLoading) {
    return <h1 className="p-6 text-2xl font-semibold">Carregando...</h1>;
  }

  // Separar consultas de hoje e futuras
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const amanha = new Date(hoje);
  amanha.setDate(amanha.getDate() + 1);

  const consultasHoje = consultas.filter(c => {
    const dataConsulta = new Date(c.data_hora);
    dataConsulta.setHours(0, 0, 0, 0);
    return dataConsulta.getTime() === hoje.getTime();
  });

  const consultasFuturas = consultas.filter(c => {
    const dataConsulta = new Date(c.data_hora);
    dataConsulta.setHours(0, 0, 0, 0);
    return dataConsulta >= amanha;
  });

  return (
    <div className="container mx-auto max-w-5xl p-6 py-10 space-y-6">
      {/* Consultas de Hoje */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Consultas de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {consultasHoje.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              Nenhuma consulta agendada para hoje.
            </div>
          ) : (
            <div className="space-y-3">
              {consultasHoje.map(consulta => {
                const dataHora = new Date(consulta.data_hora);
                const horario = dataHora.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <Card key={consulta.id} className="border">
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4 flex-1">
                          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-primary/10">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">
                              {consulta.paciente?.nome || 'Paciente não identificado'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Clock className="h-4 w-4" />
                              <span>{horario}</span>
                            </div>
                            {consulta.observacoes && (
                              <p className="text-sm text-muted-foreground mt-2">
                                <strong>Observações:</strong> {consulta.observacoes}
                              </p>
                            )}
                          </div>
                        </div>
                        <div>
                          {getStatusBadge(consulta.status)}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Próximas Consultas */}
      {consultasFuturas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl font-bold">Próximas Consultas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {consultasFuturas.map(consulta => {
                const dataHora = new Date(consulta.data_hora);
                const data = dataHora.toLocaleDateString('pt-BR', {
                  weekday: 'short',
                  day: '2-digit',
                  month: 'short',
                });
                const horario = dataHora.toLocaleTimeString('pt-BR', {
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={consulta.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/10">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="font-medium">
                          {consulta.paciente?.nome || 'Paciente não identificado'}
                        </h4>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {data}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {horario}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div>
                      {getStatusBadge(consulta.status)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

