declare module "react-shim" {
  import React from "react";
   export * from "react";
  const _default: typeof React;
  export default _default;
}

declare module "react-dom-shim" {
  import ReactDOM from "react-dom";
   export * from "react-dom";
  const _default: typeof ReactDOM;
  export default _default;
}

declare module "react-client-shim" {
  import React from "react";
  export * from "react";
  const _default: typeof React;
  export default _default;
}

