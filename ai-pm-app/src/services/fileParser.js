import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let text = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    text += content.items.map(item => item.str).join(' ') + '\n'
  }
  return text.trim()
}

async function parseDOCX(file) {
  const mammoth = await import('mammoth')
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.extractRawText({ arrayBuffer })
  return result.value.trim()
}

async function parsePPTX(file) {
  const zip = await JSZip.loadAsync(await file.arrayBuffer())
  const slideFiles = Object.keys(zip.files)
    .filter(name => /ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort()

  let text = ''
  for (const slideName of slideFiles) {
    const xml = await zip.files[slideName].async('text')
    const matches = xml.match(/<a:t[^>]*>([^<]+)<\/a:t>/g) || []
    const slideText = matches.map(m => m.replace(/<[^>]+>/g, '')).join(' ')
    if (slideText.trim()) text += slideText.trim() + '\n'
  }
  return text.trim()
}

async function parseTXT(file) {
  return await file.text()
}

export async function parseFile(file) {
  const name = file.name.toLowerCase()
  try {
    if (name.endsWith('.pdf')) return await parsePDF(file)
    if (name.endsWith('.docx')) return await parseDOCX(file)
    if (name.endsWith('.pptx')) return await parsePPTX(file)
    if (name.endsWith('.txt') || name.endsWith('.md')) return await parseTXT(file)
    throw new Error(`지원하지 않는 파일 형식입니다 (지원: PDF, DOCX, PPTX, TXT, MD)`)
  } catch (err) {
    throw new Error(`파일 파싱 실패: ${err.message}`)
  }
}

export function formatFileContext(fileName, content) {
  const maxChars = 8000
  const truncated = content.length > maxChars
    ? content.slice(0, maxChars) + '\n\n[... 이하 생략됨]'
    : content
  return `\n\n---\n📎 첨부 파일: ${fileName}\n\n${truncated}`
}
