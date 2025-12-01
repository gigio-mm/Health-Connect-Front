import React, { useState, useEffect } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { Calendar } from "../../components/ui/calendar"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog"
import { Badge } from "../../components/ui/badge"
import { Label } from "../../components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import { Search, Loader2, Eye, CheckCircle, XCircle, Clock, Plus, Trash2, CalendarPlus, Edit, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuth } from '@/hooks/useAuth'
import { consultaService } from '@/services/consulta.service'
import { medicoService } from '@/services/medico.service'
import { horarioService } from '@/services/horario.service'
import { agendaService } from '@/services/agenda.service'
import type { Consulta } from '@/types/consulta.types'
import type { Medico, HorarioAtendimento } from '@/types/medico.types'
import type { AgendaSlot } from '@/types/agenda.types'
import { toast } from 'sonner'

export const Route = createFileRoute('/_doctor/schedule')({
  component: SchedulePage,
})

function SchedulePage() {
  const { user } = useAuth()
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [consultas, setConsultas] = useState<Consulta[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null)
  const [actionType, setActionType] = useState<'confirm' | 'complete' | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [medicoProfile, setMedicoProfile] = useState<Medico | null>(null)

  // Estados para gerenciamento de horários de atendimento
  const [showHorariosDialog, setShowHorariosDialog] = useState(false)
  const [horarios, setHorarios] = useState<HorarioAtendimento[]>([])
  const [horariosLoading, setHorariosLoading] = useState(false)
  
  // Form state para edição de horários
  const [editingHorarios, setEditingHorarios] = useState<
    Omit<HorarioAtendimento, 'id' | 'medico_id' | 'ativo' | 'criado_em' | 'atualizado_em'>[]
  >([])

  // Estados para geração de slots de agenda
  const [showGenerateSlotsDialog, setShowGenerateSlotsDialog] = useState(false)
  const [generatingSlots, setGeneratingSlots] = useState(false)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [slotDuration, setSlotDuration] = useState(30)
  const [agendaSlots, setAgendaSlots] = useState<AgendaSlot[]>([])
  const [loadingAgendaSlots, setLoadingAgendaSlots] = useState(false)

  const diasSemanaLabels = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado']

  useEffect(() => {
    fetchConsultas()
    fetchMedicoProfile()
  }, [user?.id])

  useEffect(() => {
    if (medicoProfile?.id) {
      loadHorarios()
      loadAgendaSlots()
    }
  }, [medicoProfile?.id])

  const fetchMedicoProfile = async () => {
    if (!user?.id) return

    try {
      const profile = await medicoService.getProfile()
      setMedicoProfile(profile)
    } catch (error) {
      console.error('Erro ao carregar perfil do médico:', error)
      toast.error('Erro ao carregar perfil do médico')
    }
  }

  const fetchConsultas = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      const data = await consultaService.listByMedico(user.id.toString())
      setConsultas(data || [])
    } catch (error) {
      console.error('Erro ao carregar consultas:', error)
      toast.error('Erro ao carregar consultas')
    } finally {
      setLoading(false)
    }
  }

  const loadHorarios = async () => {
    if (!medicoProfile?.id) return

    try {
      setHorariosLoading(true)
      const data = await horarioService.getHorarios(medicoProfile.id)
      setHorarios(data)
    } catch (error: any) {
      console.error('Erro ao carregar horários:', error)
      
      // Se retornar 404, tentar carregar do localStorage
      if (error.response?.status === 404) {
        const savedHorarios = localStorage.getItem(`horarios_${medicoProfile.id}`)
        if (savedHorarios) {
          const parsed = JSON.parse(savedHorarios)
          setHorarios(parsed.map((h: any, index: number) => ({
            id: `temp_${index}`,
            medico_id: medicoProfile.id,
            ...h,
            ativo: true
          })))
          toast.warning('Usando horários salvos localmente. A funcionalidade de horários ainda não está implementada no backend.', { duration: 5000 })
        }
      } else {
        toast.error('Erro ao carregar horários de atendimento')
      }
    } finally {
      setHorariosLoading(false)
    }
  }

  const loadAgendaSlots = async () => {
    if (!medicoProfile?.id) return

    try {
      setLoadingAgendaSlots(true)
      const today = new Date().toISOString().split('T')[0]
      const endDate = new Date()
      endDate.setDate(endDate.getDate() + 30)
      const endDateStr = endDate.toISOString().split('T')[0]
      
      const response = await agendaService.list(medicoProfile.id, today, endDateStr, 1, 500)
      setAgendaSlots(response.data || [])
    } catch (error) {
      console.error('Erro ao carregar slots de agenda:', error)
    } finally {
      setLoadingAgendaSlots(false)
    }
  }

  const handleAction = async () => {
    if (!selectedConsulta || !actionType) return

    try {
      setActionLoading(true)

      if (actionType === 'confirm') {
        await consultaService.confirm(selectedConsulta.id)
        toast.success('Consulta confirmada com sucesso!')
      } else if (actionType === 'complete') {
        await consultaService.update(selectedConsulta.id, { status: 'CONCLUIDA' })
        toast.success('Consulta marcada como concluída!')
      }

      setSelectedConsulta(null)
      setActionType(null)
      fetchConsultas()
    } catch (error) {
      console.error('Erro ao executar ação:', error)
      toast.error('Erro ao executar ação')
    } finally {
      setActionLoading(false)
    }
  }

  const openActionDialog = (consulta: Consulta, type: 'confirm' | 'complete') => {
    setSelectedConsulta(consulta)
    setActionType(type)
  }

  const handleOpenHorariosDialog = () => {
    // Carregar horários existentes ou criar template inicial
    if (horarios.length > 0) {
      setEditingHorarios(horarios.map(h => ({
        dia_semana: h.dia_semana,
        hora_inicio: h.hora_inicio,
        hora_fim: h.hora_fim,
      })))
    } else {
      // Template padrão: Segunda a Sexta, 08:00-12:00 e 14:00-18:00
      const template = []
      for (let dia = 1; dia <= 5; dia++) {
        template.push(
          { dia_semana: dia, hora_inicio: '08:00', hora_fim: '12:00' },
          { dia_semana: dia, hora_inicio: '14:00', hora_fim: '18:00' }
        )
      }
      setEditingHorarios(template)
    }
    setShowHorariosDialog(true)
  }

  const handleAddHorario = () => {
    setEditingHorarios([
      ...editingHorarios,
      { dia_semana: 1, hora_inicio: '08:00', hora_fim: '12:00' }
    ])
  }

  const handleRemoveHorario = (index: number) => {
    setEditingHorarios(editingHorarios.filter((_, i) => i !== index))
  }

  const handleUpdateHorario = (index: number, field: keyof typeof editingHorarios[0], value: any) => {
    const updated = [...editingHorarios]
    updated[index] = { ...updated[index], [field]: value }
    setEditingHorarios(updated)
  }

  const handleOpenGenerateSlotsDialog = () => {
    if (horarios.length === 0) {
      toast.error('Configure seus horários de atendimento primeiro')
      return
    }
    
    // Set default dates: today to 30 days from now
    const today = new Date()
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 30)
    
    setStartDate(today.toISOString().split('T')[0])
    setEndDate(futureDate.toISOString().split('T')[0])
    setSlotDuration(medicoProfile?.duracao_minutos || 30)
    setShowGenerateSlotsDialog(true)
  }

  const handleGenerateSlots = async () => {
    if (!medicoProfile?.id) {
      toast.error('Perfil do médico não carregado')
      return
    }

    if (!startDate || !endDate) {
      toast.error('Selecione o período para geração de horários')
      return
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Data inicial deve ser anterior à data final')
      return
    }

    if (horarios.length === 0) {
      toast.error('Configure seus horários de atendimento primeiro')
      return
    }

    try {
      setGeneratingSlots(true)
      
      // Extract unique days from working hours
      const days = [...new Set(horarios.map(h => h.dia_semana))]
      
      // Extract unique times from working hours
      const times: string[] = []
      horarios.forEach(h => {
        const start = h.hora_inicio
        const end = h.hora_fim
        
        // Generate time slots between start and end
        let currentTime = start
        while (currentTime < end) {
          if (!times.includes(currentTime)) {
            times.push(currentTime)
          }
          // Add slot duration to get next time
          const [hours, minutes] = currentTime.split(':').map(Number)
          const totalMinutes = hours * 60 + minutes + slotDuration
          const newHours = Math.floor(totalMinutes / 60)
          const newMinutes = totalMinutes % 60
          currentTime = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`
        }
      })

      // Generate array of dates between start and end
      const dates: string[] = []
      const current = new Date(startDate)
      const end = new Date(endDate)
      
      while (current <= end) {
        dates.push(current.toISOString().split('T')[0])
        current.setDate(current.getDate() + 1)
      }

      const result = await agendaService.createMultipleSlots({
        medico_id: medicoProfile.id,
        dates,
        days,
        times: times.sort(),
        duration: slotDuration
      })

      toast.success(`${result.created} horários criados com sucesso!`)
      setShowGenerateSlotsDialog(false)
      loadAgendaSlots()
    } catch (error: any) {
      console.error('Erro ao gerar slots:', error)
      const errorMessage = error.response?.data?.message || 'Erro ao gerar horários'
      toast.error(errorMessage)
    } finally {
      setGeneratingSlots(false)
    }
  }

  const handleSaveHorarios = async () => {
    if (!medicoProfile?.id) {
      toast.error('Perfil do médico não carregado')
      return
    }

    // Validações
    for (let i = 0; i < editingHorarios.length; i++) {
      const h = editingHorarios[i]
      
      if (!horarioService.validarDia(h.dia_semana)) {
        toast.error(`Horário ${i + 1}: dia da semana inválido`)
        return
      }

      if (!horarioService.validarHora(h.hora_inicio)) {
        toast.error(`Horário ${i + 1}: formato de hora inicial inválido (use HH:mm)`)
        return
      }

      if (!horarioService.validarHora(h.hora_fim)) {
        toast.error(`Horário ${i + 1}: formato de hora final inválido (use HH:mm)`)
        return
      }

      if (!horarioService.validarIntervalo(h.hora_inicio, h.hora_fim)) {
        toast.error(`Horário ${i + 1}: hora final deve ser maior que hora inicial`)
        return
      }
    }

    try {
      setActionLoading(true)
      await horarioService.updateHorarios(medicoProfile.id, editingHorarios)
      toast.success('Horários atualizados com sucesso!')
      setShowHorariosDialog(false)
      loadHorarios()
    } catch (error: any) {
      console.error('Erro ao salvar horários:', error)
      
      // Se retornar 404, significa que o endpoint ainda não foi implementado no backend
      if (error.response?.status === 404) {
        toast.error(
          'A funcionalidade de horários ainda não está disponível no backend. ' +
          'Por favor, entre em contato com o administrador do sistema.',
          { duration: 6000 }
        )
        
        // Salvar localmente como fallback temporário
        localStorage.setItem(`horarios_${medicoProfile.id}`, JSON.stringify(editingHorarios))
        setHorarios(editingHorarios.map((h, index) => ({
          id: `temp_${index}`,
          medico_id: medicoProfile.id,
          ...h,
          ativo: true
        })))
        setShowHorariosDialog(false)
        
        toast.info(
          'Seus horários foram salvos localmente. Você pode continuar usando o sistema, ' +
          'mas os horários serão perdidos ao fazer logout.',
          { duration: 8000 }
        )
      } else {
        const errorMessage = error.response?.data?.message || 'Erro ao salvar horários'
        toast.error(errorMessage)
      }
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateTime: string) => format(new Date(dateTime), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
  const formatTime = (dateTime: string) => format(new Date(dateTime), "HH:mm")

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
      'CONFIRMADA': 'default',
      'AGENDADA': 'secondary',
      'CANCELADA': 'destructive',
      'CONCLUIDA': 'outline',
      'PENDENTE': 'secondary',
    }
    return variants[status.toUpperCase()] || 'secondary'
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'CONFIRMADA': 'Confirmada',
      'AGENDADA': 'Agendada',
      'CANCELADA': 'Cancelada',
      'CONCLUIDA': 'Concluída',
      'PENDENTE': 'Pendente',
    }
    return labels[status.toUpperCase()] || status
  }

  // Filtrar consultas por nome do paciente
  const filteredConsultas = consultas.filter(consulta =>
    consulta.paciente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false
  )

  // Separar consultas futuras e passadas
  const now = new Date()
  const upcomingConsultas = filteredConsultas
    .filter(c => new Date(c.dataHora) >= now && c.status !== 'CANCELADA' && c.status !== 'CONCLUIDA')
    .sort((a, b) => new Date(a.dataHora).getTime() - new Date(b.dataHora).getTime())

  const pastConsultas = filteredConsultas
    .filter(c => new Date(c.dataHora) < now || c.status === 'CONCLUIDA')
    .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())

  // Agrupar horários por dia da semana
  const horariosAgrupados = horarioService.agruparPorDia(horarios)

  return (
    <div className="container mx-auto max-w-7xl p-6 py-10">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Agenda e Consultas
          </h1>
          <p className="text-muted-foreground mt-1">
            {loading ? 'Carregando...' : `Total: ${consultas.length} consulta${consultas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleOpenHorariosDialog}
            className="gap-2"
            disabled={!medicoProfile}
          >
            <CalendarPlus className="h-4 w-4" />
            Definir Horários de Atendimento
          </Button>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Buscar por paciente..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="consultas" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 mb-6">
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="horarios">Horários de Atendimento</TabsTrigger>
          <TabsTrigger value="agenda">Agenda ({agendaSlots.filter(s => s.status === 'DISPONIVEL').length} disponíveis)</TabsTrigger>
        </TabsList>

        {/* Tab de Consultas */}
        <TabsContent value="consultas" className="space-y-8">
          {/* Calendário */}
          <Card className="mb-8">
            <CardContent className="p-4">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                className="rounded-md"
                numberOfMonths={2}
                defaultMonth={new Date()}
                locale={ptBR}
              />
            </CardContent>
          </Card>

          {/* Listas de Consultas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Próximas Consultas */}
            <Card>
              <CardHeader>
                <CardTitle>Próximas Consultas ({upcomingConsultas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : upcomingConsultas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma consulta próxima
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {upcomingConsultas.map(consulta => (
                        <TableRow key={consulta.id}>
                          <TableCell className="font-medium">
                            {consulta.paciente?.nome || 'Paciente não informado'}
                          </TableCell>
                          <TableCell>{formatDate(consulta.dataHora)}</TableCell>
                          <TableCell>{formatTime(consulta.dataHora)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(consulta.status)}>
                              {getStatusLabel(consulta.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              {consulta.status !== 'CONFIRMADA' && consulta.status !== 'CONCLUIDA' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openActionDialog(consulta, 'confirm')}
                                  title="Confirmar consulta"
                                >
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                </Button>
                              )}
                              {consulta.status === 'CONFIRMADA' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openActionDialog(consulta, 'complete')}
                                  title="Marcar como concluída"
                                >
                                  <CheckCircle className="h-4 w-4 text-blue-600" />
                                </Button>
                              )}
                              <Link
                                to="/patients/$patientId"
                                params={{ patientId: consulta.pacienteId }}
                                className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Ver
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Consultas Passadas */}
            <Card>
              <CardHeader>
                <CardTitle>Consultas Passadas ({pastConsultas.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : pastConsultas.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhuma consulta passada
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Paciente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pastConsultas.map(consulta => (
                        <TableRow key={consulta.id}>
                          <TableCell className="font-medium">
                            {consulta.paciente?.nome || 'Paciente não informado'}
                          </TableCell>
                          <TableCell>{formatDate(consulta.dataHora)}</TableCell>
                          <TableCell>{formatTime(consulta.dataHora)}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadge(consulta.status)}>
                              {getStatusLabel(consulta.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Link
                              to="/patients/$patientId"
                              params={{ patientId: consulta.pacienteId }}
                              className="inline-flex items-center text-sm font-medium text-primary hover:underline"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Ver Detalhes
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab de Horários de Atendimento */}
        <TabsContent value="horarios" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Meus Horários de Atendimento</CardTitle>
              <CardDescription>
                Configure os dias e horários em que você estará disponível para atendimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {horariosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : horarios.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Nenhum horário configurado
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Defina seus horários de atendimento para que os pacientes possam agendar consultas
                  </p>
                  <Button onClick={handleOpenHorariosDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Configurar Horários
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <Button onClick={handleOpenHorariosDialog} variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      Editar Horários
                    </Button>
                  </div>

                  {/* Exibir horários agrupados por dia */}
                  <div className="space-y-4">
                    {diasSemanaLabels.map((diaLabel, diaIndex) => {
                      const horariosDia = horariosAgrupados[diaIndex]
                      if (!horariosDia || horariosDia.length === 0) return null

                      return (
                        <Card key={diaIndex} className="border-l-4 border-l-primary">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold text-lg mb-2">{diaLabel}</h3>
                                <div className="space-y-1">
                                  {horariosDia.map((h, i) => (
                                    <div key={i} className="flex items-center gap-2 text-sm">
                                      <Clock className="h-4 w-4 text-muted-foreground" />
                                      <span>{h.hora_inicio} às {h.hora_fim}</span>
                                      {!h.ativo && (
                                        <Badge variant="destructive" className="text-xs">Inativo</Badge>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab de Agenda - Slots Disponíveis */}
        <TabsContent value="agenda" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Slots de Agenda</CardTitle>
                  <CardDescription>
                    Gere horários disponíveis para que pacientes possam agendar consultas
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleOpenGenerateSlotsDialog}
                  disabled={horarios.length === 0}
                  className="gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Gerar Horários
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {horarios.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Configure horários de atendimento primeiro
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Você precisa definir seus horários de atendimento antes de gerar slots de agenda
                  </p>
                  <Button onClick={handleOpenHorariosDialog}>
                    <CalendarPlus className="h-4 w-4 mr-2" />
                    Configurar Horários
                  </Button>
                </div>
              ) : loadingAgendaSlots ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : agendaSlots.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-lg font-medium text-foreground mb-2">
                    Nenhum horário de agenda criado
                  </p>
                  <p className="text-sm text-muted-foreground mb-6">
                    Gere horários para que os pacientes possam agendar consultas
                  </p>
                  <Button onClick={handleOpenGenerateSlotsDialog}>
                    <Plus className="h-4 w-4 mr-2" />
                    Gerar Horários
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <Card className="p-4 border-green-200 bg-green-50">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-700">
                          {agendaSlots.filter(s => s.status === 'DISPONIVEL').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Disponíveis</p>
                      </div>
                    </Card>
                    <Card className="p-4 border-blue-200 bg-blue-50">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-700">
                          {agendaSlots.filter(s => s.status === 'OCUPADO').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Ocupados</p>
                      </div>
                    </Card>
                    <Card className="p-4 border-gray-200 bg-gray-50">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-700">
                          {agendaSlots.filter(s => s.status === 'BLOQUEADO').length}
                        </p>
                        <p className="text-sm text-muted-foreground">Bloqueados</p>
                      </div>
                    </Card>
                    <Card className="p-4 border-primary-200 bg-primary-50">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary-700">
                          {agendaSlots.length}
                        </p>
                        <p className="text-sm text-muted-foreground">Total</p>
                      </div>
                    </Card>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data/Hora</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paciente</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {agendaSlots.slice(0, 50).map((slot) => (
                        <TableRow key={slot.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span>
                                {format(new Date(slot.inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={
                                slot.status === 'DISPONIVEL' ? 'default' :
                                slot.status === 'OCUPADO' ? 'secondary' : 'outline'
                              }
                            >
                              {slot.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {slot.consulta?.paciente?.usuario?.nome || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  
                  {agendaSlots.length > 50 && (
                    <p className="text-sm text-muted-foreground text-center">
                      Exibindo os primeiros 50 slots. Total: {agendaSlots.length}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de Geração de Slots */}
      <Dialog open={showGenerateSlotsDialog} onOpenChange={setShowGenerateSlotsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Gerar Horários de Agenda
            </DialogTitle>
            <DialogDescription>
              Crie slots de agenda baseados nos seus horários de atendimento configurados
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate || new Date().toISOString().split('T')[0]}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="slot-duration">Duração de Cada Consulta (minutos)</Label>
              <Input
                id="slot-duration"
                type="number"
                value={slotDuration}
                onChange={(e) => setSlotDuration(parseInt(e.target.value) || 30)}
                min={15}
                max={120}
                step={15}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Padrão: {medicoProfile?.duracao_minutos || 30} minutos
              </p>
            </div>

            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-4">
                <p className="text-sm font-medium mb-2">Resumo:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Baseado em {horarios.length} período(s) de atendimento configurado(s)</li>
                  <li>• Dias atendidos: {[...new Set(horarios.map(h => diasSemanaLabels[h.dia_semana]))].join(', ')}</li>
                  <li>• Slots de {slotDuration} minutos</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowGenerateSlotsDialog(false)}
              disabled={generatingSlots}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleGenerateSlots}
              disabled={generatingSlots || !startDate || !endDate}
            >
              {generatingSlots ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Gerar Horários
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Edição de Horários */}
      <Dialog open={showHorariosDialog} onOpenChange={setShowHorariosDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5" />
              Configurar Horários de Atendimento
            </DialogTitle>
            <DialogDescription>
              Defina os períodos em que você estará disponível para atendimento. Você pode adicionar múltiplos horários para o mesmo dia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {editingHorarios.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Nenhum horário adicionado</p>
                <p className="text-sm mt-1">Clique em "Adicionar Horário" para começar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {editingHorarios.map((horario, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-end">
                      <div className="col-span-4">
                        <Label htmlFor={`dia-${index}`}>Dia da Semana</Label>
                        <select
                          id={`dia-${index}`}
                          value={horario.dia_semana}
                          onChange={(e) => handleUpdateHorario(index, 'dia_semana', parseInt(e.target.value))}
                          className="w-full mt-1 px-3 py-2 border rounded-md"
                        >
                          {diasSemanaLabels.map((label, i) => (
                            <option key={i} value={i}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor={`inicio-${index}`}>Hora Início</Label>
                        <Input
                          id={`inicio-${index}`}
                          type="time"
                          value={horario.hora_inicio}
                          onChange={(e) => handleUpdateHorario(index, 'hora_inicio', e.target.value)}
                        />
                      </div>
                      <div className="col-span-3">
                        <Label htmlFor={`fim-${index}`}>Hora Fim</Label>
                        <Input
                          id={`fim-${index}`}
                          type="time"
                          value={horario.hora_fim}
                          onChange={(e) => handleUpdateHorario(index, 'hora_fim', e.target.value)}
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveHorario(index)}
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              onClick={handleAddHorario}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Horário
            </Button>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowHorariosDialog(false)}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSaveHorarios}
              disabled={actionLoading || editingHorarios.length === 0}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar Horários'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Ações */}
      <Dialog open={!!actionType} onOpenChange={() => { setActionType(null); setSelectedConsulta(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'confirm' && 'Confirmar Consulta'}
              {actionType === 'complete' && 'Concluir Consulta'}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'confirm' &&
                `Tem certeza que deseja confirmar a consulta com ${selectedConsulta?.paciente?.nome}?`}
              {actionType === 'complete' &&
                `Marcar a consulta com ${selectedConsulta?.paciente?.nome} como concluída?`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => { setActionType(null); setSelectedConsulta(null) }}
              disabled={actionLoading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  {actionType === 'confirm' && 'Confirmar'}
                  {actionType === 'complete' && 'Concluir'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
