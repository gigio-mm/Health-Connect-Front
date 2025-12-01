import { useState } from 'react'
import { ArrowLeft, UserPlus, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { authService } from '@/services/auth.service'
import { toast } from 'sonner'

export const Route = createFileRoute('/_admin/add-doctor')({
  component: AddDoctorPage,
})

type TimeSlot = {
  dia_semana: number // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado
  hora_inicio: string // HH:mm formato
  hora_fim: string
}

type DoctorFormData = {
  fullName: string
  crm: string
  specialty: string
  email: string
  phone: string
  cpf: string
  password: string
  confirmPassword: string
  duracao_minutos: number
  schedule: string
  workDays: number[] // Dias da semana selecionados
  customStartTime: string
  customEndTime: string
}

type SchedulePreset = {
  label: string
  value: string
  startTime: string
  endTime: string
}

const scheduleOptions: SchedulePreset[] = [
  { label: 'Manhã (08:00 - 12:00)', value: 'manha', startTime: '08:00', endTime: '12:00' },
  { label: 'Tarde (13:00 - 17:00)', value: 'tarde', startTime: '13:00', endTime: '17:00' },
  { label: 'Noite (18:00 - 22:00)', value: 'noite', startTime: '18:00', endTime: '22:00' },
  { label: 'Integral (08:00 - 17:00)', value: 'integral', startTime: '08:00', endTime: '17:00' },
  { label: 'Plantão 24h', value: 'plantao', startTime: '00:00', endTime: '23:59' },
  { label: 'Personalizado', value: 'custom', startTime: '', endTime: '' },
]

const weekDays = [
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
]

function AddDoctorPage() {
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<DoctorFormData>({
    fullName: '',
    crm: '',
    specialty: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
    confirmPassword: '',
    duracao_minutos: 30,
    schedule: '',
    workDays: [1, 2, 3, 4, 5], // Segunda a Sexta por padrão
    customStartTime: '',
    customEndTime: '',
  })

  const getSelectedSchedule = (): SchedulePreset | undefined => {
    return scheduleOptions.find(opt => opt.value === formData.schedule)
  }

  const getTimeSlots = (): TimeSlot[] => {
    const selectedSchedule = getSelectedSchedule()
    if (!selectedSchedule) return []

    let startTime = selectedSchedule.startTime
    let endTime = selectedSchedule.endTime

    // Se for personalizado, usar horários customizados
    if (selectedSchedule.value === 'custom') {
      if (!formData.customStartTime || !formData.customEndTime) return []
      startTime = formData.customStartTime
      endTime = formData.customEndTime
    }

    // Criar slots para cada dia da semana selecionado
    return formData.workDays.map(dia => ({
      dia_semana: dia,
      hora_inicio: startTime,
      hora_fim: endTime
    }))
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'duracao_minutos' ? parseInt(value) || 30 : value,
    }))
  }

  const handleWorkDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      workDays: prev.workDays.includes(day)
        ? prev.workDays.filter(d => d !== day)
        : [...prev.workDays, day].sort()
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validações
    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres')
      return
    }

    if (!formData.schedule) {
      toast.error('Selecione um horário de atendimento')
      return
    }

    if (formData.workDays.length === 0) {
      toast.error('Selecione pelo menos um dia da semana')
      return
    }

    // Validar horários personalizados
    if (formData.schedule === 'custom') {
      if (!formData.customStartTime || !formData.customEndTime) {
        toast.error('Preencha os horários de início e fim')
        return
      }
      if (formData.customStartTime >= formData.customEndTime) {
        toast.error('O horário de início deve ser anterior ao horário de fim')
        return
      }
    }

    setIsLoading(true)

    try {
      const timeSlots = getTimeSlots()

      // Registra o médico com os horários
      await authService.registerMedico({
        email: formData.email,
        senha: formData.password,
        nome: formData.fullName,
        cpf: formData.cpf,
        telefone: formData.phone,
        crm: formData.crm,
        duracao_minutos: formData.duracao_minutos,
        horarios_atendimento: timeSlots,
      })

      toast.success('Médico cadastrado com sucesso! Você já pode fazer login.')

      // Redireciona para a página de login
      navigate({ to: '/sign-in' })
    } catch (error: any) {
      console.error('Erro ao criar médico:', error)
      toast.error(error?.response?.data?.message || 'Erro ao cadastrar médico. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    navigate({ to: '/sign-in' })
  }

  return (
    <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header Section */}
      <div className="mb-8 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>

        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Registro de Médico
          </h1>
          <p className="text-muted-foreground">
            Preencha os dados para criar sua conta como médico
          </p>
        </div>
      </div>

      {/* Form Section */}
      <div className="flex justify-center w-full">
        <Card className="max-w-full w-full md:w-3/4 lg:w-1/2">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Informações Profissionais</CardTitle>
              <CardDescription>
                Todos os campos são obrigatórios para completar o registro
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Full Name Field */}
              <div className="space-y-2">
                <label
                  htmlFor="fullName"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Nome Completo
                </label>
                <Input
                  id="fullName"
                  name="fullName"
                  type="text"
                  placeholder="Dr. João Silva"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              {/* CRM Field */}
              <div className="space-y-2">
                <label
                  htmlFor="crm"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  CRM
                </label>
                <Input
                  id="crm"
                  name="crm"
                  type="text"
                  placeholder="12345-SP"
                  value={formData.crm}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: 12345-UF (número seguido de hífen e estado)
                </p>
              </div>

              {/* Specialty Field */}
              <div className="space-y-2">
                <label
                  htmlFor="specialty"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Especialidade
                </label>
                <Input
                  id="specialty"
                  name="specialty"
                  type="text"
                  placeholder="Cardiologia"
                  value={formData.specialty}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              {/* Email Field */}
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="joao.silva@exemplo.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              {/* CPF Field */}
              <div className="space-y-2">
                <label
                  htmlFor="cpf"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  CPF
                </label>
                <Input
                  id="cpf"
                  name="cpf"
                  type="text"
                  placeholder="000.000.000-00"
                  value={formData.cpf}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Formato: 000.000.000-00
                </p>
              </div>

              {/* Phone Field */}
              <div className="space-y-2">
                <label
                  htmlFor="phone"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Telefone
                </label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="(11) 98765-4321"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Senha
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="********"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo de 6 caracteres
                </p>
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-2">
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Confirmar Senha
                </label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="********"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  required
                  minLength={6}
                  className="w-full"
                />
              </div>

              {/* Duration Field */}
              <div className="space-y-2">
                <label
                  htmlFor="duracao_minutos"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Duração das Consultas (minutos)
                </label>
                <Input
                  id="duracao_minutos"
                  name="duracao_minutos"
                  type="number"
                  min="15"
                  step="15"
                  placeholder="30"
                  value={formData.duracao_minutos}
                  onChange={handleInputChange}
                  required
                  className="w-full"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo padrão de cada consulta (15, 30, 45, 60 minutos)
                </p>
              </div>

              {/* Availability Section */}
              <div className="pt-4 border-t">
                <h3 className="text-lg font-semibold mb-4">Disponibilidade</h3>

                {/* Schedule Field */}
                <div className="space-y-2 mb-4">
                  <label
                    htmlFor="schedule"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Horário de Atendimento
                  </label>
                  <select
                    id="schedule"
                    name="schedule"
                    value={formData.schedule}
                    onChange={handleInputChange}
                    required
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Selecione um horário</option>
                    {scheduleOptions.map(schedule => (
                      <option key={schedule.value} value={schedule.value}>
                        {schedule.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Time Fields */}
                {formData.schedule === 'custom' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div className="space-y-2">
                      <label
                        htmlFor="customStartTime"
                        className="text-sm font-medium leading-none"
                      >
                        Horário de Início
                      </label>
                      <Input
                        id="customStartTime"
                        name="customStartTime"
                        type="time"
                        value={formData.customStartTime}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <label
                        htmlFor="customEndTime"
                        className="text-sm font-medium leading-none"
                      >
                        Horário de Término
                      </label>
                      <Input
                        id="customEndTime"
                        name="customEndTime"
                        type="time"
                        value={formData.customEndTime}
                        onChange={handleInputChange}
                        required
                        className="w-full"
                      />
                    </div>
                  </div>
                )}

                {/* Work Days Selection */}
                {formData.schedule && (
                  <div className="space-y-3">
                    <label className="text-sm font-medium leading-none">
                      Dias de Atendimento
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                      {weekDays.map(day => (
                        <div
                          key={day.value}
                          onClick={() => handleWorkDayToggle(day.value)}
                          className={`
                            flex items-center justify-center p-3 rounded-md border cursor-pointer transition-all
                            ${formData.workDays.includes(day.value)
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'bg-background hover:bg-accent hover:text-accent-foreground border-input'
                            }
                          `}
                        >
                          <span className="text-sm font-medium">{day.label}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Clique nos dias em que você atende
                    </p>
                  </div>
                )}

                {/* Schedule Summary */}
                {formData.schedule && formData.workDays.length > 0 && (
                  <div className="mt-4 p-4 bg-muted rounded-md">
                    <h4 className="text-sm font-semibold mb-2">Resumo do Horário:</h4>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>
                        <strong>Período:</strong>{' '}
                        {formData.schedule === 'custom'
                          ? `${formData.customStartTime} - ${formData.customEndTime}`
                          : scheduleOptions.find(s => s.value === formData.schedule)?.label
                        }
                      </p>
                      <p>
                        <strong>Dias:</strong>{' '}
                        {formData.workDays
                          .sort()
                          .map(d => weekDays.find(wd => wd.value === d)?.label)
                          .join(', ')}
                      </p>
                      <p>
                        <strong>Duração das consultas:</strong> {formData.duracao_minutos} minutos
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cadastrando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Conta
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </main>
  )
}
