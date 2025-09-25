import * as fs from 'fs';
import type { Cookie } from '@playwright/test';

export interface NetscapeCookie {
  domain: string;
  httpOnly: boolean;
  path: string;
  secure: boolean;
  expires: number;
  name: string;
  value: string;
}

export function parseCookiesFile(filePath: string): Cookie[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(line => line && !line.startsWith('#'));

  const cookies: Cookie[] = [];

  for (const line of lines) {
    const parts = line.split('\t');
    if (parts.length === 7) {
      const [domain, , path, secure, expires, name, value] = parts;

      cookies.push({
        name: name.trim(),
        value: value.trim(),
        domain: domain.trim(),
        path: path.trim(),
        expires: parseInt(expires),
        httpOnly: false,
        secure: secure.toLowerCase() === 'true',
        sameSite: 'Lax' as const
      });
    }
  }

  return cookies;
}

export function getNotionCookies(cookiesPath: string): Cookie[] {
  const allCookies = parseCookiesFile(cookiesPath);
  return allCookies.filter(cookie =>
    cookie.domain.includes('notion.so') ||
    cookie.domain.includes('.notion.so')
  );
}