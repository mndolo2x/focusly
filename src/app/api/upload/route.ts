import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { TextProcessor } from '@/lib/text-processor'
import pdf from 'pdf-parse'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const userId = formData.get('userId') as string

    if (!file || !userId) {
      return NextResponse.json(
        { error: 'File and userId are required' },
        { status: 400 }
      )
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json(
        { error: 'Only PDF files are supported' },
        { status: 400 }
      )
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size must be less than 10MB' },
        { status: 400 }
      )
    }

    // Check user's current usage
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('monthly_usage_count')
      .eq('id', userId)
      .single()

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    const usageLimit = parseInt(process.env.MONTHLY_USAGE_LIMIT || '5')
    if (user.monthly_usage_count >= usageLimit) {
      return NextResponse.json(
        { error: `Monthly usage limit of ${usageLimit} documents reached` },
        { status: 429 }
      )
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Extract text from PDF with page tracking
    const data = await pdf(buffer)

    if (!data.text || data.text.trim().length === 0) {
      return NextResponse.json(
        { error: 'No extractable text found in PDF. Please ensure it is a text-based PDF, not a scanned image.' },
        { status: 400 }
      )
    }

    // Validate page count
    const maxPages = parseInt(process.env.MAX_DOCUMENT_PAGES || '50')
    if (data.numpages > maxPages) {
      return NextResponse.json(
        { error: `PDF exceeds maximum page limit of ${maxPages} pages` },
        { status: 400 }
      )
    }

    // Create document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .insert({
        user_id: userId,
        filename: file.name,
        status: 'processing',
      })
      .select()
      .single()

    if (docError) {
      return NextResponse.json(
        { error: 'Failed to create document record' },
        { status: 500 }
      )
    }

    // Process the document asynchronously
    processDocument(document.id, data.text, data.numpages)

    return NextResponse.json({ documentId: document.id })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processDocument(documentId: string, text: string, numPages: number) {
  try {
    // Use text processor instead of AI
    const sections = TextProcessor.processText(text, numPages)

    // Insert sections and bullets into database
    for (const section of sections) {
      const { data: sectionData, error: sectionError } = await supabaseAdmin
        .from('sections')
        .insert({
          document_id: documentId,
          title: section.title,
          order_index: sections.indexOf(section),
          source_page_start: section.pageStart,
          source_page_end: section.pageEnd,
        })
        .select()
        .single()

      if (sectionError) {
        throw new Error(`Failed to create section: ${sectionError.message}`)
      }

      // Insert bullets
      for (const bullet of section.bullets) {
        await supabaseAdmin.from('summary_bullets').insert({
          section_id: sectionData.id,
          text: bullet,
          order_index: section.bullets.indexOf(bullet),
        })
      }
    }

    // Update document status to complete
    await supabaseAdmin
      .from('documents')
      .update({ status: 'complete' })
      .eq('id', documentId)

  } catch (error) {
    console.error('Document processing error:', error)

    // Update document status to failed
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'failed',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      })
      .eq('id', documentId)
  }
}
