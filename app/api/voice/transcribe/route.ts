import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    console.log('Transcribe API called')
    
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File
    const interviewId = formData.get('interviewId') as string

    console.log('Audio file:', {
      name: audioFile?.name,
      size: audioFile?.size,
      type: audioFile?.type
    })

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json(
        { error: 'No valid audio file provided' },
        { status: 400 }
      )
    }

    if (!interviewId) {
      return NextResponse.json(
        { error: 'No interview ID provided' },
        { status: 400 }
      )
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    console.log('Calling OpenAI Whisper API...')
    
    const arrayBuffer = await audioFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const file = new File([buffer], 'audio.wav', { type: 'audio/wav' })

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    })

    console.log('Transcription successful:', transcription)

    return NextResponse.json({
      text: transcription,
      interviewId: interviewId,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('Transcription error:', error?.message)

    return NextResponse.json(
      { 
        error: 'Transcription failed',
        details: error?.message || 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export const maxDuration = 30