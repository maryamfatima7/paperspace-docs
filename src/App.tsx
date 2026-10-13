import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import "./App.css";

type Doc = { id: string; title: string; content: string; owner: string; sharedWith: string[] };
const KEY = "paperspace-docs";
const empty = "<p></p>";
const legacyEmpty = "<p>Start writing here...</p>";

export default function App() {
  const [docs, setDocs] = useState<Doc[]>(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(KEY) || "[]") as Doc[];
      return stored.map(doc => ({
        ...doc,
        content: doc.content === legacyEmpty ? empty : doc.content || empty,
      }));
    } catch { return []; }
  });
  const [id, setId] = useState("");
  const [user, setUser] = useState("maryam@example.com");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const active = docs.find(d => d.id === id);
  const activeId = useRef(id);
  const activeDocumentId = active?.id;
  const activeContent = active?.content;

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(docs)); }, [docs]);

  const editor = useEditor({
    extensions: [StarterKit.configure({ underline: false }), Underline],
    content: empty,
    onUpdate: ({ editor }) => {
      const documentId = activeId.current;
      const content = editor.getHTML();
      setDocs(current => current.map(doc => doc.id === documentId ? { ...doc, content } : doc));
    },
  });

  useLayoutEffect(() => {
    if (!activeDocumentId || !editor) return;
    const content = activeContent || empty;
    if (editor.getHTML() !== content) editor.commands.setContent(content, { emitUpdate: false });
  }, [activeContent, activeDocumentId, editor]);

  function update(documentId: string, patch: Partial<Doc>) {
    setDocs(current => current.map(doc => doc.id === documentId ? { ...doc, ...patch } : doc));
  }
  function openDocument(documentId: string) {
    if (id && editor) update(id, { content: editor.getHTML() });
    activeId.current = documentId;
    setId(documentId);
  }
  function create() {
    const d: Doc = { id: crypto.randomUUID(), title: "Untitled document", content: empty, owner: user.trim(), sharedWith: [] };
    setDocs(ds => [d, ...ds]); activeId.current = d.id; setId(d.id); setNotice("Document created");
  }
  function importFile(file?: File) {
    if (!file || !active) return;
    const documentId = active.id;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 1024 * 1024) {
      setNotice("Choose a .txt or .md file under 1 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const safe = String(reader.result || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const content = "<p>" + safe.split(/\r?\n/).join("</p><p>") + "</p>";
      if (activeId.current === documentId) editor?.commands.setContent(content);
      else update(documentId, { content });
      setNotice("File imported");
    };
    reader.onerror = () => setNotice("File could not be read");
    reader.readAsText(file);
  }
  function share() {
    if (!active) return;
    const target = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(target)) { setNotice("Enter a valid email"); return; }
    if (target === active.owner.toLowerCase()) { setNotice("Owner already has access"); return; }
    setDocs(current => current.map(doc => doc.id === active.id
      ? { ...doc, sharedWith: [...new Set([...doc.sharedWith, target])] }
      : doc));
    setEmail(""); setNotice("Demo sharing saved locally");
  }
  const visible = docs.filter(d => d.owner.trim().toLowerCase() === user.trim().toLowerCase() || d.sharedWith.includes(user.trim().toLowerCase()));

  return <div className="layout">
    <aside className="sidebar"><h2>✦ PaperSpace</h2><p className="muted">DOCUMENT WORKSPACE</p>
      <label>Demo user</label><input value={user} onChange={e => { setUser(e.target.value); activeId.current = ""; setId(""); }} />
      <button type="button" className="primary" onClick={create}>＋ New document</button><h4>YOUR DOCUMENTS</h4>
      {visible.map(d => <button type="button" key={d.id} className={`doc-link ${id === d.id ? "selected" : ""}`} onClick={() => openDocument(d.id)}>▤ {d.title}</button>)}
      {!visible.length && <p className="muted">No documents yet</p>}<p className="foot">Autosaves in this browser</p>
    </aside>
    <main><header className="workspace-header">Workspace / {active?.title || "Home"} <span className="saved">● Local autosave</span></header>
      {!active ? <section className="welcome"><div className="symbol">✎</div><h1>Your ideas, in one place.</h1><p>Create a document and start writing.</p><button type="button" className="primary" onClick={create}>Create document</button></section> :
      <section className="workspace"><input className="title" aria-label="Document title" value={active.title} onChange={e => update(active.id, { title: e.target.value })} /><p className="muted">Owner: {active.owner}</p>
        <nav className="toolbar">
          <button type="button" aria-label="Bold" className={editor?.isActive("bold") ? "active" : ""} onClick={() => editor?.chain().focus().toggleBold().run()}><b>B</b></button>
          <button type="button" aria-label="Italic" className={editor?.isActive("italic") ? "active" : ""} onClick={() => editor?.chain().focus().toggleItalic().run()}><i>I</i></button>
          <button type="button" aria-label="Underline" className={editor?.isActive("underline") ? "active" : ""} onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></button>
          <button type="button" aria-label="Heading 1" className={editor?.isActive("heading", { level: 1 }) ? "active" : ""} onClick={() => editor?.chain().focus().toggleHeading({level:1}).run()}>H1</button>
          <button type="button" aria-label="Heading 2" className={editor?.isActive("heading", { level: 2 }) ? "active" : ""} onClick={() => editor?.chain().focus().toggleHeading({level:2}).run()}>H2</button>
          <button type="button" aria-label="Bullet list" className={editor?.isActive("bulletList") ? "active" : ""} onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
          <button type="button" aria-label="Ordered list" className={editor?.isActive("orderedList") ? "active" : ""} onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
          <label className="upload">Import .txt/.md<input hidden type="file" accept=".txt,.md" onChange={e => importFile(e.target.files?.[0])} /></label>
        </nav>
        {editor?.isEmpty && <p className="editor-hint">Start writing below. Changes save automatically in this browser.</p>}
        <div className="paper"><EditorContent editor={editor} /></div>
        <section className="sharing"><h3>Sharing & access</h3><p className="muted">Owner: {active.owner}</p>
          <div className="share-row"><input type="email" placeholder="colleague@example.com" value={email} onChange={e => setEmail(e.target.value)} /><button type="button" className="primary" onClick={share}>Grant access</button></div>
          <p className="muted">Access list: {active.sharedWith.join(", ") || "Owner only"}</p>
          <small>Demo only: sharing is not secure multi-user access control.</small>
        </section>
      </section>}
      {notice && <button type="button" className="toast" onClick={() => setNotice("")}>{notice} ×</button>}
    </main>
  </div>;
}
