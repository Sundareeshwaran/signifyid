"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Loader2, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { supportApi } from "@/lib/api";
import { toast } from "sonner";
import Link from "next/link";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid work email address.",
  }),
  organizationName: z.string().optional(),
  subject: z.string().min(5, {
    message: "Subject must be at least 5 characters.",
  }),
  message: z.string().min(10, {
    message: "Message must be at least 10 characters.",
  }),
});

function ContactForm() {
  const searchParams = useSearchParams();
  const defaultSubject = searchParams.get("subject")
    ? decodeURIComponent(searchParams.get("subject")!)
    : "";

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      organizationName: "",
      subject: defaultSubject || "",
      message: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true);
    try {
      const response = await supportApi.contactSales(values);

      if (response.error) {
        toast.error("Failed to send message", {
          description: response.error,
        });
      } else {
        setIsSuccess(true);
        toast.success("Message sent!", {
          description: "We'll get back to you shortly.",
        });
      }
    } catch (error) {
      toast.error("Error", {
        description:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 animate-in fade-in-50 duration-500">
        <div className="h-16 w-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-2">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
        </div>
        <h2 className="text-2xl font-bold">Message Sent!</h2>
        <p className="text-muted-foreground max-w-sm">
          Thank you for contacting us. Our team has received your inquiry and
          will respond to {form.getValues().email} shortly.
        </p>
        <Button asChild className="mt-4">
          <Link href="/dashboard/billing">Return to Billing</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="John Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Email</FormLabel>
                <FormControl>
                  <Input placeholder="john@company.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="organizationName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company / Organization (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="Acme Inc." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Sales Inquiry" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Message</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell us about your needs..."
                  className="min-h-[150px] resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                Please include details about your team size and requirements.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Send Message
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-background py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-lg border-muted/40">
        <CardHeader className="space-y-1">
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="-ml-3 h-8 px-2 text-muted-foreground"
            >
              <Link href="/dashboard/billing">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Back
              </Link>
            </Button>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            Contact Sales
          </CardTitle>
          <CardDescription>
            Interested in our Enterprise plan? Fill out the form below and our
            sales team will get in touch.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense
            fallback={
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            }
          >
            <ContactForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
