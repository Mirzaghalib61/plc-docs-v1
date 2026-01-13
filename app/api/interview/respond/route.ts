import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { getNextQuestion, InterviewContext } from '@/lib/interview-engine'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { interviewId, smeResponse, userId } = body

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

    const { data: interview, error: fetchError } = await supabase
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .eq('user_id', userId)
      .single()

    if (fetchError || !interview) {
      return NextResponse.json(
        { error: 'Interview not found or access denied' },
        { status: 404 }
      )
    }

    if (interview.status === 'completed') {
      return NextResponse.json(
        { error: 'Interview is already completed' },
        { status: 400 }
      )
    }

    const context: InterviewContext = {
      equipmentName: interview.equipment_name,
      smeName: interview.sme_name,
      smeTitle: interview.sme_title,
      equipmentLocation: interview.equipment_location,
      currentPhase: interview.current_phase,
      conversationHistory: interview.conversation_history || []
    }

    const result = await getNextQuestion(context, smeResponse)

    if (result.error) {
      return NextResponse.json(
        { error: result.error },
        { status: 500 }
      )
    }

    const updatedHistory = [...(interview.conversation_history || [])]

    if (smeResponse && smeResponse.trim().length > 0) {
      updatedHistory.push({
        timestamp: new Date().toISOString(),
        text: smeResponse.trim(),
        phase: interview.current_phase,
        speaker: 'SME'
      })
    }

    updatedHistory.push({
      timestamp: new Date().toISOString(),
      text: result.nextQuestion,
      phase: interview.current_phase,
      speaker: 'AI'
    })

    const updatePayload: any = {
      conversation_history: updatedHistory,
      updated_at: new Date().toISOString()
    }

    if (result.isComplete) {
      updatePayload.status = 'completed'
    }

    const { error: updateError } = await supabase
      .from('interviews')
      .update(updatePayload)
      .eq('id', interviewId)
      .eq('user_id', userId)

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save conversation update' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      aiResponse: result.nextQuestion,
      isComplete: result.isComplete,
      conversationHistory: updatedHistory,
      analysis: result.analysis
    })

  } catch (error: any) {
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    )
  }
}

export const maxDuration = 30