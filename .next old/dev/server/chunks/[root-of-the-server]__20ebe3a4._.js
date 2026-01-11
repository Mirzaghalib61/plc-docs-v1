module.exports = [
"[externals]/next/dist/compiled/next-server/app-route-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-route-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-route-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/@opentelemetry/api [external] (next/dist/compiled/@opentelemetry/api, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/@opentelemetry/api", () => require("next/dist/compiled/@opentelemetry/api"));

module.exports = mod;
}),
"[externals]/next/dist/compiled/next-server/app-page-turbo.runtime.dev.js [external] (next/dist/compiled/next-server/app-page-turbo.runtime.dev.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js", () => require("next/dist/compiled/next-server/app-page-turbo.runtime.dev.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-unit-async-storage.external.js [external] (next/dist/server/app-render/work-unit-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-unit-async-storage.external.js", () => require("next/dist/server/app-render/work-unit-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/work-async-storage.external.js [external] (next/dist/server/app-render/work-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/work-async-storage.external.js", () => require("next/dist/server/app-render/work-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
"[externals]/next/dist/server/app-render/after-task-async-storage.external.js [external] (next/dist/server/app-render/after-task-async-storage.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/server/app-render/after-task-async-storage.external.js", () => require("next/dist/server/app-render/after-task-async-storage.external.js"));

module.exports = mod;
}),
"[externals]/fs [external] (fs, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("fs", () => require("fs"));

module.exports = mod;
}),
"[externals]/path [external] (path, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("path", () => require("path"));

