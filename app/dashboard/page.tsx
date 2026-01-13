'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [interviews, setInterviews] = useState<Interview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      setUser(user)

      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading interviews:', error)
        setError('We couldn\'t load your interviews. Please try refreshing the page.')
      } else {
        setInterviews(data || [])
      }

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Something went wrong. Please try refreshing the page.')
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleDelete = async (interviewId: string, equipmentName: string) => {
    const confirmed = window.confirm(
      `Delete interview for "${equipmentName}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    try {
      setDeletingId(interviewId)
      
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        setError('Could not delete the interview. Please try again.')
        setDeletingId(null)
      } else {
        setInterviews(interviews.filter(i => i.id !== interviewId))
        setDeletingId(null)
      }
    } catch (err) {
      console.error('Error:', err)
      setError('Could not delete the interview. Please try again.')
      setDeletingId(null)
    }
  }

  const handleGenerateDocument = async (interviewId: string, equipmentName: string) => {
    try {
      setGeneratingId(interviewId)
      setError('')

      // POST request to generate document
      const response = await fetch(`/api/interview/${interviewId}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate document')
      }

      // Download the file
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${equipmentName.replace(/[^a-z0-9]/gi, '_')}_Operations_Manual_${new Date().toISOString().split('T')[0]}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      
      setGeneratingId(null)
    } catch (err) {
      console.error('Error generating document:', err)
      setError('Could not generate the document. Please try again.')
      setGeneratingId(null)
    }
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      'in_progress': { color: 'bg-blue-100 text-blue-700 border-blue-200', text: '● In Progress', icon: '●' },
      'paused': { color: 'bg-yellow-100 text-yellow-700 border-yellow-200', text: '⏸ Paused', icon: '⏸' },
      'completed': { color: 'bg-green-100 text-green-700 border-green-200', text: '✓ Complete', icon: '✓' },
      'terminated': { color: 'bg-red-100 text-red-700 border-red-200', text: '⚠ Ended Early', icon: '⚠' },
    }

    const badge = badges[status as keyof typeof badges] || { color: 'bg-gray-100 text-gray-700 border-gray-200', text: status, icon: '○' }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    })
  }

  const getQuestionCount = (interview: Interview) => {
    return interview.conversation_history?.filter((e: any) => e.speaker === 'AI').length || 0
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
          <p className="text-lg font-semibold text-gray-800">Loading your dashboard...</p>
          <p className="text-sm text-gray-500 mt-1">Just a moment</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Equipment Documentation</h1>
              <p className="text-gray-600">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg font-medium transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-8">
          <Link
            href="/interview/new"
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all group"
          >
            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Start New Interview
          </Link>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mt-0.5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

        {/* Empty State */}
        {interviews.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">No Interviews Yet</h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Start documenting your equipment knowledge with AI-guided interviews. 
              It's quick, easy, and helps preserve critical operational knowledge.
            </p>
            <Link
              href="/interview/new"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create Your First Interview
            </Link>
          </div>
        ) : (
          <>
            {/* Interviews Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {interviews.map((interview) => (
                <div
                  key={interview.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-all border border-gray-100 overflow-hidden group"
                >
                  {/* Card Header */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2 line-clamp-2">
                        {interview.equipment_name}
                      </h3>
                      {getStatusBadge(interview.status)}
                    </div>
                    
                    <div className="space-y-1">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">SME:</span> {interview.sme_name}
                      </p>
                      <p className="text-xs text-gray-500">{interview.sme_title}</p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-6 bg-gray-50 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Location:</span>
                      <span className="text-gray-900 font-medium text-right">{interview.equipment_location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Questions:</span>
                      <span className="text-blue-600 font-semibold">{getQuestionCount(interview)}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-200">
                      <span className="text-gray-600">Last updated:</span>
                      <span className="text-gray-900 font-medium">{formatDate(interview.updated_at)}</span>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-white border-t border-gray-100 space-y-2">
                    <Link
                      href={`/interview/${interview.id}`}
                      className="block w-full bg-blue-600 text-white text-center px-4 py-2.5 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                    >
                      {interview.status === 'completed' || interview.status === 'terminated' 
                        ? 'View Interview' 
                        : 'Continue Interview'}
                    </Link>
                    
                    {(interview.status === 'completed' || interview.status === 'terminated') && (
                      <button
                        onClick={() => handleGenerateDocument(interview.id, interview.equipment_name)}
                        disabled={generatingId === interview.id}
                        className="w-full bg-green-50 text-green-700 px-4 py-2.5 rounded-lg hover:bg-green-100 font-medium transition-colors border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {generatingId === interview.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </span>
                        ) : '📄 Download Document'}
                      </button>
                    )}
                    
                    <button
                      onClick={() => handleDelete(interview.id, interview.equipment_name)}
                      disabled={deletingId === interview.id}
                      className="w-full bg-red-50 text-red-600 px-4 py-2.5 rounded-lg hover:bg-red-100 font-medium transition-colors border border-red-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {deletingId === interview.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Deleting...
                        </span>
                      ) : '🗑️ Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats Summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Summary</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                  <p className="text-3xl font-bold text-blue-600">{interviews.length}</p>
                  <p className="text-sm text-gray-600 mt-1">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                  <p className="text-3xl font-bold text-green-600">
                    {interviews.filter(i => i.status === 'completed').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Complete</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-100">
                  <p className="text-3xl font-bold text-yellow-600">
                    {interviews.filter(i => i.status === 'in_progress' || i.status === 'paused').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">In Progress</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center border border-red-100">
                  <p className="text-3xl font-bold text-red-600">
                    {interviews.filter(i => i.status === 'terminated').length}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">Ended Early</p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
