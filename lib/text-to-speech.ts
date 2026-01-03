/**
 * Text-to-Speech using OpenAI's TTS API
 */

export async function generateSpeech(text: string): Promise<ArrayBuffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      voice: 'alloy', // Professional, neutral voice
      input: text,
      speed: 1.0,
    }),
  })

  if (!response.ok) {
    throw new Error(`TTS API failed: ${response.statusText}`)
  }

  return await response.arrayBuffer()
}