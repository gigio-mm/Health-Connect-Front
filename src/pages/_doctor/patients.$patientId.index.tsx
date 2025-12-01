import React, { useState, useEffect } from 'react'
import { createFileRoute, useParams } from '@tanstack/react-router'
import { pacienteService } from '../../services/paciente.service'
import type { Paciente } from '../../types/paciente.types'

// Importa os componentes
import { Separator } from "@/components/ui/separator"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"

// 1. Cria a rota "index" (Visão Geral)
export const Route = createFileRoute('/_doctor/patients/$patientId/')({
  component: PatientOverviewPage,
})

// ---------------------------------------------
// HELPER COMPONENT (Para os campos de dados)
// ---------------------------------------------
interface InfoItemProps {
  label: string;
  value?: string | number;
}
function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex flex-col">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-base font-medium text-foreground">{value || 'N/A'}</span>
    </div>
  )
}

// ---------------------------------------------
// O COMPONENTE DA PÁGINA ("Visão Geral")
// ---------------------------------------------
function PatientOverviewPage() {
  const { patientId } = useParams({ from: '/_doctor/patients/$patientId/' })
  const [record, setRecord] = useState<Paciente | null>(null);

  // Busca os dados da API
  useEffect(() => {
    const loadRecord = async () => {
      try {
        // O `patientId` vem do URL como string, convertemos para número
        const id = parseInt(patientId, 10);
        const data = await pacienteService.getById(id);
        setRecord(data);
      } catch (error) {
        console.error("Erro ao carregar prontuário:", error);
        // Opcional: Adicionar um estado de erro para mostrar na UI
      }
    };

    loadRecord();
  }, [patientId])

  if (!record) {
    return <div className="p-6">Carregando prontuário...</div>
  }

  // Renderiza o conteúdo da página
  return (
    <div className="container mx-auto max-w-5xl">
      
      {/* Cabeçalho */}
      <h1 className="text-3xl font-bold text-foreground">
        Prontuário de Paciente
      </h1>
      <p className="text-muted-foreground mt-1">
        Histórico médico completo de {record.nome}
      </p>

      {/* Sistema de Abas (Tabs) do shadcn */}
      <Tabs defaultValue="geral" className="w-full mt-6">
        
        <TabsList className="mb-6">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="diagnosticos" disabled>Diagnósticos</TabsTrigger>
          <TabsTrigger value="medicacoes" disabled>Medicações</TabsTrigger>
          <TabsTrigger value="exames" disabled>Exames</TabsTrigger>
          <TabsTrigger value="alergias" disabled>Alergias</TabsTrigger>
          <TabsTrigger value="historico" disabled>Histórico</TabsTrigger>
        </TabsList>

        {/* Conteúdo da Aba "Geral" */}
        <TabsContent value="geral" className="space-y-8">
          
          {/* Secção 1: Informações Pessoais */}
          <section>
            <h2 className="text-xl font-semibold text-foreground mb-4">Informações Pessoais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <InfoItem label="Nome" value={record.nome} />
              <InfoItem label="Data de Nascimento" value={record.dataNascimento} />
              <InfoItem label="CPF" value={record.cpf} />
              <InfoItem label="Telefone" value={record.telefone} />
              <InfoItem label="Email" value={record.usuario.email} />
              <InfoItem label="Endereço" value={record.endereco} />
            </div>
          </section>

        </TabsContent>
        
      </Tabs>
    </div>
  )
}

