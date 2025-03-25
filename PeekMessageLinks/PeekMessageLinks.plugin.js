/**
* @name PeekMessageLinks
* @author DaddyBoard
* @version 1.1.1
* @description Clicking on message links will open a popup with the message content.
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils, DOM, ReactDOM} = BdApi;
const MessageActions = Webpack.getByKeys("fetchMessage", "deleteMessage");
const MessageStore = Webpack.getStore("MessageStore");
const Message = Webpack.getModule(m => String(m.type).includes('.messageListItem,"aria-setsize":-1,children:['));
const ChannelStore = Webpack.getStore("ChannelStore");
const Preloader = Webpack.getByKeys("preload");
const MessageConstructor = Webpack.getByPrototypeKeys("addReaction");
const UserStore = Webpack.getStore("UserStore");
const Dispatcher = Webpack.getByKeys("subscribe", "dispatch");
const ReferencedMessageStore = Webpack.getStore("ReferencedMessageStore");
const updateMessageReferenceStore = (()=>{
    function getActionHandler(){
        const nodes = Dispatcher._actionHandlers._dependencyGraph.nodes;
        const storeHandlers = Object.values(nodes).find(({ name }) => name === "ReferencedMessageStore");
        return storeHandlers.actionHandler["CREATE_PENDING_REPLY"];
    }
    const target = getActionHandler();
    return (message) => target({message});
})();
const ChannelConstructor = Webpack.getModule(Webpack.Filters.byPrototypeKeys("addCachedMessages"));

const config = {
    changelog: [
        {
            "title": "1.1.1",
            "type": "fixed",
            "items": [
                "Fixed an issue on message links to very old messages making them appear randomly in the chat (out of chronological order).",
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
        this.defaultSettings = {
            onClick: "popup",
            onShiftClick: "navigate",
            onCtrlClick: "none",
            onHover: "none"
        };
        this.settings = this.loadSettings();
        this.hoverPopupTimeout = null;
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

    start() {
        const lastVersion = BdApi.Data.load('PeekMessageLinks', 'lastVersion');
        if (lastVersion !== this.meta.version) {
            BdApi.UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            BdApi.Data.save('PeekMessageLinks', 'lastVersion', this.meta.version);
        }
        this.patchChannelMention();
    }

    stop() {
        Patcher.unpatchAll("PeekMessageLinks-ChannelMentionBubble");
        this.removeAllPopups();
    }

    patchChannelMention() {
        const ChannelMentionBubble = Webpack.getModule(m => m.defaultRules && m.parse).defaultRules.channelMention;       
        Patcher.after("PeekMessageLinks-ChannelMentionBubble", ChannelMentionBubble, "react", (_, [props], res) => {
            if (!props.messageId) return;
            if (props.content[0].channelType == "10000") {
                Preloader.preload(props.guildId, props.channelId);
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
        console.log(props);
        
        let message = MessageStore.getMessage(props.channelId, props.messageId);

        if (!message) {
            try {
                const messagePromise = MessageActions.fetchMessage({
                    channelId: props.channelId,
                    messageId: props.messageId
                });
                message = await messagePromise;
                
                ChannelConstructor.commit(ChannelConstructor.getOrCreate(props.channelId).mergeDelta([message]));

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
                updateMessageReferenceStore(referencedMessage);
            }
        }

        if (action === "popup") {
            const rect = targetElement.getBoundingClientRect();
            const popup = this.showMessagePopup(message, rect);
            
            const closePopup = (e) => {
                if (popup && document.body.contains(popup) && !popup.contains(e.target)) {
                    document.removeEventListener('click', closePopup);
                    ReactDOM.unmountComponentAtNode(popup);
                    popup.remove();
                }
            };
            
            setTimeout(() => {
                document.addEventListener('click', closePopup);
            }, 0);
        }
    }

    showMessagePopup(message, targetRect) {
        if (!message || !message.author) return;
        
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
            .peek-message-popup [class*=buttonContainer_] {
                display: none !important;
            }

            .peek-message-popup [class*="message__"][class*="selected_"]:not([class*="mentioned_"]),
            .peek-message-popup [class*="message__"]:hover:not([class*="mentioned__"]) {
                background: inherit !important;
            }
        `);

        const channel = ChannelStore.getChannel(message.channel_id);

        const PopupComponent = () => {
            const maxHeight = 300;
            const buffer = 40;
            const spaceAbove = targetRect.top;
            const showBelow = spaceAbove < (maxHeight + buffer);

            return React.createElement('div', {
                style: {
                    position: 'fixed',
                    ...(showBelow
                        ? { top: `${targetRect.bottom + 10}px` }
                        : { bottom: `${window.innerHeight - targetRect.top + 10}px` }
                    ),
                    left: `${targetRect.left}px`,
                    backgroundColor: 'var(--background-primary)',
                    borderRadius: '8px',
                    padding: '8px',
                    width: '460px',
                    maxHeight: '300px',
                    overflowY: 'scroll',
                    boxShadow: 'var(--elevation-high)',
                    zIndex: 1001,
                    opacity: 1,
                    border: '1px solid var(--background-tertiary)',
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
                    React.createElement(Message, {
                        id: `${message.id}-${message.id}`,
                        groupId: message.id,
                        channel: channel,
                        message: message,
                        compact: false,
                        isLastItem: true,
                        renderContentOnly: false,
                        style: {
                            width: '100%'
                        }
                    })
                )
            );
        };

        ReactDOM.render(React.createElement(PopupComponent), popupElement);
        return popupElement;
    }

    removeAllPopups() {
        document.querySelectorAll('.peek-message-popup').forEach(popup => {
            if (document.body.contains(popup)) {
                ReactDOM.unmountComponentAtNode(popup);
                popup.remove();
            }
        });
        DOM.removeStyle('peek-message-popup-style');
    }
}