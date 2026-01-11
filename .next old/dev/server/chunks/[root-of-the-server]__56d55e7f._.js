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
"[externals]/buffer [external] (buffer, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("buffer", () => require("buffer"));

module.exports = mod;
}),
"[project]/lib/document-generator-structured.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "generateStructuredDocument",
    ()=>generateStructuredDocument
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/docx/dist/index.mjs [app-route] (ecmascript)");
;
;
const DEBUG = ("TURBOPACK compile-time value", "development") === 'development';
function log(message, data) {
    if (DEBUG && data !== undefined) {
        console.log(message, data);
    } else if ("TURBOPACK compile-time truthy", 1) {
        console.log(message);
    }
}
/**
 * Use AI to structure the interview content into logical sections
 */ async function structureContent(interview) {
    const fullTranscript = interview.conversation_history.map((entry)=>`[${entry.speaker}]: ${entry.text}`).join('\n\n');
    const Anthropic = __turbopack_context__.r("[project]/node_modules/@anthropic-ai/sdk/index.js [app-route] (ecmascript)");
    const anthropic = new Anthropic({
        apiKey: process.env.ANTHROPIC_API_KEY
    });
    const structuringPrompt = `You are creating a professional PLC Operations Manual from an interview transcript. Analyze the conversation and organize it into a well-structured document.

Equipment: ${interview.equipment_name}
Location: ${interview.equipment_location}
SME: ${interview.sme_name}, ${interview.sme_title}

TRANSCRIPT:
${fullTranscript}

Create a structured operations manual with these sections (skip any that weren't covered):

1. **Equipment Overview**
   - System purpose and function
   - Products/processes handled
   - Critical importance and dependencies

2. **Critical Operating Information**
   - Key things operators must know
   - Equipment quirks and unusual behaviors
   - Optimal operating ranges and "sweet spots"
   - Common mistakes to avoid

3. **Safety Information**
   - Primary hazards
   - Emergency stops and safety interlocks
   - PPE requirements
   - Stop-work conditions

4. **Operating Procedures**
   - Startup procedure
   - Normal operation
   - Shutdown procedure
   - Adjustments and when to make them

5. **Troubleshooting**
   - Common problems and solutions
   - Phantom alarms/nuisance faults
   - Warning signs and symptoms
   - When to call maintenance

6. **Technical Specifications**
   - PLC and control system details
   - I/O configuration
   - Network/communication details
   - Instrumentation

7. **Maintenance & Calibration**
   - Calibration procedures
   - Preventive maintenance requirements
   - Critical spare parts

Return a JSON structure like this:

{
  "sections": [
    {
      "title": "Section Name",
      "subsections": [
        {
          "title": "Subsection Name",
          "content": "Main paragraph content here...",
          "bulletPoints": ["Optional bullet point 1", "Optional bullet point 2"]
        }
      ]
    }
  ],
  "skipped_sections": ["List of sections not covered"]
}

IMPORTANT RULES:
- Write in professional, clear, technical language
- Combine information from multiple Q&A exchanges into coherent paragraphs
- Use bullet points for lists, steps, or multiple items
- If information wasn't discussed, don't make it up - skip that section
- Keep it practical and operator-focused
- Include specific details, numbers, and examples mentioned
- Group related information logically

Return ONLY the JSON, no markdown formatting.`;
    try {
        const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            messages: [
                {
                    role: 'user',
                    content: structuringPrompt
                }
            ]
        });
        const content = response.content[0].text;
        let jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
        }
        if (!jsonMatch) {
            throw new Error('Failed to extract JSON from AI response');
        }
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        log('AI structuring error:', error);
        return {
            sections: [
                {
                    title: "Interview Content",
                    subsections: [
                        {
                            title: "Raw Interview Data",
                            content: "The interview was completed but content structuring failed. Please review the raw Q&A data.",
                            bulletPoints: []
                        }
                    ]
                }
            ],
            skipped_sections: [
                "Content organization failed - please review manually"
            ]
        };
    }
}
async function generateStructuredDocument(interview) {
    log('Generating structured document for:', interview.equipment_name);
    const structured = await structureContent(interview);
    const children = [];
    // ========== COVER PAGE ==========
    children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: interview.equipment_name,
        heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].TITLE,
        alignment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AlignmentType"].CENTER,
        spacing: {
            after: 200
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'Operations Manual',
        heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].HEADING_1,
        alignment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AlignmentType"].CENTER,
        spacing: {
            after: 100
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: interview.equipment_location,
        alignment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AlignmentType"].CENTER,
        italics: true,
        spacing: {
            after: 400
        }
    }));
    // Document Info Table
    children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Table"]({
        width: {
            size: 100,
            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
        },
        rows: [
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Document Title:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'E3F2FD'
                        },
                        width: {
                            size: 30,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](`${interview.equipment_name} - Operations Manual`)
                        ],
                        width: {
                            size: 70,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Equipment Location:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'E3F2FD'
                        },
                        width: {
                            size: 30,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](interview.equipment_location)
                        ],
                        width: {
                            size: 70,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Prepared By:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'E3F2FD'
                        },
                        width: {
                            size: 30,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](`${interview.sme_name}, ${interview.sme_title}`)
                        ],
                        width: {
                            size: 70,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Interview Date:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'E3F2FD'
                        },
                        width: {
                            size: 30,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](new Date(interview.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }))
                        ],
                        width: {
                            size: 70,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Document Status:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'E3F2FD'
                        },
                        width: {
                            size: 30,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](interview.status === 'completed' ? 'Complete' : interview.status === 'terminated' ? 'Incomplete - Ended Early' : 'Draft - In Progress')
                        ],
                        shading: {
                            fill: interview.status === 'completed' ? 'C8E6C9' : interview.status === 'terminated' ? 'FFCDD2' : 'FFF9C4'
                        },
                        width: {
                            size: 70,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Generated:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'E3F2FD'
                        },
                        width: {
                            size: 30,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](new Date().toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }))
                        ],
                        width: {
                            size: 70,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            })
        ]
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: '',
        spacing: {
            after: 400
        }
    }));
    // Warning for incomplete
    if (interview.status === 'terminated') {
        children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Table"]({
            width: {
                size: 100,
                type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
            },
            rows: [
                new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                    children: [
                        new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                            children: [
                                new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                    children: [
                                        new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TextRun"]({
                                            text: '⚠ IMPORTANT NOTICE',
                                            bold: true,
                                            size: 28,
                                            color: 'D32F2F'
                                        })
                                    ],
                                    spacing: {
                                        after: 100
                                    }
                                }),
                                new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                    text: 'This document is INCOMPLETE. The interview was ended before all critical information was gathered. Use with caution and schedule a follow-up session to complete missing sections.',
                                    size: 22
                                })
                            ],
                            shading: {
                                fill: 'FFEBEE'
                            },
                            margins: {
                                top: 200,
                                bottom: 200,
                                left: 200,
                                right: 200
                            }
                        })
                    ]
                })
            ]
        }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
            text: '',
            spacing: {
                after: 400
            }
        }));
    }
    // Skipped sections notice
    if (structured.skipped_sections && structured.skipped_sections.length > 0) {
        children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
            text: 'Sections Not Covered in This Interview:',
            bold: true,
            spacing: {
                before: 200,
                after: 100
            }
        }));
        structured.skipped_sections.forEach((section)=>{
            children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                text: `• ${section}`,
                bullet: {
                    level: 0
                },
                spacing: {
                    after: 50
                }
            }));
        });
        children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
            text: '',
            spacing: {
                after: 400
            }
        }));
    }
    // ========== MAIN CONTENT SECTIONS ==========
    structured.sections.forEach((section, sectionIndex)=>{
        children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
            text: section.title,
            heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].HEADING_1,
            spacing: {
                before: 400,
                after: 300
            },
            pageBreakBefore: sectionIndex > 0
        }));
        section.subsections.forEach((subsection)=>{
            children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                text: subsection.title,
                heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].HEADING_2,
                spacing: {
                    before: 300,
                    after: 200
                }
            }));
            if (subsection.content) {
                children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                    text: subsection.content,
                    spacing: {
                        after: 200
                    }
                }));
            }
            if (subsection.bulletPoints && subsection.bulletPoints.length > 0) {
                subsection.bulletPoints.forEach((bullet)=>{
                    children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                        text: bullet,
                        bullet: {
                            level: 0
                        },
                        spacing: {
                            after: 100
                        }
                    }));
                });
                children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                    text: '',
                    spacing: {
                        after: 200
                    }
                }));
            }
        });
    });
    // ========== DOCUMENT INFORMATION (FINAL PAGE) ==========
    children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'Document Information',
        heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].HEADING_1,
        spacing: {
            before: 400,
            after: 300
        },
        pageBreakBefore: true
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'About This Document',
        heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].HEADING_2,
        spacing: {
            before: 200,
            after: 100
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'This operations manual was generated through an AI-facilitated interview process designed to capture critical equipment knowledge from experienced subject matter experts. The content has been organized and structured for easy reference by operators and maintenance personnel.',
        spacing: {
            after: 300
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'Interview Metadata',
        heading: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["HeadingLevel"].HEADING_2,
        spacing: {
            before: 200,
            after: 100
        }
    }));
    // Count Q&A pairs
    let qaCount = 0;
    for(let i = 0; i < interview.conversation_history.length - 1; i++){
        if (interview.conversation_history[i].speaker === 'AI' && interview.conversation_history[i + 1].speaker === 'SME') {
            qaCount++;
        }
    }
    children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Table"]({
        width: {
            size: 100,
            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
        },
        rows: [
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Questions Asked:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'F5F5F5'
                        },
                        width: {
                            size: 40,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](qaCount.toString())
                        ],
                        width: {
                            size: 60,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Interview Duration:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'F5F5F5'
                        },
                        width: {
                            size: 40,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](calculateDuration(interview.created_at, interview.updated_at))
                        ],
                        width: {
                            size: 60,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            }),
            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableRow"]({
                children: [
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
                                text: 'Sections Covered:',
                                bold: true
                            })
                        ],
                        shading: {
                            fill: 'F5F5F5'
                        },
                        width: {
                            size: 40,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    }),
                    new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["TableCell"]({
                        children: [
                            new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"](structured.sections.length.toString())
                        ],
                        width: {
                            size: 60,
                            type: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["WidthType"].PERCENTAGE
                        }
                    })
                ]
            })
        ]
    }));
    // Footer
    children.push(new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: '',
        spacing: {
            before: 400
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: '---',
        alignment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AlignmentType"].CENTER,
        spacing: {
            before: 200,
            after: 200
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'Generated by AI Documentation System',
        alignment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AlignmentType"].CENTER,
        italics: true,
        size: 20,
        spacing: {
            after: 50
        }
    }), new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Paragraph"]({
        text: 'Preserving Critical Equipment Knowledge',
        alignment: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["AlignmentType"].CENTER,
        italics: true,
        size: 18,
        color: '666666'
    }));
    // Create document
    const doc = new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Document"]({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440,
                            right: 1440,
                            bottom: 1440,
                            left: 1440
                        }
                    }
                },
                children: children
            }
        ]
    });
    const buffer = await __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$docx$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__["Packer"].toBuffer(doc);
    log('Structured document generated successfully, size:', buffer.length);
    return buffer;
}
function calculateDuration(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) {
        return `${diffMins} minutes`;
    }
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`;
}
}),
"[project]/app/api/interview/[id]/generate/route.ts [app-route] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "GET",
    ()=>GET,
    "maxDuration",
    ()=>maxDuration
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/server.js [app-route] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/node_modules/@supabase/supabase-js/dist/index.mjs [app-route] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$document$2d$generator$2d$structured$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/lib/document-generator-structured.ts [app-route] (ecmascript)");
;
;
;
const supabase = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$route$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://ojrtiicniqowpdrbvzne.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY);
async function GET(request, context) {
    try {
        const { id: interviewId } = await context.params;
        const { data: interview, error: fetchError } = await supabase.from('interviews').select('*').eq('id', interviewId).single();
        if (fetchError || !interview) {
            return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
                error: 'Interview not found'
            }, {
                status: 404
            });
        }
        const documentBuffer = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$lib$2f$document$2d$generator$2d$structured$2e$ts__$5b$app$2d$route$5d$__$28$ecmascript$29$__["generateStructuredDocument"])(interview);
        const filename = `${interview.equipment_name.replace(/[^a-z0-9]/gi, '_')}_Operations_Manual_${new Date().toISOString().split('T')[0]}.docx`;
        return new __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"](documentBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Content-Length': documentBuffer.length.toString()
            }
        });
    } catch (error) {
        return __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$server$2e$js__$5b$app$2d$route$5d$__$28$ecmascript$29$__["NextResponse"].json({
            error: 'Failed to generate document',
            details: ("TURBOPACK compile-time truthy", 1) ? error?.message : "TURBOPACK unreachable"
        }, {
            status: 500
        });
    }
}
const maxDuration = 60;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__56d55e7f._.js.map