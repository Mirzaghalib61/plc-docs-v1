'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function NewInterviewPage() {
  const [smeName, setSmeName] = useState('')
  const [smeTitle, setSmeTitle] = useState('')
  const [equipmentName, setEquipmentName] = useState('')
  const [equipmentLocation, setEquipmentLocation] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('You must be logged in to create an interview')
      setLoading(false)
      return
    }

    // Insert interview
    const { data, error: insertError } = await supabase
      .from('interviews')
      .insert({
        user_id: user.id,
        sme_name: smeName,
        sme_title: smeTitle,
        equipment_name: equipmentName,
        equipment_location: equipmentLocation,
      })
      .select()
      .single()

    if (insertError) {
      console.error('Insert error:', insertError)
      setError(insertError.message)
      setLoading(false)
    } else {
      // Redirect to interview page
      router.push(`/interview/${data.id}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">New Interview</h1>
            <Link 
              href="/dashboard"
              className="text-blue-600 hover:underline"
            >
              Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                SME Name *
              </label>
              <input
                type="text"
                value={smeName}
                onChange={(e) => setSmeName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="John Smith"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                SME Title *
              </label>
              <input
                type="text"
                value={smeTitle}
                onChange={(e) => setSmeTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Senior PLC Engineer"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Equipment Name *
              </label>
              <input
                type="text"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Mixing Line #3"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Equipment Location *
              </label>
              <input
                type="text"
                value={equipmentLocation}
                onChange={(e) => setEquipmentLocation(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Building A, Floor 2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading ? 'Creating...' : 'Start Interview'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}