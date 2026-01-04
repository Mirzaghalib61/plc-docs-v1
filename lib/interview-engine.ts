import * as fs from 'fs'
import * as path from 'path'

export interface InterviewContext {
  equipmentName: string
  smeName: string
  smeTitle: string
  equipmentLocation: string
  currentPhase: number
  conversationHistory: any[]
}

export interface InterviewResult {
  nextQuestion: string
  isComplete: boolean
  analysis?: any
  error?: string
}

const SYSTEM_PROMPT = fs.readFileSync(
  path.join(process.cwd(), 'prompts', 'interview-system-prompt.txt'),
  'utf-8'
)

export function buildConversationContext(context: InterviewContext): string {
  const metadata = `
Equipment: ${context.equipmentName}
Location: ${context.equipmentLocation}
Subject Matter Expert: ${context.smeName}, ${context.smeTitle}
Current Phase: ${context.currentPhase}
`

  const history = context.conversationHistory
    .map(entry => `[${entry.speaker}]: ${entry.text}`)
    .join('\n\n')

  return `${metadata}\n\nConversation History:\n${history}`
}

export async function getNextQuestion(
  context: InterviewContext,
  smeResponse: string
): Promise<InterviewResult> {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        nextQuestion: '',
        isComplete: false,
        error: 'Anthropic API key not configured'
      }
    }

    const Anthropic = require('@anthropic-ai/sdk')
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const conversationContext = buildConversationContext(context)
    const userMessage = smeResponse 
      ? `${conversationContext}\n\nSME's latest response: ${smeResponse}`
      : conversationContext

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: userMessage
      }]
    })

    const aiResponse = response.content[0].text
    const isComplete = aiResponse.includes('[INTERVIEW_COMPLETE]')
    const cleanResponse = aiResponse.replace('[INTERVIEW_COMPLETE]', '').trim()

    return {
      nextQuestion: cleanResponse,
      isComplete: isComplete,
      analysis: response.usage
    }

  } catch (error: any) {
    if (error?.status === 401) {
      return {
        nextQuestion: '',
        isComplete: false,
        error: 'Authentication failed. Please check API credentials.'
      }
    }

    if (error?.status === 429) {
      return {
        nextQuestion: '',
        isComplete: false,
        error: 'Rate limit exceeded. Please try again in a moment.'
      }
    }

    return {
      nextQuestion: '',
      isComplete: false,
      error: error?.message || 'Failed to process interview'
    }
  }
}

export async function analyzeInterview(context: InterviewContext): Promise<any> {
  try {
    const conversationContext = buildConversationContext(context)
    
    const Anthropic = require('@anthropic-ai/sdk')
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze this interview and provide a brief assessment of coverage and quality:\n\n${conversationContext}`
      }]
    })

    return {
      assessment: response.content[0].text,
      usage: response.usage
    }

  } catch (error: any) {
    return {
      assessment: 'Analysis unavailable',
      error: error?.message
    }
  }
}