import "server-only";

import Link from "next/link";
import { BlogForm } from "@/features/blog/admin-client";

export function NewBlogPostPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/blog" className="text-body-sm text-mist hover:text-ice">← Blog</Link>
      <h1 className="mt-4 font-display text-display-xl text-snow">Novo artigo</h1>
      <p className="mt-1 text-body-sm text-mist">Crie como rascunho ou publique imediatamente.</p>
      <BlogForm />
    </div>
  );
}
