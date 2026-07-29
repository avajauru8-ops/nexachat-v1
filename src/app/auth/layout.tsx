export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 tracking-tight">NexaChat</h1>
          <p className="text-gray-500 mt-2">Automação inteligente para Instagram</p>
        </div>
        {children}
      </div>
    </div>
  )
}
