// src/App.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./lib/auth";
import Navbar from "./components/openshadcnblocks/block/Navbar";


import PostList from "./pages/PostList";
import PostPage from "./pages/PostPage";
import LoginPage from "./pages/LoginPage"
import SignUpPage from "./pages/SignUpPage"
import  DashBoard  from "./pages/DashBoard";
import Editor from "./pages/Editor";

// temporary stubs — replace each with a real import as you build it
// function PostPage()  { return <h1>Post page</h1>; }
// function Login()     { return <h1>Login</h1>; }
// function Dashboard() { return <h1>Dashboard</h1>; }
// function Editor()    { return <h1>Editor</h1>; }

function RequireAuth() {
  const { isAuthed } = useAuth();
  return isAuthed ? <Outlet /> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <Navbar />

      <Routes>
        <Route path="/" element={<PostList />} />
        <Route path="/post/:id" element={<PostPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />

        <Route element={<RequireAuth />}>
          <Route path="/dashboard" element={<DashBoard />} />
          <Route path="/write" element={<Editor />} />
          {/* <Route path="/write/:id" element={<Editor />} /> */}
        </Route>
      </Routes>
      </>

  );
}