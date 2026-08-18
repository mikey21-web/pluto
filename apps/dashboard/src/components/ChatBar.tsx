import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../api'
import { PixelButton } from './PixelButton'

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
    } catch {
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'pluto' as const,
        text: 'Error connecting to Pluto.',
      }].slice(-20))
    }
    setLoading(false)
  }

  return (
    <>
      <AnimatePresence>
        {open && messages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'absolute',
              bottom: '100%',
              left: 0,
              right: 0,
              maxHeight: 280,
              overflowY: 'auto',
              background: 'var(--cth-cream-50)',
              boxShadow: 'inset 0 1px 0 var(--cth-ink-100)',
              zIndex: 10,
              padding: '12px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {messages.slice(-10).map(msg => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                {msg.role === 'pluto' && (
                  <span style={{
                    fontFamily: 'var(--cth-font-display)',
                    fontSize: 8,
                    color: 'var(--cth-ink-500)',
                    marginBottom: 4,
                    letterSpacing: '0.05em',
                  }}>
                    ⬡ PLUTO
                  </span>
                )}
                <div style={{
                  maxWidth: 480,
                  padding: '6px 10px',
                  background: msg.role === 'user' ? 'var(--cth-cream-200)' : 'var(--cth-paper-100)',
                  boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
                  fontFamily: 'var(--cth-font-ui)',
                  fontSize: 13,
                  color: 'var(--cth-ink-900)',
                  lineHeight: '18px',
                }}>
                  {msg.text}
                </div>
                {msg.delegations?.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      marginLeft: 16,
                      marginTop: 4,
                      paddingLeft: 8,
                      borderLeft: '2px solid var(--cth-ink-100)',
                      fontFamily: 'var(--cth-font-ui)',
                      fontSize: 11,
                      color: 'var(--cth-ink-500)',
                    }}
                  >
                    <span style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-700)' }}>{d.role}:</span>{' '}
                    {d.response}
                  </div>
                ))}
              </div>
            ))}
            {loading && (
              <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, color: 'var(--cth-ink-300)', letterSpacing: '0.05em' }}>
                ⬡ Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{
        height: 48,
        background: 'var(--cth-cream-100)',
        boxShadow: 'inset 0 1px 0 var(--cth-ink-100)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '0 16px',
        flexShrink: 0,
      }}>
        <button
          onClick={() => setOpen(o => !o)}
          style={{
            fontFamily: 'var(--cth-font-display)',
            fontSize: 8,
            color: 'var(--cth-ink-300)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          ⬡
        </button>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Message Pluto…"
          style={{
            flex: 1,
            background: 'var(--cth-cream-200)',
            boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
            border: 'none',
            padding: '6px 10px',
            fontFamily: 'var(--cth-font-mono)',
            fontSize: 13,
            color: 'var(--cth-ink-900)',
            outline: 'none',
          }}
        />
        <PixelButton
          variant="primary"
          size="sm"
          disabled={loading || !input.trim()}
          onClick={send}
        >
          Send
        </PixelButton>
      </div>
    </>
  )
}
