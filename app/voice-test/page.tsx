'use client'

import VoiceRecorder from '@/components/VoiceRecorder'

export default function VoiceTestPage() {
  const handleTranscriptUpdate = (text: string) => {
    console.log('New transcript received:', text)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Voice Recorder Test</h1>
        
        <VoiceRecorder 
          interviewId="test-interview-123"
          onTranscriptUpdate={handleTranscriptUpdate}
        />
      </div>
    </div>
  )
}