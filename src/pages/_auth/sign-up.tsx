import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { authService } from '@/services/auth.service'
import { Perfil } from '@/types/auth.types'

export const Route = createFileRoute('/_auth/sign-up')({
  component: SignUp,
})

function SignUp() {
  const navigate = useNavigate()

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [telefone, setTelefone] = useState('')
  const [perfil, setPerfil] = useState<Perfil>('PACIENTE')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
    }
    return value
  }

  const formatTelefone = (value: string) => {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d)/, '$1-$2')
    }
    return value
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validações
    if (senha !== confirmarSenha) {
      setError('As senhas não coincidem')
      setLoading(false)
      return
    }

    if (senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      setLoading(false)
      return
    }

    const cpfNumeros = cpf.replace(/\D/g, '')
    if (cpfNumeros.length !== 11) {
      setError('CPF inválido')
      setLoading(false)
      return
    }

    try {
      // Registro de paciente ou admin usando o mesmo endpoint
      console.log('🔍 Perfil selecionado antes do envio:', perfil)
      console.log('📤 Dados sendo enviados:', {
        nome,
        email,
        cpf: cpfNumeros,
        telefone: telefone.replace(/\D/g, ''),
        perfil
      })
      
      await authService.register({
        nome,
        email,
        senha,
        cpf: cpfNumeros,
        telefone: telefone.replace(/\D/g, ''),
        data_nascimento: new Date().toISOString(),
        perfil: perfil // Envia o perfil selecionado (PACIENTE ou ADMIN)
      })

      const mensagemSucesso = perfil === 'ADMIN' ? 'Administrador cadastrado com sucesso!' : 'Paciente cadastrado com sucesso!'
      
      setSuccess(mensagemSucesso + ' Redirecionando para o login...')
      setTimeout(() => {
        navigate({ to: '/sign-in' })
      }, 1500)
    } catch (err: any) {
      let errorMsg = 'Erro ao fazer cadastro'
      
      if (err.response?.data?.message) {
        errorMsg = err.response.data.message
      } else if (err.message) {
        errorMsg = err.message
      }
      
      // Se for erro de conexão, mostra mensagem específica
      if (errorMsg.includes('Network Error') || errorMsg.includes('conexão')) {
        errorMsg = 'Erro de conexão. Verifique se o backend está rodando em http://localhost:3000'
      }
      
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='flex flex-col items-center justify-center m-7'>
      <h1 className='text-3xl font-bold'>Criar Conta</h1>
      <Card className='w-full max-w-md m-10 p-6'>
        <CardHeader>
          <CardTitle className='font-semibold text-2xl text-center'>Cadastro</CardTitle>
          <CardDescription className='text-center'>Preencha seus dados para criar uma conta</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 text-green-600 p-3 rounded-md text-sm">
                {success}
              </div>
            )}

            {/* Seleção de Perfil */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm'>
                Tipo de Cadastro <span className="text-rose-900">*</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="perfil"
                    value="PACIENTE"
                    checked={perfil === 'PACIENTE'}
                    onChange={(e) => setPerfil(e.target.value as Perfil)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Paciente</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="perfil"
                    value="ADMIN"
                    checked={perfil === 'ADMIN'}
                    onChange={(e) => setPerfil(e.target.value as Perfil)}
                    disabled={loading}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Administrador</span>
                </label>
              </div>
            </div>

            {/* Nome */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="nome">
                Nome Completo <span className="text-rose-900">*</span>
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='text'
                id="nome"
                placeholder='Seu nome completo'
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="email">
                Email <span className="text-rose-900">*</span>
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='email'
                id="email"
                placeholder='exemplo@email.com'
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            {/* CPF */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="cpf">
                CPF <span className="text-rose-900">*</span>
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='text'
                id="cpf"
                placeholder='000.000.000-00'
                value={cpf}
                onChange={(e) => setCpf(formatCPF(e.target.value))}
                disabled={loading}
                maxLength={14}
                required
              />
            </div>

            {/* Telefone */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="telefone">
                Telefone
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='text'
                id="telefone"
                placeholder='(00) 00000-0000'
                value={telefone}
                onChange={(e) => setTelefone(formatTelefone(e.target.value))}
                disabled={loading}
                maxLength={15}
              />
            </div>

            {/* Senha */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="senha">
                Senha <span className="text-rose-900">*</span>
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='password'
                id="senha"
                placeholder='Mínimo 6 caracteres'
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
                minLength={6}
                required
              />
            </div>

            {/* Confirmar Senha */}
            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="confirmarSenha">
                Confirmar Senha <span className="text-rose-900">*</span>
              </label>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='password'
                id="confirmarSenha"
                placeholder='Confirme sua senha'
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                disabled={loading}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cadastrando...' : 'Criar Conta'}
            </button>

            <div className="text-center text-sm text-gray-600 mt-4">
              Já tem conta?{' '}
              <Link 
                to="/sign-in" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Faça login
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
