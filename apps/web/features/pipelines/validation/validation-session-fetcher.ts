import type { ApiFetcher } from '@/service/source-client'

/** Every request, including follow-up mutations, belongs to the captured authentication cohort. */
export function validationSessionFetcher(
  fetcher: ApiFetcher,
  revision: number,
  current: () => number,
): ApiFetcher {
  const requireCurrent = () => {
    if (current() !== revision)
      throw new DOMException('Validation authentication changed', 'AbortError')
  }
  return async (input, init) => {
    requireCurrent()
    const response = await fetcher(input, init)
    requireCurrent()
    return response
  }
}
