/**
* @name PeekMessageLinks
* @author DaddyBoard
* @version 1.2.10
* @description Clicking on message links will open a popup with the message content.
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
* @runAt idle
*/

const { Webpack, React, Patcher, ReactUtils, Utils, DOM, ReactDOM } = BdApi;
const { createRoot } = ReactDOM;

const {MessageStore, ChannelStore, UserStore, ReferencedMessageStore} = BdApi.Webpack.Stores;

// Defer module declarations so we can resolve them when the registry is ready
let MessageActions;
let MessageConstructor;
let Dispatcher;
let ChannelActions;
let Message;
let loadThreadModule;
let loadThread;
let updateMessageReferenceStore;

const config = {
    changelog: [
        {
            "title": "Fixed",
            "type": "fixed",
            "items": [
                "Fixes for discord updates."
            ]
        }
    ],
    settings: [
        {
            "type": "dropdown",
            "id": "onClick",
            "name": "On Click Behavior",
            "note": "Select what happens when clicking a message link",
            "value": BdApi.Data.load('PeekMessageLinks', 'settings')?.onClick ?? "popup",
            "options": [
                { label: "Show in popup", value: "popup" },
                { label: "Navigate to message", value: "navigate" },
                { label: "Do nothing", value: "none" }
            ]
        },
        {
            "type": "dropdown",
            "id": "onShiftClick",
            "name": "On Shift + Click Behavior",
            "note": "Select what happens when Shift + clicking a message link",
            "value": BdApi.Data.load('PeekMessageLinks', 'settings')?.onShiftClick ?? "navigate",
            "options": [
                { label: "Show in popup", value: "popup" },
                { label: "Navigate to message", value: "navigate" },
                { label: "Do nothing", value: "none" }
            ]
        },
        {
            "type": "dropdown",
            "id": "onCtrlClick",
            "name": "On Control + Click Behavior",
            "note": "Select what happens when Control + clicking a message link",
            "value": BdApi.Data.load('PeekMessageLinks', 'settings')?.onCtrlClick ?? "none",
            "options": [
                { label: "Show in popup", value: "popup" },
                { label: "Navigate to message", value: "navigate" },
                { label: "Do nothing", value: "none" }
            ]
        },
        {
            "type": "dropdown",
            "id": "onHover",
            "name": "On Hover Behavior",
            "note": "Select what happens when hovering over a message link",
            "value": BdApi.Data.load('PeekMessageLinks', 'settings')?.onHover ?? "none",
            "options": [
                { label: "Show in popup", value: "popup" },
                { label: "Do nothing", value: "none" }
            ]
        }
    ]
};

