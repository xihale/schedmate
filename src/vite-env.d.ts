/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}

// xlsx-js-style 未自带类型，运行时是 xlsx 的超集，直接借用官方 xlsx 的类型
declare module 'xlsx-js-style' {
  export * from 'xlsx'
  import * as XLSX from 'xlsx'
  export default XLSX
}
