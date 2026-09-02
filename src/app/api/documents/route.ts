import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      )
    }

    // Fetch documents with their sections and bullets
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select(`
        *,
        sections (
          id,
          title,
          order_index,
          source_page_start,
          source_page_end,
          summary_bullets (
            id,
            text,
            order_index
          )
        )
      `)
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch documents' },
        { status: 500 }
      )
    }

    // Transform the data to match the expected structure
    const transformedDocuments = documents.map((doc: any) => ({
      ...doc,
      sections: doc.sections?.map((section: any) => ({
        ...section,
        bullets: section.summary_bullets || [],
      })) || [],
    }))

    return NextResponse.json({ documents: transformedDocuments })
  } catch (error) {
    console.error('Fetch documents error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
