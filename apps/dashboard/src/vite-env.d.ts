/// <reference types="vite/client" />

declare module '*.png?url' {
  const url: string;
  export default url;
}

declare module '*.tmj?raw' {
  const content: string;
  export default content;
}

declare module '*.png' {
  const url: string;
  export default url;
}
