/**
 * @name PingNotification
 * @author DaddyBoard
 * @authorId 241334335884492810
 * @version 8.0.1
 * @description Show in-app notifications for anything you would hear a ping for.
 * @source https://github.com/DaddyBoard/BD-Plugins
 * @invite ggNWGDV7e2
 */

const { React, Webpack, ReactDOM } = BdApi;

const UserStore = Webpack.getStore("UserStore");
const MessageConstructor = Webpack.getByPrototypeKeys("addReaction");
const ChannelStore = Webpack.getStore("ChannelStore"); 
const GuildStore = Webpack.getStore("GuildStore");
const SelectedChannelStore = Webpack.getStore("SelectedChannelStore");
const RelationshipStore = Webpack.getStore("RelationshipStore");
const UserGuildSettingsStore = Webpack.getStore("UserGuildSettingsStore");
const transitionTo = Webpack.getByStrings(["transitionTo - Transitioning to"],{searchExports:true});
const GuildMemberStore = Webpack.getStore("GuildMemberStore");
const Dispatcher = BdApi.Webpack.getByKeys("subscribe", "dispatch");
const MessageStore = BdApi.Webpack.getStore("MessageStore");
const ReferencedMessageStore = BdApi.Webpack.getStore("ReferencedMessageStore");
const MessageActions = BdApi.Webpack.getByKeys("fetchMessage", "deleteMessage");
const PresenceStore = Webpack.getStore("PresenceStore");
const Message = Webpack.getModule(m => String(m.type).includes('.messageListItem,"aria-setsize":-1,children:['));
const messageReferenceSelectors = BdApi.Webpack.getByKeys("messageSpine", "repliedMessageClickableSpine");
const ChannelAckModule = (() => {
    const filter = BdApi.Webpack.Filters.byStrings("type:\"CHANNEL_ACK\",channelId", "type:\"BULK_ACK\",channels:");
    const module = BdApi.Webpack.getModule((e, m) => filter(BdApi.Webpack.modules[m.id]));
    return Object.values(module).find(m => m.toString().includes("type:\"CHANNEL_ACK\",channelId"));
})();
const updateMessageReferenceStore = (()=>{
    function getActionHandler(){
        const nodes = Dispatcher._actionHandlers._dependencyGraph.nodes;
        const storeHandlers = Object.values(nodes).find(({ name }) => name === "ReferencedMessageStore");
        return storeHandlers.actionHandler["CREATE_PENDING_REPLY"];
    }
    const target = getActionHandler();
    return (message) => target({message});
})();
const constructMessageObj = Webpack.getModule(Webpack.Filters.byStrings("message_reference", "isProbablyAValidSnowflake"), { searchExports: true });

const ChannelConstructor = Webpack.getModule(Webpack.Filters.byPrototypeKeys("addCachedMessages"));
const useStateFromStores = Webpack.getModule(Webpack.Filters.byStrings("getStateFromStores"), { searchExports: true });

