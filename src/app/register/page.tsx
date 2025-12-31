"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { isValidEmail, isValidPassword } from "@/lib/auth";

/**
 * Organization Registration Page
 *
 * Allows new organizations to sign up with:
 * - Organization name
 * - Domain
 * - Admin credentials
 */
export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    organizationName: "",
    domain: "",
    adminName: "",
    adminEmail: "",
    adminPassword: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user types
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.organizationName.trim()) {
      newErrors.organizationName = "Organization name is required";
    }

    if (!formData.domain.trim()) {
      newErrors.domain = "Domain is required";
    } else if (
      !/^[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}$/.test(formData.domain)
    ) {
      newErrors.domain = "Please enter a valid domain (e.g., company.com)";
    }

    if (!formData.adminName.trim()) {
      newErrors.adminName = "Your name is required";
    }

    if (!formData.adminEmail.trim()) {
      newErrors.adminEmail = "Admin email is required";
    } else if (!isValidEmail(formData.adminEmail)) {
      newErrors.adminEmail = "Please enter a valid email address";
    }

    const passwordValidation = isValidPassword(formData.adminPassword);
    if (!passwordValidation.valid) {
      newErrors.adminPassword =
        passwordValidation.message || "Invalid password";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);
    setErrors({});

    try {
      const { authApi } = await import("@/lib/api");
      const result = await authApi.register({
        organizationName: formData.organizationName,
        domain: formData.domain,
        email: formData.adminEmail,
        password: formData.adminPassword,
        name: formData.adminName,
      });

      if (result.error) {
        if (result.details) {
          const newErrors: Record<string, string> = {};
          result.details.forEach((d) => {
            if (d.field === "email") newErrors.adminEmail = d.message;
            else if (d.field === "password")
              newErrors.adminPassword = d.message;
            else newErrors[d.field] = d.message;
          });
          setErrors(newErrors);
        } else {
          setErrors({ general: result.error });
        }
        return;
      }

      // Success - redirect to dashboard (auto-logged in)
      router.push("/dashboard");
    } catch (error) {
      setErrors({ general: "Registration failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center dark:hidden"
        style={{ backgroundImage: "url('/welcome_blob_light.svg')" }}
      />
      <div
        className="absolute inset-0 bg-no-repeat bg-cover bg-center hidden dark:block"
        style={{ backgroundImage: "url('/welcome_blob_dark.svg')" }}
      />
      <div className="w-full max-w-md relative z-10">
        {/* Back to Home */}
        <Link
          href="/"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to home
        </Link>

        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="flex justify-center mb-4">
              <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <CardTitle className="text-2xl">Create your organization</CardTitle>
            <CardDescription>
              Set up your identity provider in minutes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* General Error */}
              {errors.general && (
                <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  {errors.general}
                </div>
              )}

              {/* Organization Name */}
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <Input
                  id="organizationName"
                  name="organizationName"
                  placeholder="Acme Corporation"
                  value={formData.organizationName}
                  onChange={handleChange}
                  className={
                    errors.organizationName ? "border-destructive" : ""
                  }
                />
                {errors.organizationName && (
                  <p className="text-xs text-destructive">
                    {errors.organizationName}
                  </p>
                )}
              </div>

              {/* Domain */}
              <div className="space-y-2">
                <Label htmlFor="domain">Domain</Label>
                <Input
                  id="domain"
                  name="domain"
                  placeholder="acme.com"
                  value={formData.domain}
                  onChange={handleChange}
                  className={errors.domain ? "border-destructive" : ""}
                />
                {errors.domain && (
                  <p className="text-xs text-destructive">{errors.domain}</p>
                )}
              </div>

              {/* Admin Name */}
              <div className="space-y-2">
                <Label htmlFor="adminName">Your Name</Label>
                <Input
                  id="adminName"
                  name="adminName"
                  placeholder="John Smith"
                  value={formData.adminName}
                  onChange={handleChange}
                  className={errors.adminName ? "border-destructive" : ""}
                />
                {errors.adminName && (
                  <p className="text-xs text-destructive">{errors.adminName}</p>
                )}
              </div>

              {/* Admin Email */}
              <div className="space-y-2">
                <Label htmlFor="adminEmail">Admin Email</Label>
                <Input
                  id="adminEmail"
                  name="adminEmail"
                  type="email"
                  placeholder="admin@acme.com"
                  value={formData.adminEmail}
                  onChange={handleChange}
                  className={errors.adminEmail ? "border-destructive" : ""}
                />
                {errors.adminEmail && (
                  <p className="text-xs text-destructive">
                    {errors.adminEmail}
                  </p>
                )}
              </div>

              {/* Admin Password */}
              <div className="space-y-2">
                <Label htmlFor="adminPassword">Admin Password</Label>
                <div className="relative">
                  <Input
                    id="adminPassword"
                    name="adminPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.adminPassword}
                    onChange={handleChange}
                    className={
                      errors.adminPassword
                        ? "border-destructive pr-10"
                        : "pr-10"
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {errors.adminPassword && (
                  <p className="text-xs text-destructive">
                    {errors.adminPassword}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Min 8 characters, uppercase, lowercase, and number required
                </p>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating organization...
                  </>
                ) : (
                  "Create Organization"
                )}
              </Button>
            </form>

            {/* Sign In Link */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              Already have an organization?{" "}
              <Link
                href="/login"
                className="text-primary font-medium hover:underline"
              >
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
