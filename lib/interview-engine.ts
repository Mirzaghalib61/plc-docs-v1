import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'fs'
import { join } from 'path'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface ConversationEntry {
  timestamp: string
  text: string
  phase: number
  duration?: number
}

export interface InterviewContext {
  equipmentName: string
  smeName: string
  smeTitle: string
  equipmentLocation: string
  currentPhase: number
  conversationHistory: ConversationEntry[]
}

export interface InterviewResponse {
  nextQuestion: string
  isComplete: boolean
  analysis?: string
  error?: string
}

/**
 * Load the system prompt from file
 */
function loadSystemPrompt(): string {
  try {
    const promptPath = join(process.cwd(), 'prompts', 'interview-system-prompt.txt')
    return readFileSync(promptPath, 'utf-8')
  } catch (error) {
    console.error('Error loading system prompt:', error)
    throw new Error('Failed to load interview system prompt')
  }
}

/**
 * Build the conversation context for Claude
 */
function buildConversationContext(context: InterviewContext): string {
  const { equipmentName, smeName, smeTitle, equipmentLocation, conversationHistory } = context

  let contextStr = `INTERVIEW CONTEXT:
Equipment: ${equipmentName}
Location: ${equipmentLocation}
SME: ${smeName}, ${smeTitle}
Phase: 1 - Critical Equipment Information

CONVERSATION HISTORY:
`

  if (conversationHistory.length === 0) {
    contextStr += '[No conversation yet - this is the start of the interview]\n'
  } else {
    conversationHistory.forEach((entry, index) => {
      // Determine if this is AI or SME based on position (AI asks first)
      const speaker = index % 2 === 0 ? 'AI' : 'SME'
      contextStr += `\n${speaker}: ${entry.text}\n`
    })
  }

  return contextStr
}

/**
 * Check if the interview is complete based on AI response
 */
function checkIfComplete(response: string): boolean {
  return response.includes('[INTERVIEW_COMPLETE]')
}

/**
 * Extract clean response (remove completion markers)
 */
function cleanResponse(response: string): string {
  return response.replace('[INTERVIEW_COMPLETE]', '').trim()
}

/**
 * Main interview engine - gets next question from Claude
 */
export async function getNextQuestion(
  context: InterviewContext,
  smeLatestResponse?: string
): Promise<InterviewResponse> {
  try {
    const systemPrompt = loadSystemPrompt()
    const conversationContext = buildConversationContext(context)

    // Build the messages array for Claude
    const messages: Anthropic.MessageParam[] = []

    if (context.conversationHistory.length === 0 && !smeLatestResponse) {
      // First message - AI starts the interview
      messages.push({
        role: 'user',
        content: `${conversationContext}

You are starting the interview now. Begin by greeting the SME and asking the first question.`
      })
    } else if (smeLatestResponse) {
      // SME has responded - AI needs to continue
      messages.push({
        role: 'user',
        content: `${conversationContext}

SME's latest response: ${smeLatestResponse}

Based on the conversation history and this latest response, what is your next question or response? Remember to:
- Acknowledge their answer if appropriate
- Ask follow-up questions if the answer is vague or incomplete (< 30 words typically needs follow-up)
- Move to the next core question if this topic is thoroughly covered
- Signal completion if all core questions are answered

Respond naturally as the interviewer.`
      })
    } else {
      // Continuing conversation without new SME input (shouldn't happen, but handle it)
      messages.push({
        role: 'user',
        content: `${conversationContext}

Continue the interview based on the conversation history above.`
      })
    }

    // Call Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    // Extract the response text
    const aiResponse = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('\n')

    if (!aiResponse || aiResponse.trim().length === 0) {
      throw new Error('Empty response from Claude API')
    }

    // Check if interview is complete
    const isComplete = checkIfComplete(aiResponse)
    const cleanedResponse = cleanResponse(aiResponse)

    return {
      nextQuestion: cleanedResponse,
      isComplete,
      analysis: isComplete ? 'Interview has been completed successfully' : undefined
    }

  } catch (error: any) {
    console.error('Interview engine error:', error)
    
    // Handle specific API errors
    if (error?.status === 401) {
      return {
        nextQuestion: '',
        isComplete: false,
        error: 'Authentication failed. Please check API key configuration.'
      }
    }

    if (error?.status === 429) {
      return {
        nextQuestion: '',
        isComplete: false,
        error: 'Rate limit exceeded. Please try again in a moment.'
      }
    }

    if (error?.status === 500) {
      return {
        nextQuestion: '',
        isComplete: false,
        error: 'Claude API service error. Please try again.'
      }
    }

    return {
      nextQuestion: '',
      isComplete: false,
      error: error?.message || 'Failed to generate next question. Please try again.'
    }
  }
}

/**
 * Analyze conversation quality and completeness
 */
export async function analyzeInterview(
  context: InterviewContext
): Promise<{
  coverageScore: number
  missingTopics: string[]
  suggestions: string[]
}> {
  try {
    const systemPrompt = `You are analyzing an equipment documentation interview for completeness and quality.

Review the conversation and assess:
1. Which of the 5 core questions were thoroughly answered
2. What critical information is missing
3. What topics need more detail

Respond in JSON format:
{
  "coverageScore": <0-100>,
  "missingTopics": [<array of strings>],
  "suggestions": [<array of strings>]
}`

    const conversationContext = buildConversationContext(context)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `${conversationContext}

Analyze this interview for completeness.`
        }
      ]
    })

    const analysisText = response.content
      .filter((block) => block.type === 'text')
      .map((block) => (block as Anthropic.TextBlock).text)
      .join('\n')

    // Parse JSON response
    const analysis = JSON.parse(analysisText)

    return {
      coverageScore: analysis.coverageScore || 0,
      missingTopics: analysis.missingTopics || [],
      suggestions: analysis.suggestions || []
    }

  } catch (error) {
    console.error('Analysis error:', error)
    return {
      coverageScore: 0,
      missingTopics: ['Unable to analyze'],
      suggestions: ['Error occurred during analysis']
    }
  }
}