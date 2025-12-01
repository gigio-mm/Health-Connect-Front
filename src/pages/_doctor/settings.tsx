import React, { useState, useEffect, FormEvent } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Separator } from '../../components/ui/separator'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../components/ui/card"
import { Checkbox } from "../../components/ui/checkbox"
import { useAuth } from '../../hooks/useAuth'
import { authService } from '../../services/auth.service'
import { agendaService } from '../../services/agenda.service'
import { handleApiError } from '../../services/api'
import { CalendarDays, Clock, Trash2, Lock, Unlock, LogOut } from 'lucide-react'
import type { AgendaSlot } from '../../types/agenda.types'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/_doctor/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Dados do perfil
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [endereco, setEndereco] = useState('');

  // Estados para disponibilidade
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState('');
  const [availabilitySuccess, setAvailabilitySuccess] = useState('');
  const [slots, setSlots] = useState<AgendaSlot[]>([]);

  // Formulário de criação de horários
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFim, setHoraFim] = useState('17:00');
  const [duracaoMinutos, setDuracaoMinutos] = useState(30);
  const [diasSemana, setDiasSemana] = useState<number[]>([1, 2, 3, 4, 5]); // Segunda a Sexta por padrão

  const diasDaSemana = [
    { value: 0, label: 'Domingo' },
    { value: 1, label: 'Segunda' },
    { value: 2, label: 'Terça' },
    { value: 3, label: 'Quarta' },
    { value: 4, label: 'Quinta' },
    { value: 5, label: 'Sexta' },
    { value: 6, label: 'Sábado' },
  ];

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      setNome(user.nome || '');
      setEmail(user.email || '');
      setTelefone(user.telefone || '');
      setEndereco(user.endereco || '');
    }
  }, [user]);

  // Carregar slots de agenda quando a aba de disponibilidade for acessada
  const loadSlots = async () => {
    if (!user?.medico?.id) return;

    setAvailabilityLoading(true);
    setAvailabilityError('');

    try {
      const today = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(today.getDate() + 7);

      const response = await agendaService.list(
        parseInt(user.medico.id, 10),
        today.toISOString().split('T')[0],
        nextWeek.toISOString().split('T')[0]
      );

      setSlots(response.data);
    } catch (err) {
      const errorMsg = handleApiError(err);
      setAvailabilityError(errorMsg);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const updatedUser = await authService.updatePerfil({
        nome,
        telefone,
        endereco,
      });

      setUser(updatedUser);
      setSuccess('Perfil atualizado com sucesso!');
    } catch (err) {
      const errorMsg = handleApiError(err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Função para criar horários em massa
  const handleCreateSlots = async (e: FormEvent) => {
    e.preventDefault();

    if (!user?.medico?.id) {
      setAvailabilityError('Médico não identificado');
      return;
    }

    if (!dataInicio || !dataFim) {
      setAvailabilityError('Por favor, selecione as datas de início e fim');
      return;
    }

    if (diasSemana.length === 0) {
      setAvailabilityError('Selecione pelo menos um dia da semana');
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError('');
    setAvailabilitySuccess('');

    try {
      const result = await agendaService.createMultipleSlots({
        medico_id: parseInt(user.medico.id, 10),
        data_inicio: dataInicio,
        data_fim: dataFim,
        dias_semana: diasSemana,
        hora_inicio: horaInicio,
        hora_fim: horaFim,
        duracao_minutos: duracaoMinutos,
      });

      setAvailabilitySuccess(`${result.created} horários criados com sucesso!`);
      await loadSlots(); // Recarregar a lista
    } catch (err) {
      const errorMsg = handleApiError(err);
      setAvailabilityError(errorMsg);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Função para bloquear/desbloquear um horário
  const handleToggleSlotStatus = async (slot: AgendaSlot) => {
    if (slot.status === 'OCUPADO') {
      setAvailabilityError('Não é possível bloquear um horário já agendado');
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError('');

    try {
      const newStatus = slot.status === 'BLOQUEADO' ? 'DISPONIVEL' : 'BLOQUEADO';
      await agendaService.updateSlotStatus(slot.id, newStatus);
      await loadSlots();
      setAvailabilitySuccess(`Horário ${newStatus === 'BLOQUEADO' ? 'bloqueado' : 'desbloqueado'} com sucesso!`);
    } catch (err) {
      const errorMsg = handleApiError(err);
      setAvailabilityError(errorMsg);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Função para deletar um horário
  const handleDeleteSlot = async (slotId: number) => {
    if (!confirm('Tem certeza que deseja remover este horário?')) {
      return;
    }

    setAvailabilityLoading(true);
    setAvailabilityError('');

    try {
      await agendaService.deleteSlot(slotId);
      await loadSlots();
      setAvailabilitySuccess('Horário removido com sucesso!');
    } catch (err) {
      const errorMsg = handleApiError(err);
      setAvailabilityError(errorMsg);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  // Toggle dia da semana
  const toggleDiaSemana = (dia: number) => {
    setDiasSemana(prev =>
      prev.includes(dia)
        ? prev.filter(d => d !== dia)
        : [...prev, dia].sort()
    );
  };

  // Formatar data e hora para exibição
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  // Função de logout
  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logout();
      navigate({ to: '/login' });
    }
  };
  return (
    // Container principal da página (igual à imagem nova)
    <div className="container mx-auto max-w-5xl p-6 py-10">
      
      {/* Título Principal */}
      <h1 className="text-3xl font-bold text-foreground mb-4">
        Configurações
      </h1>

      {/* 3. Sistema de Abas (Tabs) do shadcn (ADICIONADO DE VOLTA) */}
      <Tabs defaultValue="perfil" className="w-full">
        
        {/* Lista de Abas (Navegação Secundária) */}
        <TabsList className="mb-6">
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="disponibilidade">Disponibilidade</TabsTrigger>
        </TabsList>

        {/* Conteúdo da Aba "Perfil" (ADICIONADO DE VOLTA) */}
        <TabsContent value="perfil">
          {/* O Card (cartão branco) ADICIONADO DE VOLTA */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize os seus dados pessoais e de contacto.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
                  {success}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome</Label>
                    <Input
                      id="nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      placeholder="Dr. Ricardo Almeida"
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      placeholder="email@exemplo.com"
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      type="tel"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      placeholder="(11) 99999-9999"
                      disabled={loading}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Endereço</h3>
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço Completo</Label>
                    <Input
                      id="endereco"
                      value={endereco}
                      onChange={(e) => setEndereco(e.target.value)}
                      placeholder="Rua, número, complemento, bairro, cidade - UF"
                      disabled={loading}
                    />
                  </div>
                </div>
              </form>
            </CardContent>
            <CardFooter className="border-t pt-6">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Conteúdo da Aba Disponibilidade */}
        <TabsContent value="disponibilidade">
          <div className="space-y-6">
            {/* Card de criação de horários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Criar Horários de Atendimento
                </CardTitle>
                <CardDescription>
                  Defina seus horários disponíveis para consultas. Você pode criar horários recorrentes para múltiplos dias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {availabilityError && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
                    {availabilityError}
                  </div>
                )}
                {availabilitySuccess && (
                  <div className="bg-green-50 text-green-600 p-3 rounded-md mb-4">
                    {availabilitySuccess}
                  </div>
                )}

                <form onSubmit={handleCreateSlots} className="space-y-6">
                  {/* Período */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dataInicio">Data de Início</Label>
                      <Input
                        id="dataInicio"
                        type="date"
                        value={dataInicio}
                        onChange={(e) => setDataInicio(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        required
                        disabled={availabilityLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataFim">Data de Fim</Label>
                      <Input
                        id="dataFim"
                        type="date"
                        value={dataFim}
                        onChange={(e) => setDataFim(e.target.value)}
                        min={dataInicio || new Date().toISOString().split('T')[0]}
                        required
                        disabled={availabilityLoading}
                      />
                    </div>
                  </div>

                  {/* Horários */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="horaInicio">Hora de Início</Label>
                      <Input
                        id="horaInicio"
                        type="time"
                        value={horaInicio}
                        onChange={(e) => setHoraInicio(e.target.value)}
                        required
                        disabled={availabilityLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="horaFim">Hora de Fim</Label>
                      <Input
                        id="horaFim"
                        type="time"
                        value={horaFim}
                        onChange={(e) => setHoraFim(e.target.value)}
                        required
                        disabled={availabilityLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="duracao">Duração da Consulta (min)</Label>
                      <Input
                        id="duracao"
                        type="number"
                        min="15"
                        step="15"
                        value={duracaoMinutos}
                        onChange={(e) => setDuracaoMinutos(parseInt(e.target.value))}
                        required
                        disabled={availabilityLoading}
                      />
                    </div>
                  </div>

                  {/* Dias da semana */}
                  <div className="space-y-3">
                    <Label>Dias da Semana</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {diasDaSemana.map((dia) => (
                        <div key={dia.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`dia-${dia.value}`}
                            checked={diasSemana.includes(dia.value)}
                            onCheckedChange={() => toggleDiaSemana(dia.value)}
                            disabled={availabilityLoading}
                          />
                          <Label
                            htmlFor={`dia-${dia.value}`}
                            className="text-sm font-normal cursor-pointer"
                          >
                            {dia.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="border-t pt-6">
                <Button
                  onClick={handleCreateSlots}
                  disabled={availabilityLoading}
                  className="w-full md:w-auto"
                >
                  {availabilityLoading ? 'Criando...' : 'Criar Horários'}
                </Button>
              </CardFooter>
            </Card>

            {/* Card de visualização dos horários */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Seus Horários
                </CardTitle>
                <CardDescription>
                  Visualize e gerencie seus horários disponíveis para os próximos 7 dias.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={loadSlots}
                  variant="outline"
                  disabled={availabilityLoading}
                  className="mb-4"
                >
                  {availabilityLoading ? 'Carregando...' : 'Atualizar Lista'}
                </Button>

                {slots.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum horário cadastrado para os próximos 7 dias.</p>
                    <p className="text-sm mt-1">Crie horários usando o formulário acima.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {slots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          slot.status === 'OCUPADO'
                            ? 'bg-blue-50 border-blue-200'
                            : slot.status === 'BLOQUEADO'
                            ? 'bg-gray-50 border-gray-300'
                            : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span className="font-medium">
                              {formatDateTime(slot.inicio)} - {new Date(slot.fim).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {slot.status === 'OCUPADO' && slot.consulta && (
                              <span>Agendado: {slot.consulta.paciente.usuario.nome}</span>
                            )}
                            {slot.status === 'DISPONIVEL' && <span>Disponível</span>}
                            {slot.status === 'BLOQUEADO' && <span>Bloqueado</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {slot.status !== 'OCUPADO' && (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleToggleSlotStatus(slot)}
                                disabled={availabilityLoading}
                                title={slot.status === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
                              >
                                {slot.status === 'BLOQUEADO' ? (
                                  <Unlock className="h-4 w-4" />
                                ) : (
                                  <Lock className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteSlot(slot.id)}
                                disabled={availabilityLoading}
                                className="text-red-600 hover:text-red-700"
                                title="Remover horário"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      {/* Seção de Logout */}
      <div className="mt-8 pt-6 border-t">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-700">Zona de Perigo</CardTitle>
            <CardDescription>
              Ações irreversíveis relacionadas à sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Ao sair, você precisará fazer login novamente para acessar sua conta.
            </p>
            <Button
              variant="destructive"
              onClick={handleLogout}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair da Conta
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

