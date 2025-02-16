/**
* @name PeekMessageLinks
* @author DaddyBoard
* @version 1.0.0
* @description Peek message links
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils, DOM } = BdApi;
const MessageActions = BdApi.Webpack.getByKeys("fetchMessage", "deleteMessage");
const ReactDOM = BdApi.ReactDOM;
const MessageStore = BdApi.Webpack.getStore("MessageStore");
const ChannelStore = BdApi.Webpack.getStore("ChannelStore");

module.exports = class PeekMessageLinks {
    constructor() {
        this.messageCache = new Map();
    }

    start() {
        this.patchChannelMention();
    }

    stop() {
        BdApi.Patcher.unpatchAll("PeekMessageLinks-ChannelMentionBubble");
        this.removeAllPopups();
    }

    patchChannelMention() {
        const ChannelMentionBubble = BdApi.Webpack.getModule(m => m.defaultRules && m.parse).defaultRules.channelMention;       
        Patcher.after("PeekMessageLinks-ChannelMentionBubble", ChannelMentionBubble, "react", (_, [props], res) => {
            
            const originalClick = res.props.onClick;
            res.props.onClick = async (e) => {
                let message = MessageStore.getMessage(props.channelId, props.messageId);
                
                if (e.shiftKey) {
                    if (originalClick) originalClick(e);
                    return;
                }

                const targetElement = e.currentTarget;
                if (!message) {
                    const cachedMessage = this.messageCache.get(props.messageId);
                    if (cachedMessage) {
                        message = cachedMessage;
                    } else {
                        try {
                            message = await MessageActions.fetchMessage({
                                channelId: props.channelId,
                                messageId: props.messageId
                            });
                            this.messageCache.set(props.messageId, message);
                        } catch (error) {
                            if (originalClick) originalClick(e);
                            return;
                        }
                    }
                }

                const rect = targetElement.getBoundingClientRect();
                const popup = this.showMessagePopup(message, rect);
                
                const closePopup = (e) => {
                    if (!popup.contains(e.target)) {
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

        const style = document.createElement('style');
        style.textContent = `
            .peek-message-popup [class*=buttonContainer_] {
                display: none !important;
            }
        `;
        document.head.appendChild(style);

        const Message = BdApi.Webpack.getModule(m => String(m.type).includes('.messageListItem,"aria-setsize":-1,children:['));
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
    }
}