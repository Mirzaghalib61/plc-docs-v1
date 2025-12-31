'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import VoiceRecorder from '@/components/VoiceRecorder'

interface Interview {
  id: string
  sme_name: string
  sme_title: string
  equipment_name: string
  equipment_location: string
  current_phase: number
  status: string
  conversation_history: any[]
  created_at: string
  updated_at: string
}

export default function InterviewPage() {
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const params = useParams()
  const router = useRouter()
  const voiceRecorderKeyRef = useRef(0)
  
  // Session management for chunking transcripts
  const currentSessionRef = useRef<{
    startTime: Date | null
    texts: string[]
    phase: number
  }>({
    startTime: null,
    texts: [],
    phase: 1
  })
  const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetchInterview()
    
    return () => {
      // Cleanup: save any pending session data on unmount
      if (currentSessionRef.current.texts.length > 0) {
        saveSessionChunk()
      }
      if (sessionTimeoutRef.current) {
        clearTimeout(sessionTimeoutRef.current)
      }
    }
  }, [params.id])

  const fetchInterview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Fetch error:', error)
        setError('Interview not found')
        setLoading(false)
      } else {
        setInterview(data)
        currentSessionRef.current.phase = data.current_phase
        setLoading(false)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load interview')
      setLoading(false)
    }
  }

  const saveSessionChunk = async () => {
    if (!interview || currentSessionRef.current.texts.length === 0) return

    try {
      setSaving(true)

      // Combine all texts in current session
      const combinedText = currentSessionRef.current.texts.join(' ')
      const startTime = currentSessionRef.current.startTime || new Date()

      // Fetch latest data to ensure we have current conversation_history
      const { data: latestData, error: fetchError } = await supabase
        .from('interviews')
        .select('conversation_history')
        .eq('id', interview.id)
        .single()

      if (fetchError) {
        console.error('Error fetching latest data:', fetchError)
        return
      }

      // Create session entry
      const sessionEntry = {
        timestamp: startTime.toISOString(),
        text: combinedText,
        phase: currentSessionRef.current.phase,
        duration: Math.floor((new Date().getTime() - startTime.getTime()) / 1000) // seconds
      }

      const currentHistory = latestData.conversation_history || []
      const updatedHistory = [...currentHistory, sessionEntry]

      const { error: updateError } = await supabase
        .from('interviews')
        .update({ 
          conversation_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', interview.id)

      if (updateError) {
        console.error('Error saving transcript:', updateError)
      } else {
        // Update local state with fresh data
        setInterview({
          ...interview,
          conversation_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        
        // Reset session
        currentSessionRef.current = {
          startTime: null,
          texts: [],
          phase: interview.current_phase
        }
      }
    } catch (err) {
      console.error('Error saving session chunk:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleTranscriptUpdate = async (text: string) => {
    if (!interview) return

    // Filter out common spurious phrases from Whisper
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

    const cleanText = text.trim().toLowerCase()
    
    // Skip if text is too short or matches spurious phrases
    if (cleanText.length < 3) return
    if (spuriousPhrases.some(phrase => cleanText === phrase)) {
      console.log('Filtered spurious phrase:', text)
      return
    }

    // Initialize session if this is the first text
    if (currentSessionRef.current.startTime === null) {
      currentSessionRef.current.startTime = new Date()
    }

    // Add text to current session
    currentSessionRef.current.texts.push(text.trim())

    // Reset the 5-minute timer
    if (sessionTimeoutRef.current) {
      clearTimeout(sessionTimeoutRef.current)
    }

    // Set timer to save after 5 minutes of inactivity
    sessionTimeoutRef.current = setTimeout(() => {
      saveSessionChunk()
    }, 5 * 60 * 1000) // 5 minutes

    console.log('Session buffer:', currentSessionRef.current.texts.length, 'segments')
  }

  const handlePause = async () => {
    if (!interview) return

    // Save any pending session data before pausing
    if (currentSessionRef.current.texts.length > 0) {
      await saveSessionChunk()
    }

    try {
      const { error } = await supabase
        .from('interviews')
        .update({ 
          status: 'paused',
          updated_at: new Date().toISOString()
        })
        .eq('id', interview.id)

      if (error) {
        console.error('Error pausing interview:', error)
      } else {
        // Force VoiceRecorder to unmount by changing key
        voiceRecorderKeyRef.current += 1
        setInterview({ ...interview, status: 'paused' })
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleResume = async () => {
    if (!interview) return

    try {
      const { error } = await supabase
        .from('interviews')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', interview.id)

      if (error) {
        console.error('Error resuming interview:', error)
      } else {
        // Force VoiceRecorder to remount by changing key
        voiceRecorderKeyRef.current += 1
        setInterview({ ...interview, status: 'in_progress' })
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleComplete = async () => {
    if (!interview) return

    const confirmed = window.confirm(
      'Are you sure you want to complete this interview? You can still view it later but cannot add more content.'
    )

    if (!confirmed) return

    // Save any pending session data before completing
    if (currentSessionRef.current.texts.length > 0) {
      await saveSessionChunk()
    }

    try {
      const { error } = await supabase
        .from('interviews')
        .update({ 
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', interview.id)

      if (error) {
        console.error('Error completing interview:', error)
      } else {
        voiceRecorderKeyRef.current += 1
        setInterview({ ...interview, status: 'completed' })
        alert('Interview completed successfully!')
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    if (mins > 0) {
      return `${mins}m ${secs}s`
    }
    return `${secs}s`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Loading interview...</p>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4 text-lg">{error || 'Interview not found'}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  const isCompleted = interview.status === 'completed'
  const isPaused = interview.status === 'paused'
  const isInProgress = interview.status === 'in_progress'

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Interview Session</h1>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isCompleted ? 'bg-green-100 text-green-800' :
                  isPaused ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {interview.status === 'in_progress' ? 'In Progress' : 
                   interview.status === 'paused' ? 'Paused' : 
                   'Completed'}
                </span>
                <span className="text-gray-500 text-sm">
                  Phase {interview.current_phase}
                </span>
              </div>
            </div>
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>

          {/* Interview Metadata */}
          <div className="grid grid-cols-2 gap-6 pt-4 border-t">
            <div>
              <p className="text-sm text-gray-600 mb-1">Subject Matter Expert</p>
              <p className="font-semibold text-lg">{interview.sme_name}</p>
              <p className="text-gray-600">{interview.sme_title}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Equipment Being Documented</p>
              <p className="font-semibold text-lg">{interview.equipment_name}</p>
              <p className="text-gray-600">{interview.equipment_location}</p>
            </div>
          </div>

          {/* Status Indicator */}
          {saving && (
            <div className="mt-4 p-2 bg-blue-50 text-blue-700 text-sm rounded">
              💾 Saving session...
            </div>
          )}
          {isInProgress && currentSessionRef.current.texts.length > 0 && (
            <div className="mt-4 p-2 bg-green-50 text-green-700 text-sm rounded">
              📝 Recording in progress... ({currentSessionRef.current.texts.length} segments buffered)
            </div>
          )}
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Voice Recorder (2/3 width) */}
          <div className="col-span-2">
            {!isCompleted && isInProgress ? (
              <VoiceRecorder 
                key={voiceRecorderKeyRef.current}
                interviewId={interview.id}
                onTranscriptUpdate={handleTranscriptUpdate}
              />
            ) : isCompleted ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Interview Completed</h3>
                <p className="text-gray-600 mb-4">
                  This interview has been marked as complete. You can view the transcript but cannot add new recordings.
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Interview Paused</h3>
                <p className="text-gray-600 mb-4">
                  Recording is paused. Your progress has been saved. Click "Resume Interview" below to continue when ready.
                </p>
                <p className="text-sm text-gray-500">
                  You can leave and return anytime - your interview will resume from where you left off.
                </p>
              </div>
            )}

            {/* Control Buttons */}
            {!isCompleted && (
              <div className="mt-4 flex gap-3">
                {isInProgress ? (
                  <button
                    onClick={handlePause}
                    className="flex-1 bg-yellow-600 text-white py-3 px-6 rounded-lg hover:bg-yellow-700 font-medium"
                  >
                    ⏸️ Pause Interview
                  </button>
                ) : isPaused ? (
                  <button
                    onClick={handleResume}
                    className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium"
                  >
                    ▶️ Resume Interview
                  </button>
                ) : null}
                
                <button
                  onClick={handleComplete}
                  className="flex-1 bg-gray-800 text-white py-3 px-6 rounded-lg hover:bg-gray-900 font-medium"
                >
                  ✓ Complete Interview
                </button>
              </div>
            )}
          </div>

          {/* Right Column - Conversation History (1/3 width) */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h3 className="text-lg font-semibold mb-4">
                Full Transcript
              </h3>
              
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {interview.conversation_history && interview.conversation_history.length > 0 ? (
                  interview.conversation_history.map((entry: any, index: number) => (
                    <div key={index} className="pb-4 border-b border-gray-200 last:border-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-gray-500 font-medium">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-2">
                          {entry.duration && (
                            <span className="text-xs text-gray-400">
                              {formatDuration(entry.duration)}
                            </span>
                          )}
                          <span className="text-xs text-gray-400">
                            Phase {entry.phase}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-800 leading-relaxed">{entry.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-400 text-sm italic">
                    No transcript yet. Start recording to begin documenting.
                  </p>
                )}
              </div>

              {/* Transcript Stats */}
              {interview.conversation_history && interview.conversation_history.length > 0 && (
                <div className="mt-4 pt-4 border-t text-sm text-gray-600">
                  <p>Total sessions: {interview.conversation_history.length}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Last updated: {new Date(interview.updated_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}