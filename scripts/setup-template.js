const fs = require('fs')
const path = require('path')

const sourceTemplate = '/mnt/user-data/uploads/PLC_Operations_Manual_Template_WordReady_v2.docx'
const templatesDir = path.join(__dirname, '..', 'templates')
const targetTemplate = path.join(templatesDir, 'PLC_Operations_Manual_Template.docx')

// Create templates directory if it doesn't exist
if (!fs.existsSync(templatesDir)) {
  fs.mkdirSync(templatesDir, { recursive: true })
  console.log('Created templates directory')
}

// Copy template
if (fs.existsSync(sourceTemplate)) {
  fs.copyFileSync(sourceTemplate, targetTemplate)
  console.log('Template copied successfully!')
  console.log('Location:', targetTemplate)
} else {
  console.error('Source template not found:', sourceTemplate)
  process.exit(1)
}