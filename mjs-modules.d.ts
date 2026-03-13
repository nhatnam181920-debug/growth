declare module '*.mjs' {
  export function createDeepSeekApiHandler(
    env?: Record<string, string | undefined>,
  ): (req: any, res: any) => Promise<boolean>;
}
