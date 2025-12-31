import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getNextQuestion, InterviewContext } from '@/lib/interview-engine'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { interviewId, smeResponse, userId } = body

    console.log('Interview respond API called:', { interviewId, userId })

    // Validate required fields
    if (!interviewId) {
      return NextResponse.json(
        { error: 'Interview ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 401 }
      )
    }

    // Load interview from database
    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !interview) {
      console.error('Interview fetch error:', fetchError)
      return NextResponse.json(
        { error: 'Interview not found or access denied' },
        { status: 404 }
      )
    }

    // Check if interview is in a state that allows responses
    if (interview.status === 'completed') {
      return NextResponse.json(
        { error: 'Interview is already completed' },
        { status: 400 }
      )
    }

    // Build interview context
    const context: InterviewContext = {
      equipmentName: interview.equipment_name,
      smeName: interview.sme_name,
      smeTitle: interview.sme_title,
      equipmentLocation: interview.equipment_location,
      currentPhase: interview.current_phase,
      conversationHistory: interview.conversation_history || []
    }

    // Get next question from interview engine
    console.log('Calling interview engine...')
    const result = await getNextQuestion(context, smeResponse)

    if (result.error) {
      console.error('Interview engine error:', result.error)
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    // Prepare updated conversation history
    const updatedHistory = [...(interview.conversation_history || [])]

    // Add SME's response if provided
    if (smeResponse && smeResponse.trim().length > 0) {
      updatedHistory.push({
        timestamp: new Date().toISOString(),
        text: smeResponse.trim(),
        phase: interview.current_phase,
        speaker: 'SME'
      })
    }

    // Add AI's response
    updatedHistory.push({
      timestamp: new Date().toISOString(),
      text: result.nextQuestion,
      phase: interview.current_phase,
      speaker: 'AI'
    })

    // Prepare update payload
    const updatePayload: any = {
      conversation_history: updatedHistory,
      updated_at: new Date().toISOString()
    }

    // Update status if interview is complete
    if (result.isComplete) {
      updatePayload.status = 'completed'
      console.log('Interview marked as complete')
    }

    // Save updated conversation to database
    const { error: updateError } = await supabase
      .from('interviews')
      .update(updatePayload)
      .eq('id', interviewId)
      .eq('user_id', userId)

    if (updateError) {
      console.error('Database update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to save conversation update' },
        { status: 500 }
      )
    }

    console.log('Interview updated successfully')

    // Return success response
    return NextResponse.json({
      success: true,
      aiResponse: result.nextQuestion,
      isComplete: result.isComplete,
      conversationHistory: updatedHistory,
      analysis: result.analysis
    })

  } catch (error: any) {
    console.error('Interview respond API error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error?.message || 'Unknown error occurred'
      },
      { status: 500 }
    )
  }
}

export const maxDuration = 30
