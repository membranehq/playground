'use client';

import { CodeBlock as AICodeBlock, CodeBlockCopyButton } from './ai-elements/code-block';
import type { BundledLanguage } from 'shiki';

interface CodeBlockProps {
  code: string;
  language?: string;
}

// Map common language aliases to shiki language names
const languageMap: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  py: 'python',
  rb: 'ruby',
  yml: 'yaml',
  sh: 'bash',
  shell: 'bash',
  text: 'text',
  plaintext: 'text',
};

export function CodeBlock({ code, language = 'typescript' }: CodeBlockProps) {
  // Normalize language name
  const normalizedLang = (languageMap[language] || language) as BundledLanguage;

  return (
    <AICodeBlock code={code} language={normalizedLang} className="my-4">
      <CodeBlockCopyButton />
    </AICodeBlock>
  );
}
