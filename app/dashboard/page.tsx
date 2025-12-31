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

      // Load all interviews for this user
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })

      if (error) {
        console.error('Error loading interviews:', error)
        setError('Failed to load interviews')
      } else {
        setInterviews(data || [])
      }

      setLoading(false)
    } catch (err) {
      console.error('Dashboard error:', err)
      setError('Failed to load dashboard')
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
      `Are you sure you want to delete the interview for "${equipmentName}"?\n\nThis action cannot be undone.`
    )

    if (!confirmed) return

    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId)
        .eq('user_id', user.id)

      if (error) {
        console.error('Delete error:', error)
        alert('Failed to delete interview')
      } else {
        // Remove from local state
        setInterviews(interviews.filter(i => i.id !== interviewId))
        alert('Interview deleted successfully')
      }
    } catch (err) {
      console.error('Error:', err)
      alert('Failed to delete interview')
    }
  }

  const handleGenerateDocument = (interviewId: string) => {
    const downloadUrl = `/api/interview/${interviewId}/generate`
    window.open(downloadUrl, '_blank')
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      'in_progress': { color: 'bg-yellow-100 text-yellow-800', text: 'In Progress' },
      'paused': { color: 'bg-blue-100 text-blue-800', text: 'Paused' },
      'completed': { color: 'bg-green-100 text-green-800', text: 'Completed' },
      'terminated': { color: 'bg-red-100 text-red-800', text: 'Terminated' },
    }

    const badge = badges[status as keyof typeof badges] || { color: 'bg-gray-100 text-gray-800', text: status }

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${badge.color}`}>
        {badge.text}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getQuestionCount = (interview: Interview) => {
    return interview.conversation_history?.filter((e: any) => e.speaker === 'AI').length || 0
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Equipment Documentation Dashboard</h1>
              <p className="text-gray-600 mt-1">Welcome back, {user?.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 font-medium"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Action Bar */}
        <div className="mb-6">
          <Link
            href="/interview/new"
            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            ➕ Start New Interview
          </Link>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Interviews Grid */}
        {interviews.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No interviews yet</h3>
            <p className="text-gray-500 mb-6">Get started by creating your first equipment documentation interview.</p>
            <Link
              href="/interview/new"
              className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 font-semibold"
            >
              Create First Interview
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {interviews.map((interview) => (
              <div
                key={interview.id}
                className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow border border-gray-200"
              >
                {/* Card Header */}
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-xl font-bold text-gray-900 flex-1 pr-2">
                      {interview.equipment_name}
                    </h3>
                    {getStatusBadge(interview.status)}
                  </div>
                  
                  <p className="text-gray-600 text-sm mb-1">
                    <span className="font-semibold">SME:</span> {interview.sme_name}
                  </p>
                  <p className="text-gray-500 text-xs">
                    {interview.sme_title}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-6 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Location:</span>
                    <span className="text-gray-900 font-medium">{interview.equipment_location}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Questions:</span>
                    <span className="text-gray-900 font-medium">{getQuestionCount(interview)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Created:</span>
                    <span className="text-gray-900 font-medium">{formatDate(interview.created_at)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Last Updated:</span>
                    <span className="text-gray-900 font-medium">{formatDate(interview.updated_at)}</span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-2">
                  <Link
                    href={`/interview/${interview.id}`}
                    className="block w-full bg-blue-600 text-white text-center px-4 py-2 rounded-lg hover:bg-blue-700 font-medium transition-colors"
                  >
                    {interview.status === 'completed' || interview.status === 'terminated' 
                      ? 'View Interview' 
                      : 'Continue Interview'}
                  </Link>
                  
                  {(interview.status === 'completed' || interview.status === 'terminated') && (
                    <button
                      onClick={() => handleGenerateDocument(interview.id)}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 font-medium transition-colors"
                    >
                      📄 Generate Document
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDelete(interview.id, interview.equipment_name)}
                    className="w-full bg-red-100 text-red-700 px-4 py-2 rounded-lg hover:bg-red-200 font-medium transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Summary */}
        {interviews.length > 0 && (
          <div className="mt-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-600">{interviews.length}</p>
                <p className="text-sm text-gray-600">Total Interviews</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-green-600">
                  {interviews.filter(i => i.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-yellow-600">
                  {interviews.filter(i => i.status === 'in_progress' || i.status === 'paused').length}
                </p>
                <p className="text-sm text-gray-600">In Progress</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-red-600">
                  {interviews.filter(i => i.status === 'terminated').length}
                </p>
                <p className="text-sm text-gray-600">Terminated</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}