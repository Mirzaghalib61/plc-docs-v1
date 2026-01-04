import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'Transcription service not configured' },
        { status: 500 }
      )
    }

    const apiFormData = new FormData()
    apiFormData.append('file', audioFile)
    apiFormData.append('model', 'whisper-1')
    apiFormData.append('language', 'en')

    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: apiFormData,
    })

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Transcription failed' },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      text: data.text || ''
    })

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to transcribe audio' },
      { status: 500 }
    )
  }
}

export const maxDuration = 30