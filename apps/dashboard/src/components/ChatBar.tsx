import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'

type Message = {
  id: string
  role: 'user' | 'pluto'
  text: string
  delegations?: Array<{ role: string; response: string }>
}

type Props = { selectedId: string | null }

export default function ChatBar({ selectedId }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setOpen(true)
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text }
    setMessages(prev => [...prev, userMsg].slice(-20))
    setLoading(true)
    try {
      const data = await api.chat(text, selectedId ?? undefined)
      const plutoMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'pluto',
        text: data.reply ?? data.message ?? JSON.stringify(data),
        delegations: data.delegations,
      }
      setMessages(prev => [...prev, plutoMsg].slice(-20))
    } catch (e: unknown) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'pluto' as const, text: 'Error connecting to Pluto.' }].slice(-20))
    }
    setLoading(false)
  }

  return (
    <>
      {/* Chat overlay */}
      <AnimatePresence>
        {open && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-16 left-0 right-64 max-h-80 overflow-y-auto bg-surface border-t border-border z-10 p-4 flex flex-col gap-2"
          >
            {messages.slice(-10).map(msg => (
              <div key={msg.id} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                {msg.role === 'pluto' && (
                  <span className="font-mono text-xs text-accent mb-1">⬡ PLUTO</span>
                )}
                <div
                  className={`max-w-xl px-3 py-2 rounded-lg text-sm ${
                    msg.role === 'user'
                      ? 'bg-accent/10 border border-accent/30 text-gray-200'
                      : 'bg-muted border border-border text-gray-300'
                  }`}
                >
                  {msg.text}
                </div>
                {msg.delegations?.map((d, i) => (
                  <div key={i} className="ml-4 mt-1 text-xs text-dim border-l border-border/50 pl-2">
                    <span className="font-mono text-accent/70">{d.role}:</span> {d.response}
                  </div>
                ))}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-dim text-xs font-mono">
                <span className="animate-pulse">⬡</span> Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fixed bar */}
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-surface border-t border-border flex items-center gap-3 px-4 z-20">
        <button
          onClick={() => setOpen(o => !o)}
          className="font-mono text-accent text-sm shrink-0 hover:opacity-70"
        >
          ⬡
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message Pluto…"
          className="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-dim focus:border-accent focus:outline-none font-mono"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="px-4 py-2 rounded-lg bg-accent/10 border border-accent/40 text-accent font-mono text-xs hover:bg-accent/20 disabled:opacity-40 transition-colors"
        >
          Send
        </button>
      </div>
    </>
  )
}
