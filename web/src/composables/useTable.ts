// 【面试重点】useTable
// 解决的问题：每个列表都要自己管页码、loading 和搜索后的页码。最常见的 bug 是搜完还停在第 5 页，结果变成空的。
// 为什么这样设计：请求、总数、加载状态收在这里。页面只提供「当前筛选条件下怎么取数据」。搜索必须走 search()，它会先回到第 1 页再请求。翻页不能直接改页码，避免绕过这个约定。

import { ref, shallowRef, readonly, type Ref } from 'vue'

interface PageResult<T> {
  list: T[]
  total: number
}

export function useTable<T>(fetcher: (page: number, pageSize: number) => Promise<PageResult<T>>) {
  const list = ref<T[]>([])
  const total = shallowRef(0)
  const page = shallowRef(1)
  const pageSize = shallowRef(10)
  const loading = shallowRef(false)

  async function load() {
    loading.value = true
    try {
      const result = await fetcher(page.value, pageSize.value)
      list.value = result.list
      total.value = result.total
    } finally {
      loading.value = false
    }
  }

  /** 条件变化后调用。先回到第一页，避免旧页码超出新结果。 */
  function search() {
    page.value = 1
    return load()
  }

  function changePage(next: number) {
    page.value = next
    return load()
  }

  function changeSize(next: number) {
    pageSize.value = next
    page.value = 1
    return load()
  }

  return {
    list: readonly(list) as Readonly<Ref<T[]>>,
    total: readonly(total),
    page: readonly(page),
    pageSize: readonly(pageSize),
    loading: readonly(loading),
    load,
    search,
    changePage,
    changeSize,
  }
}
