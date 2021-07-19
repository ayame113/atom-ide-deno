import type { LanguageClientConnection } from "atom-languageclient";
import type {
  KnownNotifications,
  KnownRequests,
  RequestCallback,
} from "atom-languageclient/build/lib/languageclient";
import type * as lsp from "vscode-languageserver-protocol";
import type * as jsonrpc from "vscode-jsonrpc";
import { addHook, addHookToObject } from "./utils/hook";

// Hack: Intervene in the connection with lsp and rewrite the URL of the request.
// Rewrite messages starting with `deno: /` to `deno-code: //`.
// If this is not done, the path will be interpreted as a relative path and any error will occur.

function transStringInObject(arg: any, trans: (arg: string) => string): any {
  if (!arg) {
    return arg;
  } else if (typeof arg === "string") {
    return trans(arg);
  } else if (typeof arg === "object" && typeof arg.then === "function") {
    return arg.then((v: any) => transStringInObject(v, trans));
  } else if (Object.prototype.toString.call(arg) === "[object Object]") {
    return Object.fromEntries(
      Object.entries(arg).map(([k, v]) => [k, transStringInObject(v, trans)]),
    );
  } else if (Array.isArray(arg)) {
    return arg.map((v) => transStringInObject(v, trans));
  } else {
    return arg;
  }
}

function encodeDenoURI<T>(arg: T): T {
  return transStringInObject(
    arg,
    (v) => v.replace(/^deno:\/(?!\/)/, "deno-code://"),
  );
}
function decodeDenoURI<T>(arg: T): T {
  return transStringInObject(
    arg,
    (v) => v.replace(/^deno-code:\/\//, "deno:/"),
  );
}

export function addHookToConnection(conn_: LanguageClientConnection) {
  const conn = conn_ as unknown as HookedLanguageClientConnection;
  type onRequestArgs = Parameters<HookedLanguageClientConnection["_onRequest"]>;
  addHookToObject(conn, "_onRequest", {
    argumentsHook([a, callback, ...others]: onRequestArgs): onRequestArgs {
      return [
        a,
        addHook(callback, {
          argumentsHook: encodeDenoURI,
          returnHook: decodeDenoURI,
        }),
        ...others,
      ];
    },
  });
  type onNotificationArgs = Parameters<
    HookedLanguageClientConnection["_onNotification"]
  >;
  addHookToObject(conn, "_onNotification", {
    argumentsHook(
      [a, callback, ...others]: onNotificationArgs,
    ): onNotificationArgs {
      return [
        a,
        addHook(callback, { argumentsHook: encodeDenoURI }),
        ...others,
      ];
    },
  });
  type sendNotificationArgs = Parameters<
    HookedLanguageClientConnection["_sendNotification"]
  >;
  addHookToObject(conn, "_sendNotification", {
    argumentsHook(
      [a, b, ...others]: sendNotificationArgs,
    ): sendNotificationArgs {
      return [
        a,
        decodeDenoURI(b),
        ...others,
      ];
    },
  });
  type sendRequestArgs = Parameters<
    HookedLanguageClientConnection["_sendRequest"]
  >;
  addHookToObject(conn, "_sendRequest", {
    argumentsHook([a, b, ...others]: sendRequestArgs): sendRequestArgs {
      return [
        a,
        decodeDenoURI(b),
        ...others,
      ];
    },
    returnHook: encodeDenoURI,
  });
}

interface HookedLanguageClientConnection {
  _onRequest<T extends Extract<keyof KnownRequests, string>>(
    type: { method: T },
    callback: RequestCallback<T>,
  ): void;

  _onNotification<T extends Extract<keyof KnownNotifications, string>>(
    type: { method: T },
    callback: (obj: KnownNotifications[T]) => void,
  ): void;

  _sendNotification<P, RO>(
    protocol:
      | lsp.ProtocolNotificationType<P, RO>
      | lsp.ProtocolNotificationType0<RO>,
    args?: P,
  ): void;

  _sendRequest<P, R, PR, E, RO>(
    protocol:
      | lsp.ProtocolRequestType<P, R, PR, E, RO>
      | lsp.ProtocolRequestType0<R, PR, E, RO>,
    args?: P,
    cancellationToken?: jsonrpc.CancellationToken,
  ): Promise<R>;
}
