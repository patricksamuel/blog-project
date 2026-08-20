import { useParams } from "react-router-dom";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarDays, MessageCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

import {useEffect, useState} from "react"

import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";




export default function PostPage(){
    const { id } = useParams();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);        // [] not null
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [author, setAuthor] = useState("");            // hooks all at top
    const [text, setText] = useState("");

    useEffect(() => {
    apiFetch(`/api/post/${id}`)
        .then(setPost)
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    apiFetch(`/api/comment?postid=${id}`)              // postid, not comment
        .then(setComments)
        .catch(() => {});
    }, [id]);                                            // [id] not []

    async function submitComment(e) {
    e.preventDefault();
    try {
        await apiFetch(`/api/comment/${id}`, {           // ${id} with the $
        method: "POST",
        body: JSON.stringify({ author, comment: text }),
        });
        setAuthor("");
        setText("");
        setComments(await apiFetch(`/api/comment?postid=${id}`));
    } catch (err) {
        setError(err.message);
    }
    }

    if (loading) return <p className="p-8 text-muted-foreground">Loading…</p>;
    if (error)   return <p className="p-8 text-red-600">Couldn't load post. {error}</p>;
    if (!post)   return <p className="p-8">Post not found.</p>;



    return (
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-10">
        {/* The post */}
        <Card>
            <CardHeader>
            <CardTitle className="text-3xl font-display leading-tight">{post.title}</CardTitle>
            <CardDescription className="flex items-center gap-1.5">
                <CalendarDays className="size-4" />
                {new Date(post.addedAt).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
                })}
            </CardDescription>
            </CardHeader>
            <CardContent>
                <div
                className="prose max-w-none"
                dangerouslySetInnerHTML={{ __html: post.content }}
                />
            </CardContent>
        </Card>

        {/* Comment form — boxed so it reads as its own compose area */}
        <Card>
            <CardHeader>
            <CardTitle className="text-base">Leave a comment</CardTitle>
            </CardHeader>
            <CardContent>
            <form onSubmit={submitComment} className="space-y-3">
                <Input placeholder="Your name" value={author} onChange={(e) => setAuthor(e.target.value)}/>
                <Textarea placeholder="Write a comment…" rows={4} value={text} onChange={(e) => setText(e.target.value)}/>
                <div className="flex justify-end">
                <Button type="submit" className="flex items-center gap-2">
                    <Send className="size-4" />
                    Post comment
                </Button>
                </div>
            </form>
            </CardContent>
        </Card>

        {/* Comments thread */}
        <section>
            <div className="flex items-center gap-2 mb-4">
            <MessageCircle className="size-5" />
            <h2 className="text-xl font-semibold">
                Comments
                {comments.length > 0 && (
                <span className="text-muted-foreground font-normal"> ({comments.length})</span>
                )}
            </h2>
            </div>

            <Separator className="mb-6" />

            <div className="space-y-6">
            {comments.length === 0 && (
                <p className="text-muted-foreground text-sm">No comments yet. Be the first.</p>
            )}
            {comments.map((c) => (
                <div key={c.id} className="flex gap-3">
                <Avatar className="size-9">
                    <AvatarFallback className="text-xs">
                    {c.author?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                    <p className="font-medium text-sm">{c.author}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{c.content}</p>
                </div>
                </div>
            ))}
            </div>
        </section>
        </div>
    );
}