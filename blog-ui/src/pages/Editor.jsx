// src/pages/Editor.jsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Editor as TinyEditor } from "@tinymce/tinymce-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "@/lib/api";

export default function Editor() {
  const editorRef = useRef(null)
  const [title, setTitle] = useState("");
  const[error,setError] = useState(null)
  const navigate = useNavigate();
  async function handleSave(e) {
    e.preventDefault();
    const post = editorRef.current.getContent();

    try {
      await apiFetch("/api/post", {
        method: "POST",
        body: JSON.stringify({ title, post }),   // ← content, not post
      });
      navigate("/dashboard");               // ← lowercase
    } catch (err) {
      setError(err.message);
    }
  }


  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle>New post</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <Input placeholder="Post title" value={title} onChange={(e) => setTitle(e.target.value)}/>
          <TinyEditor
            tinymceScriptSrc="/tinymce/tinymce.min.js"
            licenseKey="gpl"
            onInit={(_evt, editor) => (editorRef.current = editor)}
            initialValue="<p>Write your post…</p>"
            init={{
              height: 500,
              menubar: false,
              plugins: [
                "advlist", "autolink", "lists", "link", "image", "charmap",
                "anchor", "searchreplace", "visualblocks", "code", "fullscreen",
                "insertdatetime", "media", "table", "preview", "help", "wordcount",
              ],
              toolbar:
                "undo redo | blocks | bold italic | " +
                "alignleft aligncenter alignright | bullist numlist outdent indent | link image | code",
            }}
          />
          <div className="flex justify-end">
            <Button onClick={handleSave}>Save post</Button>
          </div>
        </CardContent>

      </Card>
    </div>
  );
}