const config = {
    changelog: [
        {
            title: "8.0.1 - New Option, Tweaks and Fixes",
            type: "added",
            items: [
                "Added a new option in `User Styling` to show `Server Profile` avatars instead of global avatars.",
                "Fixed some sizing issues with replied messages. They will now display at 0.85x font-size.",
                "Added css to hide the Spotify activity indicator icon from Skamt's SpotifyEnhance plugin. (There's not a lot of real estate on the notification, so it's not really viable to show it.)"
            ]
        },
        {
            title: "8.0.0 - Big Rewrite",
            type: "added",
            items: [
                "A FULL rewrite of the plugin to render notifications natively, improving reliability and fixing minor issues.",
                "Replaced all styling with default Discord variables for better theme compatibility. Reach out for Custom CSS if needed.",
                "Unironically reduced API calls—down by 99.9%.",
                "+ Added an option to hide the orange border on mentions.",
                "+ Added new option to close notification on right click.",
                "...finally fixed the oval close button, sorry lol!"
            ]
        },
        {
            title: "Honorable Mentions",
            type: "fixed",
            items: [
                "Huge thanks to [@skamt](https://github.com/Skamt) for helping with caching logic, API optimizations, and more.",
                "Shoutout to [@doggybootsy](https://github.com/doggybootsy) for showing me how to render messages natively.\nPlease go and show both their profiles some love!"
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
                        { label: "Top Centre", value: "topCentre" },
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
                    note: "Make all left clicks navigate to the message instead of allowing media interaction, likewise right clicks will always close notifications",
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
                },
                {
                    type: "switch",
                    id: "closeOnRightClick",
                    name: "Close on Right Click",
                    note: "Close notifications when right-clicking on them. To override the context menu, enable Disable Media Interaction aswell.",
                    value: false
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
                    note: "Blur content from NSFW channels only",
                    value: false
                },
                {
                    type: "switch",
                    id: "showTimer",
                    name: "Show Timer",
                    note: "Show the seconds left of the notification(numbers, not the progress bar)",
                    value: true
                },
                {
                    type: "switch",
                    id: "hideOrangeBorderOnMentions",
                    name: "Hide Orange Background on Mentions",
                    note: "Hide the orange background on messages that mention you or a group you're in.",
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
                },
                {
                    type: "switch",
                    id: "useServerProfilePictures",
                    name: "Use Server Profile Pictures",
                    note: "Show the Server Profile Picture instead of the users global avatar",
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
            useFriendNicknames: true,
            hideOrangeBorderOnMentions: true,
            closeOnRightClick: true
        };
        this.settings = this.loadSettings();
        this.activeNotifications = [];
        this.testNotificationData = null;

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

        this.messageCreateHandler = (event) => {
            if (!event?.message) return;

            this.onMessageReceived(event);

        };

        this.messageAckHandler = (event) => {
            if (!this.settings.closeOnRead) return;
                        
            const notificationsToClose = this.activeNotifications.filter(notification => 
                notification.channelId === event.channelId
            );

            if (notificationsToClose.length > 0) {
                requestAnimationFrame(() => {
                    notificationsToClose.forEach(notification => {
                        this.removeNotification(notification);
                    });
                });
            }
        };

        Dispatcher.subscribe("MESSAGE_CREATE", this.messageCreateHandler);
        Dispatcher.subscribe("MESSAGE_ACK", this.messageAckHandler);
        BdApi.DOM.addStyle("PingNotificationStyles", this.css);
    }

    stop() {
        if (Dispatcher) {
            Dispatcher.unsubscribe("MESSAGE_CREATE", this.messageCreateHandler);
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
            color: var(--text-normal);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.1);
            overflow: hidden;
            backdrop-filter: blur(10px);
            transform: translateZ(0);
            opacity: 0;
            z-index: var(--ping-notification-z-index);
        }

        .ping-notification.show {
            animation: notificationPop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        .ping-notification.centre {
            left: 50% !important;
            transform: translateX(-50%) scale(0.9) !important;
        }

        .ping-notification.centre.show {
            transform: translateX(-50%) scale(1) !important;
        }

        @keyframes notificationPop {
            0% { 
                opacity: 0;
                transform: scale(0.9) translateZ(0);
            }
            100% { 
                opacity: 1;
                transform: scale(1) translateZ(0);
            }
        }

        @keyframes notificationPopCentre {
            0% { 
                opacity: 0;
                transform: translateX(-50%) scale(0.9);
            }
            100% { 
                opacity: 1;
                transform: translateX(-50%) scale(1);
            }
        }
        .ping-notification-content {
            cursor: pointer;
        }
        .ping-notification-header {
            display: flex;
            align-items: center;
        }
            
        .ping-notification-avatar {
            width: 24px;
            height: 24px;
            border-radius: 50%;
        }
        .ping-notification-title {
            flex-grow: 1;
            font-weight: bold;
            font-size: 19px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .ping-notification-close {
            cursor: pointer;
            font-size: 18px;
            padding: 4px;
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
            font-size: var(--ping-notification-content-font-size);
            font-weight: 500;
            pointer-events: none;
            opacity: 1;
            transition: opacity 0.3s ease;
            white-space: nowrap;
            z-index: 100;
            background-color: var(--background-secondary-alt);
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

        .ping-notification [class*="spoilerContent_"],
        .ping-notification [class*="spoilerMarkdownContent_"] {
            background-color: var(--background-secondary-alt);
            border-color: var(--background-primary);
            border-width: 1px;
            border-style: solid;
            transition: background-color 0.2s ease;
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
        .ping-notification [class*="hoverButtonGroup_"],
        .ping-notification [class*="wrapper__"],
        .ping-notification [class*="codeActions_"],
        .ping-notification [class*="reactionBtn"] {
            display: none !important;
        }

        .ping-notification code {
            font-size: 14px;
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

        .ping-notification-messageContent [class*="buttonContainer_"],
        .ping-notification-messageContent [class*="header_"],
        .ping-notification-messageContent [class*="avatar_"],
        .ping-notification-messageContent [class*="avatarDecoration_"] {
            display: none !important;
        }
            
        .ping-notification-messageContent {
            padding-left: 7px !important;
            padding-right: 0 !important;
            min-height: 0 !important;
        }

        .ping-notification-body {
            margin-left: -8px !important;
        }


        .ping-notification-messageContent [class^="repliedMessage"] {
            padding-left: 20px;
        }


        .ping-notification-messageContent :is(.${messageReferenceSelectors.messageSpine}:before, .${messageReferenceSelectors.repliedMessageClickableSpine}) {
            padding-left: 10px !important;
            margin-left: 40px !important;
        }


        .ping-notification-content [class*="contents_"] [class*="markup_"][class*="messageContent"],
        .ping-notification-content [class*="contents_"] [class*="markup_"],
        .ping-notification-content [class*="scrollbarGhostHairline_"] {
            font-size: var(--ping-notification-content-font-size) !important;
        }

        .ping-notification [class*="repliedTextPreview_"] [class*="repliedTextContent_"],
        .ping-notification [class*="username_"],
        .ping-notification [class*="contents_"] [class*="message-content-"] {
            font-size: calc(var(--ping-notification-content-font-size) * 0.85) !important;
        }

        .ping-notification-content small,
        .ping-notification-content small * {
            font-size: calc(var(--ping-notification-content-font-size) - 0.1rem) !important;
        }

        .ping-notification [class*="message__"][class*="selected_"]:not([class*="mentioned_"]),
        .ping-notification [class*="message__"]:hover:not([class*="mentioned__"]) {
            background: inherit !important;
        }

        .ping-notification [class*="spotifyActivityIndicatorIcon"] {
            display: none !important;
        }

    `;

    onMessageReceived(event) {
        if (!event.message?.channel_id) return;
        const channel = ChannelStore.getChannel(event.message.channel_id);
        const currentUser = UserStore.getCurrentUser();

        if (!channel || event.message.author.id === currentUser.id) return;
        if (this.shouldNotify(event.message, channel, currentUser)) {
            this.showNotification(event.message, channel);
        }
    }

    shouldNotify(message, channel, currentUser) {
        if (this.settings.hideDND && PresenceStore.getStatus(currentUser.id) === "dnd") {
            return false;
        }

        if (RelationshipStore.isIgnored(message.author.id)) {
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

        const isDirectlyMentioned = message.mentions?.some(mention => mention.id === currentUser.id);
        const isEveryoneMentioned = message.mention_everyone && 
            !UserGuildSettingsStore.isSuppressEveryoneEnabled(channel.guild_id);

        let isRoleMentioned = false;
        if (message.mention_roles?.length > 0 && 
            !UserGuildSettingsStore.isSuppressRolesEnabled(channel.guild_id)) {
            const member = GuildMemberStore.getMember(channel.guild_id, currentUser.id);
            if (member?.roles) {
                isRoleMentioned = message.mention_roles.some(roleId => 
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

    async showNotification(messageEvent, channel) {
        const notificationElement = BdApi.DOM.createElement('div', {
            className: 'ping-notification',
            'data-channel-id': channel.id // this is so MoreRoleColors can find the channelid to apply proper color :)
        });
        
        if (this.settings.popupLocation.endsWith("Centre")) {
            notificationElement.classList.add('centre');
        }
        const message = constructMessageObj(messageEvent);

        ChannelConstructor.commit(ChannelConstructor.getOrCreate(channel.id).merge([message]));

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

        notificationElement.creationTime = Date.now();
        notificationElement.channelId = channel.id;
        notificationElement.messageId = message.id;
        notificationElement.message = message;
        
        const isTestNotification = message.id === "0";
        notificationElement.isTestNotification = isTestNotification;
        
        notificationElement.style.setProperty('--ping-notification-z-index', isTestNotification ? '1002' : '1001');

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
                    if (!isTestNotification) {
                        this.onNotificationClick(channel, message);
                    }
                    this.removeNotification(notificationElement);
                },
                ChangeHandler: () => {
                    this.adjustNotificationPositions();
                },
                onSwipe: (direction) => {
                    const isRightSwipe = direction === 'right';
                    const isLeftSwipe = direction === 'left';
                    const isTopCentre = this.settings.popupLocation === 'topCentre';
                    const isRightLocation = this.settings.popupLocation.endsWith("Right");
                    const isLeftLocation = this.settings.popupLocation.endsWith("Left");

                    if (isTopCentre || ((isRightSwipe && isRightLocation) || (isLeftSwipe && isLeftLocation))) {
                        this.removeNotification(notificationElement);
                    }
                }
            }),
            notificationElement
        );

        this.activeNotifications.push(notificationElement);
        document.body.appendChild(notificationElement);
        
        void notificationElement.offsetHeight;
        notificationElement.classList.add('show');
        
        this.adjustNotificationPositions();

        return notificationElement;
    }

    removeNotification(notificationElement) {
        if (document.body.contains(notificationElement)) {
            if (this.settings.readChannelOnClose && notificationElement.manualClose && !notificationElement.isTestNotification) {
                ChannelAckModule(notificationElement.channelId);
            }
            ReactDOM.unmountComponentAtNode(notificationElement);
            document.body.removeChild(notificationElement);
            this.activeNotifications = this.activeNotifications.filter(n => n !== notificationElement);
            this.adjustNotificationPositions();
            if (notificationElement.isTestNotification && this.activeNotifications.filter(n => n.isTestNotification).length === 0) {
                this.testNotificationData = null;
            }
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
        let offset = 30;
        const isTop = popupLocation.startsWith("top");
        const isLeft = popupLocation.endsWith("Left");
        const isCentre = popupLocation.endsWith("Centre");

        const sortedNotifications = [...this.activeNotifications].sort((a, b) => {
            return b.creationTime - a.creationTime;
        });

        sortedNotifications.forEach((notification) => {
            const height = notification.offsetHeight;
            notification.style.transition = 'all 0.1s ease-in-out';
            notification.style.position = 'fixed';

            if (isTop) {
                notification.style.top = `${offset}px`;
                notification.style.bottom = 'auto';
            } else {
                notification.style.bottom = `${offset}px`;
                notification.style.top = 'auto';
            }

            if (isCentre) {
                notification.style.left = '50%';
                notification.style.right = 'auto';
                notification.style.transform = 'translateX(-50%)';
            } else if (isLeft) {
                notification.style.left = '20px';
                notification.style.right = 'auto';
                notification.style.transform = 'none';
            } else {
                notification.style.right = '20px';
                notification.style.left = 'auto';
                notification.style.transform = 'none';
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
                    
                    if (['maxWidth', 'maxHeight', 'hideOrangeBorderOnMentions', 'showTimer', 'privacyMode', 'popupLocation', 'usernameOrDisplayName'].includes(setting.id)) {
                        setting.onChange = (value) => {
                            this.settings[setting.id] = value;
                            this.saveSettings(this.settings);

                            this.activeNotifications.forEach(notification => {
                                if (notification.isTestNotification && this.testNotificationData) {
                                    this.updateNotification(notification, this.testNotificationData.message, this.testNotificationData.channel.id, "testNotif");
                                } else {
                                    const channelId = notification.channelId || notification.message?.channel_id;
                                    if (channelId) {
                                        this.updateNotification(notification, notification.message, channelId, "testNotif");
                                    }
                                }
                            });

                            if (!this.activeNotifications.find(n => n.isTestNotification)) {
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

    async updateNotification(notificationElement, event, channelId, type) {
        let updatedMessage;

        if (type === "testNotif" && notificationElement.isTestNotification) {
            updatedMessage = this.testNotificationData?.message || notificationElement.testMessage;
        } else if (type === "testNotif") {
            updatedMessage = notificationElement.message;
        }

        if (!updatedMessage) {
            return;
        }
        
        const notificationChannel = notificationElement.isTestNotification 
            ? (this.testNotificationData?.channel || notificationElement.testChannel) 
            : ChannelStore.getChannel(channelId || updatedMessage.channel_id);
        if (!notificationChannel) {
            return;
        }
        
        notificationElement.message = updatedMessage;
        
        ReactDOM.render(
            React.createElement(NotificationComponent, {
                message: updatedMessage,
                channel: notificationChannel,
                settings: this.settings,
                onClose: (isManual) => { 
                    notificationElement.manualClose = isManual;
                    this.removeNotification(notificationElement);
                },
                onClick: () => { 
                    if (!notificationElement.isTestNotification) {
                        this.onNotificationClick(notificationChannel, updatedMessage);
                    }
                    this.removeNotification(notificationElement);
                },
                ChangeHandler: () => {
                    this.adjustNotificationPositions();
                },
                onSwipe: (direction) => {
                    const isRightSwipe = direction === 'right';
                    const isLeftSwipe = direction === 'left';
                    const isTopCentre = this.settings.popupLocation === 'topCentre';
                    const isRightLocation = this.settings.popupLocation.endsWith("Right");
                    const isLeftLocation = this.settings.popupLocation.endsWith("Left");

                    if (isTopCentre || ((isRightSwipe && isRightLocation) || (isLeftSwipe && isLeftLocation))) {
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
            if (n.isTestNotification) {
                ReactDOM.unmountComponentAtNode(n);
                document.body.removeChild(n);
                return false;
            }
            return true;
        });
        
        let testChannel = null;
        let testMessage = null;
        
        if (this.testNotificationData) {
            testChannel = this.testNotificationData.channel;
            testMessage = this.testNotificationData.message;
        } else {
            const channelIds = ChannelStore.getChannelIds();

            for (const channelId of channelIds) {
                const channel = ChannelStore.getChannel(channelId);
                if (channel) {
                    testChannel = channel;
                    break;
                }
            }
            
            if (!testChannel) {
                return null;
            }

            testMessage = new MessageConstructor({
                id: "0",
                flags: 0,
                content: '<@' + UserStore.getCurrentUser().id + '> This is a test notification to help visualize the changes you are making.\n\nI have spent a lot of time and effort on this plugin, I would appreciate it if you could take two seconds out of your day to: \n:star: this project on GitHub [here](https://github.com/DaddyBoard/BD-Plugins)\n:thumbsup: on BD Page [here](https://betterdiscord.app/plugin/PingNotification)\n\nLorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. \n\nSed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo. Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt. Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem. Ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? Quis autem vel eum iure reprehenderit qui in ea voluptate velit esse quam nihil molestiae consequatur, vel illum qui dolorem eum fugiat quo voluptas nulla pariatur?',
                channel_id: testChannel.id,
                author: UserStore.getCurrentUser(),
                mentioned: true,
                attachments: [
                    {
                        "content_type": "image/png",
                        "filename": "1519.png",
                        "height": 279,
                        "id": "1349758462329880597",
                        "placeholder": "yvcBBYB/hJaYeph4mWeXbZ6rgP0J",
                        "placeholder_version": 1,
                        "proxy_url": "https://media.discordapp.net/attachments/1085348380374470746/1349758462329880597/1519.png?ex=67d44406&is=67d2f286&hm=d848700d90dc3391da9d4e327c3caa8248f303903c1c4f9bab14952a537d48e2&",
                        "size": 46373,
                        "url": "https://cdn.discordapp.com/attachments/1085348380374470746/1349758462329880597/1519.png?ex=67d44406&is=67d2f286&hm=d848700d90dc3391da9d4e327c3caa8248f303903c1c4f9bab14952a537d48e2&",
                        "width": 417,
                        "spoiler": false
                    }
                ]
            });
            
            this.testNotificationData = {
                channel: testChannel,
                message: testMessage
            };
        }

        const notification = this.showNotification(testMessage, testChannel);
        notification.isTestNotification = true;
        notification.testMessage = testMessage;
        notification.testChannel = testChannel;
        
        return notification;
    }

}

function NotificationComponent({ message:propMessage, channel, settings, onClose, onClick, ChangeHandler, onSwipe }) {
    const oldMsg = React.useRef({
        message: propMessage,
        deleted: false
    });
    let message = useStateFromStores([MessageStore], function () {
        const message = MessageStore.getMessage(propMessage.channel_id, propMessage.id);
        if (message) 
            oldMsg.current = {
                message: message
            };
        else
            oldMsg.current.deleted = true;
        return message;
    });

    message = message ? message : oldMsg.current.message;

    if (!channel) {
        return null;
    }
    
    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
    const member = guild ? GuildMemberStore.getMember(guild.id, message.author.id) : null;
    const user = UserStore.getUser(message.author.id);

    const [isPaused, setIsPaused] = React.useState(false);
    
    React.useEffect(() => {
        ChangeHandler();
    }, [message, message.content, message.embeds, message.attachments, oldMsg]);

    const notificationTitle = React.useMemo(() => {
        let title = '';
        const isNSFW = channel.nsfw || channel.nsfw_;

        if (channel.guild_id && !oldMsg.current.deleted) {
            title = guild ? `${guild.name} • #${channel.name}` : `Unknown Server • #${channel.name}`;
        } else if (channel.type === 3 && !oldMsg.current.deleted) {
            const recipients = channel.recipients?.map(id => UserStore.getUser(id)).filter(u => u);
            const name = channel.name || recipients?.map(u => u.username).join(', ');
            title = `Group Chat • ${name}`;
        } else if (!oldMsg.current.deleted) {
            title = `Direct Message`;
        }

        if (oldMsg.current.deleted === true) {
            title += '';
            return React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
                title,
                React.createElement('span', {
                    style: {
                        color: 'var(--text-danger)',
                        fontWeight: 'bold',
                        marginLeft: '4px'
                    }
                }, '⚠ Message Deleted ⚠')
            );
        }

        if (isNSFW && settings.applyNSFWBlur && !oldMsg.current.deleted) {
            title += ' • ';
            return React.createElement('div', { style: { display: 'flex', alignItems: 'center' } },
                title,
                React.createElement('span', {
                    style: {
                        color: 'var(--text-danger)',
                        fontWeight: 'bold',
                        marginLeft: '4px'
                    }
                }, 'NSFW')
            );
        }

        return title;
    }, [channel, guild?.name, settings.applyNSFWBlur, oldMsg.current.deleted]);

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
        if (settings.useServerProfilePictures && channel.guild_id) {
            return user.getAvatarURL(channel.guild_id) || message.author.avatar
        }
        return message.author.avatar
            ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png?size=128`
            : `https://cdn.discordapp.com/embed/avatars/${parseInt(message.author.discriminator) % 5}.png`;
    }, [message.author, settings.useServerProfilePictures, channel.guild_id]);

    const handleSwipe = (e) => {
        const startX = e.touches ? e.touches[0].clientX : e.clientX;
        const startY = e.touches ? e.touches[0].clientY : e.clientY;
        let hasMoved = false;

        const handleMove = (moveEvent) => {
            if (!hasMoved) {
                const currentX = moveEvent.touches ? moveEvent.touches[0].clientX : moveEvent.clientX;
                const currentY = moveEvent.touches ? moveEvent.touches[0].clientY : moveEvent.clientY;
                const deltaX = currentX - startX;
                const deltaY = currentY - startY;
                const threshold = 100;

                if (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold) {
                    hasMoved = true;
                    const isTopCentre = settings.popupLocation === "topCentre";
                    const isRightSwipe = deltaX > threshold;
                    const isLeftSwipe = deltaX < -threshold;
                    const isRightLocation = settings.popupLocation.endsWith("Right");
                    const isLeftLocation = settings.popupLocation.endsWith("Left");

                    if (
                        isTopCentre ||
                        (isRightSwipe && isRightLocation) ||
                        (isLeftSwipe && isLeftLocation)
                    ) {
                        handleEnd();
                        onClose(true);
                    }
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

    return React.createElement('div', {
        className: `ping-notification-content ${
            settings.privacyMode || (settings.applyNSFWBlur && (channel.nsfw || channel.nsfw_)) 
            ? 'privacy-mode' 
            : ''
        }`,
        onClick: (e) => {
            const isLink = e.target.tagName === 'A' || e.target.closest('a');
            
            if (isLink) {
                e.stopPropagation();
                if (settings.disableMediaInteraction) {
                    e.preventDefault();
                    onClick();
                }
                return;
            }
            onClick();
        },
        onContextMenu: (e) => {
            if (settings.closeOnRightClick) {
                e.preventDefault();
                e.stopPropagation();
                onClose(true);
            }
        },
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
            backgroundColor: 'var(--activity-card-background)',
            backdropFilter: 'blur(10px)',
            borderRadius: '12px',
            transform: 'translateZ(0)',
            transition: 'all 0.3s ease',
            userSelect: 'none',
            WebkitUserDrag: 'none',
            zIndex: settings.disableMediaInteraction ? 2: 'auto',
            '--ping-notification-content-font-size': `${contentFontSize}px`
        },
        ref: (element) => {
            if (element) {
                if (settings.closeOnRightClick && !element._rightClickHandlerAdded && settings.disableMediaInteraction) {
                    const handleGlobalRightClick = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onClose(true);
                        return false;
                    };
                    
                    if (element._removeRightClickHandler) {
                        element._removeRightClickHandler();
                    }
                    
                    element.addEventListener('contextmenu', handleGlobalRightClick, true);
                    element._removeRightClickHandler = () => {
                        element.removeEventListener('contextmenu', handleGlobalRightClick, true);
                    };
                    element._rightClickHandlerAdded = true;
                } else if (!settings.closeOnRightClick && element._removeRightClickHandler) {
                    element._removeRightClickHandler();
                    element._rightClickHandlerAdded = false;
                }
                
                if (!element.mentionedElements) {
                    element.mentionedElements = new Map();
                }
                
                const mentionedElements = element.querySelectorAll('[class*="mentioned__"]');   
                if (settings.hideOrangeBorderOnMentions) {
                    mentionedElements.forEach(el => {
                        const classes = Array.from(el.classList);
                        const mentionedClass = classes.find(c => c.startsWith('mentioned__'));
                        if (mentionedClass) {
                            el.classList.remove(mentionedClass);
                            element.mentionedElements.set(el, mentionedClass);
                        }
                    });
                } else {
                    if (element.mentionedElements.size > 0) {
                        element.mentionedElements.forEach((className, el) => {
                            if (el && !el.classList.contains(className)) {
                                el.classList.add(className);
                            }
                        });
                    }
                    
                    const contentElements = element.querySelectorAll('[class*="messageContent__"]');
                    contentElements.forEach(contentEl => {
                        if (contentEl.closest('[data-is-mention="true"]') && !contentEl.classList.contains('mentioned__')) {
                            const mentionedClassPattern = Array.from(document.querySelectorAll('[class*="mentioned__"]'))
                                .map(el => Array.from(el.classList).find(c => c.startsWith('mentioned__')))
                                .filter(Boolean)[0];
                            
                            if (mentionedClassPattern) {
                                contentEl.classList.add(mentionedClassPattern);
                            }
                        }
                    });
                }
            }
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
                    backgroundColor: 'var(--background-primary)',
                    color: 'var(--text-normal)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',

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
                maxHeight: `${settings.maxHeight - (100 * dynamicScale)}px`,
                overflowY: 'hidden',
                transition: 'overflow-y 0.2s ease',
                padding: 0,
                position: 'relative',
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
        }, [
            React.createElement('ul', {
                key: "message-list",
                style: {
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    pointerEvents: settings.disableMediaInteraction ? 'none' : 'auto'
                },
            }, 
                React.createElement(Message, {
                    id: `${message.id}-${message.id}`,
                    groupId: message.id,
                    channel: channel,
                    message: message,
                    compact: false,
                    renderContentOnly: false,
                    className: "ping-notification-messageContent"
                })
            ),
            settings.disableMediaInteraction ? React.createElement('div', {
                key: "click-overlay",
                style: {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    zIndex: 10,
                    cursor: 'pointer',
                    backgroundColor: 'transparent'
                },
                onClick: onClick
            }) : null
        ]),
        React.createElement(ProgressBar, {
            duration: settings.duration,
            isPaused: isPaused,
            onComplete: () => onClose(false),
            showTimer: settings.showTimer
        }),
        settings.privacyMode && React.createElement('div', {
            className: 'ping-notification-hover-text'
        }, "Hover to unblur")
    );
}

function ProgressBar({ duration, isPaused, onComplete, showTimer }) {
    const [remainingTime, setRemainingTime] = React.useState(duration);
    
    React.useEffect(() => {
        let interval;
        if (!isPaused) {
            interval = setInterval(() => {
                setRemainingTime(prev => {
                    if (prev <= 100) {
                        clearInterval(interval);
                        onComplete();
                        return 0;
                    }
                    return prev - 100;
                });
            }, 100);
        }
        return () => clearInterval(interval);
    }, [isPaused, onComplete, duration]);

    const progress = (remainingTime / duration) * 100;

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

    return React.createElement(React.Fragment, null,
        React.createElement('div', { 
            style: { 
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '4px',
                width: '100%',
                backgroundColor: 'var(--background-secondary-alt)',
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
                backgroundColor: 'var(--background-primary)',
                padding: '2px 6px',
                borderRadius: '10px',
                display: showTimer ? 'block' : 'none'
            }
        }, `${Math.round(remainingTime / 1000)}s`)
    );
}