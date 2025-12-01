import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Calendar, Clock, ArrowLeft, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useAuth } from '@/hooks/useAuth'
import { medicoService } from '@/services/medico.service'
import { consultaService } from '@/services/consulta.service'
import { pacienteService } from '@/services/paciente.service'
import type { Medico, TimeSlot } from '@/types/medico.types'
import { toast } from 'sonner'

export const Route = createFileRoute('/_patient/schedule-appointment')({
  component: ScheduleAppointmentPage,
})

function ScheduleAppointmentPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [doctors, setDoctors] = useState<Medico[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [pacienteId, setPacienteId] = useState<number | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])

  // Dados do agendamento
  const [appointmentDate, setAppointmentDate] = useState('')
  const [appointmentTime, setAppointmentTime] = useState('')
  const [observations, setObservations] = useState('')

  useEffect(() => {
    loadDoctors()
    loadPacienteInfo()
  }, [])

  const loadDoctors = async () => {
    try {
      setLoading(true)
      const response = await medicoService.list(1, 100)
      setDoctors(response.data.filter(d => d.usuario.ativo))
    } catch (error) {
      console.error('Erro ao carregar médicos:', error)
      toast.error('Erro ao carregar médicos')
    } finally {
      setLoading(false)
    }
  }

  const loadPacienteInfo = async () => {
    if (!user?.id) return

    try {
      const paciente = await pacienteService.getMe()
      setPacienteId(paciente.id)
    } catch (error) {
      console.error('Erro ao carregar informações do paciente:', error)
      toast.error('Erro ao carregar suas informações. Tente novamente.')
    }
  }

  const filteredDoctors = doctors.filter((doctor) => {
    const searchLower = searchTerm.toLowerCase()
    const matchName = doctor.nome.toLowerCase().includes(searchLower)
    const matchSpecialty = doctor.especialidades?.some((esp) =>
      esp.nome.toLowerCase().includes(searchLower)
    )
    return matchName || matchSpecialty
  })

  const handleDoctorSelect = (doctor: Medico) => {
    setSelectedDoctor(doctor)
    setAppointmentDate('')
    setAppointmentTime('')
    setAvailableSlots([])
    setStep(2)
  }

  const handleDateChange = async (date: string) => {
    setAppointmentDate(date)
    setAppointmentTime('')
    setAvailableSlots([])
    
    if (!selectedDoctor || !date) return

    setLoadingSlots(true)
    try {
      const slots = await medicoService.getAvailableSlots(selectedDoctor.id, date)
      setAvailableSlots(slots)
      
      if (slots.length === 0) {
        const dayOfWeek = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long' })
        toast.info(`Médico não atende às ${dayOfWeek}s ou não há horários disponíveis`)
      }
    } catch (error) {
      console.error('Erro ao buscar slots:', error)
      toast.error('Erro ao buscar horários disponíveis')
    } finally {
      setLoadingSlots(false)
    }
  }

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.available) {
      setAppointmentTime(slot.time)
    }
  }

  const handleDateTimeNext = () => {
    if (!appointmentDate || !appointmentTime) {
      toast.error('Por favor, selecione data e horário')
      return
    }
    setStep(3)
  }

  const handleSubmit = async () => {
    if (!pacienteId || !selectedDoctor) {
      toast.error('Dados incompletos')
      return
    }

    try {
      setSubmitting(true)
      const dataHora = `${appointmentDate}T${appointmentTime}:00`

      await consultaService.create({
        pacienteId: pacienteId.toString(),
        medicoId: selectedDoctor.id.toString(),
        dataHora,
        observacoes: observations || undefined,
      })

      toast.success('Consulta agendada com sucesso!')
      navigate({ to: '/appointments' })
    } catch (error: any) {
      console.error('Erro ao agendar consulta:', error)
      toast.error(error.response?.data?.message || 'Erro ao agendar consulta')
    } finally {
      setSubmitting(false)
    }
  }

  const getTodayDate = () => {
    const today = new Date()
    return today.toISOString().split('T')[0]
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (step > 1) {
                setStep((step - 1) as 1 | 2 | 3)
              } else {
                navigate({ to: '/appointments' })
              }
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Agendar Consulta</h1>
            <p className="text-muted-foreground">
              {step === 1 && 'Selecione um médico'}
              {step === 2 && 'Escolha data e horário'}
              {step === 3 && 'Confirme os dados'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 h-2 rounded-full ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
          <div className={`flex-1 h-2 rounded-full ${step >= 3 ? 'bg-primary' : 'bg-muted'}`} />
        </div>

        {/* Step 1: Selecionar Médico */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Selecione um Médico</CardTitle>
              <CardDescription>Escolha o profissional que deseja consultar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Buscar por nome ou especialidade</Label>
                <Input
                  id="search"
                  placeholder="Digite para buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mt-2"
                />
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredDoctors.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum médico encontrado
                  </div>
                ) : (
                  filteredDoctors.map((doctor) => (
                    <Card
                      key={doctor.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => handleDoctorSelect(doctor)}
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback>
                              {doctor.nome
                                .split(' ')
                                .map((n) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <h3 className="font-semibold">{doctor.nome}</h3>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {doctor.especialidades && doctor.especialidades.length > 0 ? (
                                doctor.especialidades.map((esp) => (
                                  <span
                                    key={esp.id}
                                    className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded"
                                  >
                                    {esp.nome}
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  Sem especialidade
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              CRM: {doctor.crm} | Tel: {doctor.telefone}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Selecionar Data e Hora */}
        {step === 2 && selectedDoctor && (
          <Card>
            <CardHeader>
              <CardTitle>Data e Horário</CardTitle>
              <CardDescription>
                Escolha a data e horário para consulta com {selectedDoctor.nome}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {selectedDoctor.nome
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="font-semibold">{selectedDoctor.nome}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedDoctor.especialidades?.[0]?.nome || 'Médico(a)'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Duração da consulta: {selectedDoctor.duracao_minutos || 30} minutos
                  </p>
                </div>
              </div>

              <div>
                <Label htmlFor="date">
                  <Calendar className="h-4 w-4 inline mr-2" />
                  Data da Consulta
                </Label>
                <Input
                  id="date"
                  type="date"
                  min={getTodayDate()}
                  value={appointmentDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="mt-2"
                />
              </div>

              {/* Slots de Horário */}
              {appointmentDate && (
                <div>
                  <Label>
                    <Clock className="h-4 w-4 inline mr-2" />
                    Horários Disponíveis
                  </Label>
                  
                  {loadingSlots ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Carregando horários...
                      </span>
                    </div>
                  ) : availableSlots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhum horário disponível para esta data
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tente selecionar outra data
                      </p>
                    </div>
                  ) : (
                    <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-[300px] overflow-y-auto p-2 border rounded-md">
                      {availableSlots.map((slot) => (
                        <Button
                          key={slot.time}
                          variant={appointmentTime === slot.time ? 'default' : 'outline'}
                          className={`h-12 ${
                            !slot.available 
                              ? 'opacity-50 cursor-not-allowed' 
                              : appointmentTime === slot.time
                              ? ''
                              : 'hover:border-primary'
                          }`}
                          disabled={!slot.available}
                          onClick={() => handleTimeSlotSelect(slot)}
                        >
                          {slot.time}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div>
                <Label htmlFor="observations">Observações (opcional)</Label>
                <Textarea
                  id="observations"
                  placeholder="Descreva o motivo da consulta ou observações relevantes..."
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="mt-2"
                  rows={4}
                />
              </div>

              <Button
                onClick={handleDateTimeNext}
                className="w-full"
                disabled={!appointmentDate || !appointmentTime}
              >
                Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Confirmação */}
        {step === 3 && selectedDoctor && (
          <Card>
            <CardHeader>
              <CardTitle>Confirmação</CardTitle>
              <CardDescription>Revise os dados antes de confirmar o agendamento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Médico</h3>
                  <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback>
                        {selectedDoctor.nome
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{selectedDoctor.nome}</h4>
                      <p className="text-sm text-muted-foreground">
                        {selectedDoctor.especialidades?.[0]?.nome || 'Médico(a)'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        CRM: {selectedDoctor.crm}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Data e Horário</h3>
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        {new Date(appointmentDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span>{appointmentTime}</span>
                    </div>
                  </div>
                </div>

                {observations && (
                  <div>
                    <h3 className="font-semibold mb-2">Observações</h3>
                    <div className="p-4 bg-muted rounded-lg">
                      <p className="text-sm">{observations}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1"
                  disabled={submitting}
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Agendando...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
