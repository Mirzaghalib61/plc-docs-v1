import * as fs from 'fs'
import * as path from 'path'
const PizZip = require('pizzip')
const Docxtemplater = require('docxtemplater')

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

interface ExtractedData {
  // Quick Start
  quirks: Array<{title: string, symptom: string, root_cause: string, dont: string, do: string}>
  phantom_faults: string
  optimal_range: string
  sweet_spot: string
  when_to_adjust: string
  avoidable_causes: string[]
  
  // Safety
  hazards: string
  estop_locations: string
  safety_gates: string
  ppe_requirements: string
  stop_work_triggers: string
  
  // System Overview
  system_purpose: string
  products: string
  operating_schedule: string
  throughput: string
  quality_requirements: string
  why_critical: string
  downtime_impact: string
  
  // Technical
  plc_info: string
  io_info: string
  hmi_info: string
  drives_info: string
  safety_chain: string
  instrumentation: string
  utilities: string
  networks: string
  
  // Procedures
  startup_procedure: string[]
  normal_operation: string[]
  shutdown_procedure: string[]
  
  // Common Problems
  common_problems: Array<{
    code: string
    trigger: string
    causes: string
    operator_actions: string
    maintenance_actions: string
    downtime_risk: string
    notes: string
  }>
  
  // Skipped sections
  skipped_sections: string[]
}

/**
 * Extract structured data from conversation history using AI
 */
