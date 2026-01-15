import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateQADocument } from '@/lib/document-generator'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle OPTIONS requests (CORS preflight)
export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}

// Handle GET requests by returning an error
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'This endpoint requires a POST request. Please use POST method.' },
    { status: 405, headers: corsHeaders }
  )
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get the interview
    const { data: interview, error: interviewError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', id)
      .single()

    if (interviewError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Generate the Q&A document
    const documentBuffer = await generateQADocument(interview)

    if (!documentBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate Q&A document' },
        { status: 500, headers: corsHeaders }
      )
    }

    const filename = `${interview.equipment_name.replace(/[^a-z0-9]/gi, '_')}_QA_Transcript_${new Date().toISOString().split('T')[0]}.docx`

    return new NextResponse(new Blob([new Uint8Array(documentBuffer)]), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating Q&A document:', error)
    return NextResponse.json(
      { error: 'Failed to generate Q&A document' },
      { status: 500, headers: corsHeaders }
    )
  }
}

export const maxDuration = 30
