import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { Packer } from 'docx'

const DEBUG = process.env.NODE_ENV === 'development'

function log(message: string, data?: any) {
  if (DEBUG && data !== undefined) {
    console.log(message, data)
  } else if (DEBUG) {
    console.log(message)
  }
}

interface InterviewData {
  id: string
  sme_name: string
  sme_title: string
  equipment_name: string
  equipment_location: string
  current_phase: number
  status: string
  conversation_history: ConversationEntry[]
  created_at: string
  updated_at: string
}

interface ConversationEntry {
  timestamp: string
  text: string
  phase: number
  speaker: 'AI' | 'SME' | 'SYSTEM'
}

interface StructuredContent {
  sections: {
    title: string
    subsections: {
      title: string
      content: string
      bulletPoints?: string[]
    }[]
  }[]
  skipped_sections: string[]
}

/**
 * Use AI to structure the interview content into logical sections
 */
async function structureContent(interview: InterviewData): Promise<StructuredContent> {
  const fullTranscript = interview.conversation_history
    .map(entry => `[${entry.speaker}]: ${entry.text}`)
    .join('\n\n')
  
  const Anthropic = require('@anthropic-ai/sdk')
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  
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

Return ONLY the JSON, no markdown formatting.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: structuringPrompt
      }]
    })
    
    const content = response.content[0].text
    
    let jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
    }
    
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response')
    }
    
    return JSON.parse(jsonMatch[0])
  } catch (error) {
    log('AI structuring error:', error)
    return {
      sections: [{
        title: "Interview Content",
        subsections: [{
          title: "Raw Interview Data",
          content: "The interview was completed but content structuring failed. Please review the raw Q&A data.",
          bulletPoints: []
        }]
      }],
      skipped_sections: ["Content organization failed - please review manually"]
    }
  }
}

/**
 * Generate a professionally structured DOCX document
 */
