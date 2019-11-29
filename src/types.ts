export type RouteHandler = (
  params: { [option: string]: void | string },
  request: Request
) => Promise<Response>;


