declare module 'glob' {
  export function glob(pattern: string, options?: { ignore?: string | string[] }): Promise<string[]>;
}

