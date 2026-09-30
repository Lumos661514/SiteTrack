/// <reference types="vite/client" />

declare module 'vue-router' {
  interface RouteMeta {
    title?: string
    desc?: string
    public?: boolean
  }
}

export {}
