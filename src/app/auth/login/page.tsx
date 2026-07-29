import Link from 'next/link'


export default async function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string }
}) {
  const resolvedParams = searchParams
  const error = resolvedParams?.error

  return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Entrar</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 text-center">
          {error}
        </div>
      )}

      <form action={""} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
          <input 
            type="email" 
            name="email" 
            required 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
            placeholder="seu@email.com"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
          <input 
            type="password" 
            name="password" 
            required 
            className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-gray-800"
            placeholder="••••••••"
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-blue-600 text-white font-medium py-2.5 rounded-lg hover:bg-blue-700 transition-colors mt-2"
        >
          Entrar
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-6">
        Não tem uma conta?{' '}
        <Link href="/auth/register" className="text-blue-600 font-medium hover:underline">
          Cadastre-se
        </Link>
      </p>
    </div>
  )
}
