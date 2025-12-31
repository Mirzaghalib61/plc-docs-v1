import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableCell, TableRow, WidthType, BorderStyle, PageBreak, TableOfContents, Footer, PageNumber, NumberFormat } from 'docx'

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

/**
 * Generate professional DOCX documentation from interview data
 */
export async function generateInterviewDocument(interview: InterviewData): Promise<Buffer> {
  const doc = new Document({
    creator: 'AI Documentation Platform',
    description: `Equipment Documentation for ${interview.equipment_name}`,
    title: `${interview.equipment_name} - Equipment Documentation`,
    
    sections: [
      {
        properties: {
          page: {
            pageNumbers: {
              start: 1,
              formatType: NumberFormat.DECIMAL,
            },
          },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    children: ['Page ', PageNumber.CURRENT],
                    size: 20,
                    color: '666666',
                  }),
                  new TextRun({
                    children: [' of ', PageNumber.TOTAL_PAGES],
                    size: 20,
                    color: '666666',
                  }),
                ],
              }),
            ],
          }),
        },
        children: [
          // COVER PAGE
          ...createCoverPage(interview),
          
          // PAGE BREAK
          new Paragraph({
            children: [new PageBreak()],
          }),
          
          // TABLE OF CONTENTS
          ...createTableOfContents(),
          
          // PAGE BREAK
          new Paragraph({
            children: [new PageBreak()],
          }),
          
          // DOCUMENT INFORMATION
          ...createDocumentInfo(interview),
          
          // MAIN CONTENT - Q&A Section
          ...createQASection(interview),
          
          // COMPLETION STATUS
          ...createCompletionStatus(interview),
        ],
      },
    ],
  })

  // Generate buffer
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

/**
 * Create cover page
 */
function createCoverPage(interview: InterviewData): Paragraph[] {
  const isComplete = interview.status === 'completed'
  const isTerminated = interview.status === 'terminated'
  
  return [
    // Title
    new Paragraph({
      text: 'EQUIPMENT DOCUMENTATION',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400,
      },
    }),
    
    new Paragraph({
      text: interview.equipment_name,
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 800,
      },
      children: [
        new TextRun({
          text: interview.equipment_name,
          bold: true,
          size: 36,
          color: '1a56db',
        }),
      ],
    }),
    
    // Status Badge
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: {
        after: 400,
      },
      children: [
        new TextRun({
          text: isTerminated ? '⚠️ INCOMPLETE DOCUMENTATION' : isComplete ? '✓ COMPLETE DOCUMENTATION' : '○ IN PROGRESS',
          bold: true,
          size: 24,
          color: isTerminated ? 'dc2626' : isComplete ? '16a34a' : 'eab308',
        }),
      ],
    }),
    
    new Paragraph({
      text: '',
      spacing: { after: 800 },
    }),
    
    // Metadata Table
    new Table({
      width: {
        size: 100,
        type: WidthType.PERCENTAGE,
      },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              width: { size: 40, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Subject Matter Expert:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              width: { size: 60, type: WidthType.PERCENTAGE },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: interview.sme_name,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Title:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: interview.sme_title,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Equipment Location:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: interview.equipment_location,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Interview Date:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: new Date(interview.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: 'Document Generated:',
                      bold: true,
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: new Date().toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      }),
                      size: 22,
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
      ],
    }),
  ]
}

/**
 * Create table of contents
 */
function createTableOfContents(): Paragraph[] {
  return [
    new Paragraph({
      text: 'Table of Contents',
      heading: HeadingLevel.HEADING_1,
      spacing: {
        after: 400,
      },
    }),
    new TableOfContents('Table of Contents', {
      hyperlink: true,
      headingStyleRange: '1-3',
    }),
  ]
}

/**
 * Create document information section
 */
function createDocumentInfo(interview: InterviewData): Paragraph[] {
  const isTerminated = interview.status === 'terminated'
  
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: 'Document Information',
      heading: HeadingLevel.HEADING_1,
      spacing: {
        before: 400,
        after: 300,
      },
    }),
    
    new Paragraph({
      text: 'Purpose',
      heading: HeadingLevel.HEADING_2,
      spacing: {
        before: 300,
        after: 200,
      },
    }),
    
    new Paragraph({
      text: `This document contains critical operational knowledge about ${interview.equipment_name}, captured through an AI-facilitated interview with ${interview.sme_name}. The information herein is intended to support equipment operation, maintenance, and troubleshooting activities.`,
      spacing: {
        after: 300,
      },
    }),
  ]
  
  if (isTerminated) {
    paragraphs.push(
      new Paragraph({
        text: 'Documentation Status Warning',
        heading: HeadingLevel.HEADING_2,
        spacing: {
          before: 300,
          after: 200,
        },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: '⚠️ INCOMPLETE DOCUMENTATION: ',
            bold: true,
            color: 'dc2626',
          }),
          new TextRun({
            text: 'This interview was terminated before completion. Not all critical equipment information may have been captured. Users should exercise caution and seek additional information from subject matter experts as needed.',
            color: '666666',
          }),
        ],
        spacing: {
          after: 300,
        },
      })
    )
  }
  
  return paragraphs
}

