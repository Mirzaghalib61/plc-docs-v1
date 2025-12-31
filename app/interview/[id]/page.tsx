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
  const [documentGenerating, setDocumentGenerating] = useState(false)
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
        setError('We couldn\'t find this interview. It may have been deleted.')
        setLoading(false)
        return
      }

      setInterview(data)
      setLoading(false)

      if (!hasInitializedRef.current && (!data.conversation_history || data.conversation_history.length === 0)) {
        hasInitializedRef.current = true
        await getFirstQuestion(user.id, data.id)
      } else if (data.conversation_history && data.conversation_history.length > 0) {
        const lastAiEntry = [...data.conversation_history]
          .reverse()
          .find((entry: any) => entry.speaker === 'AI')
        
        if (lastAiEntry) {
          setCurrentAiQuestion(lastAiEntry.text)
        }
      }

    } catch (err) {
      console.error('Error:', err)
      setError('Something went wrong loading the interview. Please try refreshing the page.')
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
        throw new Error(data.error || 'Failed to start interview')
      }

      setCurrentAiQuestion(data.aiResponse)
      
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
      setError('We couldn\'t start the interview. Please try again.')
    } finally {
      setAiThinking(false)
    }
  }

  const handleTranscriptComplete = async (fullTranscript: string) => {
    if (!interview || !userId || !fullTranscript.trim()) return

    try {
      setAiThinking(true)
      setError('')

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

      const { data: updatedInterview } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interview.id)
        .single()

      if (updatedInterview) {
        setInterview(updatedInterview)
        
        if (data.isComplete) {
          setInterview({ ...updatedInterview, status: 'completed' })
        }
      }

    } catch (err: any) {
      console.error('Error processing transcript:', err)
      setError('We couldn\'t process your response. Please try recording again.')
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
        setError('Could not pause the interview. Please try again.')
      } else {
        voiceRecorderKeyRef.current += 1
        setInterview({ ...interview, status: 'paused' })
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Could not pause the interview. Please try again.')
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
        setError('Could not resume the interview. Please try again.')
      } else {
        voiceRecorderKeyRef.current += 1
        setInterview({ ...interview, status: 'in_progress' })
        setError('')
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Could not resume the interview. Please try again.')
    }
  }

  const handleTerminate = async () => {
    if (!interview) return

    const confirmed = window.confirm(
      'Are you sure you want to end this interview early?\n\n' +
      'The AI hasn\'t finished gathering all the information yet. You can always pause and come back later instead.\n\n' +
      'End interview now?'
    )

    if (!confirmed) return

    try {
      const terminationEntry = {
        timestamp: new Date().toISOString(),
        text: '[INTERVIEW ENDED EARLY]\n\nThis interview was ended before the AI finished gathering all critical equipment information.',
        phase: interview.current_phase,
        speaker: 'SYSTEM'
      }

      const updatedHistory = [...(interview.conversation_history || []), terminationEntry]

      const { error } = await supabase
        .from('interviews')
        .update({ 
          status: 'terminated',
          conversation_history: updatedHistory,
          updated_at: new Date().toISOString()
        })
        .eq('id', interview.id)

      if (error) {
        console.error('Error terminating interview:', error)
        setError('Could not end the interview. Please try again.')
      } else {
        voiceRecorderKeyRef.current += 1
        setInterview({ 
          ...interview, 
          status: 'terminated',
          conversation_history: updatedHistory
        })
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Could not end the interview. Please try again.')
    }
  }

  const handleGenerateDocument = async () => {
    if (!interview) return

    try {
      setDocumentGenerating(true)
      const downloadUrl = `/api/interview/${interview.id}/generate`
      window.open(downloadUrl, '_blank')
      
      setTimeout(() => {
        setDocumentGenerating(false)
      }, 2000)
    } catch (err) {
      console.error('Error generating document:', err)
      setError('Could not generate the document. Please try again.')
      setDocumentGenerating(false)
    }
  }

  const retryInitialize = () => {
    setError('')
    setLoading(true)
    initializeInterview()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-8 w-8 bg-blue-600 rounded-full opacity-20 animate-ping"></div>
            </div>
          </div>
          <p className="text-lg font-medium text-gray-700">Loading your interview...</p>
          <p className="text-sm text-gray-500 mt-1">This will just take a moment</p>
        </div>
      </div>
    )
  }

  if (error && !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={retryInitialize}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/dashboard"
              className="block w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isCompleted = interview?.status === 'completed'
  const isPaused = interview?.status === 'paused'
  const isInProgress = interview?.status === 'in_progress'
  const isTerminated = interview?.status === 'terminated'

  const conversationEntries = interview?.conversation_history || []
  const smeEntries = conversationEntries.filter((e: any) => e.speaker === 'SME')
  const aiEntries = conversationEntries.filter((e: any) => e.speaker === 'AI')

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">AI Interview Session</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  isCompleted ? 'bg-green-100 text-green-800' :
                  isTerminated ? 'bg-red-100 text-red-800' :
                  isPaused ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {interview?.status === 'in_progress' ? '● In Progress' : 
                   interview?.status === 'paused' ? '⏸ Paused' : 
                   interview?.status === 'terminated' ? '⚠ Ended Early' :
                   '✓ Complete'}
                </span>
                <span className="text-gray-500 text-sm">
                  Phase {interview?.current_phase} - Critical Equipment Info
                </span>
              </div>
            </div>
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm hover:underline"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs text-blue-600 font-medium mb-1">Subject Matter Expert</p>
              <p className="font-semibold text-gray-900">{interview?.sme_name}</p>
              <p className="text-sm text-gray-600">{interview?.sme_title}</p>
            </div>
            <div className="bg-indigo-50 rounded-lg p-4">
              <p className="text-xs text-indigo-600 font-medium mb-1">Equipment</p>
              <p className="font-semibold text-gray-900">{interview?.equipment_name}</p>
              <p className="text-sm text-gray-600">{interview?.equipment_location}</p>
            </div>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="text-red-800 font-medium">{error}</p>
                <button
                  onClick={() => setError('')}
                  className="text-red-600 text-sm hover:text-red-700 mt-1 font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main Interview Area */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Terminated State */}
            {isTerminated && (
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Interview Ended Early</h3>
                    <p className="text-gray-700 text-sm">
                      This interview was ended before the AI finished gathering all critical information. 
                      You can still generate a document with the information collected so far.
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateDocument}
                  disabled={documentGenerating}
                  className="w-full sm:w-auto bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {documentGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : '📄 Generate Partial Documentation'}
                </button>
              </div>
            )}

            {/* AI Question Display */}
            {currentAiQuestion && !isCompleted && !isTerminated && (
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-l-4 border-blue-600 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-md">
                    <span className="text-white font-bold text-lg">AI</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-blue-900 mb-2 text-sm">Current Question:</h3>
                    <p className="text-gray-800 text-base leading-relaxed whitespace-pre-wrap">
                      {currentAiQuestion}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* AI Thinking State */}
            {aiThinking && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-purple-200 border-t-purple-600"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-6 w-6 bg-purple-600 rounded-full opacity-20 animate-ping"></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-purple-900 font-semibold">AI is analyzing your response...</p>
                    <p className="text-purple-700 text-sm">This usually takes just a few seconds</p>
                  </div>
                </div>
              </div>
            )}

            {/* Completed State */}
            {isCompleted && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-sm">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">Interview Complete! 🎉</h3>
                    <p className="text-gray-700 text-sm mb-3">{currentAiQuestion}</p>
                  </div>
                </div>
                <button
                  onClick={handleGenerateDocument}
                  disabled={documentGenerating}
                  className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 font-medium transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {documentGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Document...
                    </span>
                  ) : '📄 Generate Final Documentation'}
                </button>
              </div>
            )}

            {/* Voice Recorder with Instructions */}
            {!isCompleted && !isTerminated && isInProgress && !aiThinking ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100">
                {/* Helpful Instructions */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100 p-4 rounded-t-xl">
                  <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    How it works
                  </h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">1.</span>
                      <span>Click "Start Recording" and speak naturally - just like having a conversation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">2.</span>
                      <span>Click "Stop & Submit" when you're done answering</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-600 font-bold">3.</span>
                      <span>The AI will ask follow-up questions to get more details</span>
                    </li>
                  </ul>
                </div>
                
                <VoiceRecorder 
                  key={voiceRecorderKeyRef.current}
                  interviewId={interview?.id || ''}
                  onTranscriptUpdate={() => {}}
                  onRecordingComplete={handleTranscriptComplete}
                />
              </div>
            ) : isPaused ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Interview Paused</h3>
                <p className="text-gray-600 mb-1">Your progress has been saved automatically.</p>
                <p className="text-sm text-gray-500">Click "Resume Interview" below when you're ready to continue.</p>
              </div>
            ) : (isCompleted || isTerminated) ? null : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="animate-pulse">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto"></div>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            {!isCompleted && !isTerminated && (
              <div className="flex flex-col sm:flex-row gap-3">
                {isInProgress && !aiThinking ? (
                  <>
                    <button
                      onClick={handlePause}
                      className="flex-1 bg-yellow-500 text-white py-3 px-6 rounded-lg hover:bg-yellow-600 font-medium transition-all shadow-sm"
                    >
                      ⏸ Pause & Save Progress
                    </button>
                    <button
                      onClick={handleTerminate}
                      className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium transition-all shadow-sm"
                    >
                      End Interview Early
                    </button>
                  </>
                ) : isPaused ? (
                  <>
                    <button
                      onClick={handleResume}
                      className="flex-1 bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 font-medium transition-all shadow-sm"
                    >
                      ▶ Resume Interview
                    </button>
                    <button
                      onClick={handleTerminate}
                      className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 font-medium transition-all shadow-sm"
                    >
                      End Interview Early
                    </button>
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* Right Column - Progress Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 sticky top-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Progress</h3>
                <button
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  {showHistory ? 'Hide' : 'Show'} Details
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4 pb-4 border-b border-gray-100">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{aiEntries.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Questions</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{smeEntries.length}</p>
                  <p className="text-xs text-gray-600 mt-1">Responses</p>
                </div>
              </div>

              {/* History */}
              {showHistory && (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {conversationEntries.length > 0 ? (
                    conversationEntries.map((entry: any, index: number) => (
                      <div 
                        key={index} 
                        className={`p-3 rounded-lg text-xs ${
                          entry.speaker === 'AI' 
                            ? 'bg-blue-50 border-l-2 border-blue-400' 
                            : entry.speaker === 'SYSTEM'
                            ? 'bg-red-50 border-l-2 border-red-400'
                            : 'bg-green-50 border-l-2 border-green-400'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold ${
                            entry.speaker === 'AI' ? 'text-blue-700' : 
                            entry.speaker === 'SYSTEM' ? 'text-red-700' : 'text-green-700'
                          }`}>
                            {entry.speaker === 'AI' ? '🤖 AI' : entry.speaker === 'SYSTEM' ? '⚠️ System' : '👤 You'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed">
                          {entry.text.length > 120 ? `${entry.text.substring(0, 120)}...` : entry.text}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400 text-sm italic text-center py-4">
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