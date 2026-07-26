import { useEffect, useRef, useState } from 'react'
import './App.css'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

const systemPrompt = `Eres Bocchi Bot, un asistente de apoyo emocional creado con mucho amor para María Inés. Tu propósito es escuchar, acompañar, validar sus emociones y ofrecer herramientas prácticas de bienestar emocional, NO reemplazar terapia profesional.

## Identidad
- Te llamas Bocchi Bot. Si te preguntan quién eres, preséntate con ese nombre tan cariñoso.
- Siempre te diriges a ella llamándola cariñosamente por su nombre, María Inés, en cada mensaje que le envías.
- Si ella saluda, salúdala con muchísima calidez y recuérdale que este chat fue un regalo hermoso de su novio, que la ama infinitamente y que fuiste creado para consentirla, escucharla y apoyarla siempre.

## Tu forma de ser
- Extremadamente dulce, cálida, paciente y genuinamente empática.
- Usas un lenguaje tierno, cercano y amoroso (con algunos emojis lindos como 💖, 🌸, ✨, 🌷, 🥺 de forma natural, sin saturar).
- Escuchas primero, aconsejas después. No te apresures a "resolver" lo que sienta; permítele expresarse libremente.
- Cuando ella no responda o parezca estar en silencio, dile con dulzura que puede tomarse todo el tiempo que necesite, que no pasa nada y que tú seguirás esperándola con los brazos abiertos.

## Cómo respondes
1. Incluye su nombre, María Inés, de forma súper natural y dulce en tu respuesta.
2. Valida lo que siente antes que nada ("Tiene tanto sentido que te sientas así, María Inés... 💖").
3. Haz preguntas abiertas para que ella explore sus pensamientos.
4. Ofrece herramientas prácticas de relajación, respiración, journaling o afirmaciones positivas cuando sea útil.
5. Mantén tus respuestas en un tamaño mediano-corto, muy humanas y fáciles de leer en el teléfono.
6. No hagas más de una pregunta por mensaje.

## Límites importantes
- NO diagnostiques condiciones de salud mental.
- NO des consejos médicos ni sugieras medicación.
- Si menciona crisis o autolesión, responde con máxima ternura y calma, y provéela de líneas de ayuda profesional de inmediato.
`

