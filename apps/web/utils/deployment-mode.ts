/** Shared pure mode predicate for both the Node build and the browser runtime. */
export function isCloudDeploymentMode(mode: string | undefined): boolean {
  return mode?.trim().toLowerCase() === 'cloud'
}
