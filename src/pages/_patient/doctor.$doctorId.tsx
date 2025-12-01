import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Clock, Loader2 } from 'lucide-react'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { medicoService } from '@/services/medico.service'
import { consultaService } from '@/services/consulta.service'
import { pacienteService } from '@/services/paciente.service'
import type { Medico, TimeSlot } from '@/types/medico.types'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_patient/doctor/$doctorId')({
  component: DoctorProfilePage,
})

function DoctorProfilePage() {
  const { doctorId } = Route.useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [doctor, setDoctor] = useState<Medico | null>(null)
  const [loading, setLoading] = useState(true)
  const [bookingLoading, setBookingLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [observacoes, setObservacoes] = useState('')
  const [pacienteId, setPacienteId] = useState<string | null>(null)

  useEffect(() => {
    loadDoctor()
    loadPacienteInfo()
  }, [doctorId, user?.id])

  useEffect(() => {
    if (selectedDate && doctorId) {
      loadTimeSlots()
    }
  }, [selectedDate, doctorId])

  const loadPacienteInfo = async () => {
    if (!user?.id) return

    try {
      const paciente = await pacienteService.getMe()
      if (paciente) {
        setPacienteId(paciente.id)
      } else {
        throw new Error('Paciente não encontrado');
      }
    } catch (error) {
      console.error('Erro ao carregar informações do paciente:', error)
      toast.error('Erro ao carregar suas informações de paciente.')
    }
  }

  const loadDoctor = async () => {
    try {
      setLoading(true)
      const data = await medicoService.getById(doctorId)
      setDoctor(data)
    } catch (error) {
      console.error('Erro ao carregar médico:', error)
      toast.error('Erro ao carregar informações do médico.')
    } finally {
      setLoading(false)
    }
  }

  const loadTimeSlots = async () => {
    if (!selectedDate) return

    setSlotsLoading(true)
    try {
      const dateString = selectedDate.toISOString().split('T')[0]
      const availableSlots = await medicoService.getAvailableSlots(doctorId, dateString)
      
      // Garantir que availableSlots seja sempre um array
      const slotsArray = Array.isArray(availableSlots) ? availableSlots : []
      setSlots(slotsArray)

      if (slotsArray.length === 0) {
        const dayOfWeek = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long' })
        toast.info(`Médico não atende às ${dayOfWeek}s ou não há horários disponíveis`)
      }
    } catch (error) {
      console.error('Erro ao carregar horários:', error)
      toast.error('Erro ao carregar horários disponíveis.')
      setSlots([]) // Definir array vazio em caso de erro
    } finally {
      setSlotsLoading(false)
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days: (Date | null)[] = []

    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }

    return days
  }

  const changeMonth = (offset: number) => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(newDate.getMonth() + offset)
      return newDate
    })
  }

  const handleBookAppointment = async () => {
    if (!selectedTime || !selectedDate) {
      toast.error('Por favor, selecione um horário.')
      return
    }

    if (!pacienteId) {
      toast.error('Carregando suas informações... Tente novamente em instantes.')
      return
    }

    try {
      setBookingLoading(true)


      // Monta dataHora no formato ISO 8601 completo
      const [hour, minute] = selectedTime.split(':');
      const dataHoraObj = new Date(selectedDate);
      dataHoraObj.setHours(Number(hour), Number(minute), 0, 0);
      const dataHora = dataHoraObj.toISOString();

      await consultaService.create({
        pacienteId: pacienteId.toString(),
        medicoId: doctorId,
        dataHora,
        observacoes: observacoes || undefined,
      })

      toast.success('Consulta agendada com sucesso!')
      navigate({ to: '/dashboard' })
    } catch (error: any) {
      console.error('Erro ao agendar consulta:', error)
      console.error('Erro completo:', JSON.stringify(error.response?.data, null, 2))
      console.error('Payload enviado:', { pacienteId: pacienteId?.toString(), medicoId: doctorId, dataHora })

      const errorMessage = error.response?.data?.message
        || error.response?.data?.error
        || error.response?.data?.errors?.[0]?.msg
        || 'Erro ao agendar consulta. Tente novamente.'

      toast.error(errorMessage)
    } finally {
      setBookingLoading(false)
    }
  }

  const isDateSelected = (date: Date | null) => {
    if (!date || !selectedDate) return false
    return date.toDateString() === selectedDate.toDateString()
  }

  const isPastDate = (date: Date | null) => {
    if (!date) return false
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date < today
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      </main>
    )
  }

  if (!doctor) {
    return (
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Médico não encontrado.</p>
          <Button onClick={() => navigate({ to: '/find-doctor' })} className="mt-4">
            Voltar para busca
          </Button>
        </div>
      </main>
    )
  }

  const monthName = currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })
  const daysInMonth = getDaysInMonth(currentMonth)
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate({ to: '/find-doctor' })}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Perfil do Médico
            </h1>
            <p className="text-muted-foreground mt-1">
              Veja os detalhes e agende uma consulta
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Doctor Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Doctor Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-24 w-24 mb-4">
                    <AvatarFallback className="text-2xl">
                      {doctor.nome
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-2xl">Dr. {doctor.nome}</CardTitle>
                  <CardDescription className="mt-2">
                    <div className="flex flex-wrap gap-1 justify-center">
                      {doctor.especialidades && doctor.especialidades.length > 0 ? (
                        doctor.especialidades.map((esp) => (
                          <span
                            key={esp.id}
                            className="text-sm text-gray-600 bg-gray-100 px-2 py-0.5 rounded"
                          >
                            {esp.nome}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">Sem especialidade</span>
                      )}
                    </div>
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone</p>
                    <p className="font-medium">{doctor.telefone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{doctor.usuario.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">CRM</p>
                    <p className="font-medium">{doctor.crm}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm text-muted-foreground">Duração da Consulta</p>
                    <p className="font-medium">{doctor.duracao_minutos} minutos</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle>Sobre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Dr. {doctor.nome} é um profissional qualificado com experiência em{' '}
                  {doctor.especialidades && doctor.especialidades.length > 0
                    ? doctor.especialidades.map((e) => e.nome).join(', ')
                    : 'diversas áreas'}.
                  Está comprometido em fornecer atendimento personalizado e de qualidade aos pacientes.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Scheduling */}
          <div className="lg:col-span-2 space-y-6">
            {/* Calendar Card */}
            <Card>
              <CardHeader>
                <CardTitle>Agendar Consulta</CardTitle>
                <CardDescription>Selecione uma data e horário disponível</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Calendar */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeMonth(-1)}
                    >
                      ←
                    </Button>
                    <h3 className="text-lg font-semibold capitalize">{monthName}</h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => changeMonth(1)}
                    >
                      →
                    </Button>
                  </div>

                  <div className="grid grid-cols-7 gap-2">
                    {weekDays.map((day) => (
                      <div
                        key={day}
                        className="text-center text-sm font-medium text-muted-foreground py-2"
                      >
                        {day}
                      </div>
                    ))}
                    {daysInMonth.map((date, index) => (
                      <button
                        key={index}
                        disabled={!date || isPastDate(date)}
                        onClick={() => {
                          if (date) {
                            setSelectedDate(date)
                            setSelectedTime(null)
                          }
                        }}
                        className={`
                          aspect-square p-2 text-sm rounded-lg transition-colors
                          ${!date ? 'invisible' : ''}
                          ${isPastDate(date) ? 'text-gray-300 cursor-not-allowed' : 'hover:bg-gray-100'}
                          ${isDateSelected(date) ? 'bg-blue-500 text-white hover:bg-blue-600' : ''}
                          ${date && !isPastDate(date) && !isDateSelected(date) ? 'bg-white border' : ''}
                        `}
                      >
                        {date?.getDate()}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Slots */}
                {selectedDate && (
                  <div>
                    <h3 className="text-lg font-semibold mb-3">Horários Disponíveis</h3>
                    {slotsLoading ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                      </div>
                    ) : !slots || slots.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <p>Nenhum horário disponível para esta data</p>
                        <p className="text-sm mt-1">Tente selecionar outra data</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                        {slots.filter(slot => slot.available).map((slot) => (
                          <Button
                            key={slot.time}
                            variant={selectedTime === slot.time ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedTime(slot.time)}
                            className="w-full"
                          >
                            {slot.time}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Observações */}
                {selectedTime && (
                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Observações (Opcional)
                    </label>
                    <textarea
                      value={observacoes}
                      onChange={(e) => setObservacoes(e.target.value)}
                      placeholder="Descreva brevemente o motivo da consulta..."
                      className="w-full min-h-[100px] p-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Book Button */}
                {selectedTime && (
                  <Button
                    onClick={handleBookAppointment}
                    disabled={bookingLoading || !pacienteId}
                    className="w-full gap-2"
                    size="lg"
                  >
                    {bookingLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Agendando...
                      </>
                    ) : !pacienteId ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando...
                      </>
                    ) : (
                      <>
                        <Calendar className="h-4 w-4" />
                        Confirmar Agendamento
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
