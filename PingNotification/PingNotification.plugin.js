/**
 * @name PingNotification
 * @author DaddyBoard
 * @version 7.2.6
 * @description Show in-app notifications for anything you would hear a ping for.
 * @source https://github.com/DaddyBoard/BD-Plugins
 * @invite ggNWGDV7e2
 */

const { React, Webpack, ReactDOM } = BdApi;

const UserStore = Webpack.getStore("UserStore");
const ChannelStore = Webpack.getStore("ChannelStore"); 
const GuildStore = Webpack.getStore("GuildStore");
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");
const RelationshipStore = Webpack.getStore("RelationshipStore");
const UserGuildSettingsStore = Webpack.getStore("UserGuildSettingsStore");
const transitionTo = Webpack.getByStrings(["transitionTo - Transitioning to"],{searchExports:true});
const MessageParserModule = Webpack.getModule(m => m.defaultRules && m.parse);
const parse = MessageParserModule?.parse;
const GuildMemberStore = Webpack.getModule(m => m.getMember);
const Dispatcher = BdApi.Webpack.getByKeys("subscribe", "dispatch")
const MessageStore = BdApi.Webpack.getStore("MessageStore");
const MessageAccessories = BdApi.Webpack.getByPrototypeKeys("renderEmbeds", {searchExports:true});
const MessageActions = BdApi.Webpack.getByKeys("fetchMessage", "deleteMessage");
const PresenceStore = Webpack.getStore("PresenceStore");

const ChannelAckModule = (() => {
    const filter = BdApi.Webpack.Filters.byStrings("type:\"CHANNEL_ACK\",channelId", "type:\"BULK_ACK\",channels:");
    const module = BdApi.Webpack.getModule((e, m) => filter(BdApi.Webpack.modules[m.id]));
    return Object.values(module).find(m => m.toString().includes("type:\"CHANNEL_ACK\",channelId"));
})();

const config = {
    changelog: [
        {
            title: "Update",
            type: "improved",
            items: [
                "Migrated plugin to grouped repo, update meta to reflect this"
            ]
        }
    ],
    settings: [
        {
            type: "category",
            id: "behavior",
            name: "Behavior Settings",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "slider", 
                    id: "duration",
                    name: "Notification Duration",
                    note: "How long notifications stay on screen (in seconds)",
                    value: 15,
                    min: 1,
                    max: 60,
                    markers: [1, 20, 40, 60],
                    units: "s",
                    defaultValue: 15,
                    stickToMarkers: false
                },
                {
                    type: "dropdown",
                    id: "popupLocation",
                    name: "Popup Location",
                    note: "Where notifications appear on screen",
                    value: "bottomRight",
                    options: [
                        { label: "Top Left", value: "topLeft" },
                        { label: "Top Right", value: "topRight" },
                        { label: "Bottom Left", value: "bottomLeft" },
                        { label: "Bottom Right", value: "bottomRight" }
                    ]
                },
                {
                    type: "switch",
                    id: "readChannelOnClose",
                    name: "Mark Channel as Read on Close",
                    note: "Automatically mark the channel as read when closing a notification",
                    value: false
                },
                {
                    type: "switch",
                    id: "disableMediaInteraction",
                    name: "Disable Media Interaction",
                    note: "Make all clicks navigate to the message instead of allowing media interaction",
                    value: false
                },
                {
                    type: "switch",
                    id: "allowNotificationsInCurrentChannel",
                    name: "Current Channel Notifications",
                    note: "Show notifications for the channel you're currently viewing",
                    value: false
                },
                {
                    type: "switch",
                    id: "hideDND",
                    name: "Hide When DND",
                    note: "Hide all notifications when your status is set to Do Not Disturb",
                    value: false
                },
                {
                    type: "switch",
                    id: "closeOnRead",
                    name: "Close notifications upon reading message",
                    note: "If you manually navigate to the messages origin (channel or DM), close all notifications currently live on-screen from that same channel/DM",
                    value: true
                }
            ]
        },
        {
            type: "category", 
            id: "appearance",
            name: "Appearance Settings",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "privacyMode",
                    name: "Privacy Mode",
                    note: "Blur notification content until hovered",
                    value: false
                },
                {
                    type: "switch",
                    id: "applyNSFWBlur",
                    name: "Blur NSFW Content",
                    note: "Blur content from NSFW channels",
                    value: false
                },
                {
                    type: "switch",
                    id: "showTimer",
                    name: "Show Timer",
                    note: "Show the seconds left of the notification(numbers, not the progress bar)",
                    value: true
                }
            ]
        },
        {
            type: "category",
            id: "userStyling",
            name: "User Styling",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "coloredUsernames",
                    name: "Colored Usernames",
                    note: "Show usernames in their role colors",
                    value: true
                },
                {
                    type: "switch",
                    id: "showNicknames",
                    name: "Show Nicknames",
                    note: "Use server nicknames instead of usernames",
                    value: true
                },
                {
                    type: "switch",
                    id: "usernameOrDisplayName",
                    name: "Use Display Name",
                    note: "When no nickname is set, show the display name instead of the username. On = Display Name, Off = Username",
                    value: false
                },
                {
                    type: "switch",
                    id: "useFriendNicknames",
                    name: "Use Friend Nicknames for DMs",
                    note: "Show your custom friend nicknames from DM messages",
                    value: true
                }
            ]
        },
        {
            type: "category",
            id: "advancedSettings",
            name: "Advanced Settings",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "slider",
                    id: "maxWidth",
                    name: "Notification Width",
                    note: "Default: 370px",
                    value: 370,
                    min: 100,
                    max: 400,
                    markers: [100, 200, 300, 370, 400],
                    units: "px",
                    defaultValue: 370,
                    stickToMarkers: false
                },
                {
                    type: "slider",
                    id: "maxHeight",
                    name: "Notification Height",
                    note: "Default: 300px",
                    value: 300,
                    min: 200,
                    max: 600,
                    markers: [200, 300, 400, 500, 600],
                    units: "px",
                    defaultValue: 300,
                    stickToMarkers: false
                }
            ]
        }
    ]
};

