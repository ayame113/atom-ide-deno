import { CompositeDisposable, Disposable } from "atom";
import type { StatusBar, Tile } from "atom/status-bar";
//https://github.com/atom/atom-select-list/pull/31
//import {SelectListView} from "atom-select-list";

interface SelectListView {
  selectItem(item: Record<string, unknown> | string): Promise<void>;
  confirmSelection(): void;
  cancelSelection(): void;
}

type modes = "deno" | "node";
let statusBarElement: HTMLAnchorElement;
let statusBarTile: Tile;
const subscriptions = new CompositeDisposable();
let tooltip: Disposable;

// consumeStatusBarとactivateの呼ばれる順番が前後する
// statusbarを受け取ってresolveするPromise
// getstatusBar.then(statusBar=>...)
export let consumeStatusBar: (param: StatusBar) => void;
const getStatusBar = new Promise<StatusBar>((resolve) => {
  consumeStatusBar = resolve;
});

export function activate({ grammarScopes }: { grammarScopes: string[] }) {
  //下部のステータスバーをクリックして切り替え
  statusBarElement = document.createElement("a");
  statusBarElement.classList.add("inline-block");
  if (!atom.config.get("atom-ide-deno.modes.enable")) {
    statusBarElement.classList.add("atom-ide-deno-status-bar-disable");
  }
  getStatusBar.then((statusBar) => {
    statusBarTile = statusBar.addRightTile({
      item: statusBarElement,
      priority: 10.5,
    });
  });
  subscriptions.add(
    atom.config.onDidChange("atom-ide-deno.modes.currentMode", changeMode),
    atom.config.onDidChange("atom-ide-deno.modes.DenoMode", changeMode),
    atom.config.onDidChange("atom-ide-deno.modes.NodeMode", changeMode),
    atom.config.onDidChange("atom-ide-deno.modes.enable", ({ newValue }) => {
      statusBarElement.classList[newValue ? "remove" : "add"](
        "atom-ide-deno-status-bar-disable",
      );
      changeMode();
    }),
    atom.workspace.observeActiveTextEditor((editor: any) => {
      //js/tsと設定画面以外ではステータスバーを非表示
      if (
        grammarScopes.includes(editor?.getGrammar?.()?.scopeName) ||
        atom.workspace.getPaneItems().some((e: any) =>
          e?.getURI?.() == "atom://config"
        )
      ) {
        statusBarElement.classList.remove(
          "atom-ide-deno-status-bar-not-in-scope",
        );
      } else {
        statusBarElement.classList.add("atom-ide-deno-status-bar-not-in-scope");
      }
    }),
  );
  statusBarElement.addEventListener("click", () => {
    atom.config.set(
      "atom-ide-deno.modes.currentMode",
      atom.config.get("atom-ide-deno.modes.currentMode") == "deno"
        ? "node"
        : "deno",
    );
  });
  // 全てのpackageの初期が終わったらchangeMode
  atom.packages.onDidActivateInitialPackages(changeMode);
}

function changeMode() {
  if (!atom.config.get("atom-ide-deno.modes.enable")) {
    return;
  }
  const newMode: modes = atom.config.get("atom-ide-deno.modes.currentMode");
  // console.log(`Mode change to ${newMode}`);
  if (newMode == "deno") {
    statusBarElement.innerText = "Deno";
    statusBarElement.classList.remove("status-bar-icon-node");
    statusBarElement.classList.add("status-bar-icon-deno");
  } else {
    statusBarElement.innerText = "Node.js";
    statusBarElement.classList.remove("status-bar-icon-deno");
    statusBarElement.classList.add("status-bar-icon-node");
  }
  //設定変更
  //deno lsp: enable:false+lint:false->なにも行わない
  if (newMode == "deno") {
    //atom.packages.enablePackage('atom-ide-deno')
    atom.config.set("atom-ide-deno.lspFlags.enable", true);
    atom.packages.disablePackage("atom-ide-javascript");
    atom.packages.disablePackage("atom-typescript");
    atom.packages.disablePackage("javascript-drag-import");
  } else {
    //atom.packages.disablePackage('atom-ide-deno')
    atom.config.set("atom-ide-deno.lspFlags.enable", false);
    atom.packages.enablePackage("atom-ide-javascript");
    atom.packages.enablePackage("atom-typescript");
    atom.packages.enablePackage("javascript-drag-import");
  }
  const { linter, formatter } = atom.config.get(
    `atom-ide-deno.modes.${newMode == "deno" ? "Deno" : "Node"}Mode`,
  );
  // linter
  (async () => {
    // deno lint
    const isDenoLintEnable = linter == "deno lint";
    atom.config.set("atom-ide-deno.lspFlags.lint", isDenoLintEnable);
    // eslint
    const isEslintEnable = linter == "eslint";
    // Disabling the entire package can lead to unexpected bugs, but it's better than having problems like https://github.com/ayame113/atom-ide-deno/issues/44.
    if (isEslintEnable) {
      atom.packages.enablePackage("linter-eslint");
    } else {
      atom.packages.disablePackage("linter-eslint");
    }
    if (isEslintEnable) {
      // TODO: # I'll leave the code of activation for those who encountered in #44, but remove it after some time.
      await atom.commands.dispatch(
        (atom.workspace as any).getElement(),
        "linter:enable-linter",
      );
      const selectListViewItem = atom.workspace.getModalPanels().filter((v) =>
        v.isVisible() && v.getItem().constructor.name == "SelectListView"
      )[0]?.getItem() as SelectListView;
      try {
        await selectListViewItem?.selectItem("ESLint");
        selectListViewItem?.confirmSelection();
      } catch (_) {
        selectListViewItem.cancelSelection();
      }
      try {
        await atom.commands.dispatch(
          (atom.workspace.getActiveTextEditor() as any).getElement(),
          "linter:lint",
        );
      } catch (_) {}
    }
  })();
  // formatter
  {
    //deno fmt
    const isDenoFormatEnable = formatter == "deno fmt";
    atom.config.set("atom-ide-deno.format.onSave.enable", isDenoFormatEnable);
    // prettier
    const isPrettierEnable = formatter == "prettier";
    if (isPrettierEnable) {
      atom.packages.enablePackage("prettier-atom");
    } else {
      atom.packages.disablePackage("prettier-atom");
    }
  }
  //tooltip
  tooltip?.dispose();
  tooltip = atom.tooltips.add(statusBarElement, {
    title: `<div style="text-align:left;">
            <b>Enabled</b>:<br>
            ${
      (newMode == "deno"
        ? ["atom-ide-deno"]
        : ["atom-ide-javascript", "atom-typescript", "javascript-drag-import"])
        .map((v) => `• ${v}<br>`).join("")
    }
            • ${linter}<br>
            • ${formatter}<hr style="margin:0.25em 0;">
            Click to toggle Deno<br>and Node.js mode.
        </div>`,
    delay: { show: 0, hide: 100 },
  });
}

export function deactivate() {
  statusBarTile.destroy();
  subscriptions.dispose();
  tooltip?.dispose();
}
