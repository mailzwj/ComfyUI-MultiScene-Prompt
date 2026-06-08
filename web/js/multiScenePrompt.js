import { app } from "../../../scripts/app.js";

app.registerExtension({
    name: "Comfy.MultiScenePrompt",
    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "MultiScenePrompt") return;

        const origOnNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            if (origOnNodeCreated) origOnNodeCreated.apply(this, arguments);

            this._scenes = [""];
            this._activeTab = 0;

            // Remove the default scenes_json widget created by backend
            const idx = this.widgets.findIndex(w => w.name === "scenes_json");
            if (idx !== -1) {
                const old = this.widgets[idx];
                if (old.inputEl && old.inputEl.parentNode) {
                    old.inputEl.parentNode.removeChild(old.inputEl);
                }
                if (old.element && old.element.parentNode) {
                    old.element.parentNode.removeChild(old.element);
                }
                this.widgets.splice(idx, 1);
            }

            // Create the scene editor DOM widget
            this._createSceneWidget();
            this.size[0] = Math.max(this.size[0], 400);
        };

        nodeType.prototype._createSceneWidget = function () {
            const node = this;

            // Container
            const container = document.createElement("div");
            container.style.cssText = `
                display: flex; flex-direction: column; gap: 0;
                width: 100%; overflow: hidden;
            `;

            // Tab bar wrapper (flex row: scrollable tabs + fixed "+" button)
            const tabBarWrapper = document.createElement("div");
            tabBarWrapper.style.cssText = `
                display: flex; align-items: center;
                background: #2a2a2a; border-radius: 6px 6px 0 0;
                padding: 4px 6px; min-height: 28px;
            `;

            // Scrollable tab container
            const tabBar = document.createElement("div");
            tabBar.style.cssText = `
                display: flex; align-items: center; gap: 2px;
                flex: 1; overflow-x: auto; overflow-y: hidden;
                scrollbar-width: none; white-space: nowrap;
            `;
            // Hide scrollbar for webkit
            const styleId = "multi-scene-prompt-scrollbar-style";
            if (!document.getElementById(styleId)) {
                const style = document.createElement("style");
                style.id = styleId;
                style.textContent = `.ms-prompt-tabbar::-webkit-scrollbar { display: none; }`;
                document.head.appendChild(style);
            }
            tabBar.classList.add("ms-prompt-tabbar");

            // Support horizontal scroll with mouse wheel
            tabBar.addEventListener("wheel", (e) => {
                if (Math.abs(e.deltaY) > 0) {
                    e.preventDefault();
                    tabBar.scrollLeft += e.deltaY;
                }
            }, { passive: false });

            tabBarWrapper.appendChild(tabBar);

            // Fixed "+" button
            const addBtn = document.createElement("div");
            addBtn.textContent = "+";
            addBtn.style.cssText = `
                display: flex; align-items: center; justify-content: center;
                width: 20px; height: 20px; border-radius: 4px;
                background: #3a3a3a; color: #ccc; cursor: pointer;
                font-size: 14px; font-weight: bold; user-select: none;
                margin-left: 6px; flex-shrink: 0;
            `;
            addBtn.addEventListener("click", () => {
                node._scenes[node._activeTab] = node._textarea.value;
                node._scenes.push("");
                node._activeTab = node._scenes.length - 1;
                node._textarea.value = "";
                node._renderTabs();
                // Scroll to end to show new tab
                setTimeout(() => { tabBar.scrollLeft = tabBar.scrollWidth; }, 0);
            });
            tabBarWrapper.appendChild(addBtn);

            container.appendChild(tabBarWrapper);

            // Text area for scene prompt
            const textarea = document.createElement("textarea");
            textarea.placeholder = "场景提示词";
            textarea.style.cssText = `
                width: 100%; height: 100px; background: #1a1a1a; color: #ddd;
                border: 1px solid #444; border-top: none; border-radius: 0 0 6px 6px;
                padding: 8px 10px; font-size: 12px; resize: none;
                box-sizing: border-box; font-family: sans-serif;
                line-height: 1.4; outline: none;
            `;
            textarea.addEventListener("focus", () => { textarea.style.borderColor = "#4a9eff"; });
            textarea.addEventListener("blur", () => { textarea.style.borderColor = "#444"; });
            textarea.addEventListener("input", () => {
                node._scenes[node._activeTab] = textarea.value;
            });
            container.appendChild(textarea);

            // Store references
            node._tabBar = tabBar;
            node._textarea = textarea;

            // Render tabs
            node._renderTabs();

            // Create DOM widget named "scenes_json" to match backend input
            const widget = this.addDOMWidget("scenes_json", "customtext", container, {
                getValue: () => JSON.stringify(node._scenes),
                setValue: (v) => {
                    try {
                        const parsed = JSON.parse(v);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            node._scenes = parsed;
                        }
                    } catch (e) {}
                    if (node._activeTab >= node._scenes.length) node._activeTab = 0;
                    node._renderTabs();
                    node._textarea.value = node._scenes[node._activeTab] || "";
                },
                getMinHeight: () => 140,
            });

            widget.computeSize = () => [0, 140];
            // This is critical: serializeValue is called when building the prompt
            widget.serializeValue = () => JSON.stringify(node._scenes);
            this._sceneWidget = widget;
        };

        nodeType.prototype._renderTabs = function () {
            const tabBar = this._tabBar;
            if (!tabBar) return;

            tabBar.innerHTML = "";

            for (let i = 0; i < this._scenes.length; i++) {
                const tab = document.createElement("div");
                tab.style.cssText = `
                    display: inline-flex; align-items: center; gap: 2px;
                    padding: 3px 8px; border-radius: 4px; cursor: pointer;
                    font-size: 11px; user-select: none; white-space: nowrap;
                    flex-shrink: 0;
                    ${i === this._activeTab
                        ? "background: #4a4a4a; color: #fff;"
                        : "background: transparent; color: #999;"}
                `;

                const label = document.createElement("span");
                label.textContent = `场景${i + 1}`;
                label.addEventListener("click", () => {
                    this._scenes[this._activeTab] = this._textarea.value;
                    this._activeTab = i;
                    this._textarea.value = this._scenes[i] || "";
                    this._renderTabs();
                });
                tab.appendChild(label);

                if (this._scenes.length > 1) {
                    const closeBtn = document.createElement("span");
                    closeBtn.textContent = "×";
                    closeBtn.style.cssText = `
                        margin-left: 4px; cursor: pointer; font-size: 13px;
                        color: ${i === this._activeTab ? "#aaa" : "#666"};
                        line-height: 1;
                    `;
                    closeBtn.addEventListener("click", (e) => {
                        e.stopPropagation();
                        this._scenes.splice(i, 1);
                        if (this._activeTab >= this._scenes.length) {
                            this._activeTab = this._scenes.length - 1;
                        }
                        this._textarea.value = this._scenes[this._activeTab] || "";
                        this._renderTabs();
                    });
                    tab.appendChild(closeBtn);
                }

                tabBar.appendChild(tab);
            }

            // Scroll active tab into view
            const activeEl = tabBar.children[this._activeTab];
            if (activeEl) {
                setTimeout(() => {
                    activeEl.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
                }, 0);
            }
        };

        // Restore state on load
        const origOnConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (data) {
            if (origOnConfigure) origOnConfigure.apply(this, arguments);

            const w = this.widgets?.find(w => w.name === "scenes_json");
            if (w) {
                let val = w.value;
                if (typeof val === "string") {
                    try {
                        const parsed = JSON.parse(val);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            this._scenes = parsed;
                        }
                    } catch (e) {}
                }
            }

            if (!this._scenes || this._scenes.length === 0) this._scenes = [""];
            if (this._activeTab >= this._scenes.length) this._activeTab = 0;
            if (this._textarea) {
                this._textarea.value = this._scenes[this._activeTab] || "";
            }
            if (this._tabBar) {
                this._renderTabs();
            }
        };
    },
});
