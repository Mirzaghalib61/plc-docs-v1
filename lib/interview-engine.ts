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

    let aiResponse = response.content[0].text
    const isComplete = aiResponse.includes('[INTERVIEW_COMPLETE]')

    // Remove completion marker
    let cleanResponse = aiResponse.replace('[INTERVIEW_COMPLETE]', '').trim()

    // CRITICAL: Prevent hallucinated conversations
    // If the AI outputs simulated SME responses (e.g., "[SME]:", "SME:", or multiple turns),
    // we need to extract only the AI's first question/statement
    const halluccinationPatterns = [
      /\[SME\]:/i,
      /\nSME:/i,
      /\n\[User\]:/i,
      /\nUser:/i,
      /\n\[Expert\]:/i,
      /\nExpert:/i,
      /\n\[Response\]:/i,
      /\nResponse:/i,
    ]

    for (const pattern of halluccinationPatterns) {
      const match = cleanResponse.search(pattern)
      if (match !== -1) {
        // Only keep the text before any simulated response
        cleanResponse = cleanResponse.substring(0, match).trim()
        console.warn('[interview-engine] Detected and removed hallucinated SME response from AI output')
        break
      }
    }

    // Also check for multiple question patterns (AI asking multiple questions in sequence)
    // Look for patterns like question followed by quoted response followed by another question
    const multiTurnPattern = /["'].*?["']\s*\n\s*["']/
    if (multiTurnPattern.test(cleanResponse)) {
      // Extract just the first question
      const firstQuestionEnd = cleanResponse.indexOf('\n')
      if (firstQuestionEnd !== -1 && firstQuestionEnd < cleanResponse.length - 10) {
        const potentialFirst = cleanResponse.substring(0, firstQuestionEnd).trim()
        // Only truncate if the first part is substantial (at least 20 chars)
        if (potentialFirst.length >= 20) {
          cleanResponse = potentialFirst
          console.warn('[interview-engine] Detected multi-turn response, extracted first question only')
        }
      }
    }

    // Remove any AI speaker prefix that might have been added
    cleanResponse = cleanResponse.replace(/^\[AI\]:\s*/i, '').replace(/^AI:\s*/i, '').trim()

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