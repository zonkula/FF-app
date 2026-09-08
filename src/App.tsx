import { DraftProvider } from './context/DraftContext'
import { DraftBoard } from './components/DraftBoard'

function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <header className="border-b border-gray-800 p-4 text-center">
        <h1 className="text-2xl font-bold">FF App — 1v1 Weekly Draft (PPR)</h1>
      </header>

      <DraftProvider>
        <DraftBoard />
      </DraftProvider>
    </div>
  )
}

export default App