/**
 * Create Q&A section from conversation history
 */
function createQASection(interview: InterviewData): Paragraph[] {
  const paragraphs: Paragraph[] = [
    new Paragraph({
      text: 'Critical Equipment Information',
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: {
        before: 400,
        after: 400,
      },
    }),
  ]
  
  // Filter out SYSTEM messages and pair AI questions with SME responses
  const conversationPairs: { question: string; answer: string; timestamp: string }[] = []
  let currentQuestion = ''
  
  interview.conversation_history.forEach((entry) => {
    if (entry.speaker === 'AI') {
      currentQuestion = entry.text
    } else if (entry.speaker === 'SME' && currentQuestion) {
      conversationPairs.push({
        question: currentQuestion,
        answer: entry.text,
        timestamp: entry.timestamp,
      })
      currentQuestion = ''
    }
  })
  
  // Add each Q&A pair
  conversationPairs.forEach((pair, index) => {
    paragraphs.push(
      // Question
      new Paragraph({
        children: [
          new TextRun({
            text: `Q${index + 1}: `,
            bold: true,
            color: '1a56db',
            size: 24,
          }),
          new TextRun({
            text: pair.question,
            size: 24,
          }),
        ],
        spacing: {
          before: 300,
          after: 200,
        },
      }),
      
      // Answer
      new Paragraph({
        children: [
          new TextRun({
            text: 'A: ',
            bold: true,
            color: '16a34a',
            size: 24,
          }),
          new TextRun({
            text: pair.answer,
            size: 24,
          }),
        ],
        spacing: {
          after: 400,
        },
        border: {
          left: {
            color: 'e5e7eb',
            space: 8,
            style: BorderStyle.SINGLE,
            size: 24,
          },
        },
      })
    )
  })
  
  if (conversationPairs.length === 0) {
    paragraphs.push(
      new Paragraph({
        text: 'No conversation data available.',
        italics: true,
        color: '999999',
      })
    )
  }
  
  return paragraphs
}

/**
 * Create completion status section
 */
function createCompletionStatus(interview: InterviewData): Paragraph[] {
  const totalQuestions = interview.conversation_history.filter(e => e.speaker === 'AI').length
  const totalResponses = interview.conversation_history.filter(e => e.speaker === 'SME').length
  
  return [
    new Paragraph({
      text: 'Interview Statistics',
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: {
        before: 400,
        after: 400,
      },
    }),
    
    new Paragraph({
      children: [
        new TextRun({
          text: 'Total Questions Asked: ',
          bold: true,
        }),
        new TextRun({
          text: totalQuestions.toString(),
        }),
      ],
      spacing: {
        after: 200,
      },
    }),
    
    new Paragraph({
      children: [
        new TextRun({
          text: 'Total Responses Captured: ',
          bold: true,
        }),
        new TextRun({
          text: totalResponses.toString(),
        }),
      ],
      spacing: {
        after: 200,
      },
    }),
    
    new Paragraph({
      children: [
        new TextRun({
          text: 'Interview Status: ',
          bold: true,
        }),
        new TextRun({
          text: interview.status.charAt(0).toUpperCase() + interview.status.slice(1),
          color: interview.status === 'completed' ? '16a34a' : interview.status === 'terminated' ? 'dc2626' : 'eab308',
        }),
      ],
      spacing: {
        after: 200,
      },
    }),
    
    new Paragraph({
      children: [
        new TextRun({
          text: 'Interview Duration: ',
          bold: true,
        }),
        new TextRun({
          text: calculateDuration(interview.created_at, interview.updated_at),
        }),
      ],
      spacing: {
        after: 400,
      },
    }),
  ]
}

/**
 * Calculate duration between two dates
 */
function calculateDuration(start: string, end: string): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  const diffMs = endDate.getTime() - startDate.getTime()
  
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''}, ${hours % 24} hour${hours % 24 !== 1 ? 's' : ''}`
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''}, ${minutes % 60} minute${minutes % 60 !== 1 ? 's' : ''}`
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`
  }
}