module.exports = mod;
}),
"[project]/lib/interview-engine.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "analyzeInterview",
    ()=>analyzeInterview,
    "getNextQuestion",
    ()=>getNextQuestion
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@anthropic-ai/sdk/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__Anthropic__as__default$3e$__ = __turbopack_context__.i("[project]/node_modules/@anthropic-ai/sdk/client.mjs [app-route] (ecmascript) <export Anthropic as default>");
var __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/fs [external] (fs, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/path [external] (path, cjs)");
;
;
;
const anthropic = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$anthropic$2d$ai$2f$sdk$2f$client$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$export__Anthropic__as__default$3e$__["default"]({
    apiKey: process.env.ANTHROPIC_API_KEY
});
/**
 * Load the system prompt from file
 */ function loadSystemPrompt() {
    try {
        const promptPath = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$path__$5b$external$5d$__$28$path$2c$__cjs$29$__["join"])(process.cwd(), 'prompts', 'interview-system-prompt.txt');
        return (0, __TURBOPACK__imported__module__$5b$externals$5d2f$fs__$5b$external$5d$__$28$fs$2c$__cjs$29$__["readFileSync"])(promptPath, 'utf-8');
    } catch (error) {
        console.error('Error loading system prompt:', error);
        throw new Error('Failed to load interview system prompt');
    }
}
/**
 * Build the conversation context for Claude
 */ function buildConversationContext(context) {
    const { equipmentName, smeName, smeTitle, equipmentLocation, conversationHistory } = context;
    let contextStr = `INTERVIEW CONTEXT:
Equipment: ${equipmentName}
Location: ${equipmentLocation}
SME: ${smeName}, ${smeTitle}
Phase: 1 - Critical Equipment Information

CONVERSATION HISTORY:
`;
    if (conversationHistory.length === 0) {
        contextStr += '[No conversation yet - this is the start of the interview]\n';
    } else {
        conversationHistory.forEach((entry, index)=>{
            // Determine if this is AI or SME based on position (AI asks first)
            const speaker = index % 2 === 0 ? 'AI' : 'SME';
            contextStr += `\n${speaker}: ${entry.text}\n`;
        });
    }
    return contextStr;
}
/**
 * Check if the interview is complete based on AI response
 */ function checkIfComplete(response) {
    return response.includes('[INTERVIEW_COMPLETE]');
}
/**
 * Extract clean response (remove completion markers)
 */ function cleanResponse(response) {
    return response.replace('[INTERVIEW_COMPLETE]', '').trim();
}
async function getNextQuestion(context, smeLatestResponse) {
    try {
        const systemPrompt = loadSystemPrompt();
        const conversationContext = buildConversationContext(context);
        // Build the messages array for Claude
        const messages = [];
        if (context.conversationHistory.length === 0 && !smeLatestResponse) {
            // First message - AI starts the interview
            messages.push({
                role: 'user',
                content: `${conversationContext}

You are starting the interview now. Begin by greeting the SME and asking the first question.`
            });
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
            });
        } else {
            // Continuing conversation without new SME input (shouldn't happen, but handle it)
            messages.push({
                role: 'user',
                content: `${conversationContext}

Continue the interview based on the conversation history above.`
            });
        }
        // Call Claude API
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 1024,
            system: systemPrompt,
            messages: messages
        });
        // Extract the response text
        const aiResponse = response.content.filter((block)=>block.type === 'text').map((block)=>block.text).join('\n');
        if (!aiResponse || aiResponse.trim().length === 0) {
            throw new Error('Empty response from Claude API');
        }
        // Check if interview is complete
        const isComplete = checkIfComplete(aiResponse);
        const cleanedResponse = cleanResponse(aiResponse);
        return {
            nextQuestion: cleanedResponse,
            isComplete,
            analysis: isComplete ? 'Interview has been completed successfully' : undefined
        };
    } catch (error) {
        console.error('Interview engine error:', error);
        // Handle specific API errors
        if (error?.status === 401) {
            return {
                nextQuestion: '',
                isComplete: false,
                error: 'Authentication failed. Please check API key configuration.'
            };
        }
        if (error?.status === 429) {
            return {
                nextQuestion: '',
                isComplete: false,
                error: 'Rate limit exceeded. Please try again in a moment.'
            };
        }
        if (error?.status === 500) {
            return {
                nextQuestion: '',
                isComplete: false,
                error: 'Claude API service error. Please try again.'
            };
        }
        return {
            nextQuestion: '',
            isComplete: false,
            error: error?.message || 'Failed to generate next question. Please try again.'
        };
    }
}
async function analyzeInterview(context) {
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
}`;
        const conversationContext = buildConversationContext(context);
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
        });
        const analysisText = response.content.filter((block)=>block.type === 'text').map((block)=>block.text).join('\n');
        // Parse JSON response
        const analysis = JSON.parse(analysisText);
        return {
            coverageScore: analysis.coverageScore || 0,
            missingTopics: analysis.missingTopics || [],
            suggestions: analysis.suggestions || []
        };
    } catch (error) {
        console.error('Analysis error:', error);
        return {
            coverageScore: 0,
            missingTopics: [
                'Unable to analyze'
            ],
            suggestions: [
                'Error occurred during analysis'
            ]
        };
    }
}
}),
"[project]/app/api/interview/respond/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "POST",
    ()=>POST,
    "maxDuration",
    ()=>maxDuration
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$interview$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/interview-engine.ts [app-route] (ecmascript)");
;
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://ojrtiicniqowpdrbvzne.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY);
async function POST(request) {
    try {
        const body = await request.json();
        const { interviewId, smeResponse, userId } = body;
        console.log('Interview respond API called:', {
            interviewId,
            userId
        });
        if (!interviewId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Interview ID is required'
            }, {
                status: 400
            });
        }
        if (!userId) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'User ID is required'
            }, {
                status: 401
            });
        }
        const { data: interview, error: fetchError } = await supabase.from('interviews').select('*').eq('id', interviewId).eq('user_id', userId).single();
        if (fetchError || !interview) {
            console.error('Interview fetch error:', fetchError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Interview not found or access denied'
            }, {
                status: 404
            });
        }
        if (interview.status === 'completed') {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Interview is already completed'
            }, {
                status: 400
            });
        }
        const context = {
            equipmentName: interview.equipment_name,
            smeName: interview.sme_name,
            smeTitle: interview.sme_title,
            equipmentLocation: interview.equipment_location,
            currentPhase: interview.current_phase,
            conversationHistory: interview.conversation_history || []
        };
        console.log('Calling interview engine...');
        const result = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$interview$2d$engine$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["getNextQuestion"])(context, smeResponse);
        if (result.error) {
            console.error('Interview engine error:', result.error);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: result.error
            }, {
                status: 500
            });
        }
        const updatedHistory = [
            ...interview.conversation_history || []
        ];
        if (smeResponse && smeResponse.trim().length > 0) {
            updatedHistory.push({
                timestamp: new Date().toISOString(),
                text: smeResponse.trim(),
                phase: interview.current_phase,
                speaker: 'SME'
            });
        }
        updatedHistory.push({
            timestamp: new Date().toISOString(),
            text: result.nextQuestion,
            phase: interview.current_phase,
            speaker: 'AI'
        });
        const updatePayload = {
            conversation_history: updatedHistory,
            updated_at: new Date().toISOString()
        };
        if (result.isComplete) {
            updatePayload.status = 'completed';
            console.log('Interview marked as complete');
        }
        const { error: updateError } = await supabase.from('interviews').update(updatePayload).eq('id', interviewId).eq('user_id', userId);
        if (updateError) {
            console.error('Database update error:', updateError);
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Failed to save conversation update'
            }, {
                status: 500
            });
        }
        console.log('Interview updated successfully');
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            success: true,
            aiResponse: result.nextQuestion,
            isComplete: result.isComplete,
            conversationHistory: updatedHistory,
            analysis: result.analysis
        });
    } catch (error) {
        console.error('Interview respond API error:', error);
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Internal server error',
            details: error?.message || 'Unknown error occurred'
        }, {
            status: 500
        });
    }
}
const maxDuration = 30;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__20ebe3a4._.js.map