"use client";

import { cn } from "@/lib/utils";
import { CodeBlock } from "./code-block";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface Parameter {
  name: string;
  type: string;
  required?: boolean;
  description: string;
}

interface ApiEndpointProps {
  method: HttpMethod;
  path: string;
  title: string;
  description: string;
  parameters?: Parameter[];
  headers?: { name: string; value: string; description?: string }[];
  requestBody?: string;
  responseBody?: string;
  className?: string;
}

const methodColors: Record<HttpMethod, string> = {
  GET: "bg-emerald-500 text-white",
  POST: "bg-blue-500 text-white",
  PUT: "bg-primary text-primary-foreground",
  PATCH: "bg-orange-500 text-white",
  DELETE: "bg-red-500 text-white",
};

export function ApiEndpoint({
  method,
  path,
  title,
  description,
  parameters,
  headers,
  requestBody,
  responseBody,
  className,
}: ApiEndpointProps) {
  return (
    <div className={cn("rounded-xl border bg-card overflow-hidden", className)}>
      {/* Header */}
      <div className="border-b bg-muted/30 p-4">
        <div className="flex items-center gap-3 mb-2">
          <span
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider",
              methodColors[method]
            )}
          >
            {method}
          </span>
          <code className="text-sm font-mono font-medium text-foreground">
            {path}
          </code>
        </div>
        <h3 className="font-semibold text-lg text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>

      <div className="p-4 space-y-6">
        {/* Headers */}
        {headers && headers.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3 text-foreground">
              Headers
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Value</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {headers.map((header, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">
                        {header.name}
                      </td>
                      <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                        {header.value}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {header.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Parameters */}
        {parameters && parameters.length > 0 && (
          <div>
            <h4 className="font-medium text-sm mb-3 text-foreground">
              Parameters
            </h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Name</th>
                    <th className="text-left px-4 py-2 font-medium">Type</th>
                    <th className="text-left px-4 py-2 font-medium">
                      Required
                    </th>
                    <th className="text-left px-4 py-2 font-medium">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {parameters.map((param, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-2 font-mono text-xs">
                        {param.name}
                      </td>
                      <td className="px-4 py-2">
                        <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium">
                          {param.type}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        {param.required ? (
                          <span className="text-accent-foreground text-xs font-medium">
                            Required
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Optional
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground">
                        {param.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Request Body */}
        {requestBody && (
          <div>
            <h4 className="font-medium text-sm mb-3 text-foreground">
              Request Body
            </h4>
            <CodeBlock code={requestBody} language="json" />
          </div>
        )}

        {/* Response Body */}
        {responseBody && (
          <div>
            <h4 className="font-medium text-sm mb-3 text-foreground">
              Response
            </h4>
            <CodeBlock code={responseBody} language="json" />
          </div>
        )}
      </div>
    </div>
  );
}