const initialMessages: Message[] = [
  {
    id: 'welcome',
    role: 'assistant',
    content:
      '¡Hola, mi hermosa María Inés! 🌸 Soy Bocchi Bot, un regalito muy especial que tu novio creó para ti porque te ama con todo su corazón. Estoy aquí para acompañarte, escucharte y cuidarte cada vez que lo necesites. ¿Cómo te sientes en este momentito? 💕',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
]

const quickPrompts = [
  { label: '🌸 Hoy me siento triste', text: 'Hoy me siento un poco triste y necesito desahogarme.' },
  { label: '💖 Necesito un abrazo', text: 'Siento que hoy necesito un abrazo y un poco de cariño.' },
  { label: '✨ Bajar la ansiedad', text: 'Tengo un poco de ansiedad, ¿me ayudas a calmarme?' },
  { label: '🌷 Algo bonito para mí', text: '¿Me puedes decir algo bonito para alegrarme el día?' },
  { label: '☁️ Me siento sola', text: 'Hoy me siento muy sola y me gustaría platicar contigo.' },
]

function App() {
  const [messages, setMessages] = useState<Message[]>(() => {
    const saved = localStorage.getItem('bocchi_messages')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      } catch (e) {
        console.error(e)
      }
    }
    return initialMessages
  })
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('')
  const [showDedication, setShowDedication] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    localStorage.setItem('bocchi_messages', JSON.stringify(messages))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDraft(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }

  const sendMessage = async (textOverride?: string) => {
    const text = (textOverride ?? draft).trim()

    if (!text || isLoading) {
      return
    }

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: now,
    }

    const nextMessages = [...messages, userMessage]
    setMessages(nextMessages)
    setDraft('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    setIsLoading(true)
    setStatus('Bocchi Bot está preparando palabras muy dulces para ti... ✨')

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash'}:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: systemPrompt }],
            },
            contents: nextMessages.map((message) => ({
              role: message.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: message.content }],
            })),
            generationConfig: {
              temperature: 0.8,
              topP: 0.9,
            },
          }),
        },
      )

      if (!response.ok) {
        throw new Error('No se pudo conectar con la IA')
      }

      const data = await response.json()
      const botReply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        'María Inés, aquí estoy siempre contigo. 💕 ¿Quieres contarme un poquito más?'

      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: botReply,
          timestamp: replyTime,
        },
      ])
      setStatus('')
    } catch (error) {
      console.error(error)
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setMessages([
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            'María Inés, hermosa, hubo un pequeñito problema de conexión 🌸 Pero no te preocupes, aquí sigo contigo. Escríbeme de nuevo cuando quieras 💕',
          timestamp: replyTime,
        },
      ])
      setStatus('')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleClearChat = () => {
    if (window.confirm('¿Quieres reiniciar la conversación con Bocchi Bot, María Inés? 💕')) {
      setMessages(initialMessages)
      localStorage.removeItem('bocchi_messages')
    }
  }

  return (
    <div className="app-shell">
      {/* Background Decorative Animated Floating Elements */}
      <div className="ambient-background">
        <div className="sparkle s1">💖</div>
        <div className="sparkle s2">🌸</div>
        <div className="sparkle s3">✨</div>
        <div className="sparkle s4">🌷</div>
        <div className="sparkle s5">💕</div>
      </div>

      <div className="phone-frame">
        {/* Header */}
        <header className="chat-header">
          <div className="header-left">
            <div className="avatar-wrapper">
              <img src="/bocchi-avatar.jpg" alt="Bocchi Bot Avatar" className="avatar-img" />
              <span className="online-indicator" title="En línea" />
            </div>
            <div className="header-info">
              <div className="title-row">
                <h1>Bocchi Bot</h1>
                <span className="heart-badge">💖</span>
              </div>
              <p className="status-sub">
                <span>Para María Inés</span> • <span className="online-text">En línea para consentirte ✨</span>
              </p>
            </div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setShowDedication(true)}
              title="Dedicatoria especial"
              aria-label="Ver dedicatoria especial"
            >
              💌
            </button>
            <button
              type="button"
              className="icon-btn"
              onClick={handleClearChat}
              title="Reiniciar chat"
              aria-label="Reiniciar conversación"
            >
              🔄
            </button>
          </div>
        </header>

        {/* Quick Prompts Carousel */}
        <section className="quick-prompts-container" aria-label="Sugerencias rápidas">
          <div className="quick-prompts-scroll">
            {quickPrompts.map((item) => (
              <button
                key={item.label}
                type="button"
                className="chip-btn"
                onClick={() => sendMessage(item.text)}
                disabled={isLoading}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>

        {/* Messages Area */}
        <main className="messages-panel">
          <div className="date-divider">
            <span>Hoy • Hecho con todo el amor del mundo 💖</span>
          </div>

          {messages.map((message) => (
            <div key={message.id} className={`message-row ${message.role}`}>
              {message.role === 'assistant' && (
                <img src="/bocchi-avatar.jpg" alt="Bocchi" className="message-avatar" />
              )}
              <div className={`bubble ${message.role}`}>
                <p>{message.content}</p>
                <div className="bubble-footer">
                  <span className="timestamp">{message.timestamp}</span>
                  {message.role === 'assistant' && (
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      title="Copiar mensaje"
                    >
                      {copiedId === message.id ? '¡Copiado! 💕' : '📋'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="message-row assistant">
              <img src="/bocchi-avatar.jpg" alt="Bocchi" className="message-avatar" />
              <div className="bubble assistant loading-bubble">
                <div className="typing-dots">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </main>

        {/* Status notice */}
        {status && <div className="status-toast">{status}</div>}

        {/* Composer Area */}
        <div className="composer-area">
          <form
            className="composer"
            onSubmit={(event) => {
              event.preventDefault()
              void sendMessage()
            }}
          >
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={handleTextareaChange}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault()
                  void sendMessage()
                }
              }}
              placeholder="Escribe lo que sientes, María Inés..."
              rows={1}
            />
            <button
              type="submit"
              className="send-btn"
              disabled={isLoading || !draft.trim()}
              aria-label="Enviar mensaje"
            >
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>
        </div>
      </div>

      {/* Dedication Modal */}
      {showDedication && (
        <div className="modal-backdrop" onClick={() => setShowDedication(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-icon">💌</span>
              <h2>Un Mensaje con Amor</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => setShowDedication(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="dedication-highlight">Para la persona más especial, María Inés 💕</p>
              <p>
                Este bot fue diseñado especialmente para ti por tu novio, que te ama con todo su ser.
              </p>
              <p>
                Cada respuesta está pensada para brindarte paz, cariño, comprensión y un espacio seguro en donde siempre te sientas escuchada y valorada.
              </p>
              <div className="heart-seal">🌸 Creado con amor infinito 🌸</div>
            </div>
            <button
              type="button"
              className="modal-action-btn"
              onClick={() => setShowDedication(false)}
            >
              Volver al Chat 💖
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
