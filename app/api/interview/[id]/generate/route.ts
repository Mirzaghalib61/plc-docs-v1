import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateStructuredDocument } from '@/lib/document-generator-structured'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: interviewId } = await context.params

    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single()

    if (fetchError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found' },
        { status: 404 }
      )
    }

    const documentBuffer = await generateStructuredDocument(interview)

    const filename = `${interview.equipment_name.replace(/[^a-z0-9]/gi, '_')}_Operations_Manual_${new Date().toISOString().split('T')[0]}.docx`

    return new NextResponse(new Blob([documentBuffer]), {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': documentBuffer.length.toString(),
      },
    })

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Failed to generate document',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

export const maxDuration = 60