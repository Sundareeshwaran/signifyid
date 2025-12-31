"use client";

import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function CheckoutCanceledPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-orange-50 to-amber-100 dark:from-orange-950/20 dark:to-amber-950/20">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-orange-600 dark:text-orange-400" />
          </div>
          <CardTitle className="text-2xl">Checkout Canceled</CardTitle>
          <CardDescription>
            Your payment was not completed. No charges have been made.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            You can try again anytime. If you have any questions or need
            assistance, please contact our support team.
          </p>

          <Button
            onClick={() => router.push("/dashboard/billing")}
            className="w-full"
          >
            Back to Billing
          </Button>

          <Button
            variant="outline"
            onClick={() => router.push("/dashboard")}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
