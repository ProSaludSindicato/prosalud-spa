/**
 * Renderers personalizados para ReactMarkdown
 */

import React from "react";
import SyntaxHighlighter from "react-syntax-highlighter/dist/cjs/light";
import { atomOneDark } from "react-syntax-highlighter/dist/cjs/styles/hljs";

export const markdownRenderers = {
  code({ node, inline, className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || "");
    return !inline && match ? (
      <SyntaxHighlighter
        language={match[1]}
        style={atomOneDark}
        customStyle={{
          padding: "1rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          margin: "1rem 0",
          overflow: "auto",
          maxWidth: "100%",
        }}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a({ node, children, href, ...props }: any) {
    // Determinar si es una URL relativa y agregar la URL base si es necesario
    const isRelative = href && href.startsWith("/") && !href.startsWith("//");
    const finalHref = isRelative ? `${window.location.origin}${href}` : href;

    return (
      <a
        href={finalHref}
        className="text-primary-500 underline hover:text-primary-600 font-medium"
        target="_blank"
        rel="noopener noreferrer"
        {...props}
      >
        {children}
      </a>
    );
  },
  p: ({ children }: any) => <p className="my-2 leading-relaxed">{children}</p>,
  br: () => <br className="my-px" />,
  ul: ({ children }: any) => <ul className="ml-4 my-2 list-disc space-y-0.5">{children}</ul>,
  ol: ({ children }: any) => <ol className="ml-4 my-2 list-decimal space-y-0.5">{children}</ol>,
  li: ({ children }: any) => <li className="ml-1">{children}</li>,
  h1: ({ children }: any) => <h1 className="text-xl font-bold my-3">{children}</h1>,
  h2: ({ children }: any) => <h2 className="text-lg font-bold my-2">{children}</h2>,
  h3: ({ children }: any) => <h3 className="text-md font-semibold my-2">{children}</h3>,
  h4: ({ children }: any) => <h4 className="font-semibold my-1">{children}</h4>,
  blockquote: ({ children }: any) => (
    <blockquote className="border-l-4 border-gray-300 pl-3 py-1 my-2 italic dark:border-gray-600">
      {children}
    </blockquote>
  ),
  hr: () => (
    <hr className="my-4 border-0 border-t border-gray-200 dark:border-gray-700" />
  ),
};

