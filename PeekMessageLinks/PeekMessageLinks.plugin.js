/**
* @name PeekMessageLinks
* @author DaddyBoard
* @version 1.0.1
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

const config = {
    changelog: [
        {
            "title": "Initial Release - how does it work?",
            "type": "added",
            "items": [
                "Depending on how you configure the settings, when you click on a message link, a popup will appear with the message content.",
                "By default, normal clicking will open the popup, shift clicking will navigate to the message.",
                "Please do go ahead and configure the settings to your liking! \n\nI do plan on adding other ways to show the message content, such as embedding it directly into the chat like a website link would do, but that will be for later."
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
        }
    ]
};

module.exports = class PeekMessageLinks {
    constructor(meta) {
        this.meta = meta;
        this.config = config;
        this.messageCache = new Map();
        this.defaultSettings = {
            onClick: "popup",
            onShiftClick: "navigate",
            onCtrlClick: "none"
        };
        this.settings = this.loadSettings();
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

                if (action === "none") return;
                if (action === "navigate") {
                    if (originalClick) originalClick(e);
                    return;
                }

                let message = MessageStore.getMessage(props.channelId, props.messageId);
                const targetElement = e.currentTarget;

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
                        if (originalClick) originalClick(e);
                        return;
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
            };
        });
    }

    showMessagePopup(message, targetRect) {
        if (!message || !message.author) return;
        
        this.removeAllPopups();
        
        const popupElement = DOM.createElement('div');
        popupElement.className = 'peek-message-popup';
        document.body.appendChild(popupElement);

        DOM.addStyle('peek-message-popup-style', `
            .peek-message-popup [class*=buttonContainer_] {
                display: none !important;
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
                    padding: '16px',
                    width: '460px',
                    maxHeight: '300px',
                    overflowY: 'scroll',
                    boxShadow: 'var(--elevation-high)',
                    zIndex: 100,
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