module.exports = class PeekMessageLinks {
    constructor(meta) {
        this.meta = meta;
        this.config = config;
        this.messageCache = new Map();
        this.defaultSettings = {
            onClick: "navigate",
            onShiftClick: "none",
            onCtrlClick: "none",
            onHover: "popup"
        };
        this.settings = this.loadSettings();
        this.hoverPopupTimeout = null;
        this.active = false;
        this.abortController = null;
    }

    loadSettings() {
        return { ...this.defaultSettings, ...BdApi.Data.load('PeekMessageLinks', 'settings') };
    }

    saveSettings(newSettings) {
        this.settings = newSettings;
        BdApi.Data.save('PeekMessageLinks', 'settings', this.settings);
    }

    getSettingsPanel() {
        config.settings.forEach(setting => {
            setting.value = this.settings[setting.id];
        });

        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                const newSettings = { ...this.settings, [id]: value };
                this.saveSettings(newSettings);
            }
        });
    }

    inMana(node) {
        let item = BdApi.ReactUtils.getInternalInstance(document.querySelector("div[class^=app_] > div[class^=app_]"));
        while (!item.memoizedProps?.value?.isWindowFocused) {
            item = item.return;
        }
        return React.createElement(item.type, {
            value: item.memoizedProps.value,
            children: node
        });
    }

    initUpdateMessageReferenceStore() {
        if (updateMessageReferenceStore) return;
        try {
            const nodes = Dispatcher._actionHandlers._dependencyGraph.nodes;
            const storeHandlers = Object.values(nodes).find(({ name }) => name === "ReferencedMessageStore");
            const target = storeHandlers.actionHandler["CREATE_PENDING_REPLY"];
            updateMessageReferenceStore = (message) => target({ message });
        } catch (e) {
            BdApi.Logger.error(this.meta.name, "Failed to initialize updateMessageReferenceStore:", e);
        }
    }

    start() {
        this.active = true;
        this.abortController = new AbortController();
        BdApi.Logger.log(this.meta.name, `(v${this.meta.version}) has started.`);

        const lastVersion = BdApi.Data.load('PeekMessageLinks', 'lastVersion');
        if (lastVersion !== this.meta.version) {
            BdApi.UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            BdApi.Data.save('PeekMessageLinks', 'lastVersion', this.meta.version);
        }

        const timeoutId = setTimeout(() => {
            if (this.active) {
                BdApi.Logger.error(this.meta.name, "Timeout waiting for Message component.");
                this.abortController?.abort();
            }
        }, 15000);

        Webpack.waitForModule(
            Webpack.Filters.bySource("Message must not be a thread starter message"),
            { 
                declarationFilter: (m) => m.type?.toString().includes("Message must not be a thread starter message"),
                signal: this.abortController.signal
            }
        ).then((resolvedMessage) => {
            clearTimeout(timeoutId);
            // Abort setup if the plugin was stopped before resolution completed
            if (!this.active) return;

            if (!resolvedMessage) {
                BdApi.UI.showNotice("PeekMessageLinks ERROR: Could not resolve the Message component. Please report this on the Github page!", { type: 'error' });
                return;
            }

            Message = resolvedMessage;

            const bulkResult = Webpack.getBulk(
                { filter: Webpack.Filters.byKeys("fetchMessage", "deleteMessage") }, // MessageActions
                { filter: Webpack.Filters.byPrototypeKeys("addReaction") }, // MessageConstructor
                { filter: Webpack.Filters.byKeys("subscribe", "dispatch"), searchExports: true }, // Dispatcher
                { filter: m => m.clearChannel }, // ChannelActions
                { filter: m => m.loadThread } // loadThreadModule
            );

            MessageActions = bulkResult[0];
            MessageConstructor = bulkResult[1];
            Dispatcher = bulkResult[2];
            ChannelActions = bulkResult[3];
            loadThreadModule = bulkResult[4];
            loadThread = loadThreadModule?.loadThread;

            this.initUpdateMessageReferenceStore();
            this.patchChannelMention();
        }).catch((error) => {
            clearTimeout(timeoutId);
            BdApi.Logger.error(this.meta.name, "Failed to resolve Webpack modules:", error);
            if (this.active) {
                BdApi.UI.showNotice("PeekMessageLinks ERROR: Failed to resolve Discord modules. Check the console for details.", { type: 'error' });
            }
        });
    }

    stop() {
        this.active = false;
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null;
        }
        Patcher.unpatchAll("PeekMessageLinks-ChannelMentionBubble");
        this.removeAllPopups();
        BdApi.Logger.log(this.meta.name, `(v${this.meta.version}) has stopped.`);
    }

    patchChannelMention() {
        const ChannelMentionBubble = Webpack.getModule(m => m.defaultRules && m.parse).defaultRules.channelMention;       
        Patcher.after("PeekMessageLinks-ChannelMentionBubble", ChannelMentionBubble, "react", (_, [props], res) => {
            if (props.content[0].channelType == "10000") {
                loadThread(props.channelId);
            }
            
            const originalClick = res.props.onClick;
            res.props.onClick = async (e) => {
                let action = this.settings.onClick;
                if (e.shiftKey) action = this.settings.onShiftClick;
                if (e.ctrlKey) action = this.settings.onCtrlClick;

                if (this.hoverPopupTimeout) {
                    clearTimeout(this.hoverPopupTimeout);
                    this.hoverPopupTimeout = null;
                }
                
                if (action === "navigate") {
                    this.removeAllPopups();
                }
                
                const targetElement = e.currentTarget;
                
                if (action === "navigate" && originalClick) {
                    originalClick(e);
                    return;
                }
                
                this.handleAction(action, props, targetElement, originalClick, e);
            };

            res.props.onMouseEnter = async (e) => {
                const action = this.settings.onHover;
                if (action === "none") return;

                const targetElement = e.currentTarget;
                
                if (targetElement.closest('.peek-message-popup')) {
                    return;
                }
                
                if (this.popupCloseTimeout) {
                    clearTimeout(this.popupCloseTimeout);
                    this.popupCloseTimeout = null;
                }
                
                this.hoverPopupTimeout = setTimeout(() => {
                    this.handleAction(action, props, targetElement, originalClick, e);
                    this.hoverPopupTimeout = null;
                }, 200);
            };
            
            res.props.onMouseLeave = (e) => {
                if (this.hoverPopupTimeout) {
                    clearTimeout(this.hoverPopupTimeout);
                    this.hoverPopupTimeout = null;
                }
                
                if (e.currentTarget.closest('.peek-message-popup')) {
                    return;
                }
                
                if (this.settings.onHover === "popup") {
                    this.popupCloseTimeout = setTimeout(() => {
                        this.removeAllPopups();
                        this.popupCloseTimeout = null;
                    }, 200);
                }
            };
        });
    }

    async handleAction(action, props, targetElement, originalClick, event) {
        if (action === "none") return;
                
        let messages = [];

        if (!props.messageId) {
            let messageStore = Webpack.Stores.MessageStore.getMessages(props.channelId);
            if (messageStore.ready === false) {
                await ChannelActions.fetchMessages({channelId:props.channelId});
                messageStore = Webpack.Stores.MessageStore.getMessages(props.channelId);
            }
            if (messageStore && messageStore._array) {
                messages = messageStore._array.slice(-50);
            }
        } else {
            let message = MessageStore.getMessage(props.channelId, props.messageId);

            if (!message) {
                try {
                    const messagePromise = this.messageCache.get(props.messageId) || MessageActions.fetchMessage({
                        channelId: props.channelId,
                        messageId: props.messageId
                    });
                    this.messageCache.set(props.messageId, messagePromise);
                    message = await messagePromise;

                    if (message.id !== props.messageId) {
                        message = new MessageConstructor({
                            id: props.messageId,
                            flags: 64,
                            content: "This message has likely been deleted as the returned message ID does not match that of the message link. If you attempt to navigate to the message, you will be redirected to the closest message.",
                            channel_id: props.channelId,
                            author: UserStore.getCurrentUser(),
                        });
                    }
                } catch (error) {
                    if (originalClick) originalClick(event);
                    return;
                }
            }
            
            if (message.messageReference) {
                if (ReferencedMessageStore.getMessageByReference(message.messageReference).state !== 0) {
                    let referencedMessage = MessageStore.getMessage(message.messageReference.channel_id, message.messageReference.message_id);

                    if (!referencedMessage) {
                        referencedMessage = await MessageActions.fetchMessage({
                            channelId: message.messageReference.channel_id,
                            messageId: message.messageReference.message_id
                        });
                    }
                    if (updateMessageReferenceStore) {
                        updateMessageReferenceStore(referencedMessage);
                    }
                }
            }
            
            messages = [message];
        }

        if (action === "popup" && messages.length > 0) {
            const rect = targetElement.getBoundingClientRect();
            const popup = this.showMessagePopup(messages, rect, props.channelId);
            
            const closePopup = (e) => {
                if (popup && document.body.contains(popup) && !popup.contains(e.target)) {
                    document.removeEventListener('click', closePopup);
                    popup.root.unmount();
                    popup.remove();
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closePopup);
            }, 0);
        }
    }

    showMessagePopup(messages, targetRect, channelId) {
        if (!messages || messages.length === 0) return;
        
        this.removeAllPopups();
        
        const popupElement = DOM.createElement('div');
        popupElement.className = 'peek-message-popup';
        document.body.appendChild(popupElement);

        popupElement.addEventListener('mouseenter', () => {
            if (this.popupCloseTimeout) {
                clearTimeout(this.popupCloseTimeout);
                this.popupCloseTimeout = null;
            }
        });
        
        popupElement.addEventListener('mouseleave', () => {
            this.popupCloseTimeout = setTimeout(() => {
                this.removeAllPopups();
                this.popupCloseTimeout = null;
            }, 200);
        });

        DOM.addStyle('peek-message-popup-style', `
            .peek-message-popup [class*="buttonContainer"] {
                display: none !important;
            }

            .peek-message-popup [class*="message"][class*="selected"]:not([class*="mentioned"]),
            .peek-message-popup [class*="message"]:hover:not([class*="mentioned"]) {
                background: inherit !important;
            }
            
            .peek-message-popup .message-item {
                margin-top: 8px;
                padding-top: 8px;
            }

        `);

        const channel = ChannelStore.getChannel(channelId || (messages[0] && messages[0].channel_id));
        
        if (!channel) {
            BdApi.Logger.log(this.meta.name, "No channel found");
            return;
        }

        const PopupComponent = () => {
            const maxHeight = 500;
            const buffer = 20;
            const edgeMargin = 40;
            
            const spaceAbove = targetRect.top;
            const spaceBelow = window.innerHeight - targetRect.bottom;
            
            const showBelow = spaceAbove < spaceBelow || spaceAbove < 200;
            
            const adjustedMaxHeight = Math.min(
                maxHeight,
                showBelow ? spaceBelow - buffer - edgeMargin : spaceAbove - buffer - edgeMargin
            );
            
            let topPosition = targetRect.bottom + 10;
            if (topPosition + adjustedMaxHeight > window.innerHeight - edgeMargin) {
                topPosition = window.innerHeight - adjustedMaxHeight - edgeMargin;
            }
            
            let bottomPosition = window.innerHeight - targetRect.top + 10;
            if (window.innerHeight - bottomPosition - adjustedMaxHeight < edgeMargin) {
                bottomPosition = window.innerHeight - adjustedMaxHeight - edgeMargin;
            }
            
            const containerRef = React.useRef(null);
            
            React.useEffect(() => {
                if (containerRef.current) {
                    containerRef.current.scrollTop = containerRef.current.scrollHeight;
                }
            }, []);

            return React.createElement('div', {
                ref: containerRef,
                style: {
                    position: 'fixed',
                    ...(showBelow
                        ? { top: `${topPosition}px` }
                        : { bottom: `${bottomPosition}px` }
                    ),
                    left: `${Math.min(Math.max(edgeMargin, targetRect.left), window.innerWidth - 460 - edgeMargin)}px`,
                    backgroundColor: 'var(--background-base-low)',
                    borderRadius: '8px',
                    padding: '8px',
                    width: '460px',
                    maxHeight: `${adjustedMaxHeight}px`,
                    overflowY: 'scroll',
                    boxShadow: 'var(--elevation-high)',
                    zIndex: 1002,
                    opacity: 1,
                    border: '1px solid var(--background-base-lowest)',
                    msOverflowStyle: 'none',
                    scrollbarWidth: 'none',
                    '&::-webkit-scrollbar': {
                        display: 'none'
                    }
                }
            },
                React.createElement('ul', {
                    style: {
                        listStyle: 'none',
                        margin: 0,
                        padding: 0
                    }
                }, 
                    messages.map((message, index) => {
                        return React.createElement('div', {
                            className: 'message-item',
                            key: `${message.id}-container-${index}`
                        }, React.createElement(Message, {
                            id: `${message.id}-${index}`,
                            groupId: message.id,
                            channel: channel,
                            message: message,
                            compact: false,
                            isLastItem: index === messages.length - 1,
                            renderContentOnly: false,
                            style: {
                                width: '100%'
                            }
                        }));
                    })
                )
            );
        };

        const root = createRoot(popupElement);
        root.render(this.inMana(React.createElement(PopupComponent)));
        popupElement.root = root;
        
        return popupElement;
    }

    removeAllPopups() {
        document.querySelectorAll('.peek-message-popup').forEach(popup => {
            if (document.body.contains(popup)) {
                popup.root.unmount();
                popup.remove();
            }
        });
        DOM.removeStyle('peek-message-popup-style');
    }
}