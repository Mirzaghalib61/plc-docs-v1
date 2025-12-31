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
  const [aiThinking, setAiThinking] = useState(false)
  const [currentAiQuestion, setCurrentAiQuestion] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const params = useParams()
  const router = useRouter()
  const voiceRecorderKeyRef = useRef(0)
  const hasInitializedRef = useRef(false)

  useEffect(() => {
    initializeInterview()
  }, [params.id])

  const initializeInterview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUserId(user.id)

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', params.id)
        .single()

      if (error) {
        console.error('Fetch error:', error)
        setError('Interview not found')
        setLoading(false)
        return
      }

      setInterview(data)
      setLoading(false)

      // If conversation is empty and we haven't initialized, get first question
      if (!hasInitializedRef.current && (!data.conversation_history || data.conversation_history.length === 0)) {
        hasInitializedRef.current = true
        await getFirstQuestion(user.id, data.id)
      } else if (data.conversation_history && data.conversation_history.length > 0) {
        // Find the last AI question
        const lastAiEntry = [...data.conversation_history]
          .reverse()
          .find((entry: any) => entry.speaker === 'AI')
        
        if (lastAiEntry) {
          setCurrentAiQuestion(lastAiEntry.text)
        }
      }

    } catch (err) {
      console.error('Error:', err)
      setError('Failed to load interview')
      setLoading(false)
    }
  }

  const getFirstQuestion = async (uid: string, interviewId: string) => {
    try {
      setAiThinking(true)
      
      const response = await fetch('/api/interview/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: interviewId,
          smeResponse: '',
          userId: uid
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get first question')
      }

      setCurrentAiQuestion(data.aiResponse)
      
      // Refresh interview data
      const { data: updatedInterview } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single()

      if (updatedInterview) {
        setInterview(updatedInterview)
      }

    } catch (err: any) {
      console.error('Error getting first question:', err)
      setError(err.message || 'Failed to start interview')
    } finally {
      setAiThinking(false)
    }
  }

  const handleTranscriptComplete = async (fullTranscript: string) => {
    if (!interview || !userId || !fullTranscript.trim()) return

    try {
      setAiThinking(true)

      console.log('Sending transcript to AI:', fullTranscript)

      const response = await fetch('/api/interview/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          interviewId: interview.id,
          smeResponse: fullTranscript,
          userId: userId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process response')
      }

      setCurrentAiQuestion(data.aiResponse)

      // Refresh interview data from database
      const { data: updatedInterview } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interview.id)
        .single()

      if (updatedInterview) {
        setInterview(updatedInterview)
        
        // If interview is complete, update status
        if (data.isComplete) {
          setInterview({ ...updatedInterview, status: 'completed' })
        }
      }

    } catch (err: any) {
      console.error('Error processing transcript:', err)
      setError(err.message || 'Failed to process your response')
    } finally {
      setAiThinking(false)
    }
  }

  const handlePause = async () => {
    if (!interview) return

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
        voiceRecorderKeyRef.current += 1
        setInterview({ ...interview, status: 'in_progress' })
      }
    } catch (err) {
      console.error('Error:', err)
    }
  }

  const handleGenerateDocument = () => {
    // TODO: Implement document generation
    alert('Document generation will be implemented next!')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg">Loading interview...</p>
        </div>
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

  // Get conversation entries
  const conversationEntries = interview.conversation_history || []
  const smeEntries = conversationEntries.filter((e: any) => e.speaker === 'SME')
  const aiEntries = conversationEntries.filter((e: any) => e.speaker === 'AI')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">AI Interview Session</h1>
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
                  Phase {interview.current_phase} - Critical Equipment Info
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
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - AI Question & Voice Recorder */}
          <div className="col-span-2 space-y-6">
            
            {/* Current AI Question */}
            {currentAiQuestion && !isCompleted && (
              <div className="bg-blue-50 border-l-4 border-blue-600 p-6 rounded-lg shadow">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                    AI
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2">Current Question:</h3>
                    <p className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap">
                      {currentAiQuestion}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Thinking State */}
            {aiThinking && (
              <div className="bg-purple-50 border-l-4 border-purple-600 p-6 rounded-lg shadow">
                <div className="flex items-center gap-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                  <p className="text-purple-900 font-medium">AI is processing your response...</p>
                </div>
              </div>
            )}

            {/* Interview Complete - Generate Document */}
            {isCompleted && (
              <div className="bg-green-50 border-l-4 border-green-600 p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  ✓ Interview Complete!
                </h3>
                <p className="text-gray-700 mb-4">
                  {currentAiQuestion}
                </p>
                <button
                  onClick={handleGenerateDocument}
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium"
                >
                  📄 Generate Documentation
                </button>
              </div>
            )}

            {/* Voice Recorder */}
            {!isCompleted && isInProgress && !aiThinking ? (
              <div className="bg-white rounded-lg shadow">
                <VoiceRecorder 
                  key={voiceRecorderKeyRef.current}
                  interviewId={interview.id}
                  onTranscriptUpdate={() => {}} // Not used anymore
                  onRecordingComplete={handleTranscriptComplete}
                />
              </div>
            ) : isPaused ? (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Interview Paused</h3>
                <p className="text-gray-600 mb-4">
                  Recording is paused. Your progress has been saved. Click "Resume Interview" below to continue.
                </p>
              </div>
            ) : isCompleted ? null : (
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-500 text-center italic">
                  Please wait for AI to finish processing...
                </p>
              </div>
            )}

            {/* Control Buttons */}
            {!isCompleted && (
              <div className="flex gap-3">
                {isInProgress && !aiThinking ? (
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
              </div>
            )}
          </div>

          {/* Right Column - Conversation History */}
          <div className="col-span-1">
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Interview Progress
                </h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showHistory ? 'Hide' : 'Show'} Details
                </button>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 mb-4 pb-4 border-b">
                <div>
                  <p className="text-xs text-gray-500">Questions Asked</p>
                  <p className="text-2xl font-bold text-blue-600">{aiEntries.length}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Responses Given</p>
                  <p className="text-2xl font-bold text-green-600">{smeEntries.length}</p>
                </div>
              </div>

              {/* Collapsible History */}
              {showHistory && (
                <div className="space-y-4 max-h-[500px] overflow-y-auto">
                  {conversationEntries.length > 0 ? (
                    conversationEntries.map((entry: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg ${
                          entry.speaker === 'AI' 
                            ? 'bg-blue-50 border-l-2 border-blue-600' 
                            : 'bg-green-50 border-l-2 border-green-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${
                            entry.speaker === 'AI' ? 'text-blue-700' : 'text-green-700'
                          }`}>
                            {entry.speaker === 'AI' ? '🤖 AI' : '👤 SME'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-800 leading-relaxed">
                          {entry.text.substring(0, 150)}
                          {entry.text.length > 150 ? '...' : ''}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic text-center">
                      No conversation yet
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}