
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"


import { apiFetch } from "@/lib/api";

import { useEffect , useState} from "react";

export default function DashBoard(
    {className,
  ...props}){
    const [loading, setLoading] = useState(true)
    const [Posts, setPosts] = useState(null)
    async function load(){
        setPosts(await apiFetch(`/api/post/mine`,{
            method: "GET"
        }))
        setLoading(false)
    }

    async function publishPost(postId){
        await apiFetch(`/api/post/${postId}`,{
            method:"PATCH",
            body: JSON.stringify({ published: true }),   // ← tell it what to do
        })
        await load()


    }

    useEffect(()=> {load();},[])

    if (loading) return <p className="p-8 text-muted-foreground">Loading posts…</p>;
    return(
            <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
                {Posts.map((post)=>(
                    <Card key ={post.id}>
                        <CardHeader>

                            <CardTitle>
                                <div className="flex justify-between items-center ">
                                    <div className="flex gap-2">                                    
                                        {post.title} 
                                        <Badge size="xs" variant={post.published ? "default" : "secondary"}>
                                            {post.published ? "Published" : "Draft"}
                                        </Badge>
                                    </div>

                                    <div className="flex items-center gap-2">

                                        {!post.published &&(
                                            <Button onClick={()=> publishPost(post.id)}>Publish Now</Button>
                                            )}


                                    </div>

                                </div>

                            </CardTitle>
                            <CardDescription>{new Date(post.addedAt).toLocaleDateString()}</CardDescription>

                        </CardHeader>
                        <CardContent>
                            <div
                            className="prose max-w-none"
                            dangerouslySetInnerHTML={{ __html: post.content }}
                            />
                        </CardContent>
                        <CardFooter>
                            {/* <Link key={post.id} to ={`/post/${post.id}`}><p className="flex items-center gap-1">Read more <ArrowRight className="size-4" /></p></Link>
                             */}
                        </CardFooter>
                    </Card>

                ))}

            </div>

    );

}