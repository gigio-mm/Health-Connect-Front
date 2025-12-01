import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from '@/hooks/useAuth'

export const Route = createFileRoute('/_auth/sign-in')({
  component: SignIn,
})

function SignIn() {
  const navigate = useNavigate()
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login({ email, senha })
      
      // Pega o usuário do localStorage após o login (o login já salva lá)
      const userStr = localStorage.getItem('user')
      if (userStr) {
        const userData = JSON.parse(userStr)
        console.log('👤 Usuário logado:', userData)
        console.log('🔑 Perfil do usuário:', userData.perfil)
        
        if (userData.perfil === 'ADMIN') {
          console.log('✅ Redirecionando para /admin-painel')
          navigate({ to: '/admin-painel' })
        } else if (userData.perfil === 'MEDICO') {
          console.log('✅ Redirecionando para /home')
          navigate({ to: '/home' })
        } else if (userData.perfil === 'PACIENTE') {
          console.log('✅ Redirecionando para /dashboard')
          navigate({ to: '/dashboard' })
        } else {
          console.log('⚠️ Perfil desconhecido, redirecionando para /sign-in')
          navigate({ to: '/sign-in' })
        }
      } else {
        console.log('❌ Nenhum usuário encontrado no localStorage')
        navigate({ to: '/sign-in' })
      }
    } catch (err) {
      let errorMsg = 'Erro ao fazer login'
      
      if (err instanceof Error) {
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
      <h1 className='text-3xl font-bold'>Bem-Vindo de volta</h1>
      <Card className='w-full max-w-md m-10 p-6'>
        <CardHeader>
          <CardTitle className='font-semibold text-2xl text-center'>Entrar</CardTitle>
          <CardDescription className='text-center'>Entre com suas credenciais</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-col space-y-2">
              <label className='font-bold text-sm' htmlFor="email">Email</label>
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

            <div className="flex flex-col space-y-2">
               <div className='flex gap-1'>
                 <label className='font-bold text-sm' htmlFor="password">Senha</label>
                 <span className="text-destructive-foreground text-rose-900">*</span>
               </div>
              <input
                className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                type='password'
                id="password"
                placeholder='Sua senha'
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>

            <div className="text-center text-sm text-gray-600 mt-4">
              Não tem conta?{' '}
              <Link 
                to="/sign-up" 
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                Cadastre-se
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}


