import { NextRequest, NextResponse } from 'next/server'

// Create an ephemeral token for client-side WebSocket connection
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instructions } = body

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      )
    }

    // Request an ephemeral client secret from OpenAI using the GA endpoint
    // Format based on OpenAI docs: model is "gpt-realtime", voice under audio.output
    const requestBody = {
      expires_after: {
        anchor: 'created_at',
        seconds: 600
      },
      session: {
        type: 'realtime',
        model: 'gpt-realtime',
        instructions: instructions || 'You are a helpful assistant conducting an equipment documentation interview.',
        audio: {
          output: {
            voice: 'alloy'
          }
        }
      }
    }

    console.log('Requesting client secret with body:', JSON.stringify(requestBody, null, 2))

    const response = await fetch('https://api.openai.com/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI session creation failed:', response.status, errorText)
      return NextResponse.json(
        { error: `OpenAI API error: ${errorText}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Log the response structure for debugging
    console.log('OpenAI client_secrets response:', JSON.stringify(data, null, 2))

    // The GA endpoint returns { client_secret: { value: "...", expires_at: ... } }
    // or it could return the secret directly as a string
    let secretValue: string
    let expiresAt: number | undefined

    if (data.client_secret) {
      if (typeof data.client_secret === 'object' && data.client_secret.value) {
        secretValue = data.client_secret.value
        expiresAt = data.client_secret.expires_at
      } else if (typeof data.client_secret === 'string') {
        secretValue = data.client_secret
        expiresAt = data.expires_at
      } else {
        console.error('Unexpected client_secret format:', data.client_secret)
        return NextResponse.json(
          { error: 'Invalid response from OpenAI' },
          { status: 500 }
        )
      }
    } else if (data.value) {
      // Alternative format where the secret is at the top level
      secretValue = data.value
      expiresAt = data.expires_at
    } else {
      console.error('No client_secret found in response:', data)
      return NextResponse.json(
        { error: 'No client secret in response' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      client_secret: secretValue,
      session_id: data.id,
      expires_at: expiresAt
    })

  } catch (error: any) {
    console.error('Error creating realtime session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
