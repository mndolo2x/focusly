export type MockBullet = {
  id: string;
  text: string;
  order_index: number;
};

export type MockSection = {
  id: string;
  title: string;
  order_index: number;
  source_page_start: number;
  source_page_end: number;
  bullets: MockBullet[];
};

export const mockDocument = {
  id: "doc-demo-1",
  title: "Sample Study Notes",
  usageCount: 1,
  usageResetDate: "2026-09-01",
  sections: [
    {
      id: "section-1",
      title: "Section 1: Key Overview",
      order_index: 1,
      source_page_start: 1,
      source_page_end: 6,
      bullets: [
        { id: "bullet-1-1", text: "The material introduces the foundational concept and explains its purpose clearly.", order_index: 1 },
        { id: "bullet-1-2", text: "Core definitions are provided before deeper analysis so the reader understands the context.", order_index: 2 },
        { id: "bullet-1-3", text: "Important terminology is repeated across sections to reinforce retention and comprehension.", order_index: 3 },
      ],
    },
    {
      id: "section-2",
      title: "Section 2: Main Ideas",
      order_index: 2,
      source_page_start: 7,
      source_page_end: 14,
      bullets: [
        { id: "bullet-2-1", text: "The central arguments build logically from the earlier definitions into more complex reasoning.", order_index: 1 },
        { id: "bullet-2-2", text: "Examples help connect theory to practical application and make the content easier to remember.", order_index: 2 },
        { id: "bullet-2-3", text: "Comparisons highlight the relative strengths and weaknesses of the main approaches discussed.", order_index: 3 },
      ],
    },
    {
      id: "section-3",
      title: "Section 3: Review and Implications",
      order_index: 3,
      source_page_start: 15,
      source_page_end: 20,
      bullets: [
        { id: "bullet-3-1", text: "The final portion summarizes the most important takeaways for quick revision.", order_index: 1 },
        { id: "bullet-3-2", text: "Implications suggest how the ideas connect to future study topics and exam preparation.", order_index: 2 },
        { id: "bullet-3-3", text: "Readers are encouraged to verify details against the original material before finalizing conclusions.", order_index: 3 },
      ],
    },
  ],
} as const;

export function getDocumentById(documentId: string) {
  return documentId === mockDocument.id ? mockDocument : null;
}
