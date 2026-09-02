/**
 * Basic text processing for PDF summarization
 * Splits text into logical sections and extracts key points without AI
 */

export interface ProcessedSection {
  title: string
  bullets: string[]
  pageStart: number
  pageEnd: number
}

export class TextProcessor {
  /**
   * Process raw text into structured sections
   */
  static processText(text: string, numPages: number): ProcessedSection[] {
    // Split text into chunks by pages
    const chunkSize = Math.ceil(text.length / numPages)
    const chunks: Array<{ text: string; pageStart: number; pageEnd: number }> = []

    for (let i = 0; i < numPages; i++) {
      const start = i * chunkSize
      const end = Math.min((i + 1) * chunkSize, text.length)
      chunks.push({
        text: text.slice(start, end),
        pageStart: i + 1,
        pageEnd: i + 1,
      })
    }

    // Combine chunks into logical sections
    const sections = this.createSections(chunks)
    return sections
  }

  /**
   * Create logical sections from page chunks
   */
  private static createSections(
    chunks: Array<{ text: string; pageStart: number; pageEnd: number }>
  ): ProcessedSection[] {
    const sections: ProcessedSection[] = []
    const sectionSize = Math.max(2, Math.ceil(chunks.length / 5)) // Create 3-5 sections

    for (let i = 0; i < chunks.length; i += sectionSize) {
      const sectionChunks = chunks.slice(i, i + sectionSize)
      const combinedText = sectionChunks.map(c => c.text).join('\n\n')
      const pageStart = sectionChunks[0].pageStart
      const pageEnd = sectionChunks[sectionChunks.length - 1].pageEnd

      // Generate section title
      const title = this.generateTitle(combinedText, i / sectionSize + 1)

      // Extract bullet points
      const bullets = this.extractBullets(combinedText)

      sections.push({
        title,
        bullets,
        pageStart,
        pageEnd,
      })
    }

    return sections
  }

  /**
   * Generate a section title based on content
   */
  private static generateTitle(text: string, sectionNumber: number): string {
    // Try to find a heading-like line
    const lines = text.split('\n').filter(line => line.trim().length > 0)
    const firstLine = lines[0]?.trim()

    // Look for lines that might be headings (short, all caps, or numbered)
    const potentialHeading = lines.find(line => {
      const trimmed = line.trim()
      return (
        trimmed.length < 100 &&
        (trimmed === trimmed.toUpperCase() ||
         trimmed.match(/^[IVX]+\.|^Section|^Chapter|^Part/i) ||
         trimmed.match(/^\d+\./))
      )
    })

    if (potentialHeading) {
      return potentialHeading.trim().substring(0, 80)
    }

    // Use first substantial line if no heading found
    if (firstLine && firstLine.length < 80) {
      return firstLine
    }

    // Fallback to numbered section
    return `Section ${sectionNumber}`
  }

  /**
   * Extract key sentences as bullet points
   */
  private static extractBullets(text: string): string[] {
    const sentences = this.splitIntoSentences(text)
    const bullets: string[] = []

    // Filter for meaningful sentences
    const meaningfulSentences = sentences.filter(sentence => {
      const trimmed = sentence.trim()
      return (
        trimmed.length > 20 &&
        trimmed.length < 200 &&
        !trimmed.match(/^(note|warning|caution|important|see also)/i) &&
        !trimmed.match(/^[\s\d]*$/) &&
        !trimmed.match(/^\s*[a-z]\./) // Avoid single letter fragments
      )
    })

    // Select up to 6 key sentences
    const maxBullets = Math.min(6, meaningfulSentences.length)
    const step = Math.max(1, Math.floor(meaningfulSentences.length / maxBullets))

    for (let i = 0; i < maxBullets && i * step < meaningfulSentences.length; i++) {
      const sentence = meaningfulSentences[i * step].trim()
      // Clean up the sentence
      const cleaned = sentence
        .replace(/^\s*[-•*]\s*/, '') // Remove bullet markers
        .replace(/^\s*\d+[.)]\s*/, '') // Remove numbered markers
        .trim()
      bullets.push(cleaned)
    }

    // Ensure we have at least 3 bullets if possible
    if (bullets.length < 3 && meaningfulSentences.length >= 3) {
      for (let i = bullets.length; i < 3 && i < meaningfulSentences.length; i++) {
        const sentence = meaningfulSentences[i].trim()
        const cleaned = sentence
          .replace(/^\s*[-•*]\s*/, '')
          .replace(/^\s*\d+[.)]\s*/, '')
          .trim()
        bullets.push(cleaned)
      }
    }

    return bullets.slice(0, 6)
  }

  /**
   * Split text into sentences
   */
  private static splitIntoSentences(text: string): string[] {
    // Split by common sentence terminators
    const sentences = text
      .split(/(?<=[.!?])\s+(?=[A-Z])/)
      .map(s => s.trim())
      .filter(s => s.length > 0)

    return sentences
  }
}
