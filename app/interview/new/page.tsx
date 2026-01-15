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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-2xl mx-auto p-4 sm:p-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 sm:p-6 md:p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">New Interview</h1>
            <Link
              href="/dashboard"
              className="text-blue-600 hover:text-blue-700 font-medium text-sm sm:text-base active:scale-95 transition-all"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {error && (
            <div className="mb-4 p-3 sm:p-4 bg-red-50 text-red-700 rounded-lg border-l-4 border-red-500 text-sm sm:text-base">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                SME Name *
              </label>
              <input
                type="text"
                value={smeName}
                onChange={(e) => setSmeName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                required
                placeholder="John Smith"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                SME Title *
              </label>
              <input
                type="text"
                value={smeTitle}
                onChange={(e) => setSmeTitle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                required
                placeholder="Senior PLC Engineer"
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Equipment Name *
              </label>
              <input
                type="text"
                value={equipmentName}
                onChange={(e) => setEquipmentName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                required
                placeholder="Mixing Line #3"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold mb-2 text-gray-700">
                Equipment Location *
              </label>
              <input
                type="text"
                value={equipmentLocation}
                onChange={(e) => setEquipmentLocation(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-base"
                required
                placeholder="Building A, Floor 2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 sm:py-3.5 rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 font-semibold text-base sm:text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:active:scale-100"
            >
              {loading ? 'Creating...' : 'Start Interview'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}