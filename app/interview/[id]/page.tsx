'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Interview {
  id: string
  sme_name: string
  sme_title: string
  equipment_name: string
  equipment_location: string
  current_phase: number
  status: string
  created_at: string
}

export default function InterviewPage() {
  const [interview, setInterview] = useState<Interview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const params = useParams()
  const router = useRouter()

  useEffect(() => {
    const fetchInterview = async () => {
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
        setLoading(false)
      }
    }

    fetchInterview()
  }, [params.id, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Interview not found'}</p>
          <Link href="/dashboard" className="text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Interview</h1>
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>

          <div className="border-b pb-4 mb-4">
            <h2 className="text-lg font-semibold mb-3">Interview Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">SME Name</p>
                <p className="font-medium">{interview.sme_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">SME Title</p>
                <p className="font-medium">{interview.sme_title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Equipment Name</p>
                <p className="font-medium">{interview.equipment_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Equipment Location</p>
                <p className="font-medium">{interview.equipment_location}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Current Phase</p>
                <p className="font-medium">Phase {interview.current_phase}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-medium capitalize">{interview.status}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded">
            <p className="text-gray-600 text-center">
              Interview interface will go here
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}