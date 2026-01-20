'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface RealtimeConversationRecorderProps {
  interviewId: string
  equipmentName: string
  smeName: string
  smeTitle: string
  onTranscriptUpdate: (aiText: string, userText: string) => void
  onConversationEnd: () => void
  onError?: (error: string) => void
  systemInstructions: string
}

interface ConversationTurn {
  speaker: 'AI' | 'SME'
  text: string
  timestamp: string
}

export default function RealtimeConversationRecorder({
  interviewId,
  equipmentName,
  smeName,
  smeTitle,
  onTranscriptUpdate,
  onConversationEnd,
  onError,
  systemInstructions
}: RealtimeConversationRecorderProps) {
  const [isActive, setIsActive] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected' | 'speaking' | 'listening' | 'processing'>('idle')
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [aiTranscript, setAiTranscript] = useState('')
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([])
  const [error, setError] = useState<string | null>(null)

  const wsRef = useRef<WebSocket | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const playbackContextRef = useRef<AudioContext | null>(null)
  const audioQueueRef = useRef<Int16Array[]>([])
  const isPlayingRef = useRef(false)
  const currentItemIdRef = useRef<string | null>(null)
  const lastAiTranscriptRef = useRef<string>('')

  // Convert Float32 to Int16 for sending to API
  const floatTo16BitPCM = (float32Array: Float32Array): Int16Array => {
    const int16Array = new Int16Array(float32Array.length)
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
    }
    return int16Array
  }

  // Convert Int16 to Float32 for playback
  const int16ToFloat32 = (int16Array: Int16Array): Float32Array => {
    const float32Array = new Float32Array(int16Array.length)
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / (int16Array[i] < 0 ? 0x8000 : 0x7FFF)
    }
    return float32Array
  }

  // Base64 encode Int16Array
  const encodeAudioToBase64 = (int16Array: Int16Array): string => {
    const uint8Array = new Uint8Array(int16Array.buffer)
    let binary = ''
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i])
    }
    return btoa(binary)
  }

  // Base64 decode to Int16Array
  const decodeBase64ToAudio = (base64: string): Int16Array => {
    const binary = atob(base64)
    const uint8Array = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) {
      uint8Array[i] = binary.charCodeAt(i)
    }
    return new Int16Array(uint8Array.buffer)
  }

  // Play audio from queue
  const playAudioQueue = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) return

    isPlayingRef.current = true
    setStatus('speaking')

    while (audioQueueRef.current.length > 0) {
      const audioData = audioQueueRef.current.shift()!

      if (!playbackContextRef.current || playbackContextRef.current.state === 'closed') {
        playbackContextRef.current = new AudioContext({ sampleRate: 24000 })
      }

      const float32Data = int16ToFloat32(audioData)
      const audioBuffer = playbackContextRef.current.createBuffer(1, float32Data.length, 24000)
      audioBuffer.getChannelData(0).set(float32Data)

      const source = playbackContextRef.current.createBufferSource()
      source.buffer = audioBuffer
      source.connect(playbackContextRef.current.destination)

      await new Promise<void>((resolve) => {
        source.onended = () => resolve()
        source.start()
      })
    }

    isPlayingRef.current = false
    setStatus('listening')
  }, [])

  // Handle WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data)

      switch (data.type) {
        case 'session.created':
          console.log('Realtime session created:', data.session?.id)
          setStatus('connected')
          // Send initial message to start the interview
          sendInitialPrompt()
          break

        case 'session.updated':
          console.log('Session updated')
          break

        case 'response.created':
          currentItemIdRef.current = data.response?.id
          break

        case 'response.audio.delta':
        case 'response.output_audio.delta':
          // Received audio chunk from AI (handle both beta and GA event names)
          if (data.delta) {
            const audioData = decodeBase64ToAudio(data.delta)
            audioQueueRef.current.push(audioData)
            playAudioQueue()
          }
          break

        case 'response.audio_transcript.delta':
        case 'response.output_audio_transcript.delta':
          // AI speech transcript update (handle both beta and GA event names)
          if (data.delta) {
            setAiTranscript(prev => prev + data.delta)
          }
          break

        case 'response.audio_transcript.done':
        case 'response.output_audio_transcript.done':
          // AI finished speaking - save the transcript (handle both beta and GA event names)
          if (data.transcript) {
            console.log('AI transcript done:', data.transcript)
            const turn: ConversationTurn = {
              speaker: 'AI',
              text: data.transcript,
              timestamp: new Date().toISOString()
            }
            setConversationHistory(prev => [...prev, turn])

            // Save the AI transcript for pairing with user response
            lastAiTranscriptRef.current = data.transcript
            setAiTranscript('')

            // Notify parent of AI speech
            onTranscriptUpdate(data.transcript, '')

            // Check for interview completion
            if (data.transcript.includes('[INTERVIEW_COMPLETE]')) {
              onConversationEnd()
            }
          }
          break

        case 'conversation.item.input_audio_transcription.completed':
        case 'input_audio.transcription.done':
        case 'transcription.done':
          // User speech transcript completed (handle multiple event name formats)
          const userTranscript = data.transcript || data.text
          if (userTranscript) {
            console.log('User transcript received:', userTranscript)
            const turn: ConversationTurn = {
              speaker: 'SME',
              text: userTranscript,
              timestamp: new Date().toISOString()
            }
            setConversationHistory(prev => [...prev, turn])
            setCurrentTranscript('')

            // Notify parent of the user's response
            onTranscriptUpdate('', userTranscript)
          }
          break

        case 'input_audio_buffer.speech_started':
          console.log('Speech started detected')
          setStatus('listening')
          setCurrentTranscript('')
          // Stop any playing audio when user starts speaking
          audioQueueRef.current = []
          break

        case 'input_audio_buffer.speech_stopped':
          console.log('Speech stopped detected')
          setStatus('processing')
          break

        case 'response.done':
          console.log('Response done')
          if (!isPlayingRef.current) {
            setStatus('listening')
          }
          break

        case 'error':
          console.error('Realtime API error:', JSON.stringify(data.error, null, 2))
          // Don't show error to user for non-critical errors
          if (data.error?.code !== 'unknown_parameter') {
            setError(data.error?.message || 'An error occurred')
            onError?.(data.error?.message || 'An error occurred')
          }
          break

        default:
          // Log all events for debugging
          if (data.type) {
            console.log('Realtime event:', data.type, data)
          }
      }
    } catch (err) {
      console.error('Error parsing WebSocket message:', err)
    }
  }, [aiTranscript, onTranscriptUpdate, onConversationEnd, onError, playAudioQueue])

  // Send initial prompt to start the interview
  const sendInitialPrompt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return

    // Create a response to start the interview
    // Note: modalities is set in session config, not in response.create
    wsRef.current.send(JSON.stringify({
      type: 'response.create',
      response: {
        instructions: `Start in English. Brief greeting to ${smeName}, then get straight to business. Ask: "Let's start with the most critical thing - if someone was going to operate or maintain the ${equipmentName} for the first time, what's the one thing they absolutely must know?" Keep your opening under 15 seconds. Be professional and direct.`
      }
    }))
  }, [smeName, equipmentName])

  // Start the realtime conversation
  const startConversation = async () => {
    try {
      setIsConnecting(true)
      setStatus('connecting')
      setError(null)

      // Get ephemeral token from our API
      const tokenResponse = await fetch('/api/realtime/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instructions: systemInstructions
        })
      })

      if (!tokenResponse.ok) {
        const errorData = await tokenResponse.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to create realtime session')
      }

      const tokenData = await tokenResponse.json()
      const client_secret = tokenData.client_secret

      console.log('Got client secret:', client_secret ? `${client_secret.substring(0, 20)}...` : 'undefined')

      if (!client_secret || typeof client_secret !== 'string') {
        throw new Error('Invalid client secret received')
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        }
      })
      streamRef.current = stream

      // Create audio context for capturing
      const audioContext = new AudioContext({ sampleRate: 24000 })
      audioContextRef.current = audioContext

      // Connect to OpenAI Realtime API using the GA model name
      const ws = new WebSocket(
        `wss://api.openai.com/v1/realtime?model=gpt-realtime`,
        [
          'realtime',
          `openai-insecure-api-key.${client_secret}`
        ]
      )

      ws.onopen = () => {
        console.log('WebSocket connected')

        // Update session with our interview settings using GA API format
        // Instructions should be language-agnostic - respond in the language the user speaks
        const sessionConfig = {
          type: 'session.update',
          session: {
            type: 'realtime',
            instructions: systemInstructions + '\n\nLANGUAGE RULES:\n- ALWAYS start the interview in English regardless of the person\'s name.\n- After your initial greeting and first question, if the user responds in a different language, switch to that language for the rest of the conversation.\n- Do not assume language based on names - wait for the user to speak first before adapting.',
            audio: {
              input: {
                format: {
                  type: 'audio/pcm',
                  rate: 24000
                },
                transcription: {
                  model: 'gpt-4o-transcribe'
                },
                turn_detection: {
                  type: 'semantic_vad',
                  eagerness: 'medium',
                  create_response: true,
                  interrupt_response: true
                }
              },
              output: {
                format: {
                  type: 'audio/pcm',
                  rate: 24000
                },
                voice: 'alloy'
              }
            }
          }
        }

        console.log('Sending session.update:', JSON.stringify(sessionConfig, null, 2))
        ws.send(JSON.stringify(sessionConfig))

        // Start capturing and sending audio
        startAudioCapture(audioContext, stream, ws)
      }

      ws.onmessage = handleMessage

      ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        setError('Connection error occurred')
        onError?.('Connection error occurred')
      }

      ws.onclose = (event) => {
        console.log('WebSocket closed:', event.code, event.reason)
        setIsActive(false)
        setStatus('idle')
        stopAudioCapture()
      }

      wsRef.current = ws
      setIsActive(true)
      setIsConnecting(false)

    } catch (err: any) {
      console.error('Error starting conversation:', err)
      setError(err.message || 'Failed to start conversation')
      onError?.(err.message || 'Failed to start conversation')
      setIsConnecting(false)
      setStatus('idle')
    }
  }

  // Start capturing audio from microphone
  const startAudioCapture = (audioContext: AudioContext, stream: MediaStream, ws: WebSocket) => {
    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)
    processorRef.current = processor

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return

      const inputData = e.inputBuffer.getChannelData(0)
      const int16Data = floatTo16BitPCM(inputData)
      const base64Audio = encodeAudioToBase64(int16Data)

      // Send audio to the API
      ws.send(JSON.stringify({
        type: 'input_audio_buffer.append',
        audio: base64Audio
      }))
    }

    source.connect(processor)
    processor.connect(audioContext.destination)
  }

  // Stop audio capture
  const stopAudioCapture = () => {
    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    if (playbackContextRef.current && playbackContextRef.current.state !== 'closed') {
      playbackContextRef.current.close()
      playbackContextRef.current = null
    }
  }

  // Stop the conversation
  const stopConversation = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    stopAudioCapture()
    setIsActive(false)
    setStatus('idle')
    audioQueueRef.current = []
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopConversation()
    }
  }, [])

  const getStatusMessage = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting to AI...'
      case 'connected':
        return 'Connected - Starting interview...'
      case 'speaking':
        return 'AI is speaking...'
      case 'listening':
        return 'Listening to you...'
      case 'processing':
        return 'Processing your response...'
      default:
        return 'Ready for real-time conversation'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'connecting':
      case 'connected':
        return 'bg-yellow-500'
      case 'speaking':
        return 'bg-blue-500'
      case 'listening':
        return 'bg-green-500'
      case 'processing':
        return 'bg-purple-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100 p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status !== 'idle' ? 'animate-pulse' : ''}`} />
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                Real-Time Voice Mode
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  Ultra-Low Latency
                </span>
              </h4>
              <p className="text-sm text-gray-600">{getStatusMessage()}</p>
            </div>
          </div>

          {!isActive ? (
            <button
              onClick={startConversation}
              disabled={isConnecting}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  Start Real-Time Interview
                </>
              )}
            </button>
          ) : (
            <button
              onClick={stopConversation}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              End Conversation
            </button>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-800">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-xs text-red-600 hover:text-red-700 mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {!isActive ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Lightning-Fast Voice Conversation</h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto mb-4">
              Experience natural, real-time conversation with sub-second response times.
              The AI will speak and listen just like a real interviewer.
            </p>
            <div className="bg-emerald-50 rounded-lg p-4 max-w-md mx-auto">
              <ul className="text-sm text-gray-700 space-y-2 text-left">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  ~300ms response latency
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Natural interruption handling
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Automatic turn detection
                </li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Feedback */}
            <div className="flex items-center justify-center py-4">
              {status === 'speaking' && (
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {[...Array(5)].map((_, i) => (
                      <div
                        key={i}
                        className="w-1 bg-blue-500 rounded-full animate-pulse"
                        style={{
                          height: `${20 + Math.random() * 20}px`,
                          animationDelay: `${i * 0.1}s`
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-blue-600 font-medium">AI Speaking...</span>
                </div>
              )}

              {status === 'listening' && (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                    </div>
                    <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20" />
                  </div>
                  <div>
                    <p className="font-medium text-green-700">Listening...</p>
                    <p className="text-sm text-gray-500">Speak naturally</p>
                  </div>
                </div>
              )}

              {(status === 'processing' || status === 'connecting' || status === 'connected') && (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600" />
                  <span className="text-purple-600 font-medium">
                    {status === 'processing' ? 'Processing...' : 'Connecting...'}
                  </span>
                </div>
              )}
            </div>

            {/* Live Transcripts */}
            <div className="grid grid-cols-2 gap-4">
              {/* AI Transcript */}
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  AI Speaking
                </h4>
                <div className="bg-blue-50 rounded-lg p-3 min-h-[80px] max-h-[120px] overflow-y-auto">
                  <p className="text-gray-800 text-sm">
                    {aiTranscript || <span className="text-gray-400 italic">Waiting for AI...</span>}
                  </p>
                </div>
              </div>

              {/* User Transcript */}
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-700 mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  You Speaking
                </h4>
                <div className="bg-green-50 rounded-lg p-3 min-h-[80px] max-h-[120px] overflow-y-auto">
                  <p className="text-gray-800 text-sm">
                    {currentTranscript || <span className="text-gray-400 italic">Waiting for you...</span>}
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Conversation History */}
            {conversationHistory.length > 0 && (
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Exchanges</h4>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {conversationHistory.slice(-4).map((turn, index) => (
                    <div
                      key={index}
                      className={`p-2 rounded-lg text-xs ${
                        turn.speaker === 'AI'
                          ? 'bg-blue-50 border-l-2 border-blue-400'
                          : 'bg-green-50 border-l-2 border-green-400'
                      }`}
                    >
                      <span className={`font-semibold ${turn.speaker === 'AI' ? 'text-blue-700' : 'text-green-700'}`}>
                        {turn.speaker === 'AI' ? 'AI' : 'You'}:
                      </span>
                      <span className="text-gray-700 ml-1">
                        {turn.text.length > 100 ? turn.text.substring(0, 100) + '...' : turn.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
