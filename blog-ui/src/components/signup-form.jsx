import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { apiFetch } from "@/lib/api";
import { useNavigate } from "react-router-dom"
import { useState } from "react";


export function SignupForm({
  ...props
}) {
    const [error, setError] = useState(null);
    
    const navigate =useNavigate()
    
    async function handleSubmit(e) {
        e.preventDefault();
        setError(null)

        const data = new FormData(e.target)
        const email = data.get("email")
        const password = data.get("password")
        const confirmpassword = data.get("confirmpassword")
        const name = data.get("name")
        if (password !== confirmpassword) {
          setError("Passwords do not match.");
          return;                          // stop — don't submit
        }
        if (password.length < 8) {
          setError("Password must be at least 8 characters.");
          return;
        }
        try {
          await apiFetch(`/api/auth/signup`, {      
          method: "POST",
          body: JSON.stringify({ email,password,name}),
          });
          navigate("/")

        } catch (err) {
            setError(err.message);
        }
    }

  return (


    
    <Card {...props}>
      <CardHeader>
        <CardTitle>Create an account</CardTitle>
        <CardDescription>
          Enter your information below to create your account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="name">Full Name</FieldLabel>
              <Input id="name" name="name" type="text" placeholder="John Doe" required />
            </Field>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" type="email" name="email" placeholder="m@example.com" required />
              <FieldDescription>
                We&apos;ll use this to contact you. We will not share your email
                with anyone else.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input id="password" type="password" name="password" required />
              <FieldDescription>
                Must be at least 8 characters long.
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="confirm-password">
                Confirm Password
              </FieldLabel>
              <Input id="confirm-password" type="password" name="confirmpassword" required />
              <FieldDescription>Please confirm your password.</FieldDescription>
            </Field>
            <FieldGroup>
              <Field>
                {error ? <p className="text-sm text-red-600">{error}</p> : null}
                <Button type="submit">Create Account</Button>
                <FieldDescription className="px-6 text-center">
                  Already have an account? <a href="/login">Sign in</a>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}
