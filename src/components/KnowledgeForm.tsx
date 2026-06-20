import type { KnowledgeEntry, User } from "@prisma/client";

const TYPES = ["PROCESS", "DECISION", "EXCEPTION", "POLICY"] as const;
const STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export default function KnowledgeForm({
  entry,
  users,
  initialTitle,
  action,
}: {
  entry?: KnowledgeEntry;
  users?: User[];
  initialTitle?: string;
  action: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={action} className="space-y-5">
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input
          name="title"
          required
          defaultValue={entry?.title ?? initialTitle}
          className="input"
          placeholder="e.g. How we handle refund requests over $500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Type</label>
          <select name="type" defaultValue={entry?.type ?? "PROCESS"} className="input">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Status</label>
          <select name="status" defaultValue={entry?.status ?? "PUBLISHED"} className="input">
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Summary</label>
        <input
          name="summary"
          required
          defaultValue={entry?.summary}
          className="input"
          placeholder="One sentence an AI agent or new hire could act on"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Tags</label>
          <input
            name="tags"
            defaultValue={entry?.tags?.join(", ")}
            className="input"
            placeholder="comma, separated, tags"
          />
        </div>
        {users && (
          <div>
            <label className="block text-sm font-medium mb-1">Owner</label>
            <select name="ownerId" defaultValue={entry?.ownerId ?? entry?.authorId ?? ""} className="input">
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Content</label>
        <textarea
          name="content"
          required
          rows={10}
          defaultValue={entry?.content}
          className="input mono"
          placeholder="Write the full process, decision context, or policy in markdown..."
        />
      </div>

      <div className="flex gap-3">
        <button type="submit" className="btn btn-primary">
          {entry ? "Save changes" : "Create entry"}
        </button>
      </div>
    </form>
  );
}
