// src/components/Navbar.jsx
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function Navbar() {
  const { isAuthed, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="border-b">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-semibold">My Blog</Link>

        <div className="flex items-center gap-2">
          {isAuthed ? (
            <>
              <Button variant="ghost" asChild><Link to="/dashboard">Dashboard</Link></Button>
              <Button asChild><Link to="/write">Write</Link></Button>
              <Button variant="ghost" onClick={handleLogout}>Log out</Button>
            </>
          ) : (
            <Button asChild><Link to="/login">Log in</Link></Button>
          )}
        </div>
      </div>
    </header>
  );
}