export async function generateStructuredDocument(interview: InterviewData): Promise<Buffer> {
  log('Generating structured document for:', interview.equipment_name)

  const structured = await structureContent(interview)

  const children: any[] = []

  // ========== COVER PAGE ==========
  children.push(
    new Paragraph({
      text: interview.equipment_name,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: 'Operations Manual',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: interview.equipment_location,
          italics: true
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    })
  )

  // Document Info Table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Document Title:', bold: true })] })],
              shading: { fill: 'E3F2FD' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(`${interview.equipment_name} - Operations Manual`)],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Equipment Location:', bold: true })] })],
              shading: { fill: 'E3F2FD' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(interview.equipment_location)],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Prepared By:', bold: true })] })],
              shading: { fill: 'E3F2FD' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(`${interview.sme_name}, ${interview.sme_title}`)],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Interview Date:', bold: true })] })],
              shading: { fill: 'E3F2FD' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(new Date(interview.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }))],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Document Status:', bold: true })] })],
              shading: { fill: 'E3F2FD' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(
                interview.status === 'completed' ? 'Complete' : 
                interview.status === 'terminated' ? 'Incomplete - Ended Early' : 
                'Draft - In Progress'
              )],
              shading: { 
                fill: interview.status === 'completed' ? 'C8E6C9' : 
                      interview.status === 'terminated' ? 'FFCDD2' : 
                      'FFF9C4' 
              },
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Generated:', bold: true })] })],
              shading: { fill: 'E3F2FD' },
              width: { size: 30, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }))],
              width: { size: 70, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ]
    }),
    new Paragraph({
      text: '',
      spacing: { after: 400 }
    })
  )

  // Warning for incomplete
  if (interview.status === 'terminated') {
    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: '⚠ IMPORTANT NOTICE',
                        bold: true,
                        size: 28,
                        color: 'D32F2F'
                      })
                    ],
                    spacing: { after: 100 }
                  }),
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: 'This document is INCOMPLETE. The interview was ended before all critical information was gathered. Use with caution and schedule a follow-up session to complete missing sections.',
                        size: 22
                      })
                    ]
                  })
                ],
                shading: { fill: 'FFEBEE' },
                margins: { top: 200, bottom: 200, left: 200, right: 200 }
              })
            ]
          })
        ]
      }),
      new Paragraph({
        text: '',
        spacing: { after: 400 }
      })
    )
  }

  // Skipped sections notice
  if (structured.skipped_sections && structured.skipped_sections.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: 'Sections Not Covered in This Interview:',
            bold: true
          })
        ],
        spacing: { before: 200, after: 100 }
      })
    )
    
    structured.skipped_sections.forEach(section => {
      children.push(
        new Paragraph({
          text: `• ${section}`,
          bullet: { level: 0 },
          spacing: { after: 50 }
        })
      )
    })
    
    children.push(
      new Paragraph({
        text: '',
        spacing: { after: 400 }
      })
    )
  }

  // ========== MAIN CONTENT SECTIONS ==========
  structured.sections.forEach((section, sectionIndex) => {
    children.push(
      new Paragraph({
        text: section.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 300 },
        pageBreakBefore: sectionIndex > 0
      })
    )

    section.subsections.forEach(subsection => {
      children.push(
        new Paragraph({
          text: subsection.title,
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 }
        })
      )

      if (subsection.content) {
        children.push(
          new Paragraph({
            text: subsection.content,
            spacing: { after: 200 }
          })
        )
      }

      if (subsection.bulletPoints && subsection.bulletPoints.length > 0) {
        subsection.bulletPoints.forEach(bullet => {
          children.push(
            new Paragraph({
              text: bullet,
              bullet: { level: 0 },
              spacing: { after: 100 }
            })
          )
        })
        
        children.push(
          new Paragraph({
            text: '',
            spacing: { after: 200 }
          })
        )
      }
    })
  })

  // ========== DOCUMENT INFORMATION (FINAL PAGE) ==========
  children.push(
    new Paragraph({
      text: 'Document Information',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      pageBreakBefore: true
    }),
    new Paragraph({
      text: 'About This Document',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    }),
    new Paragraph({
      text: 'This operations manual was generated through an AI-facilitated interview process designed to capture critical equipment knowledge from experienced subject matter experts. The content has been organized and structured for easy reference by operators and maintenance personnel.',
      spacing: { after: 300 }
    }),
    new Paragraph({
      text: 'Interview Metadata',
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 200, after: 100 }
    })
  )

  // Count Q&A pairs
  let qaCount = 0
  for (let i = 0; i < interview.conversation_history.length - 1; i++) {
    if (interview.conversation_history[i].speaker === 'AI' && 
        interview.conversation_history[i + 1].speaker === 'SME') {
      qaCount++
    }
  }

  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Questions Asked:', bold: true })] })],
              shading: { fill: 'F5F5F5' },
              width: { size: 40, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(qaCount.toString())],
              width: { size: 60, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Interview Duration:', bold: true })] })],
              shading: { fill: 'F5F5F5' },
              width: { size: 40, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(calculateDuration(interview.created_at, interview.updated_at))],
              width: { size: 60, type: WidthType.PERCENTAGE }
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Sections Covered:', bold: true })] })],
              shading: { fill: 'F5F5F5' },
              width: { size: 40, type: WidthType.PERCENTAGE }
            }),
            new TableCell({
              children: [new Paragraph(structured.sections.length.toString())],
              width: { size: 60, type: WidthType.PERCENTAGE }
            })
          ]
        })
      ]
    })
  )

  // Footer
  children.push(
    new Paragraph({
      text: '',
      spacing: { before: 400 }
    }),
    new Paragraph({
      text: '---',
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 200 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Generated by AI Documentation System',
          italics: true,
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 }
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: 'Preserving Critical Equipment Knowledge',
          italics: true,
          size: 18,
          color: '666666'
        })
      ],
      alignment: AlignmentType.CENTER
    })
  )

  // Create document
  const doc = new Document({
    sections: [{
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
    }]
  })

  const buffer = await Packer.toBuffer(doc)
  log('Structured document generated successfully, size:', buffer.length)
  
  return buffer
}

function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 60) {
    return `${diffMins} minutes`
  }
  
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours} hour${hours > 1 ? 's' : ''} ${mins} minutes`
}