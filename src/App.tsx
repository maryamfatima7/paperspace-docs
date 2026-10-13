import { useEffect, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import "./App.css";

type Doc = { id: string; title: string; content: string; owner: string; sharedWith: string[] };
const KEY = "paperspace-docs";
const empty = "<p>Start writing here...</p>";

export default function App() {
  const [docs, setDocs] = useState<Doc[]>(() => {
    try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
  });
  const [id, setId] = useState("");
  const [user, setUser] = useState("maryam@example.com");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const active = docs.find(d => d.id === id);

  useEffect(() => { localStorage.setItem(KEY, JSON.stringify(docs)); }, [docs]);

  const editor = useEditor({
    extensions: [StarterKit, Underline],
    content: active?.content || empty,
    onUpdate: ({ editor }) => setDocs(ds => ds.map(d => d.id === id ? { ...d, content: editor.getHTML() } : d))
  });

  useEffect(() => {
    if (active && editor && editor.getHTML() !== active.content) editor.commands.setContent(active.content || empty);
  }, [id, editor]);

  function update(patch: Partial<Doc>) {
    setDocs(ds => ds.map(d => d.id === id ? { ...d, ...patch } : d));
  }
  function create() {
    const d: Doc = { id: crypto.randomUUID(), title: "Untitled document", content: empty, owner: user.trim(), sharedWith: [] };
    setDocs(ds => [d, ...ds]); setId(d.id); setNotice("Document created");
  }
  function importFile(file?: File) {
    if (!file || !active) return;
    if (!/\.(txt|md)$/i.test(file.name) || file.size > 1024 * 1024) {
      setNotice("Choose a .txt or .md file under 1 MB."); return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const safe = String(reader.result || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
      editor?.commands.setContent("<p>" + safe.split(/\r?\n/).join("</p><p>") + "</p>");
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
    update({ sharedWith: [...new Set([...active.sharedWith, target])] });
    setEmail(""); setNotice("Demo sharing saved locally");
  }
  const visible = docs.filter(d => d.owner.toLowerCase() === user.trim().toLowerCase() || d.sharedWith.includes(user.trim().toLowerCase()));

  return <div className="layout">
    <aside className="sidebar"><h2>✦ PaperSpace</h2><p className="muted">DOCUMENT WORKSPACE</p>
      <label>Demo user</label><input value={user} onChange={e => { setUser(e.target.value); setId(""); }} />
      <button className="primary" onClick={create}>＋ New document</button><h4>YOUR DOCUMENTS</h4>
      {visible.map(d => <button key={d.id} className={`doc-link ${id === d.id ? "selected" : ""}`} onClick={() => setId(d.id)}>▤ {d.title}</button>)}
      {!visible.length && <p className="muted">No documents yet</p>}<p className="foot">Autosaves in this browser</p>
    </aside>
    <main><header>Workspace / {active?.title || "Home"} <span className="saved">● Local autosave</span></header>
      {!active ? <section className="welcome"><div className="symbol">✎</div><h1>Your ideas, in one place.</h1><p>Create a document and start writing.</p><button className="primary" onClick={create}>Create document</button></section> :
      <section className="workspace"><input className="title" aria-label="Document title" value={active.title} onChange={e => update({ title: e.target.value })} /><p className="muted">Owner: {active.owner}</p>
        <nav className="toolbar">
          <button onClick={() => editor?.chain().focus().toggleBold().run()}><b>B</b></button>
          <button onClick={() => editor?.chain().focus().toggleItalic().run()}><i>I</i></button>
          <button onClick={() => editor?.chain().focus().toggleUnderline().run()}><u>U</u></button>
          <button onClick={() => editor?.chain().focus().toggleHeading({level:1}).run()}>H1</button>
          <button onClick={() => editor?.chain().focus().toggleHeading({level:2}).run()}>H2</button>
          <button onClick={() => editor?.chain().focus().toggleBulletList().run()}>• List</button>
          <button onClick={() => editor?.chain().focus().toggleOrderedList().run()}>1. List</button>
          <label className="upload">Import .txt/.md<input hidden type="file" accept=".txt,.md" onChange={e => importFile(e.target.files?.[0])} /></label>
        </nav>
        <div className="paper"><EditorContent editor={editor} /></div>
        <section className="sharing"><h3>Sharing & access</h3><p className="muted">Owner: {active.owner}</p>
          <div className="share-row"><input type="email" placeholder="colleague@example.com" value={email} onChange={e => setEmail(e.target.value)} /><button className="primary" onClick={share}>Grant access</button></div>
          <p className="muted">Access list: {active.sharedWith.join(", ") || "Owner only"}</p>
          <small>Demo only: sharing is not secure multi-user access control.</small>
        </section>
      </section>}
      {notice && <button className="toast" onClick={() => setNotice("")}>{notice} ×</button>}
    </main>
  </div>;
}