module.exports = class PingNotification {
    constructor(meta) {
        this.meta = meta;
        this.defaultSettings = {
            duration: 15000,
            maxWidth: 370,
            maxHeight: 300,
            popupLocation: "bottomRight",
            allowNotificationsInCurrentChannel: false,
            privacyMode: false,
            coloredUsernames: true,
            showNicknames: true,
            applyNSFWBlur: false,
            readChannelOnClose: false,
            disableMediaInteraction: false,
            showTimer: true,
            usernameOrDisplayName: true,
            hideDND: false,
            closeOnRead: true,
            useFriendNicknames: true
        };
        this.settings = this.loadSettings();
        this.activeNotifications = [];

        this.onMessageReceived = this.onMessageReceived.bind(this);
    }

    start() {
        const lastVersion = BdApi.Data.load('PingNotification', 'lastVersion');
        if (lastVersion !== this.meta.version) {
            BdApi.UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            BdApi.Data.save('PingNotification', 'lastVersion', this.meta.version);
        }     
        this.messageCreateHandler = async (event) => {
            if (!event?.message) return;
            try {
                let message = MessageStore.getMessage(event.message.channel_id, event.message.id) || 
                              await MessageActions.fetchMessage({ 
                                  channelId: event.message.channel_id, 
                                  messageId: event.message.id 
                              });
                
                if (message.messageReference) {
                    const referencedMessage = MessageStore.getMessage(
                        message.messageReference.channel_id, 
                        message.messageReference.message_id
                    ) || await MessageActions.fetchMessage({
                        channelId: message.messageReference.channel_id,
                        messageId: message.messageReference.message_id
                    });
                    
                    if (referencedMessage) {
                        message.messageReference.author = referencedMessage.author;
                        message.messageReference.message = referencedMessage;
                    }
                }
                
                if (message) {
                    this.onMessageReceived(message);
                }
            } catch (error) {
                console.error("PingNotification: Error fetching message", error);
            }
        };

        this.messageUpdateHandler = async (event) => {
            if (!event?.message) return;
            const activeNotification = this.activeNotifications.find(n => 
                n.messageId === event.message.id && n.channelId === event.message.channel_id
            );

            if (activeNotification) {
                try {
                    let updatedMessage = MessageStore.getMessage(event.message.channel_id, event.message.id) || 
                                       await MessageActions.fetchMessage({ 
                                           channelId: event.message.channel_id, 
                                           messageId: event.message.id 
                                       });
                    
                    if (updatedMessage.messageReference) {
                        const referencedMessage = MessageStore.getMessage(
                            updatedMessage.messageReference.channel_id,
                            updatedMessage.messageReference.message_id
                        ) || await MessageActions.fetchMessage({
                            channelId: updatedMessage.messageReference.channel_id,
                            messageId: updatedMessage.messageReference.message_id
                        });

                        if (referencedMessage) {
                            updatedMessage.messageReference.message = referencedMessage;
                            updatedMessage.messageReference.author = referencedMessage.author;
                        }
                    }
                    
                    if (updatedMessage) {
                        this.updateNotification(activeNotification, updatedMessage);
                    }
                } catch (error) {
                    console.error("PingNotification: Error fetching updated message", error);
                }
            }
        };

        this.reactionAddHandler = async (event) => {
            if (!event?.messageId) return;
            const activeNotification = this.activeNotifications.find(n => 
                n.messageId === event.messageId && n.channelId === event.channelId
            );

            if (activeNotification) {
                try {
                    const updatedMessage = MessageStore.getMessage(event.channelId, event.messageId) || 
                                         await MessageActions.fetchMessage({ 
                                             channelId: event.channelId, 
                                             messageId: event.messageId 
                                         });
                    
                    if (updatedMessage) {
                        this.updateNotification(activeNotification, updatedMessage);
                    }
                } catch (error) {
                    console.error("PingNotification: Error fetching message for reaction update", error);
                }
            }
        };

        this.reactionRemoveHandler = this.reactionAddHandler;

        this.messageAckHandler = (event) => {
            if (!this.settings.closeOnRead) return;
            
            console.log('[PingNotification] Message ACK received for channel:', event.channelId);
            
            const notificationsToClose = this.activeNotifications.filter(notification => 
                notification.channelId === event.channelId
            );

            if (notificationsToClose.length > 0) {
                console.log('[PingNotification] Closing notifications:', notificationsToClose.length);
                requestAnimationFrame(() => {
                    notificationsToClose.forEach(notification => {
                        this.removeNotification(notification);
                    });
                });
            }
        };

        Dispatcher.subscribe("MESSAGE_CREATE", this.messageCreateHandler);
        Dispatcher.subscribe("MESSAGE_UPDATE", this.messageUpdateHandler);
        Dispatcher.subscribe("MESSAGE_REACTION_ADD", this.reactionAddHandler);
        Dispatcher.subscribe("MESSAGE_REACTION_REMOVE", this.reactionRemoveHandler);
        Dispatcher.subscribe("MESSAGE_ACK", this.messageAckHandler);
        BdApi.DOM.addStyle("PingNotificationStyles", this.css);
    }

    stop() {
        if (Dispatcher) {
            Dispatcher.unsubscribe("MESSAGE_CREATE", this.messageCreateHandler);
            Dispatcher.unsubscribe("MESSAGE_UPDATE", this.messageUpdateHandler);
            Dispatcher.unsubscribe("MESSAGE_REACTION_ADD", this.reactionAddHandler);
            Dispatcher.unsubscribe("MESSAGE_REACTION_REMOVE", this.reactionRemoveHandler);
            Dispatcher.unsubscribe("MESSAGE_ACK", this.messageAckHandler);
        }
        this.removeAllNotifications();
        BdApi.DOM.removeStyle("PingNotificationStyles");
    }

    loadSettings() {
        const savedSettings = BdApi.Data.load('PingNotification', 'settings');
        return Object.assign({}, this.defaultSettings, savedSettings);
    }

    saveSettings(newSettings) {
        this.settings = newSettings;
        BdApi.Data.save('PingNotification', 'settings', newSettings);
    }


    css = `

        .ping-notification {
            background-color: rgba(30, 31, 34, 0.95);
            color: var(--text-normal);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.1);
            z-index: 9999;
            overflow: hidden;
            backdrop-filter: blur(10px);
            animation: notificationPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            transform: translateZ(0);
        }
        @keyframes notificationPop {
            0% { transform: scale(0.9) translateZ(0); opacity: 0; }
            100% { transform: scale(1) translateZ(0); opacity: 1; }
        }
        .ping-notification-content {
            padding: 12px;
            cursor: pointer;
            position: relative;
            color: var(--text-normal);
        }
        .ping-notification-header {
            display: flex;
            align-items: center;
            margin-bottom: 8px;
        }
        .ping-notification-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            margin-right: 8px;
        }
        .ping-notification-title {
            flex-grow: 1;
            font-weight: bold;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ping-notification-close {
            cursor: pointer;
            font-size: 18px;
            padding: 0 4px;
        }
        .ping-notification-body {
            font-size: 15px;
            margin-bottom: 8px;
            word-break: break-word;
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .ping-notification-body::-webkit-scrollbar {
            display: none;
        }
        .ping-notification-content.privacy-mode .ping-notification-body,
        .ping-notification-content.privacy-mode .ping-notification-attachment {
            filter: blur(20px);
            transition: filter 0.3s ease;
            position: relative;
        }
        .ping-notification-hover-text {
            position: absolute;
            top: calc(50% + 20px);
            left: 50%;
            transform: translate(-50%, -50%);
            color: var(--text-normal);
            font-size: 14px;
            font-weight: 500;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.3s ease;
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
            white-space: nowrap;
            z-index: 100;
            background-color: rgba(0, 0, 0, 0.7);
            padding: 4px 8px;
            border-radius: 4px;
        }
        .ping-notification-content.privacy-mode:hover .ping-notification-hover-text {
            opacity: 0;
        }
        .ping-notification-content.privacy-mode:hover .ping-notification-body,
        .ping-notification-content.privacy-mode:hover .ping-notification-attachment {
            filter: blur(0);
        }

        .ping-notification .spoilerContent_aa9639,
        .ping-notification .spoilerMarkdownContent_aa9639 {
            background-color: rgba(255, 255, 255, 0.15);
            border-radius: 3px;
            transition: background-color 0.2s ease;
        }

        .ping-notification-media img,
        .ping-notification-media video,
        .ping-notification-media [class*="clickableMedia"],
        .ping-notification-media [class*="imageContainer"],
        .ping-notification-media [class*="videoContainer"],
        .ping-notification-media [class*="wrapper"],
        .ping-notification-media [class*="imageWrapper"] {
            max-width: 100% !important;
            height: auto !important;
            object-fit: contain !important;
            pointer-events: auto !important;
            -webkit-user-drag: none !important;
            user-drag: none !important;
            -webkit-touch-callout: none !important;
        }

        .ping-notification-media [class*="spoilerContent"],
        .ping-notification-media [class*="hiddenSpoilers"] {
            max-width: 100% !important;
            max-height: 250px !important;
            width: auto !important;
            height: auto !important;
        }

        .ping-notification-media [class*="draggableWrapper"] {
            pointer-events: none !important;
        }
        .ping-notification [class*="hoverButtonGroup_d0395d"],
        .ping-notification [class*="codeActions_f8f345"],
        .ping-notification [class*="reactionBtn"] {
            display: none !important;
        }

        .ping-notification code {
            background-color: var(--background-secondary);
            border-radius: 3px;
            padding: 0.2em 0.4em;
            margin: 0;
            font-size: 85%;
            font-family: var(--font-code);
            color: var(--text-normal);
        }

        .ping-notification pre {
            background-color: var(--background-secondary);
            border-radius: 4px;
            padding: 0.5em;
            margin: 0.5em 0;
            overflow-x: auto;
        }

        .ping-notification pre code {
            background-color: transparent;
            padding: 0;
            border-radius: 0;
            font-size: 85%;
            color: var(--text-normal);
            white-space: pre;
            word-spacing: normal;
            word-break: normal;
            word-wrap: normal;
            line-height: 1.45;
        }

        .ping-notification-media.disable-interaction * {
            pointer-events: none !important;
            user-select: none !important;
            -webkit-user-drag: none !important;
        }

        .ping-notification-media.disable-interaction [class*="imageWrapper"],
        .ping-notification-media.disable-interaction [class*="clickableMedia"],
        .ping-notification-media.disable-interaction [class*="imageContainer"],
        .ping-notification-media.disable-interaction [class*="videoContainer"],
        .ping-notification-media.disable-interaction [class*="wrapper"] {
            cursor: pointer !important;
        }
    `;

    onMessageReceived(message) {
        if (!message?.channel_id) return;  
        const channel = ChannelStore.getChannel(message.channel_id);
        const currentUser = UserStore.getCurrentUser();

        if (!channel || message.author.id === currentUser.id) return;

        if (this.shouldNotify(message, channel, currentUser)) {
            this.showNotification(message, channel);
        }
    }

    shouldNotify(message, channel, currentUser) {
        if (this.settings.hideDND && PresenceStore.getStatus(currentUser.id) === "dnd") {
            return false;
        }

        if (!this.settings.allowNotificationsInCurrentChannel && 
            channel.id === SelectedChannelStore.getChannelId()) {
            return false;
        }

        if (message.author.id === currentUser.id) return false;
        if (message.flags && (message.flags & 64) === 64) return false;

        if (!channel.guild_id) {
            const isGroupDMMuted = UserGuildSettingsStore.isChannelMuted(null, channel.id);
            const isUserBlocked = RelationshipStore.isBlocked(message.author.id);
            return !isGroupDMMuted && !isUserBlocked;
        }

        if (UserGuildSettingsStore.isGuildOrCategoryOrChannelMuted(channel.guild_id, channel.id)) {
            return false;
        }

        const channelOverride = UserGuildSettingsStore.getChannelMessageNotifications(channel.guild_id, channel.id);
        const guildDefault = UserGuildSettingsStore.getMessageNotifications(channel.guild_id);
        const finalSetting = channelOverride === 3 ? guildDefault : channelOverride;

        const isDirectlyMentioned = message.mentions?.includes(currentUser.id);
        const isEveryoneMentioned = message.mentionEveryone && 
            !UserGuildSettingsStore.isSuppressEveryoneEnabled(channel.guild_id);

        let isRoleMentioned = false;
        if (message.mentionRoles?.length > 0 && 
            !UserGuildSettingsStore.isSuppressRolesEnabled(channel.guild_id)) {
            const member = GuildMemberStore.getMember(channel.guild_id, currentUser.id);
            if (member?.roles) {
                isRoleMentioned = message.mentionRoles.some(roleId => 
                    member.roles.includes(roleId)
                );
            }
        }

        const isMentioned = isDirectlyMentioned || isEveryoneMentioned || isRoleMentioned;

        switch (finalSetting) {
            case 0: return true;
            case 1: return isMentioned;
            case 2: return false;
            default: return false;
        }
    }

    showNotification(message, channel) {
        const notificationElement = BdApi.DOM.createElement('div', {
            className: 'ping-notification',
            target: document.body
        });
        notificationElement.creationTime = Date.now();
        notificationElement.channelId = channel.id;
        notificationElement.messageId = message.id;

        ReactDOM.render(
            React.createElement(NotificationComponent, {
                message: message,
                channel: channel,
                settings: this.settings,
                onClose: (isManual) => { 
                    notificationElement.manualClose = isManual;
                    this.removeNotification(notificationElement);
                },
                onClick: () => {
                    this.onNotificationClick(channel, message);
                    this.removeNotification(notificationElement);
                },
                onImageLoad: () => {
                    this.adjustNotificationPositions();
                },
                onSwipe: (direction) => {
                    const isRightSwipe = direction === 'right';
                    const isLeftSwipe = direction === 'left';
                    const isRightLocation = this.settings.popupLocation.endsWith("Right");
                    const isLeftLocation = this.settings.popupLocation.endsWith("Left");

                    if ((isRightSwipe && isRightLocation) || (isLeftSwipe && isLeftLocation)) {
                        this.removeNotification(notificationElement);
                    }
                }
            }),
            notificationElement
        );

        this.activeNotifications.push(notificationElement);
        this.adjustNotificationPositions();

        return notificationElement;
    }

    removeNotification(notificationElement) {
        if (document.body.contains(notificationElement)) {
            if (this.settings.readChannelOnClose && notificationElement.manualClose) {
                ChannelAckModule(notificationElement.channelId);
            }
            ReactDOM.unmountComponentAtNode(notificationElement);
            document.body.removeChild(notificationElement);
            this.activeNotifications = this.activeNotifications.filter(n => n !== notificationElement);
            this.adjustNotificationPositions();
        }
    }

    removeAllNotifications() {
        this.activeNotifications.forEach(notification => {
            if (document.body.contains(notification)) {
                ReactDOM.unmountComponentAtNode(notification);
                document.body.removeChild(notification);
            }
        });
        this.activeNotifications = [];
    }

    adjustNotificationPositions() {
        const { popupLocation } = this.settings;
        let offset = 20;
        const isTop = popupLocation.startsWith("top");
        const isLeft = popupLocation.endsWith("Left");

        const sortedNotifications = [...this.activeNotifications].sort((a, b) => {
            return b.creationTime - a.creationTime;
        });

        sortedNotifications.forEach((notification) => {
            const height = notification.offsetHeight;
            notification.style.transition = 'all 0.3s ease-in-out';
            notification.style.position = 'fixed';

            if (isTop) {
                notification.style.top = `${offset}px`;
                notification.style.bottom = 'auto';
            } else {
                notification.style.bottom = `${offset}px`;
                notification.style.top = 'auto';
            }

            if (isLeft) {
                notification.style.left = '20px';
                notification.style.right = 'auto';
            } else {
                notification.style.right = '20px';
                notification.style.left = 'auto';
            }

            offset += height + 10;
        });
    }

    onNotificationClick(channel, message) {
        const notificationsToRemove = this.activeNotifications.filter(notification => 
            notification.channelId === channel.id
        );
        
        notificationsToRemove.forEach(notification => {
            this.removeNotification(notification);
        });

        transitionTo(`/channels/${channel.guild_id || "@me"}/${channel.id}/${message.id}`);
    }

    getSettingsPanel() {
        const settingsConfig = structuredClone(config.settings);
        
        settingsConfig.forEach(category => {
            if (category.settings) {
                category.settings.forEach(setting => {
                    if (setting.id === 'duration') {
                        setting.value = this.settings.duration / 1000;
                    } else {
                        setting.value = this.settings[setting.id];
                    }
                    
                    if (['maxWidth', 'maxHeight', 'showTimer', 'privacyMode', 'popupLocation', 'usernameOrDisplayName'].includes(setting.id)) {
                        setting.onChange = (value) => {
                            this.settings[setting.id] = value;
                            this.saveSettings(this.settings);
                            
                            const testNotification = this.activeNotifications.find(n => n.isTest);
                            if (testNotification) {
                                this.updateNotification(testNotification, testNotification.testMessage, testNotification.testChannel);
                            } else {
                                this.showTestNotification();
                            }
                        };
                    }
                });
            }
        });

        return BdApi.UI.buildSettingsPanel({
            settings: settingsConfig,
            onChange: (category, id, value) => {
                if (id === 'duration') {
                    this.settings[id] = value * 1000;
                } else {
                    this.settings[id] = value;
                }
                this.saveSettings(this.settings);
            }
        });
    }

    updateNotification(notificationElement, updatedMessage, channel) {
        ReactDOM.render(
            React.createElement(NotificationComponent, {
                message: updatedMessage,
                channel: updatedMessage.isTestMessage ? channel : ChannelStore.getChannel(updatedMessage.channel_id),
                settings: this.settings,
                onClose: (isManual) => { 
                    notificationElement.manualClose = isManual;
                    this.removeNotification(notificationElement);
                },
                onClick: () => {
                    if (!updatedMessage.isTestMessage) {
                        this.onNotificationClick(ChannelStore.getChannel(updatedMessage.channel_id), updatedMessage);
                    }
                    this.removeNotification(notificationElement);
                },
                onImageLoad: () => {
                    this.adjustNotificationPositions();
                },
                onSwipe: (direction) => {
                    const isRightSwipe = direction === 'right';
                    const isLeftSwipe = direction === 'left';
                    const isRightLocation = this.settings.popupLocation.endsWith("Right");
                    const isLeftLocation = this.settings.popupLocation.endsWith("Left");

                    if ((isRightSwipe && isRightLocation) || (isLeftSwipe && isLeftLocation)) {
                        this.removeNotification(notificationElement);
                    }
                }
            }),
            notificationElement,
            () => {
                requestAnimationFrame(() => {
                    this.adjustNotificationPositions();
                });
            }
        );
    }

    showTestNotification() {
        this.activeNotifications = this.activeNotifications.filter(n => {
            if (n.isTest) {
                ReactDOM.unmountComponentAtNode(n);
                document.body.removeChild(n);
                return false;
            }
            return true;
        });

        const currentUser = UserStore.getCurrentUser();
        const testMessage = {
            id: "test-message",
            content: "",
            plainText: "This is a test notification to help visualize the changes you are making.\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. \n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?",
            author: currentUser,
            timestamp: new Date(),
            attachments: [],
            embeds: [],
            mentions: [],
            mention_roles: [],
            mention_everyone: false,
            messageReference: null,
            flags: 0,
            isTestMessage: true
        };

        const testChannel = {
            id: "test-channel",
            name: "Test Channel",
            guild_id: null,
            type: 0,
            nsfw: false
        };

        const notification = this.showNotification(testMessage, testChannel);
        notification.isTest = true;
        notification.testMessage = testMessage;
        notification.testChannel = testChannel;
    }
}

    function NotificationComponent({ message, channel, settings, onClose, onClick, onImageLoad, onSwipe }) {
        const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
        const member = guild ? GuildMemberStore.getMember(guild.id, message.author.id) : null;

        const [remainingTime, setRemainingTime] = React.useState(settings.duration);
        const [isPaused, setIsPaused] = React.useState(false);

        const notificationTitle = React.useMemo(() => {
            let title = '';
            const isNSFW = channel.nsfw || channel.nsfw_;

            if (channel.guild_id) {
                title = guild ? `${guild.name} • #${channel.name}` : `Unknown Server • #${channel.name}`;
            } else if (channel.type === 3) {
                const recipients = channel.recipients?.map(id => UserStore.getUser(id)).filter(u => u);
                const name = channel.name || recipients?.map(u => u.username).join(', ');
                title = `Group Chat • ${name}`;
            } else {
                title = `Direct Message`;
            }

            if (isNSFW && settings.applyNSFWBlur) {
                title += ' • ';
                return React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
                    title,
                    React.createElement('span', {
                        style: {
                            color: 'rgb(240, 71, 71)',
                            fontWeight: 'bold',
                            marginLeft: '4px'
                        }
                    }, 'NSFW')
                );
            }

            return title;
        }, [channel, guild?.name, settings.applyNSFWBlur]);

        const roleColor = React.useMemo(() => {
            if (!guild || !member || !member.roles) return null;
            const getRoles = Webpack.getModule(m => m.getRole);
            const guildRoles = getRoles.getRoles(guild.id);
            if (!guildRoles) return null;
            
            const roles = member.roles
                .map(roleId => guildRoles[roleId])
                .filter(role => role && typeof role.color === 'number' && role.color !== 0);
            
            if (roles.length === 0) return null;
            const colorRole = roles.sort((a, b) => (b.position || 0) - (a.position || 0))[0];
            return colorRole ? `#${colorRole.color.toString(16).padStart(6, '0')}` : null;
        }, [guild?.id, member?.roles]);

        const displayName = React.useMemo(() => {
            const customNickname = RelationshipStore.getNickname(message.author.id);
            if (settings.useFriendNicknames && !channel.guild_id && customNickname) {
                return customNickname;
            }
            if (settings.showNicknames && member?.nick) {
                return member.nick;
            }
            if (settings.usernameOrDisplayName) {
                if (!message.author.globalName) {
                    return message.author.username;
                }
                return message.author.globalName;
            }
            return message.author.username;
        }, [settings.showNicknames, settings.useFriendNicknames, member?.nick, message.author.username, settings.usernameOrDisplayName, channel.guild_id]);

        const avatarUrl = React.useMemo(() => {
            return message.author.avatar
                ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`
                : `https://cdn.discordapp.com/embed/avatars/${parseInt(message.author.discriminator) % 5}.png`;
        }, [message.author]);

        React.useEffect(() => {
            let interval;
            if (!isPaused) {
                interval = setInterval(() => {
                    setRemainingTime(prev => {
                        if (prev <= 100) {
                            clearInterval(interval);
                            onClose(false);
                            return 0;
                        }
                        return prev - 100;
                    });
                }, 100);
            }
            return () => clearInterval(interval);
        }, [isPaused, onClose, settings.duration]);

        const progress = (remainingTime / settings.duration) * 100;

        const getProgressColor = () => {
            const green = [67, 181, 129];
            const orange = [250, 166, 26];
            const red = [240, 71, 71];

            let color;
            if (progress > 66) {
                color = interpolateColor(orange, green, (progress - 66) / 34);
            } else if (progress > 33) {
                color = interpolateColor(red, orange, (progress - 33) / 33);
            } else {
                color = red;
            }

            return color;
        };

        const interpolateColor = (color1, color2, factor) => {
            return color1.map((channel, index) => 
                Math.round(channel + (color2[index] - channel) * factor)
            );
        };

        const progressColor = getProgressColor();
        const progressColorString = `rgb(${progressColor[0]}, ${progressColor[1]}, ${progressColor[2]})`;

        const handleSwipe = (e) => {
            const startX = e.touches ? e.touches[0].clientX : e.clientX;
            const handleMove = (moveEvent) => {
                const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
                const deltaX = currentX - startX;
                const threshold = 100;

                if (Math.abs(deltaX) > threshold) {
                    const isRightSwipe = deltaX > 0;
                    const isLeftSwipe = deltaX < 0;
                    const isRightLocation = settings.popupLocation.endsWith("Right");
                    const isLeftLocation = settings.popupLocation.endsWith("Left");

                    if ((isRightSwipe && isRightLocation) || (isLeftSwipe && isLeftLocation)) {
                        document.removeEventListener('mousemove', handleMove);
                        document.removeEventListener('mouseup', handleEnd);
                        document.removeEventListener('touchmove', handleMove);
                        document.removeEventListener('touchend', handleEnd);
                        
                        onClose(true);
                    }
                }
            };

            const handleEnd = () => {
                document.removeEventListener('mousemove', handleMove);
                document.removeEventListener('mouseup', handleEnd);
                document.removeEventListener('touchmove', handleMove);
                document.removeEventListener('touchend', handleEnd);
            };

            document.addEventListener('mousemove', handleMove);
            document.addEventListener('mouseup', handleEnd);
            document.addEventListener('touchmove', handleMove);
            document.addEventListener('touchend', handleEnd);
        };

        const baseWidth = 370;
        const baseHeight = 300;
        
        const scaleFactor = Math.min(
            Math.max(0.8, settings.maxWidth / baseWidth),
            Math.max(0.8, settings.maxHeight / baseHeight)
        );
        
        const getDynamicScale = (scale) => {
            return 1 + (Math.log1p(scale - 1) * 0.5);
        };
        
        const dynamicScale = getDynamicScale(scaleFactor);

        const avatarSize = Math.round(40 * dynamicScale);
        const headerFontSize = Math.round(16 * dynamicScale);
        const subheaderFontSize = Math.round(12 * dynamicScale);
        const contentFontSize = Math.round(14 * dynamicScale);
        const replyFontSize = Math.round(13 * dynamicScale);
        const mediaMaxHeight = Math.min(250 * dynamicScale, settings.maxHeight * 0.6);

        return React.createElement('div', {
            className: `ping-notification-content ${
                settings.privacyMode || (settings.applyNSFWBlur && (channel.nsfw || channel.nsfw_)) 
                ? 'privacy-mode' 
                : ''
            }`,
            onClick: onClick,
            onMouseEnter: () => setIsPaused(true),
            onMouseLeave: () => setIsPaused(false),
            onMouseDown: handleSwipe,
            onTouchStart: handleSwipe,
            style: { 
                position: 'relative', 
                overflow: 'hidden', 
                padding: `${Math.round(16 * dynamicScale)}px`,
                paddingBottom: `${Math.round(24 * dynamicScale)}px`,
                minHeight: `${Math.round(80 * dynamicScale)}px`,
                width: `${settings.maxWidth}px`,
                maxHeight: `${settings.maxHeight}px`,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'rgba(30, 31, 34, 0.95)',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.1)',
                transform: 'translateZ(0)',
                transition: 'all 0.3s ease',
                userSelect: 'none',
                WebkitUserDrag: 'none',
                zIndex: settings.disableMediaInteraction ? 2 : 'auto'
            }
        },
            React.createElement('div', { className: "ping-notification-header" },
                React.createElement('img', { 
                    src: avatarUrl, 
                    alt: "Avatar", 
                    className: "ping-notification-avatar",
                    style: {
                        width: `${avatarSize}px`,
                        height: `${avatarSize}px`,
                        borderRadius: '50%',
                        border: `${Math.round(2 * dynamicScale)}px solid var(--brand-experiment)`,
                    }
                }),
                React.createElement('div', { 
                    className: "ping-notification-title",
                    style: { 
                        display: 'flex', 
                        flexDirection: 'column',
                        marginLeft: `${Math.round(12 * dynamicScale)}px`
                    }
                },
                    React.createElement('span', {
                        style: {
                            fontSize: `${headerFontSize}px`,
                            fontWeight: 'bold',
                            color: settings.coloredUsernames && roleColor ? roleColor : 'var(--header-primary)',
                            marginBottom: `${Math.round(2 * dynamicScale)}px`
                        }
                    }, displayName),
                    React.createElement('span', {
                        style: {
                            fontSize: `${subheaderFontSize}px`,
                            color: 'var(--text-muted)'
                        }
                    }, notificationTitle)
                ),
                React.createElement('div', { 
                    className: "ping-notification-close", 
                    onClick: (e) => { 
                        e.stopPropagation(); 
                        onClose(true);
                    },
                    style: {
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '20px',
                        height: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '50%',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        color: 'var(--interactive-normal)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            color: 'var(--interactive-hover)'
                        }
                    }
                }, 
                    React.createElement('svg', {
                        width: '14',
                        height: '14',
                        viewBox: '0 0 24 24',
                        fill: 'currentColor'
                    },
                        React.createElement('path', {
                            d: 'M18.4 4L12 10.4L5.6 4L4 5.6L10.4 12L4 18.4L5.6 20L12 13.6L18.4 20L20 18.4L13.6 12L20 5.6L18.4 4Z'
                        })
                    )
                ),
                (settings.privacyMode || (settings.applyNSFWBlur && (channel.nsfw || channel.nsfw_))) && 
                React.createElement('div', {
                    className: 'ping-notification-hover-text'
                }, "Hover to unblur")
            ),
            React.createElement('div', { 
                className: "ping-notification-body",
                style: { 
                    flex: 1, 
                    marginTop: `${Math.round(12 * dynamicScale)}px`,
                    marginBottom: `${Math.round(8 * dynamicScale)}px`,
                    fontSize: `${contentFontSize}px`,
                    lineHeight: '1.4',
                    maxHeight: `${settings.maxHeight - (100 * dynamicScale)}px`,
                    overflowY: 'hidden',
                    transition: 'overflow-y 0.2s ease',
                    whiteSpace: 'pre-wrap',
                    '&:hover': {
                        overflowY: 'auto'
                    }
                },
                onMouseEnter: (e) => {
                    e.currentTarget.style.overflowY = 'auto';
                },
                onMouseLeave: (e) => {
                    e.currentTarget.style.overflowY = 'hidden';
                }
            },
                message.messageReference && !message.flags && React.createElement('div', {
                    style: {
                        display: 'flex',
                        alignItems: 'center',
                        marginBottom: '8px',
                        fontSize: `${replyFontSize}px`,
                        color: 'var(--text-muted)',
                        paddingLeft: '16px',
                        position: 'relative',
                        marginTop: '2px'
                    }
                },
                    React.createElement('div', {
                        style: {
                            position: 'absolute',
                            left: '0',
                            bottom: '50%',
                            width: '12px',
                            height: '2px',
                            backgroundColor: 'var(--background-modifier-accent)',
                            borderBottomLeftRadius: '6px'
                        }
                    }),
                    React.createElement('div', {
                        style: {
                            position: 'absolute',
                            left: '0',
                            bottom: '-8px',
                            width: '2px',
                            height: 'calc(50% + 8px)',
                            backgroundColor: 'var(--background-modifier-accent)'
                        }
                    }),
                    React.createElement('img', {
                        src: message.messageReference.author?.avatar 
                            ? `https://cdn.discordapp.com/avatars/${message.messageReference.author.id}/${message.messageReference.author.avatar}.png?size=32`
                            : `https://cdn.discordapp.com/embed/avatars/${parseInt(message.messageReference.author?.discriminator || '0') % 5}.png`,
                        style: {
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            marginRight: '8px'
                        }
                    }),
                    React.createElement('span', {
                        style: {
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-muted)',
                            fontSize: '0.9em',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden'
                        }
                    }, 
                        React.createElement('span', {
                            style: {
                                color: (() => {
                                    if (!settings.coloredUsernames || !guild || !message.messageReference.author) return 'var(--header-primary)';
                                    const member = GuildMemberStore.getMember(guild.id, message.messageReference.author.id);
                                    if (!member?.roles) return 'var(--header-primary)';
                                    const getRoles = Webpack.getModule(m => m.getRole);
                                    const guildRoles = getRoles.getRoles(guild.id);
                                    if (!guildRoles) return 'var(--header-primary)';
                                    
                                    const roles = member.roles
                                        .map(roleId => guildRoles[roleId])
                                        .filter(role => role && typeof role.color === 'number' && role.color !== 0);
                                    
                                    if (roles.length === 0) return 'var(--header-primary)';
                                    const colorRole = roles.sort((a, b) => (b.position || 0) - (a.position || 0))[0];
                                    return colorRole ? `#${colorRole.color.toString(16).padStart(6, '0')}` : 'var(--header-primary)';
                                })(),
                                fontWeight: '500',
                                flexShrink: 0
                            }
                        }, message.messageReference.author?.username || "Unknown"),
                        React.createElement('span', {
                            style: {
                                color: 'var(--text-muted)',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px',
                                maxWidth: '100%'
                            }
                        }, (() => {
                            const refMessage = message.messageReference.message;
                            if (!refMessage) return "Original message was deleted";
                            
                            const mediaIcon = React.createElement('svg', {
                                width: '16',
                                height: '16',
                                viewBox: '0 0 24 24',
                                style: {
                                    flexShrink: 0,
                                    color: 'var(--text-muted)'
                                }
                            }, React.createElement('path', {
                                fill: 'currentColor',
                                fillRule: 'evenodd',
                                d: 'M2 5a3 3 0 0 1 3-3h14a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V5Zm13.35 8.13 3.5 4.67c.37.5.02 1.2-.6 1.2H5.81a.75.75 0 0 1-.59-1.22l1.86-2.32a1.5 1.5 0 0 1 2.34 0l.5.64 2.23-2.97a2 2 0 0 1 3.2 0ZM10.2 5.98c.23-.91-.88-1.55-1.55-.9a.93.93 0 0 1-1.3 0c-.67-.65-1.78-.01-1.55.9a.93.93 0 0 1-.65 1.12c-.9.26-.9 1.54 0 1.8.48.14.77.63.65 1.12-.23.91.88 1.55 1.55.9a.93.93 0 0 1 1.3 0c.67.65 1.78.01 1.55-.9a.93.93 0 0 1 .65-1.12c.9-.26.9-1.54 0-1.8a.93.93 0 0 1-.65-1.12Z',
                                clipRule: 'evenodd'
                            }));

                            if (!refMessage.content && (refMessage.attachments?.length || refMessage.embeds?.length)) {
                                return [mediaIcon];
                            }

                            const mediaRegex = /https?:\/\/\S+\.(png|jpe?g|gif|webp|mp4|webm|mov|mkv|avi|flv|wmv|m4v)\b/gi;
                            let content = refMessage.content || '';
                            const hasMediaLinks = mediaRegex.test(content);
                            content = content.replace(mediaRegex, '').trim();

                            if (content) {
                                const parsedContent = parse(content
                                    .replace(/```(?:[\w]*\n)?([^```]+)```/g, '$1')
                                    .replace(/`([^`]+)`/g, '$1')
                                    .replace(/\n/g, ' ')
                                    .trim(), true, { channelId: channel.id });
                                
                                return [parsedContent, (hasMediaLinks || refMessage.attachments?.length || refMessage.embeds?.length) ? mediaIcon : null];
                            }

                            return [mediaIcon];
                        })())
                    )
                ),
                React.createElement('span', null,
                    message.isTestMessage ? 
                        message.plainText : 
                        parse(message.content || '', true, { channelId: channel.id, allowLinks: true }),
                    message.editedTimestamp && React.createElement('span', {
                        style: {
                            fontSize: '0.625rem',
                            color: 'var(--text-muted)',
                            marginLeft: '3px'
                        }
                    }, '(edited)')
                ),
                React.createElement('div', {
                    className: 'ping-notification-media-container',
                    style: {
                        width: '100%',
                        position: 'relative',
                        zIndex: settings.disableMediaInteraction ? 1 : 'auto'
                    },
                    onClick: (e) => settings.disableMediaInteraction ? null : e.stopPropagation()
                },
                    !message.isTestMessage && React.createElement(MessageAccessories, {
                        message: message,
                        channel: channel,
                        inlineEmbedMedia: true,
                        onImageLoad: onImageLoad,
                        renderEmbeds: true,
                        renderAttachments: true,
                        attachmentPosition: 0,
                        compact: false,
                        isHighlighted: false,
                        inlineAttachmentMedia: true,
                        autoplayGifs: true,
                        hideMedia: false,
                        forceAutoplay: true,
                        shouldRenderEmbed: true,
                        canDeleteAttachments: false,
                        gifAutoPlay: true,
                        onMediaItemContextMenu: (e) => e.preventDefault(),
                        className: `ping-notification-media${settings.disableMediaInteraction ? ' disable-interaction' : ''}`,
                        style: {
                            fontSize: `${contentFontSize}px`,
                        }
                    })
                )
            ),
            React.createElement('div', { 
                style: { 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: '100%',
                    backgroundColor: 'rgba(0, 0, 0, 0.2)',
                }
            }),
            React.createElement('div', { 
                style: { 
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    height: '4px',
                    width: `${progress}%`,
                    backgroundColor: progressColorString,
                    transition: 'width 0.1s linear, background-color 0.5s ease',
                    zIndex: 1,
                }
            }),
            React.createElement('div', {
                style: {
                    position: 'absolute',
                    bottom: '8px',
                    right: '12px',
                    fontSize: '12px',
                    color: progressColorString,
                    transition: 'color 0.5s ease',
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(0, 0, 0, 0.4)',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    display: settings.showTimer ? 'block' : 'none'
                }
            }, `${Math.round(remainingTime / 1000)}s`),
            settings.privacyMode && React.createElement('div', {
                className: 'ping-notification-hover-text'
            }, "Hover to unblur")
        );
    }
