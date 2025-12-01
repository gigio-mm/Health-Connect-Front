import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Calendar, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'
// import { useToast } from '@/hooks/use-toast' // ARQUIVO NÃO EXISTE - COMENTADO TEMPORARIAMENTE

export const Route = createFileRoute('/_admin/generate-slots')({
  component: RouteComponent,
})

interface Doctor {
  id: string
  crm: string
  duracao_minutos: number
  usuario?: {
    nome: string
    email: string
  }
  especialidades?: Array<{
    id: string
    nome: string
  }>
}

interface HorarioAtendimento {
  id: string
  dia_semana: number
  hora_inicio: string
  hora_fim: string
  ativo: boolean
}

interface DoctorWithHorarios extends Doctor {
  horarios: HorarioAtendimento[]
  slotsCount?: number
}

function RouteComponent() {
  // const { toast } = useToast() // COMENTADO - use-toast não existe
  const toast = (params: any) => console.log('Toast:', params.title, params.description) // Fallback temporário
  const [doctors, setDoctors] = useState<DoctorWithHorarios[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatingDoctorId, setGeneratingDoctorId] = useState<string | null>(null)
  const [numDays, setNumDays] = useState('30')

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

  // Carregar médicos ao montar o componente
  useEffect(() => {
    loadDoctors()
  }, [])

  const loadDoctors = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('token')

      // Buscar todos os médicos
      const medicosRes = await axios.get(`${API_BASE_URL}/medicos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const medicosData = medicosRes.data.data || []

      // Para cada médico, buscar seus horários
      const medicosWithHorarios = await Promise.all(
        medicosData.map(async (medico: Doctor) => {
          try {
            const horariosRes = await axios.get(`${API_BASE_URL}/medicos/${medico.id}/horarios`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })

            return {
              ...medico,
              horarios: horariosRes.data.horarios || []
            }
          } catch (error) {
            console.error(`Erro ao buscar horários do médico ${medico.id}:`, error)
            return {
              ...medico,
              horarios: []
            }
          }
        })
      )

      setDoctors(medicosWithHorarios)

    } catch (error: any) {
      console.error('Erro ao carregar médicos:', error)
      toast({
        title: 'Erro ao carregar médicos',
        description: error.response?.data?.message || 'Ocorreu um erro ao carregar a lista de médicos',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const generateSlotsForDoctor = async (doctor: DoctorWithHorarios) => {
    try {
      setIsGenerating(true)
      setGeneratingDoctorId(doctor.id)
      const token = localStorage.getItem('token')

      // Preparar datas
      const dates: string[] = []
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(0, 0, 0, 0)

      const days = parseInt(numDays) || 30

      for (let i = 0; i < days; i++) {
        const date = new Date(tomorrow)
        date.setDate(tomorrow.getDate() + i)
        dates.push(date.toISOString().split('T')[0])
      }

      // Preparar dias da semana e horários
      const daysSet = new Set<number>()
      const timesSet = new Set<string>()

      doctor.horarios.forEach(h => {
        if (h.ativo) {
          daysSet.add(h.dia_semana)

          // Gerar todos os horários possíveis
          const [inicioH, inicioM] = h.hora_inicio.split(':').map(Number)
          const [fimH, fimM] = h.hora_fim.split(':').map(Number)

          const inicioMinutos = inicioH * 60 + inicioM
          const fimMinutos = fimH * 60 + fimM

          for (let m = inicioMinutos; m < fimMinutos; m += doctor.duracao_minutos) {
            const hour = Math.floor(m / 60)
            const minute = m % 60
            const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
            timesSet.add(timeStr)
          }
        }
      })

      const daysArray = Array.from(daysSet)
      const timesArray = Array.from(timesSet).sort()

      // Fazer requisição para criar slots
      const response = await axios.post(`${API_BASE_URL}/agenda/slots/bulk`, {
        medico_id: doctor.id,
        dates: dates,
        days: daysArray,
        times: timesArray,
        duration: doctor.duracao_minutos
      }, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      toast({
        title: 'Slots gerados com sucesso!',
        description: `${response.data.created} slots foram criados para ${doctor.usuario?.nome}`,
      })

      // Atualizar contador de slots
      setDoctors(prev => prev.map(d =>
        d.id === doctor.id
          ? { ...d, slotsCount: (d.slotsCount || 0) + response.data.created }
          : d
      ))

    } catch (error: any) {
      console.error('Erro ao gerar slots:', error)
      toast({
        title: 'Erro ao gerar slots',
        description: error.response?.data?.message || 'Ocorreu um erro ao gerar os slots',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
      setGeneratingDoctorId(null)
    }
  }

  const generateSlotsForAll = async () => {
    const doctorsWithHorarios = doctors.filter(d => d.horarios.length > 0)

    if (doctorsWithHorarios.length === 0) {
      toast({
        title: 'Nenhum médico disponível',
        description: 'Não há médicos com horários de atendimento configurados',
        variant: 'destructive',
      })
      return
    }

    for (const doctor of doctorsWithHorarios) {
      await generateSlotsForDoctor(doctor)
    }
  }

  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gerador de Slots de Agenda</h1>
          <p className="text-muted-foreground mt-1">
            Gere automaticamente os horários disponíveis para agendamento
          </p>
        </div>
        <Calendar className="h-12 w-12 text-primary" />
      </div>

      {/* Configurações */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações</CardTitle>
          <CardDescription>
            Defina quantos dias à frente você deseja gerar slots
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-4">
            <div className="flex-1 max-w-xs">
              <Label htmlFor="numDays">Número de dias</Label>
              <Input
                id="numDays"
                type="number"
                min="1"
                max="90"
                value={numDays}
                onChange={(e) => setNumDays(e.target.value)}
                placeholder="30"
              />
              <p className="text-sm text-muted-foreground mt-1">
                Máximo: 90 dias
              </p>
            </div>
            <Button
              onClick={generateSlotsForAll}
              disabled={isGenerating || doctors.length === 0}
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Gerar para Todos
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Médicos */}
      <Card>
        <CardHeader>
          <CardTitle>Médicos Cadastrados</CardTitle>
          <CardDescription>
            {doctors.length} médico(s) cadastrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground">Nenhum médico cadastrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Médico</TableHead>
                  <TableHead>CRM</TableHead>
                  <TableHead>Duração</TableHead>
                  <TableHead>Horários</TableHead>
                  <TableHead>Especialidades</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {doctors.map((doctor) => (
                  <TableRow key={doctor.id}>
                    <TableCell className="font-medium">
                      {doctor.usuario?.nome || 'N/A'}
                    </TableCell>
                    <TableCell>{doctor.crm}</TableCell>
                    <TableCell>{doctor.duracao_minutos} min</TableCell>
                    <TableCell>
                      {doctor.horarios.length === 0 ? (
                        <Badge variant="destructive">Sem horários</Badge>
                      ) : (
                        <div className="space-y-1">
                          {doctor.horarios
                            .filter(h => h.ativo)
                            .reduce((acc, h) => {
                              const existing = acc.find(item => item.dia === h.dia_semana)
                              if (existing) {
                                existing.horarios.push(`${h.hora_inicio}-${h.hora_fim}`)
                              } else {
                                acc.push({
                                  dia: h.dia_semana,
                                  horarios: [`${h.hora_inicio}-${h.hora_fim}`]
                                })
                              }
                              return acc
                            }, [] as Array<{ dia: number; horarios: string[] }>)
                            .map((item, idx) => (
                              <div key={idx} className="text-xs">
                                <span className="font-semibold">{diasSemana[item.dia]}:</span>{' '}
                                {item.horarios.join(', ')}
                              </div>
                            ))
                          }
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {doctor.especialidades && doctor.especialidades.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {doctor.especialidades.map((esp) => (
                            <Badge key={esp.id} variant="outline">
                              {esp.nome}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nenhuma</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => generateSlotsForDoctor(doctor)}
                        disabled={
                          isGenerating ||
                          doctor.horarios.length === 0 ||
                          generatingDoctorId === doctor.id
                        }
                        size="sm"
                      >
                        {generatingDoctorId === doctor.id ? (
                          <>
                            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          'Gerar Slots'
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
