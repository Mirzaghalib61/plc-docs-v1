import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { generateInterviewDocument } from '@/lib/document-generator'

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
        { status: 404 }
      )
    }

    // Generate the document
    const documentBuffer = await generateInterviewDocument(interview)
    
    if (!documentBuffer) {
      return NextResponse.json(
        { error: 'Failed to generate document' },
        { status: 500 }
      )
    }

    const filename = `${interview.equipment_name.replace(/[^a-z0-9]/gi, '_')}_Operations_Manual_${new Date().toISOString().split('T')[0]}.docx`

    return new NextResponse(new Blob([new Uint8Array(documentBuffer)]), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('Error generating document:', error)
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    )
  }
}