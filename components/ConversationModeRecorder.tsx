'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface ConversationModeRecorderProps {
  interviewId: string
  onTranscriptComplete: (fullTranscript: string) => void
  currentQuestion: string
  isAiThinking: boolean
  onError?: (error: string) => void
}

export default function ConversationModeRecorder({
  interviewId,
  onTranscriptComplete,
  currentQuestion,
  isAiThinking,
  onError
}: ConversationModeRecorderProps) {
  const [isActive, setIsActive] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isPlayingQuestion, setIsPlayingQuestion] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [silenceCountdown, setSilenceCountdown] = useState<number | null>(null)
  const [status, setStatus] = useState<'idle' | 'playing' | 'listening' | 'processing' | 'waiting'>('idle')
  const [ttsDisabled, setTtsDisabled] = useState(false)
  const ttsFailCountRef = useRef(0)
  const MAX_TTS_FAILURES = 5

  // Use ref to track active state for callbacks
  const isActiveRef = useRef(false)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const lastProcessTimeRef = useRef<number>(0)
  const fullTranscriptRef = useRef<string>('')
  const isRecordingRef = useRef(false)
  const silenceStartRef = useRef<number | null>(null)
  const silenceCheckIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hasSpokenRef = useRef(false)
  const lastQuestionRef = useRef<string>('')

  const SILENCE_THRESHOLD = 0.02 // Audio level threshold for silence (increased sensitivity)
  const SILENCE_DURATION = 4000 // 4 seconds of silence before submitting
  const PROCESS_INTERVAL = 3000 // Process audio every 3 seconds

  // Play the current question using TTS
  const playQuestion = useCallback(async () => {
    console.log('playQuestion called, currentQuestion:', !!currentQuestion, 'isPlayingQuestion:', isPlayingQuestion, 'ttsDisabled:', ttsDisabled)
    if (!currentQuestion || isPlayingQuestion || ttsDisabled) {
      // If TTS is disabled, skip directly to listening
      if (ttsDisabled && isActiveRef.current) {
        lastQuestionRef.current = currentQuestion
        startListening()
      }
      return
    }

    try {
      setIsPlayingQuestion(true)
      setStatus('playing')
      console.log('Fetching TTS audio...')

      const response = await fetch('/api/interview/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentQuestion })
      })

      if (!response.ok) {
        throw new Error('Failed to generate speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      console.log('Audio blob created, setting up playback...')

      // Reset failure count on success
      ttsFailCountRef.current = 0

      if (audioRef.current) {
        audioRef.current.pause()
      }

      const audio = new Audio(audioUrl)
      audioRef.current = audio

      audio.onended = () => {
        console.log('>>> Audio onended fired! isActiveRef:', isActiveRef.current)
        setIsPlayingQuestion(false)
        URL.revokeObjectURL(audioUrl)
        // Start recording after question finishes playing - use ref for latest state
        if (isActiveRef.current) {
          console.log('>>> Calling startListening in 300ms...')
          setTimeout(() => {
            console.log('>>> setTimeout fired, calling startListening now')
            startListening()
          }, 300)
        } else {
          console.log('>>> isActiveRef is false, not starting listening')
        }
      }

      audio.onerror = (e) => {
        console.log('Audio error:', e)
        setIsPlayingQuestion(false)
        handleTtsFailure()
        // Still try to start listening even if audio fails - use ref for latest state
        if (isActiveRef.current) {
          startListening()
        }
      }

      console.log('Starting audio playback...')
      await audio.play()
      console.log('Audio is now playing')
      lastQuestionRef.current = currentQuestion

    } catch (err) {
      console.error('TTS error:', err)
      setIsPlayingQuestion(false)
      handleTtsFailure()
      // Still try to start listening - use ref for latest state
      if (isActiveRef.current) {
        lastQuestionRef.current = currentQuestion
        startListening()
      }
    }
  }, [currentQuestion, isPlayingQuestion, ttsDisabled])

  // Handle TTS failures and disable after max attempts
  const handleTtsFailure = useCallback(() => {
    ttsFailCountRef.current += 1
    console.log(`TTS failure ${ttsFailCountRef.current}/${MAX_TTS_FAILURES}`)

    if (ttsFailCountRef.current >= MAX_TTS_FAILURES) {
      setTtsDisabled(true)
      onError?.('Voice playback is unavailable. Questions will be displayed on screen - please read them and respond. The interview will continue in text mode.')
    }
  }, [onError])

  // Effect to auto-play new questions when in conversation mode
  useEffect(() => {
    if (isActive && currentQuestion && currentQuestion !== lastQuestionRef.current && !isAiThinking && !isPlayingQuestion) {
      // Small delay before playing to ensure smooth transition
      const timer = setTimeout(() => {
        playQuestion()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isActive, currentQuestion, isAiThinking, isPlayingQuestion, playQuestion])

  // Effect to handle AI thinking state changes
  useEffect(() => {
    if (isAiThinking) {
      setStatus('processing')
      // Stop recording while AI is thinking
      if (isRecording) {
        pauseListening()
      }
    }
  }, [isAiThinking, isRecording])

  const startListening = async () => {
    console.log('Starting to listen...')
    try {
      setStatus('listening')
      hasSpokenRef.current = false
      silenceStartRef.current = null
      setSilenceCountdown(null)
      fullTranscriptRef.current = ''
      setTranscript([])

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext

      const source = audioContext.createMediaStreamSource(stream)

      // Create analyser for silence detection
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      analyserRef.current = analyser
      source.connect(analyser)

      // Create processor for recording
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      audioChunksRef.current = []
      lastProcessTimeRef.current = Date.now()
      isRecordingRef.current = true

      processor.onaudioprocess = (e) => {
        if (!isRecordingRef.current) return

        const inputData = e.inputBuffer.getChannelData(0)
        const audioData = new Float32Array(inputData)
        audioChunksRef.current.push(audioData)

        // Process every 3 seconds
        const now = Date.now()
        if (now - lastProcessTimeRef.current >= PROCESS_INTERVAL) {
          processAudioChunks()
          lastProcessTimeRef.current = now
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecording(true)
      console.log('Recording started, listening for speech...')

      // Start silence detection
      startSilenceDetection()

    } catch (err: any) {
      console.error('Error starting listening:', err)
      onError?.('Could not access microphone. Please check permissions.')
      setStatus('idle')
    }
  }

  const pauseListening = () => {
    isRecordingRef.current = false
    stopSilenceDetection()

    if (processorRef.current) {
      processorRef.current.disconnect()
      processorRef.current = null
    }

    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }

    setIsRecording(false)
  }

  const stopSilenceDetection = () => {
    if (silenceCheckIntervalRef.current) {
      clearInterval(silenceCheckIntervalRef.current)
      silenceCheckIntervalRef.current = null
    }
    setSilenceCountdown(null)
  }

  const startSilenceDetection = () => {
    stopSilenceDetection()

    silenceCheckIntervalRef.current = setInterval(() => {
      if (!analyserRef.current || !isRecordingRef.current) return

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
      analyserRef.current.getByteFrequencyData(dataArray)

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length
      const normalizedLevel = average / 255

      if (normalizedLevel > SILENCE_THRESHOLD) {
        // User is speaking
        hasSpokenRef.current = true
        silenceStartRef.current = null
        setSilenceCountdown(null)
      } else if (hasSpokenRef.current) {
        // Silence detected after user has spoken
        if (!silenceStartRef.current) {
          silenceStartRef.current = Date.now()
        }

        const silenceDuration = Date.now() - silenceStartRef.current
        const remaining = Math.ceil((SILENCE_DURATION - silenceDuration) / 1000)

        if (remaining > 0 && remaining <= 4) {
          setSilenceCountdown(remaining)
        }

        if (silenceDuration >= SILENCE_DURATION) {
          // 6 seconds of silence - submit the response
          submitResponse()
        }
      }
    }, 100) // Check every 100ms
  }

  const submitResponse = async () => {
    stopSilenceDetection()

    // Process any remaining audio chunks
    if (audioChunksRef.current.length > 0) {
      await processAudioChunks()
    }

    const transcript = fullTranscriptRef.current.trim()

    // Stop listening
    pauseListening()

    if (transcript) {
      setStatus('waiting')
      onTranscriptComplete(transcript)
    } else {
      // No transcript - restart listening
      if (isActiveRef.current && !isAiThinking) {
        console.log('No transcript, restarting listening...')
        setTimeout(() => startListening(), 500)
      }
    }
  }

  const processAudioChunks = async () => {
    if (audioChunksRef.current.length === 0) return

    try {
      const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
      const combinedAudio = new Float32Array(totalLength)

      let offset = 0
      for (const chunk of audioChunksRef.current) {
        combinedAudio.set(chunk, offset)
        offset += chunk.length
      }

      const wavBlob = floatTo16BitPCM(combinedAudio)
      audioChunksRef.current = []

      await transcribeAudio(wavBlob)

    } catch (err) {
      console.error('Error processing audio chunks:', err)
    }
  }

  const floatTo16BitPCM = (float32Array: Float32Array): Blob => {
    const buffer = new ArrayBuffer(44 + float32Array.length * 2)
    const view = new DataView(buffer)

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    const sampleRate = 16000
    const numChannels = 1
    const bitsPerSample = 16

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + float32Array.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numChannels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true)
    view.setUint16(32, numChannels * bitsPerSample / 8, true)
    view.setUint16(34, bitsPerSample, true)
    writeString(36, 'data')
    view.setUint32(40, float32Array.length * 2, true)

    let pcmOffset = 44
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(pcmOffset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      pcmOffset += 2
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.wav')
      formData.append('interviewId', interviewId)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        console.error('Transcription failed:', data)
        return
      }

      if (data.text && data.text.trim()) {
        const spuriousPhrases = [
          'thank you',
          'thank you for watching',
          'thanks for watching',
          'please subscribe',
          'like and subscribe',
          'see you next time',
          'bye bye',
          'thank you.',
          'thanks.',
        ]

        const cleanText = data.text.trim().toLowerCase()

        if (cleanText.length < 3) return
        if (spuriousPhrases.some(phrase => cleanText === phrase)) {
          return
        }

        setTranscript(prev => [...prev, data.text])
        fullTranscriptRef.current += (fullTranscriptRef.current ? ' ' : '') + data.text.trim()
      }

    } catch (err: any) {
      console.error('Transcription error:', err)
    }
  }

  const startConversation = async () => {
    console.log('=== Starting conversation mode ===')
    console.log('Setting isActiveRef.current = true')
    isActiveRef.current = true
    setIsActive(true)
    // Play the current question to start the conversation
    if (currentQuestion) {
      console.log('Current question exists, calling playQuestion...')
      // Small delay to ensure state is set
      setTimeout(() => {
        console.log('After delay, isActiveRef.current:', isActiveRef.current)
        playQuestion()
      }, 100)
    } else {
      console.log('No current question to play')
    }
  }

  const stopConversation = () => {
    console.log('Stopping conversation mode...')
    setIsActive(false)
    isActiveRef.current = false
    setStatus('idle')
    pauseListening()

    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }
    setIsPlayingQuestion(false)

    // Submit any pending transcript
    if (fullTranscriptRef.current.trim()) {
      onTranscriptComplete(fullTranscriptRef.current)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSilenceDetection()
      pauseListening()
      if (audioRef.current) {
        audioRef.current.pause()
      }
    }
  }, [])

  const getStatusMessage = () => {
    if (ttsDisabled && status === 'listening') {
      return silenceCountdown !== null
        ? `Listening... (submitting in ${silenceCountdown}s)`
        : 'Read the question above, then speak your response...'
    }
    switch (status) {
      case 'playing':
        return 'AI is asking a question...'
      case 'listening':
        return silenceCountdown !== null
          ? `Listening... (submitting in ${silenceCountdown}s)`
          : 'Listening to your response...'
      case 'processing':
        return 'AI is thinking...'
      case 'waiting':
        return 'Processing your response...'
      default:
        return ttsDisabled ? 'Voice playback unavailable - text mode active' : 'Ready to start conversation'
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'playing':
        return 'bg-blue-500'
      case 'listening':
        return silenceCountdown !== null ? 'bg-yellow-500' : 'bg-green-500'
      case 'processing':
      case 'waiting':
        return 'bg-purple-500'
      default:
        return 'bg-gray-400'
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-4 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()} ${status === 'listening' || status === 'playing' ? 'animate-pulse' : ''}`} />
            <div>
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                Conversation Mode
                {ttsDisabled ? (
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Text Mode</span>
                ) : (
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Voice AI</span>
                )}
              </h4>
              <p className="text-sm text-gray-600">{getStatusMessage()}</p>
            </div>
          </div>

          {!isActive ? (
            <button
              onClick={startConversation}
              disabled={isAiThinking}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              Start Conversation
            </button>
          ) : (
            <button
              onClick={stopConversation}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
              </svg>
              Stop Conversation
            </button>
          )}
        </div>
      </div>

      {/* TTS Disabled Banner */}
      {ttsDisabled && isActive && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-yellow-800">Voice playback unavailable</p>
              <p className="text-xs text-yellow-700">Please read the question displayed above and speak your response. The interview continues normally.</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="p-6">
        {!isActive ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Have a Natural Conversation</h3>
            <p className="text-gray-600 text-sm max-w-md mx-auto mb-4">
              Click "Start Conversation" and the AI will speak questions aloud.
              Simply respond naturally - after 4 seconds of silence, your response will be submitted automatically.
            </p>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>The AI asks one question at a time</li>
              <li>Speak naturally, pause when done</li>
              <li>4 seconds of silence = automatic submission</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Visual Feedback */}
            <div className="flex items-center justify-center py-4">
              {status === 'playing' && (
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
                    {silenceCountdown !== null && (
                      <p className="text-sm text-yellow-600">
                        Submitting in {silenceCountdown}s (keep talking to cancel)
                      </p>
                    )}
                  </div>
                </div>
              )}

              {(status === 'processing' || status === 'waiting') && (
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600" />
                  <span className="text-purple-600 font-medium">
                    {status === 'processing' ? 'AI is thinking...' : 'Processing...'}
                  </span>
                </div>
              )}
            </div>

            {/* Live Transcript */}
            <div className="border-t pt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Your Response</h4>
              <div className="bg-gray-50 rounded-lg p-4 min-h-[100px] max-h-[200px] overflow-y-auto">
                {transcript.length === 0 ? (
                  <p className="text-gray-400 text-sm italic">
                    Your words will appear here as you speak...
                  </p>
                ) : (
                  <p className="text-gray-800 text-sm leading-relaxed">
                    {transcript.join(' ')}
                  </p>
                )}
              </div>
            </div>

            {/* Manual Submit Button (fallback) */}
            {isRecording && transcript.length > 0 && (
              <div className="flex justify-center pt-2">
                <button
                  onClick={submitResponse}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm transition-colors"
                >
                  Submit Now (or wait for auto-submit)
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
