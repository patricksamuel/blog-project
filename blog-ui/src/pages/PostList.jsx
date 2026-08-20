
// src/pages/PostList.jsx

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { ArrowRight } from "lucide-react";

import {useEffect, useState} from "react"

import { apiFetch } from "@/lib/api";
import { Link } from "react-router-dom";





export default function PostList() {

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const[error,setError] = useState(null)
    useEffect(()=>{
    apiFetch("/api/post")
        .then(setPosts)
        .catch((err) => setError(err.message))
        .finally(()=>setLoading(false));
    },[])
    if (loading) return <p className="p-8 text-muted-foreground">Loading posts…</p>;
    if (error)   return <p className="p-8 text-red-600">Couldn't load posts. {error}</p>;
    if (posts.length === 0) return <p className="p-8">No posts yet.</p>;


  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {posts.map((post)=>(

        <Card key ={post.id}>
            <CardHeader>
                <CardTitle>{post.title}</CardTitle>
                <CardDescription>{new Date(post.addedAt).toLocaleDateString()}</CardDescription>

            </CardHeader>
            <CardContent>
              <div
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: post.content }}
              />
            </CardContent>
            <CardFooter>
                <Link key={post.id} to ={`/post/${post.id}`}><p className="flex items-center gap-1">Read more <ArrowRight className="size-4" /></p></Link>
                
            </CardFooter>
        </Card>
        ))}
    </div>
  );
}