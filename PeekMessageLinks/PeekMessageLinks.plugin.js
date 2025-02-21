/**
* @name PeekMessageLinks
* @author DaddyBoard
* @version 1.0.0
* @description Peek message links
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils, DOM, ReactDOM} = BdApi;
const MessageActions = Webpack.getByKeys("fetchMessage", "deleteMessage");
const MessageStore = Webpack.getStore("MessageStore");
const Message = Webpack.getModule(m => String(m.type).includes('.messageListItem,"aria-setsize":-1,children:['));
const ChannelStore = Webpack.getStore("ChannelStore");
const Preloader = Webpack.getByKeys("preload");

module.exports = class PeekMessageLinks {
    constructor() {
        this.messageCache = new Map();
    }

    start() {
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
                let message = MessageStore.getMessage(props.channelId, props.messageId);
                
                if (e.shiftKey) {
                    if (originalClick) originalClick(e);
                    return;
                }

                const targetElement = e.currentTarget;
                if (!message) {
                    try {
                        const messagePromise = this.messageCache.get(props.messageId) || MessageActions.fetchMessage({
                            channelId: props.channelId,
                            messageId: props.messageId
                        });
                        this.messageCache.set(props.messageId, messagePromise);
                        message = await messagePromise;
                    } catch (error) {
                        if (originalClick) originalClick(e);
                        return;
                    }
                }

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