import { unref, type Ref } from 'vue'
import { useMutation, useQuery } from '@tanstack/vue-query'

type MaybeRef<T> = T | Ref<T>

/**
 * useFetched
 *
 * @param fetcher   A function which expects raw values A[0], A[1], ...
 * @param params    A list of MaybeRef wrappers around those same values
 * @returns         The standard Vue Query result for a T
 */
export const useFetched = <A extends unknown[], T>(
  fetcher: (...args: A) => T | Promise<T>,
  ...params: { [K in keyof A]: MaybeRef<A[K]> }
) =>
  useQuery<T>({
    queryKey: [fetcher.name, ...params],
    queryFn: () => fetcher(...params.map(unref) as A)
  })

export const useMutated = <A extends unknown[], T>(
  mutator: (...args: A) => never,
  ...params: { [K in keyof A]: MaybeRef<A[K]> }
) =>
  useMutation<T>({
    mutationKey: [mutator.name],
    mutationFn: () => mutator(...params.map(unref) as A)
  })
