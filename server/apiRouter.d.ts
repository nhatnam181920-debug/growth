declare module './apiRouter.mjs' {
  export function createApiRequestHandler(
    env?: Record<string, string>,
  ): (req: any, res: any) => Promise<boolean>;
}
