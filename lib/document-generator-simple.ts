import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, BorderStyle } from 'docx'
import { Packer } from 'docx'

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
 * Generate a simple, clean DOCX document from interview data
 */
export async function generateSimpleDocument(interview: InterviewData): Promise<Buffer> {
  console.log('Generating simple document for:', interview.equipment_name)

  // Extract Q&A pairs
  const qaPairs: Array<{ question: string; answer: string; timestamp: string }> = []
  
  let currentQuestion = ''
  
  for (const entry of interview.conversation_history) {
    if (entry.speaker === 'AI') {
      currentQuestion = entry.text
    } else if (entry.speaker === 'SME' && currentQuestion) {
      qaPairs.push({
        question: currentQuestion,
        answer: entry.text,
        timestamp: entry.timestamp
      })
      currentQuestion = ''
    }
  }

  // Build document sections
  const children: any[] = []

  // Title Page
  children.push(
    new Paragraph({
      text: `${interview.equipment_name}`,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    }),
    new Paragraph({
      text: 'Equipment Operations Manual',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 }
    }),
    new Paragraph({
      text: '',
      spacing: { after: 200 }
    })
  )

  // Document Information Table
  children.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Equipment Name:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(interview.equipment_name)]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Location:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(interview.equipment_location)]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Subject Matter Expert:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(`${interview.sme_name}, ${interview.sme_title}`)]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Interview Date:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(new Date(interview.created_at).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              }))]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Status:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(
                interview.status === 'completed' ? 'Complete' : 
                interview.status === 'terminated' ? 'Ended Early - Incomplete' : 
                'In Progress'
              )],
              shading: { 
                fill: interview.status === 'completed' ? 'C8E6C9' : 
                      interview.status === 'terminated' ? 'FFCDD2' : 
                      'FFF9C4' 
              }
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

  // Warning for incomplete interviews
  if (interview.status === 'terminated') {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: '⚠ WARNING: INCOMPLETE INTERVIEW',
            bold: true,
            color: 'D32F2F',
            size: 28
          })
        ],
        spacing: { after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: 'This interview was ended before completion. Not all critical equipment information was gathered. Use this document with caution and consider scheduling a follow-up interview.',
            italics: true
          })
        ],
        spacing: { after: 400 }
      })
    )
  }

  // Interview Questions & Answers Section
  children.push(
    new Paragraph({
      text: 'Interview Questions & Answers',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      pageBreakBefore: true
    }),
    new Paragraph({
      text: `This document contains ${qaPairs.length} question-answer pairs covering critical equipment information.`,
      spacing: { after: 400 }
    })
  )

  // Add each Q&A pair
  qaPairs.forEach((qa, index) => {
    children.push(
      new Paragraph({
        text: `Question ${index + 1}`,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: qa.question, color: '1976D2' })],
        spacing: { after: 200 },
        border: {
          left: { color: '1976D2', space: 8, size: 12, style: BorderStyle.SINGLE }
        }
      }),
      new Paragraph({
        children: [new TextRun({ text: 'Answer', bold: true })],
        spacing: { before: 100, after: 100 }
      }),
      new Paragraph({
        children: [new TextRun({ text: qa.answer, color: '388E3C' })],
        spacing: { after: 300 },
        border: {
          left: { color: '388E3C', space: 8, size: 12, style: BorderStyle.SINGLE }
        }
      })
    )
  })

  // Summary Statistics
  children.push(
    new Paragraph({
      text: 'Interview Statistics',
      heading: HeadingLevel.HEADING_1,
      spacing: { before: 400, after: 300 },
      pageBreakBefore: true
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Total Questions Asked:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(qaPairs.length.toString())]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Interview Duration:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(calculateDuration(interview.created_at, interview.updated_at))]
            })
          ]
        }),
        new TableRow({
          children: [
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: 'Generated On:', bold: true })] })],
              shading: { fill: 'E3F2FD' }
            }),
            new TableCell({
              children: [new Paragraph(new Date().toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              }))]
            })
          ]
        })
      ]
    })
  )

  // Footer note
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
          text: 'This document was generated by AI Documentation System',
          italics: true,
          size: 20
        })
      ],
      alignment: AlignmentType.CENTER
    })
  )

  // Create document
  const doc = new Document({
    sections: [{
      properties: {},
      children: children
    }]
  })

  // Generate buffer
  const buffer = await Packer.toBuffer(doc)
  console.log('Simple document generated successfully, size:', buffer.length)
  
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