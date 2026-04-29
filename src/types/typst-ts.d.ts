declare module "@myriaddreamin/typst.ts/dist/esm/contrib/snippet.mjs" {
  /**
   * Typst.ts 的全局快捷调用对象。
   * 详见：https://github.com/Myriad-Dreamin/typst.ts
   */
  export const $typst: {
    /** 编译 Typst 源码为 PDF（Uint8Array）*/
    pdf: (opts: { mainContent: string }) => Promise<Uint8Array>;
    /** 编译 Typst 源码为 SVG 字符串 */
    svg: (opts: { mainContent: string }) => Promise<string>;
    /** 设置自定义 wasm/font 资源加载器（高级用法）*/
    setCompilerInitOptions?: (opts: unknown) => void;
    setRendererInitOptions?: (opts: unknown) => void;
  };
}

declare module "@myriaddreamin/typst.ts" {
  export const $typst: {
    pdf: (opts: { mainContent: string }) => Promise<Uint8Array>;
    svg: (opts: { mainContent: string }) => Promise<string>;
  };
}
