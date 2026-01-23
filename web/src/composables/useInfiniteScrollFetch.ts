import { ref, type Ref } from 'vue'

export interface FetchResult<T> {
  items: T[]
  totalPages: number
  totalItems: number
}

export type FetchFunction<T> = (page: number, perPage: number) => Promise<FetchResult<T>>

export interface UseInfiniteScrollFetchOptions<T> {
  fetchFn: FetchFunction<T>
  perPage?: number
}

export interface UseInfiniteScrollFetchReturn<T> {
  items: Ref<T[]>
  loading: Ref<boolean>
  hasMore: Ref<boolean>
  page: Ref<number>
  loadNext: () => Promise<void>
  reset: () => void
}

export function useInfiniteScrollFetch<T>(options: UseInfiniteScrollFetchOptions<T>): UseInfiniteScrollFetchReturn<T> {
  const items = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const hasMore = ref(true)
  const page = ref(0) // Start at 0 so first loadNext makes it 1
  const perPage = options.perPage || 20

  const loadNext = async () => {
    if (loading.value || !hasMore.value) return

    loading.value = true
    try {
      const nextPage = page.value + 1
      const result = await options.fetchFn(nextPage, perPage)
      
      if (nextPage === 1) {
        items.value = result.items
      } else {
        items.value = [...items.value, ...result.items]
      }
      
      page.value = nextPage
      hasMore.value = nextPage < result.totalPages
    } catch (e) {
      console.error('Failed to load next page', e)
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    page.value = 0
    items.value = []
    hasMore.value = true
    loading.value = false
  }

  return {
    items,
    loading,
    hasMore,
    page,
    loadNext,
    reset
  }
}