async function extractStructuredData(interview: InterviewData): Promise<ExtractedData> {
  // Combine all SME responses
  const smeResponses = interview.conversation_history
    .filter(entry => entry.speaker === 'SME')
    .map(entry => entry.text)
    .join('\n\n')
  
  // Use Claude to extract structured data
  const Anthropic = require('@anthropic-ai/sdk')
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })
  
  const extractionPrompt = `Analyze this equipment interview transcript and extract structured data for a PLC operations manual.

Equipment: ${interview.equipment_name}
Location: ${interview.equipment_location}
SME: ${interview.sme_name}, ${interview.sme_title}

TRANSCRIPT:
${smeResponses}

Extract the following information in JSON format. If information is not mentioned, use "[NOT COVERED IN INTERVIEW]":

{
  "quirks": [{"title": "...", "symptom": "...", "root_cause": "...", "dont": "...", "do": "..."}],
  "phantom_faults": "...",
  "optimal_range": "...",
  "sweet_spot": "...",
  "when_to_adjust": "...",
  "avoidable_causes": ["cause 1", "cause 2", "cause 3"],
  "hazards": "...",
  "estop_locations": "...",
  "safety_gates": "...",
  "ppe_requirements": "...",
  "stop_work_triggers": "...",
  "system_purpose": "...",
  "products": "...",
  "operating_schedule": "...",
  "throughput": "...",
  "quality_requirements": "...",
  "why_critical": "...",
  "downtime_impact": "...",
  "plc_info": "...",
  "io_info": "...",
  "hmi_info": "...",
  "drives_info": "...",
  "safety_chain": "...",
  "instrumentation": "...",
  "utilities": "...",
  "networks": "...",
  "startup_procedure": ["step 1", "step 2"],
  "normal_operation": ["step 1", "step 2"],
  "shutdown_procedure": ["step 1", "step 2"],
  "common_problems": [
    {
      "code": "alarm code or description",
      "trigger": "what triggers it",
      "causes": "likely causes",
      "operator_actions": "what operator should do",
      "maintenance_actions": "what maintenance should do",
      "downtime_risk": "low/medium/high",
      "notes": "any quirks or notes"
    }
  ],
  "skipped_sections": ["section name if not covered"]
}

Return ONLY the JSON, no markdown or explanation.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{
        role: 'user',
        content: extractionPrompt
      }]
    })
    
    const content = response.content[0].text
    
    // Try to extract JSON from response
    let jsonMatch = content.match(/\{[\s\S]*\}/)
    
    if (!jsonMatch) {
      // Try removing markdown code blocks
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '')
      jsonMatch = cleanContent.match(/\{[\s\S]*\}/)
    }
    
    if (!jsonMatch) {
      throw new Error('Failed to extract JSON from AI response')
    }
    
    const parsed = JSON.parse(jsonMatch[0])
    
    // Ensure arrays are actually arrays
    if (!Array.isArray(parsed.quirks)) parsed.quirks = []
    if (!Array.isArray(parsed.avoidable_causes)) parsed.avoidable_causes = []
    if (!Array.isArray(parsed.startup_procedure)) parsed.startup_procedure = []
    if (!Array.isArray(parsed.normal_operation)) parsed.normal_operation = []
    if (!Array.isArray(parsed.shutdown_procedure)) parsed.shutdown_procedure = []
    if (!Array.isArray(parsed.common_problems)) parsed.common_problems = []
    if (!Array.isArray(parsed.skipped_sections)) parsed.skipped_sections = []
    
    return parsed
  } catch (error) {
    console.error('AI extraction error:', error)
    // Return default structure with "not covered" placeholders
    return getDefaultExtractedData()
  }
}

function getDefaultExtractedData(): ExtractedData {
  return {
    quirks: [],
    phantom_faults: '[NOT COVERED IN INTERVIEW]',
    optimal_range: '[NOT COVERED IN INTERVIEW]',
    sweet_spot: '[NOT COVERED IN INTERVIEW]',
    when_to_adjust: '[NOT COVERED IN INTERVIEW]',
    avoidable_causes: [],
    hazards: '[NOT COVERED IN INTERVIEW]',
    estop_locations: '[NOT COVERED IN INTERVIEW]',
    safety_gates: '[NOT COVERED IN INTERVIEW]',
    ppe_requirements: '[NOT COVERED IN INTERVIEW]',
    stop_work_triggers: '[NOT COVERED IN INTERVIEW]',
    system_purpose: '[NOT COVERED IN INTERVIEW]',
    products: '[NOT COVERED IN INTERVIEW]',
    operating_schedule: '[NOT COVERED IN INTERVIEW]',
    throughput: '[NOT COVERED IN INTERVIEW]',
    quality_requirements: '[NOT COVERED IN INTERVIEW]',
    why_critical: '[NOT COVERED IN INTERVIEW]',
    downtime_impact: '[NOT COVERED IN INTERVIEW]',
    plc_info: '[NOT COVERED IN INTERVIEW]',
    io_info: '[NOT COVERED IN INTERVIEW]',
    hmi_info: '[NOT COVERED IN INTERVIEW]',
    drives_info: '[NOT COVERED IN INTERVIEW]',
    safety_chain: '[NOT COVERED IN INTERVIEW]',
    instrumentation: '[NOT COVERED IN INTERVIEW]',
    utilities: '[NOT COVERED IN INTERVIEW]',
    networks: '[NOT COVERED IN INTERVIEW]',
    startup_procedure: [],
    normal_operation: [],
    shutdown_procedure: [],
    common_problems: [],
    skipped_sections: ['Most sections not covered - interview incomplete']
  }
}

/**
 * Get all placeholders from template
 */
function getAllPlaceholders(template: Buffer): string[] {
  const content = template.toString('utf8')
  const placeholders = new Set<string>()
  
  // Match {{PLACEHOLDER}} patterns
  const regex = /\{\{([A-Z_0-9.]+)\}\}/g
  let match
  
  while ((match = regex.exec(content)) !== null) {
    placeholders.add(match[1])
  }
  
  return Array.from(placeholders)
}

/**
 * Generate document from template
 */
export async function generateDocumentFromTemplate(interview: InterviewData): Promise<Buffer> {
  console.log('Starting document generation from template...')
  
  // Load template - try custom first, then default
  const customTemplatePath = path.join(process.cwd(), 'templates', 'PLC_Operations_Manual_Template.docx')
  const defaultTemplatePath = '/mnt/user-data/uploads/PLC_Operations_Manual_Template_WordReady_v2.docx'
  
  let templatePath = defaultTemplatePath
  if (fs.existsSync(customTemplatePath)) {
    templatePath = customTemplatePath
    console.log('Using custom template')
  } else {
    console.log('Using default template')
  }
  
  const template = fs.readFileSync(templatePath)
  
  // Get all placeholders from template
  const placeholders = getAllPlaceholders(template)
  console.log('Found placeholders in template:', placeholders.length)
  
  // Extract structured data from interview
  console.log('Extracting structured data from interview...')
  const data = await extractStructuredData(interview)
  
  // Create a comprehensive data object with ALL possible placeholders
  const templateData: Record<string, string> = {}
  
  // Initialize all placeholders with default value
  placeholders.forEach(placeholder => {
    templateData[placeholder] = '[NOT COVERED IN INTERVIEW]'
  })
  
  // Procedures - ensure they're arrays and format safely
  const startupSteps = Array.isArray(data.startup_procedure) && data.startup_procedure.length > 0
    ? data.startup_procedure.map((step, i) => `${i + 1}. ${step}`).join('\n')
    : '[NOT COVERED IN INTERVIEW]'

  const normalOpSteps = Array.isArray(data.normal_operation) && data.normal_operation.length > 0
    ? data.normal_operation.map((step, i) => `${i + 1}. ${step}`).join('\n')
    : '[NOT COVERED IN INTERVIEW]'

  const shutdownSteps = Array.isArray(data.shutdown_procedure) && data.shutdown_procedure.length > 0
    ? data.shutdown_procedure.map((step, i) => `${i + 1}. ${step}`).join('\n')
    : '[NOT COVERED IN INTERVIEW]'

  const avoidableCauses = Array.isArray(data.avoidable_causes) && data.avoidable_causes.length > 0
    ? data.avoidable_causes.join('; ')
    : '[NOT COVERED IN INTERVIEW]'
  
  // Now override with actual data where available
  Object.assign(templateData, {
    GENERATED_DATE: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    COMPANY_NAME: 'AI Documentation System',
    SYSTEM_NAME: interview.equipment_name,
    EQUIPMENT_LOCATION: interview.equipment_location,
    SME_NAME: interview.sme_name,
    SME_TITLE: interview.sme_title,
    INTERVIEW_DATE: new Date(interview.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    INTERVIEW_STATUS: interview.status === 'completed' ? 'Complete' : interview.status === 'terminated' ? 'Ended Early - Incomplete' : 'In Progress',
    
    // Quick Start - Critical Information
    QUIRK_1_TITLE: data.quirks[0]?.title || '[NOT COVERED IN INTERVIEW]',
    QUIRK_1_SYMPTOM: data.quirks[0]?.symptom || '[NOT COVERED IN INTERVIEW]',
    QUIRK_1_ROOT_CAUSE: data.quirks[0]?.root_cause || '[NOT COVERED IN INTERVIEW]',
    QUIRK_1_DONT: data.quirks[0]?.dont || '[NOT COVERED IN INTERVIEW]',
    QUIRK_1_DO: data.quirks[0]?.do || '[NOT COVERED IN INTERVIEW]',
    QUIRK_2_TITLE: data.quirks[1]?.title || '[NOT COVERED IN INTERVIEW]',
    QUIRK_2_SYMPTOM: data.quirks[1]?.symptom || '[NOT COVERED IN INTERVIEW]',
    QUIRK_2_ROOT_CAUSE: data.quirks[1]?.root_cause || '[NOT COVERED IN INTERVIEW]',
    QUIRK_2_DONT: data.quirks[1]?.dont || '[NOT COVERED IN INTERVIEW]',
    QUIRK_2_DO: data.quirks[1]?.do || '[NOT COVERED IN INTERVIEW]',
    PHANTOM_FAULTS_LIST: data.phantom_faults,
    OPTIMAL_RANGE_VALUE_UNITS: data.optimal_range,
    SWEET_SPOT_SETPOINTS: data.sweet_spot,
    WHEN_TO_ADJUST_AND_WHY: data.when_to_adjust,
    TOP_5_AVOIDABLE_CAUSES: avoidableCauses,
    
    // Safety Essentials
    PINCH_POINTS_HOT_SURFACES_ROTATING_ELECTRICAL_CHEMICALS: data.hazards,
    ESTOP_LOCATIONS_AND_LABELS: data.estop_locations,
    GATE_LOCATIONS_SWITCH_TYPES: data.safety_gates,
    PPE_REQUIREMENTS: data.ppe_requirements,
    STOP_WORK_TRIGGERS: data.stop_work_triggers,
    
    // System Overview
    ONE_PARAGRAPH_PURPOSE_IN_PLAIN_LANGUAGE: data.system_purpose,
    PRODUCT_LIST: data.products,
    HOURS_PER_DAY_DAYS_PER_WEEK: data.operating_schedule,
    UNITS_PER_MIN_HOUR_DAY: data.throughput,
    'CRITICAL_LIMITS_E.G_TEMP_MOISTURE_WEIGHT_SEAL': data.quality_requirements,
    DOWNSTREAM_UPSTREAM_DEPENDENCIES: data.why_critical,
    MINUTES_BEFORE_LINE_STOP: data.downtime_impact,
    COST_PER_HOUR: data.downtime_impact,
    
    // System Architecture
    RACK_LAYOUT_CPU_FIRMWARE: data.plc_info,
    REMOTE_IO_LOCATIONS_PROTOCOLS: data.io_info,
    PANELVIEW_SCADA_CLIENT_LOCATIONS: data.hmi_info,
    DRIVE_TYPES_NETWORK_CONTROL_MODE: data.drives_info,
    SAFETY_CHAIN_DESCRIPTION_PERFORMANCE_LEVEL: data.safety_chain,
    SENSOR_TYPES_COUNTS: data.instrumentation,
    AIR_WATER_STEAM_CIP_POWER: data.utilities,
    IP_SCHEME_VLANS_SWITCHES_FIREWALLS: data.networks,
    
    // Procedures - using the safe variables
    STARTUP_STEPS: startupSteps,
    NORMAL_OPERATION_STEPS: normalOpSteps,
    SHUTDOWN_STEPS: shutdownSteps,
    
    // Skipped sections notice
    SKIPPED_SECTIONS_NOTE: data.skipped_sections.length > 0 
      ? `\n\n⚠️ NOTE: The following sections were not covered in this interview:\n${data.skipped_sections.map(s => `- ${s}`).join('\n')}\n\nThese sections should be completed in a follow-up interview or by technical documentation team.`
      : '\n\n✓ All core sections were covered in this interview.',
  })
  
  console.log('Loading template into docxtemplater...')
  
  // Load and process template
  const zip = new PizZip(template)
  
  try {
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: (part: any) => {
        console.log('Missing placeholder:', part.value)
        return '[NOT COVERED IN INTERVIEW]'
      },
    })
    
    console.log('Rendering document with data...')
    
    // Render with data
    doc.render(templateData)
    
    console.log('Generating final buffer...')
    
    // Generate buffer
    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    })
    
    console.log('Document generated successfully, size:', buffer.length)
    
    return buffer
  } catch (error: any) {
    console.error('Docxtemplater error:', error)
    
    if (error.properties && error.properties.errors) {
      console.error('Template errors:', JSON.stringify(error.properties.errors, null, 2))
    }
    
    throw error
  }
}