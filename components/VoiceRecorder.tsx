'use client'

import { useState, useRef, useEffect } from 'react'

interface VoiceRecorderProps {
  onTranscriptUpdate: (text: string) => void
  interviewId: string
  onRecordingComplete?: (fullTranscript: string) => void
}

export default function VoiceRecorder({ onTranscriptUpdate, interviewId, onRecordingComplete }: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState<string[]>([])
  const [error, setError] = useState('')
  const [permissionDenied, setPermissionDenied] = useState(false)
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const isRecordingRef = useRef(false)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const audioChunksRef = useRef<Float32Array[]>([])
  const lastProcessTimeRef = useRef<number>(0)
  const fullTranscriptRef = useRef<string>('')

  useEffect(() => {
    return () => {
      stopRecording()
    }
  }, [])

  const startRecording = async () => {
    try {
      setError('')
      setPermissionDenied(false)
      fullTranscriptRef.current = '' // Reset transcript on new recording

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Create AudioContext for raw audio processing
      const audioContext = new AudioContext({ sampleRate: 16000 })
      audioContextRef.current = audioContext
      
      const source = audioContext.createMediaStreamSource(stream)
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
        if (now - lastProcessTimeRef.current >= 3000) {
          processAudioChunks()
          lastProcessTimeRef.current = now
        }
      }

      source.connect(processor)
      processor.connect(audioContext.destination)

      setIsRecording(true)
      console.log('Recording started with AudioContext')

    } catch (err: any) {
      console.error('Error starting recording:', err)
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermissionDenied(true)
        setError('Microphone permission denied. Please allow access in your browser settings.')
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.')
      } else {
        setError('Failed to start recording. Please try again.')
      }
    }
  }

  const stopRecording = () => {
    isRecordingRef.current = false
    
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
    
    // Send complete transcript when recording stops
    if (onRecordingComplete && fullTranscriptRef.current.trim()) {
      console.log('Sending complete transcript:', fullTranscriptRef.current)
      onRecordingComplete(fullTranscriptRef.current)
      fullTranscriptRef.current = '' // Reset after sending
    }
    
    setIsRecording(false)
    setTranscript([]) // Clear display transcript
    console.log('Recording stopped')
  }

  const processAudioChunks = async () => {
    if (audioChunksRef.current.length === 0) return

    try {
      // Combine all chunks
      const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
      const combinedAudio = new Float32Array(totalLength)
      
      let offset = 0
      for (const chunk of audioChunksRef.current) {
        combinedAudio.set(chunk, offset)
        offset += chunk.length
      }

      // Convert Float32Array to WAV
      const wavBlob = floatTo16BitPCM(combinedAudio)
      
      console.log('Processing audio chunk, size:', wavBlob.size)
      
      // Clear chunks for next interval
      audioChunksRef.current = []
      
      await transcribeAudio(wavBlob)

    } catch (err) {
      console.error('Error processing audio chunks:', err)
    }
  }

  const floatTo16BitPCM = (float32Array: Float32Array): Blob => {
    const buffer = new ArrayBuffer(44 + float32Array.length * 2)
    const view = new DataView(buffer)

    // WAV header
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

    // Convert float samples to 16-bit PCM
    let offset = 44
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      offset += 2
    }

    return new Blob([buffer], { type: 'audio/wav' })
  }

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      console.log('Transcribing audio chunk, size:', audioBlob.size, 'type:', audioBlob.type)
      
      const formData = new FormData()
      formData.append('audio', audioBlob, 'audio.wav')
      formData.append('interviewId', interviewId)

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      
      if (!response.ok) {
        console.error('Transcription failed:', {
          status: response.status,
          statusText: response.statusText,
          error: data
        })
        
        setError(`Transcription error: ${data.details || data.error || 'Unknown error'}`)
        return
      }

      console.log('Transcription result:', data)
      
      if (data.text && data.text.trim()) {
        // Filter spurious phrases
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
          console.log('Filtered spurious phrase:', data.text)
          return
        }

        setTranscript(prev => [...prev, data.text])
        onTranscriptUpdate(data.text)
        
        // Accumulate full transcript
        fullTranscriptRef.current += (fullTranscriptRef.current ? ' ' : '') + data.text.trim()
      }

    } catch (err: any) {
      console.error('Transcription error:', err)
      setError(`Network error: ${err.message}`)
    }
  }

  return (
    <div className="border rounded-lg p-6 bg-white shadow">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Voice Recording</h3>
        
        {isRecording && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
            <span className="text-sm text-red-600 font-medium">Recording</span>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded text-sm">
          {error}
          {permissionDenied && (
            <div className="mt-2 text-xs">
              <p>To fix this:</p>
              <ul className="list-disc ml-5 mt-1">
                <li>Click the camera/microphone icon in your browser's address bar</li>
                <li>Allow microphone access for this site</li>
                <li>Refresh the page and try again</li>
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 mb-4">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium"
          >
            🎤 Start Recording
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="flex-1 bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 font-medium"
          >
            ⏹️ Stop & Submit
          </button>
        )}
      </div>

      <div className="border-t pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Live Transcript</h4>
        <div className="bg-gray-50 rounded p-4 min-h-[200px] max-h-[400px] overflow-y-auto">
          {transcript.length === 0 ? (
            <p className="text-gray-400 text-sm italic">
              Transcript will appear here as you speak...
            </p>
          ) : (
            <div className="space-y-2">
              {transcript.map((text, index) => (
                <p key={index} className="text-gray-800 text-sm">
                  {text}
                </p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}