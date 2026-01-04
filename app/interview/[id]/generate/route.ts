import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateInterviewDocument } from '@/lib/document-generator'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await params

    console.log('Generate document API called for interview:', interviewId)

    // Load interview from database
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single()

    if (fetchError || !interview) {
      console.error('Interview fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    console.log('Generating document for:', interview.equipment_name)

    // Generate DOCX document
    const documentBuffer = await generateInterviewDocument(interview)

    // Create filename
    const filename = `${interview.equipment_name.replace(/[^a-z0-9]/gi, '_')}_Documentation_${new Date().toISOString().split('T')[0]}.docx`

    // Return file with proper headers
    return new NextResponse(new Blob([new Uint8Array(documentBuffer)]), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': documentBuffer.length.toString(),
      },
    })

  } catch (error: any) {
    console.error('Document generation error:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate document',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export const maxDuration = 30