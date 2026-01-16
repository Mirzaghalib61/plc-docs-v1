import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function OPTIONS() {
  return NextResponse.json({}, { status: 200, headers: corsHeaders })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { entryIndex, newText } = await request.json()

    if (typeof entryIndex !== 'number' || typeof newText !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request. entryIndex (number) and newText (string) are required.' },
        { status: 400, headers: corsHeaders }
      )
    }

    if (!newText.trim()) {
      return NextResponse.json(
        { error: 'Answer cannot be empty.' },
        { status: 400, headers: corsHeaders }
      )
    }

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

    const conversationHistory = interview.conversation_history || []

    // Validate the entry index
    if (entryIndex < 0 || entryIndex >= conversationHistory.length) {
      return NextResponse.json(
        { error: 'Invalid entry index' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Verify this is an SME entry (user can only edit their own answers)
    if (conversationHistory[entryIndex].speaker !== 'SME') {
      return NextResponse.json(
        { error: 'Can only edit SME responses' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Update the entry
    conversationHistory[entryIndex] = {
      ...conversationHistory[entryIndex],
      text: newText.trim(),
      edited: true,
      editedAt: new Date().toISOString(),
    }

    // Save to database
    const { error: updateError } = await supabase
      .from('interviews')
      .update({
        conversation_history: conversationHistory,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating interview:', updateError)
      return NextResponse.json(
        { error: 'Failed to update answer' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json(
      { success: true, updatedEntry: conversationHistory[entryIndex] },
      { status: 200, headers: corsHeaders }
    )
  } catch (error) {
    console.error('Error updating answer:', error)
    return NextResponse.json(
      { error: 'Failed to update answer' },
      { status: 500, headers: corsHeaders }
    )
  }
}
