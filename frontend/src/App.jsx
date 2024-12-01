import { useState, useRef, useEffect } from 'react'
import { api } from './services/api'
import ReactMarkdown from 'react-markdown'

function App() {
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [selectedImages, setSelectedImages] = useState([])
  const chatContainerRef = useRef(null)

  // Função para rolar para o final do chat
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }

  // Rola para baixo quando mensagens são atualizadas
  useEffect(() => {
    scrollToBottom()
  }, [chatMessages])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (chatInput.trim()) {
        handleSubmit(e)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!chatInput.trim()) return

    try {
      setLoading(true)
      setError(null)
      
      // Guarda os valores atuais antes de limpar
      const currentMessage = chatInput
      const currentImages = [...selectedImages]
      
      // Limpa o input e as imagens imediatamente
      setChatInput('')
      setSelectedImages([])
      
      const userMessage = { 
        type: 'user', 
        text: currentMessage,
        images: currentImages
      }
      
      const loadingMessage = {
        type: 'bot',
        text: '...',
        isLoading: true
      }
      
      setChatMessages(prev => [...prev, userMessage, loadingMessage])
      
      // Usa os valores guardados para a chamada da API
      const response = await api.sendMessage(currentMessage, currentImages, false)
      
      setChatMessages(prev => {
        const messages = prev.filter(msg => !msg.isLoading)
        return [...messages, {
          type: 'bot',
          text: response.response
        }]
      })

    } catch (error) {
      setError('Erro ao enviar mensagem: ' + error.message)
      setChatMessages(prev => prev.filter(msg => !msg.isLoading))
    } finally {
      setLoading(false)
    }
  }

  const handleRegenerate = async (messageIndex) => {
    try {
      setLoading(true)
      setError(null)
      
      const previousMessage = chatMessages[messageIndex]
      
      // Adiciona mensagem de loading após a mensagem que está sendo regenerada
      setChatMessages(prev => {
        const messages = [...prev]
        messages.splice(messageIndex + 1, 1, {
          type: 'bot',
          text: '...',
          isLoading: true
        })
        return messages
      })

      const response = await api.regenerateResponse(
        previousMessage.text,
        previousMessage.images
      )
      
      // Substitui mensagem de loading pela nova resposta
      setChatMessages(prev => {
        const messages = [...prev]
        messages[messageIndex + 1] = {
          type: 'bot',
          text: response.response
        }
        return messages
      })
    } catch (error) {
      setError('Erro ao regenerar resposta: ' + error.message)
      // Remove mensagem de loading em caso de erro
      setChatMessages(prev => prev.filter(msg => !msg.isLoading))
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    if (files.length > 0) {
      // Limita a 3 imagens
      const newImages = files.slice(0, 3).map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            resolve(reader.result)
          }
          reader.readAsDataURL(file)
        })
      })

      Promise.all(newImages).then(images => {
        setSelectedImages(prev => {
          const combined = [...prev, ...images]
          return combined.slice(0, 3) // Mantém apenas 3 imagens
        })
      })
    }
  }

  return (
    <div className="chat-container" style={{ 
      padding: '20px',
      maxWidth: '800px',
      margin: '0 auto',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <h1 style={{ 
        margin: '0 0 20px 0',
        color: '#2c3e50',
        borderBottom: '2px solid #eee',
        paddingBottom: '10px'
      }}>Chat AI com Visão</h1>
      
      <div ref={chatContainerRef} style={{ 
        flex: 1,
        border: '1px solid #e1e8ed',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '20px',
        overflowY: 'auto',
        background: '#f8f9fa'
      }}>
        {chatMessages.map((msg, index) => (
          <div key={index} style={{
            marginBottom: '15px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: msg.type === 'user' ? 'flex-end' : 'flex-start'
          }}>
            <div style={{
              maxWidth: '80%',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {msg.images && msg.images.map((img, imgIndex) => (
                <img 
                  key={imgIndex}
                  src={img} 
                  alt={`Uploaded ${imgIndex + 1}`}
                  style={{
                    maxWidth: '300px',
                    borderRadius: '12px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginBottom: '8px'
                  }}
                />
              ))}
              <div style={{
                background: msg.type === 'user' ? '#007AFF' : '#ffffff',
                color: msg.type === 'user' ? 'white' : '#2c3e50',
                padding: '12px 16px',
                paddingLeft: msg.type === 'bot' ? '32px' : '16px',
                borderRadius: '18px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                position: 'relative',
                minWidth: '60px',
                border: msg.type === 'bot' ? '1px solid #e1e8ed' : 'none'
              }}>
                {msg.isLoading ? (
                  <div style={{ 
                    display: 'flex',
                    gap: '4px',
                    justifyContent: 'center',
                    padding: '8px'
                  }}>
                    <div className="dot-flashing"></div>
                  </div>
                ) : (
                  msg.type === 'bot' ? (
                    <div className="markdown-content">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.text
                  )
                )}
              </div>
              {msg.type === 'bot' && !msg.isLoading && (
                <button
                  onClick={() => handleRegenerate(index - 1)}
                  style={{
                    alignSelf: 'flex-start',
                    background: 'transparent',
                    border: '1px solid #e1e8ed',
                    borderRadius: '15px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    color: '#666',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '4px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.target.style.background = '#f1f1f1'}
                  onMouseOut={(e) => e.target.style.background = 'transparent'}
                >
                  🔄 Regenerar resposta
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        background: 'white',
        padding: '15px',
        borderRadius: '12px',
        border: '1px solid #e1e8ed'
      }}>
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          flexWrap: 'wrap'
        }}>
          <label
            htmlFor="image-upload"
            style={{
              padding: '8px 12px',
              borderRadius: '8px',
              border: '1px solid #e1e8ed',
              cursor: selectedImages.length >= 3 ? 'not-allowed' : 'pointer',
              color: selectedImages.length >= 3 ? '#999' : '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            📷 {selectedImages.length >= 3 ? 'Limite de imagens atingido' : 'Adicionar imagem'}
            <input
              id="image-upload"
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              disabled={selectedImages.length >= 3}
              multiple
              style={{ display: 'none' }}
            />
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {selectedImages.map((img, index) => (
              <div key={index} style={{
                position: 'relative',
                display: 'inline-block'
              }}>
                <img 
                  src={img} 
                  alt={`Preview ${index + 1}`}
                  style={{
                    width: '40px',
                    height: '40px',
                    objectFit: 'cover',
                    borderRadius: '8px'
                  }}
                />
                <button
                  onClick={() => setSelectedImages(prev => prev.filter((_, i) => i !== index))}
                  style={{
                    position: 'absolute',
                    top: -5,
                    right: -5,
                    background: '#ff4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '12px'
                  }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua mensagem..."
            style={{ 
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #e1e8ed',
              fontSize: '16px'
            }}
          />
          <button 
            type="submit" 
            disabled={loading || !chatInput.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: !chatInput.trim() ? '#ccc' : '#007AFF',
              color: 'white',
              cursor: !chatInput.trim() ? 'not-allowed' : 'pointer',
              fontSize: '16px',
              transition: 'all 0.2s'
            }}
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </form>

      {error && (
        <div style={{ 
          color: '#ff4444',
          marginTop: '10px',
          padding: '10px',
          borderRadius: '8px',
          background: '#ffe6e6'
        }}>
          {error}
        </div>
      )}

      <style>{`
        .markdown-content {
          font-size: 15px;
          line-height: 1.5;
        }
        
        .markdown-content p {
          margin: 0 0 10px 0;
        }
        
        .markdown-content p:last-child {
          margin-bottom: 0;
        }
        
        .markdown-content code {
          background: #f1f1f1;
          padding: 2px 4px;
          border-radius: 4px;
          font-size: 14px;
        }
        
        .dot-flashing {
          position: relative;
          width: 8px;
          height: 8px;
          border-radius: 5px;
          background-color: #666;
          animation: dot-flashing 1s infinite linear alternate;
          animation-delay: .5s;
        }
        
        .dot-flashing::before, .dot-flashing::after {
          content: '';
          display: inline-block;
          position: absolute;
          top: 0;
        }
        
        .dot-flashing::before {
          left: -15px;
          width: 8px;
          height: 8px;
          border-radius: 5px;
          background-color: #666;
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 0s;
        }
        
        .dot-flashing::after {
          left: 15px;
          width: 8px;
          height: 8px;
          border-radius: 5px;
          background-color: #666;
          animation: dot-flashing 1s infinite alternate;
          animation-delay: 1s;
        }
        
        @keyframes dot-flashing {
          0% {
            background-color: #666;
          }
          50%,
          100% {
            background-color: #ddd;
          }
        }
      `}</style>
    </div>
  )
}

export default App 