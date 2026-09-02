import Link from "next/link";
import { notFound } from "next/navigation";
import { getDocumentById } from "@/lib/mock-data";

export default function DocumentPage({ params }: { params: { id: string } }) {
  const document = getDocumentById(params.id);

  if (!document) {
    notFound();
  }

  const safeDocument = document;

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="text-sm font-medium text-sky-700 hover:text-sky-800">
            ← Back to upload
          </Link>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            Shareable URL: /documents/{safeDocument.id}
          </span>
        </div>

        <header className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">Study summary</p>
          <h1 className="mt-2 text-3xl font-bold">{safeDocument.title}</h1>
          <p className="mt-3 text-sm text-slate-600">Document ID: {safeDocument.id}</p>
        </header>

        <div className="mt-6 space-y-4">
          {safeDocument.sections.map((section) => (
            <section key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
              <div className="flex items-center justify-between gap-3 bg-slate-50 px-5 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Section {section.order_index}</p>
                  <h2 className="mt-1 text-xl font-semibold">{section.title}</h2>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                  Pages {section.source_page_start}-{section.source_page_end}
                </span>
              </div>

              <ul className="space-y-3 px-5 py-4 pl-8 text-slate-700">
                {section.bullets.map((bullet) => (
                  <li key={bullet.id} className="list-disc">
                    {bullet.text}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          AI-generated summaries may contain errors — always verify against your original material.
        </div>
      </div>
    </main>
  );
}
