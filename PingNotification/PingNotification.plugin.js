/**
 * @name PingNotification
 * @author DaddyBoard
 * @authorId 241334335884492810
 * @version 9.1.1
 * @description Show in-app notifications for anything you would hear a ping for.
 * @source https://github.com/DaddyBoard/BD-Plugins
 * @invite ggNWGDV7e2
 */

const { React, Webpack, ReactDOM, UI } = BdApi;
const { createRoot } = ReactDOM;
const { Patcher } = BdApi;
const { Filters } = Webpack;

const [
    NotificationUtils,
    NotificationSoundModule,
    MessageConstructor,
    transitionTo,
    Dispatcher,
    MessageActions,
    hasThreadElementModule,
    Message,
    messageReferenceSelectors,
    PopoutModule,
    RecentMentionsInbox,
    trailingModule,
    DiscordProgressBar,
    constructMessageObj,
    ChannelConstructor,
    useStateFromStores,
    appSidePanelSelectors
] = Webpack.getBulk(
    { filter: Webpack.Filters.byStrings("SUPPRESS_NOTIFICATIONS", "SELF_MENTIONABLE_SYSTEM"), searchExports: true }, // NotificationUtils
    { filter: m => m?.playNotificationSound }, // NotificationSoundModule
    { filter: Webpack.Filters.byPrototypeKeys("addReaction") }, // MessageConstructor
    { filter: Webpack.Filters.byStrings("transitionToGuild - Transitioning to"), searchExports: true }, // transitionTo
    { filter: Webpack.Filters.byKeys("subscribe", "dispatch") }, // Dispatcher
    { filter: Webpack.Filters.byKeys("fetchMessage", "deleteMessage") }, // MessageActions
    { filter: Webpack.Filters.bySource("hasThread", "nitroAuthorBadgeContainer", "isSystemMessage") }, // hasThreadElementModule
    { filter: m => String(m.type).includes('.messageListItem,"aria-setsize":-1,children:[') }, // Message
    { filter: Webpack.Filters.byKeys("messageSpine", "repliedMessageClickableSpine") }, // messageReferenceSelectors
    { filter: (a) => a?.prototype?.render && a.Animation, searchExports: true }, // PopoutModule
    { filter: Webpack.Filters.byStrings(".clearMentions(),", ".deleteRecentMention") }, // RecentMentionsInbox
    { filter: Webpack.Filters.byKeys('bar', 'trailing') }, // trailingModule
    { filter: Webpack.Filters.byStrings("percent", "foregroundGradientColor"), searchExports: true }, // DiscordProgressBar
    { filter: Webpack.Filters.byStrings("message_reference", "isProbablyAValidSnowflake"), searchExports: true }, // constructMessageObj
    { filter: Webpack.Filters.byPrototypeKeys("addCachedMessages") }, // ChannelConstructor
    { filter: Webpack.Filters.byStrings("getStateFromStores"), searchExports: true }, // useStateFromStores
    { filter: Webpack.Filters.byKeys("appAsidePanelWrapper", "app") } // appSidePanelSelectors
);

const {
    IdleStore,
    WindowStore,
    SelectedChannelStore,
    UserGuildSettingsStore,
    UserStore,
    ChannelStore,
    GuildStore,
    RelationshipStore,
    GuildMemberStore,
    MessageStore,
    ReferencedMessageStore,
    GuildRoleStore,
    PresenceStore
} = BdApi.Webpack.Stores;

if (!NotificationUtils) {
    UI.showNotice("PingNotification ERROR: Could not find the NotificationUtils module. Please report this on the Github page!", { type: 'error' });
}

const hasThreadElement = hasThreadElementModule.hasThread;
const trailing = trailingModule.trailing;
const UserFetchModule = Webpack.getMangled('type:"USER_PROFILE_FETCH_START"', { fetchUser: Webpack.Filters.byStrings("USER_UPDATE", "Promise.resolve") })
//const [ module2, key ] = Webpack.getWithKey(Filters.byStrings("PlatformTypes", "windowKey", "title"));
const windowArea = BdApi.Webpack.getById("950796");

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

const { appAsidePanelWrapper, app } = appSidePanelSelectors;
let container = document.querySelector(`#app-mount > div.${appAsidePanelWrapper} > div`);
let appElem = container ? container.querySelector(`.${app}`) : null;

function updateDOMReferences() {
    container = document.querySelector(`#app-mount > div.${appAsidePanelWrapper} > div`);
    appElem = container ? container.querySelector(`.${app}`) : null;
}

let liveMessages = [];

const config = {
    changelog: [
        {
            "title": "9.1.1 - Fixed",
            "type": "fixed",
            "items": [
                "Fixed CSS breakage.",
            ]
        },
        {
            "title": "9.1.0 - Added",
            "type": "added",
            "items": [
                "**__NEW__** Option in `Keyword Notifications` section for `Keyword Only Mode`. This will only show notifications if the content matches any of your rules. This essentially turns PingNotification into a standalone keyword tracking plugin.",
            ]
        },
        {
            "title": "9.1.0 - Improvements",
            "type": "improved",
            "items": [
                "Regex patterns now display the index of the pattern that was matched instead of the result of the pattern itself.",
                "Keyword Matching now correctly checks for matches where special characters are used. Words like `!test` will now match.",
            ]
        },
        {
            "title": "9.1.0 - Fixed",
            "type": "fixed",
            "items": [
                "Discord CSS changes breaking our styling.",
            ]
        },
        {
            "title": "9.0.0",
            "type": "added",
            "items": [
                "**__HIGHLY REQUESTED__** Notification History Popout! You can now view all notifications you've received in a popout window. Invoke it with the 'PN' button top right in the title bar",
                "**__NEW__** Option in `Keyword Notifications` section, to flip behaviour between `Whitelist` and `Blacklist` mode.  ",
                "Optimised progress bar. This should create less lag when high numbers of notifications are live.",
                "Fixed `transitionTo` for Reaction Notifications, they now take you to the reacted message.",
                "Greatly improved speed of clicking a notification to be taken to the message. (`transitionTo`)",
                "Fixed hovering timestamps causing notifications to be forcefully destroyed."
            ]
        },
        // {
        //     "title": "8.6.0",
        //     "type": "fixed",
        //     "items": [
        //         "Reworked the entire init phase to be more efficient and faster, thanks to new BdApi methods.",
        //     ]
        // }
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
                    type: "dropdown",
                    id: "overrideDND",
                    name: "Override Do Not Disturb",
                    note: "Show notifications even when your status is set to Do Not Disturb",
                    value: "off",
                    options: [
                        { label: "Off", value: "off" },
                        { label: "On", value: "on" },
                        { label: "On + Sound", value: "onWithSound" }
                    ]
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
            id: "autoPauseCategory",
            name: "Auto Pause Settings",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "pinOnAFK",
                    name: "Pin on AFK",
                    note: "Pin notifications when you are AFK (REQUIRES 'Show Timer' to be enabled)",
                    value: false
                },
                {
                    type: "dropdown",
                    id: "noLongerAFKBehavior",
                    name: "No longer AFK Behavior",
                    note: "What to do when you are no longer AFK?",
                    value: "doNothing",
                    options: [
                        { label: "Do Nothing", value: "doNothing" },
                        { label: "Unpin All Notifications", value: "unpinAll" }
                    ]
                },
                {
                    type: "switch",
                    id: "pinOnWindowNotVisible",
                    name: "Pin on 'Window Not Visible'",
                    note: "Pin notifications whilst discord is minimized or has another window overlapping (REQUIRES 'Show Timer' to be enabled)",
                    value: false
                },
                {
                    type: "dropdown",
                    id: "noLongerWindowNotVisible",
                    name: "No longer 'Window Not Visible'",
                    note: "What happens when discord returns to visibility?",
                    value: "unpinAll",
                    options: [
                        { label: "Do Nothing", value: "doNothing" },
                        { label: "Unpin All Notifications", value: "unpinAll" }
                    ]
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
                    id: "showHistoryButton",
                    name: "Show History Button",
                    note: "Show the History (PN) button top right in the title bar. Disabling this will also halt all history related functionality.",
                    value: true
                },
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
            id: "keywordNotifications",
            name: "Keyword Notifications",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "enableKeywordNotifications",
                    name: "Enable Keyword Notifications",
                    note: "Show notifications when messages contain your keywords",
                    value: false
                },
                {
                    type: "switch",
                    id: "keywordOnlyMode",
                    name: "Keyword Only Mode",
                    note: "!!!NOTE!!! Only show notifications if the content matches any of your rules.",
                    value: false
                },
                {
                    type: "switch",
                    id: "simulateAudioNotification",
                    name: "Force Audio on Keyword Notifications",
                    note: "Simulate a discord message sound when a keyword notification is shown",
                    value: false
                },
                {
                    type: "switch",
                    id: "exactMatch",
                    name: "Exact Match",
                    note: "Only trigger notifications if the message content exactly matches the keywords. Off = `test` will trigger on `testing`, On = `test` will only trigger on `test`",
                    value: true
                },
                {
                    type: "switch",
                    id: "showKeyword",
                    name: "Show Keyword",
                    note: "Show the keyword that was detected inside the notification",
                    value: true
                },
                {
                    type: "dropdown",
                    id: "keywordSearchScope",
                    name: "Keyword Search Scope",
                    note: "Choose what to search for keywords: content only (message text) or entire message object (includes author, embeds, etc.)",
                    value: "contentOnly",
                    options: [
                        { label: "Content only", value: "contentOnly" },
                        { label: "Entire Message Object", value: "entireMessage" }
                    ]
                },
                {
                    type: "text",
                    id: "notificationKeywords",
                    name: "Notification Keywords",
                    note: "Add keywords that will trigger notifications, separated by commas. Example: `hello, hi, hey`",
                    value: ""
                },
                {
                    type: "text",
                    id: "regexPatterns",
                    name: "REGEX Patterns",
                    note: "Add REGEX patterns that will trigger notifications, separated by triple semicolons. Example: `\\b(hello|hi)\\b;;; @everyone;;; \\d{1,3},\\d{3};;; \\$\\d+\\.\\d{2}`",
                    value: ""
                },
                {
                    type: "text",
                    id: "ignoredServersKeywords",
                    name: "Ignored Servers for Keywords",
                    note: "",
                    value: ""
                },
                {
                    type: "text",
                    id: "ignoredChannelsKeywords",
                    name: `Ignored Channels for Keywords`,
                    note: "",
                    value: ""
                },
                {
                    type: "dropdown",
                    id: "keywordFilterMode",
                    name: "Keyword Filter Mode",
                    note: "Blacklist = Ignore servers and channels, Whitelist = Only show servers and channels",
                    options: [
                        { label: "Blacklist (default)", value: "blacklist" },
                        { label: "Whitelist", value: "whitelist" }
                    ],
                    value: "blacklist"
                }
            ]
        },
        {
            type: "category",
            id: "reactionNotifications",
            name: "Reaction Notifications",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "enableReactionNotifications",
                    name: "Enable Reaction Notifications",
                    note: "Show notifications when people react to your messages",
                    value: ""
                },
                {
                    type: "switch",
                    id: "simulateAudioNotificationReaction",
                    name: "Simulate Audio on Reaction",
                    note: "Simulate a discord message sound when a reaction notification is shown",
                    value: ""
                }
            ]
        },
        {
            type: "category",
            id: "threadNotifications",
            name: "Thread Notifications",
            collapsible: true,
            shown: false,
            settings: [
                {
                    type: "switch",
                    id: "enableThreadNotifications",
                    name: "Enable Thread Notifications",
                    note: "Show notifications when new threads are created",
                    value: ""
                },
                {
                    type: "switch",
                    id: "simulateAudioNotificationThread",
                    name: "Simulate Audio on Thread",
                    note: "Simulate a discord message sound when a thread notification is shown",
                    value: ""
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
                    type: "switch",
                    id: "autoSubscribeToAllServers",
                    name: "Auto Subscribe to All Servers on start",
                    note: "Discord recently made large servers load lazily, so this option will auto subscribe to all servers on start to ensure you don't miss any notifications. UNKNOWN IF THIS IS ENTIRELY SAFE. USE AT YOUR OWN RISK.",
                    value: true
                },
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
                },
                {
                    type: "slider",
                    id: "readjustAnimationDuration",
                    name: "Readjust Animation Duration",
                    note: "Default: 100ms",
                    value: 100,
                    min: 0,
                    max: 500,
                    markers: [0, 100, 200, 300, 400, 500],
                    units: "ms",
                    defaultValue: 100,
                    step: 100
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
            privacyMode: false,
            coloredUsernames: true,
            showNicknames: true,
            applyNSFWBlur: false,
            readChannelOnClose: false,
            disableMediaInteraction: false,
            showTimer: true,
            usernameOrDisplayName: true,
            closeOnRead: true,
            useFriendNicknames: true,
            hideOrangeBorderOnMentions: true,
            closeOnRightClick: true,
            enableKeywordNotifications: false,
            exactMatch: true,
            keywordSearchScope: "contentOnly",
            showKeyword: true,
            simulateAudioNotification: true,
            notificationKeywords: "",
            ignoredServersKeywords: "",
            ignoredChannelsKeywords: "",
            keywordFilterMode: "blacklist",
            regexPatterns: "",
            enableReactionNotifications: true,
            simulateAudioNotificationReaction: false,
            enableThreadNotifications: true,
            simulateAudioNotificationThread: true,
            pinOnAFK: false,
            noLongerAFKBehavior: "doNothing",
            pinOnWindowNotVisible: false,
            noLongerWindowNotVisible: "unpinAll",
            readjustAnimationDuration: 100,
            overrideDND: "off",
            autoSubscribeToAllServers: false,
            showHistoryButton: true,
            keywordOnlyMode: false
        };
        this.settings = this.loadSettings();
        this.activeNotifications = [];
        this.sessionMessages = [];
        this.testNotificationData = null;

        this.onMessageReceived = this.onMessageReceived.bind(this);
        this.messageThreadCreateHandler = this.messageThreadCreateHandler.bind(this);

        let missingModules = false;
        let missingModulesName = "";

        if (!appSidePanelSelectors.app) {
            missingModules = true;
            missingModulesName = "appSidePanelSelectors";
        }
        if (!NotificationUtils) {
            missingModules = true;
            missingModulesName = "NotificationUtils";
        }
        if (!windowArea) {
            missingModules = true;
            missingModulesName = "windowArea";
        }
        if (missingModules) {
            UI.showNotification({
                title: "PingNotification",
                content: `**ERROR:** Could not find the ${missingModulesName} module. Please report this on the Github page!`,
                type: "error",
                duration: 30000,
                actions: [
                    {
                        label: "Open Github",
                        onClick: () => {
                            window.open(`https://github.com/DaddyBoard/BD-Plugins/issues/new?title=Auto%20generated%20bug%20report%20for%20missing%20module&body=Filter%20search%20for%20%60${missingModulesName}%60%20failed.`);
                        }
                    }
                ]
            })
        }
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

        this.messageUpdateHandler = (event) => {
            if (!event?.message) return;
            if (liveMessages.includes(event.message.id)) return;
            const msgTime = new Date(event.message.timestamp).getTime();
            if (Date.now() - msgTime > 5000) return;
            this.onMessageReceived(event, true);
        };

        this.reactionAddHandler = (event) => {
            if (!this.settings.enableReactionNotifications) return;
            if (this.settings.keywordOnlyMode) return;
            this.onReactionReceived(event);
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

        if (this.settings.showHistoryButton) {
            this.patchTitleBar();
        }

        Dispatcher.subscribe("MESSAGE_CREATE", this.messageCreateHandler);
        Dispatcher.subscribe("THREAD_CREATE", this.messageThreadCreateHandler);
        Dispatcher.subscribe("MESSAGE_REACTION_ADD", this.reactionAddHandler);
        Dispatcher.subscribe("MESSAGE_ACK", this.messageAckHandler);
        Dispatcher.subscribe("MESSAGE_UPDATE", this.messageUpdateHandler);
        const appMount = document.getElementById('app-mount');
        if (appMount) {
            this.domObserver = new MutationObserver(() => {
                updateDOMReferences();
            });
            this.domObserver.observe(appMount, { childList: true, subtree: false });
        }
        BdApi.DOM.addStyle("PingNotificationStyles", this.css);

        if (this.settings.autoSubscribeToAllServers) {
            this.autoSubscribeToAllServers();
        }
    }

    patchTitleBar() {
        Patcher.after("PN", windowArea, "TF", (_, [props], ret) => {
            if (props.windowKey?.startsWith("DISCORD_")) return ret;
            if (props.trailing?.props?.children) {
                props.trailing.props.children.splice(3, 0,
                    createPopout(this),
                );
            }
        });
        reRender("." + trailing);
    }

    unpatchTitleBar() {
        Patcher.unpatchAll("PN");
        reRender("." + trailing);
    }

    stop() {
        if (Dispatcher) {
            Dispatcher.unsubscribe("MESSAGE_CREATE", this.messageCreateHandler);
            Dispatcher.unsubscribe("MESSAGE_ACK", this.messageAckHandler);
            Dispatcher.unsubscribe("THREAD_CREATE", this.messageThreadCreateHandler);
            Dispatcher.unsubscribe("MESSAGE_REACTION_ADD", this.reactionAddHandler);
            Dispatcher.unsubscribe("MESSAGE_UPDATE", this.messageUpdateHandler);
        }
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
        this.removeAllNotifications();
        BdApi.DOM.removeStyle("PingNotificationStyles");
        Patcher.unpatchAll("PN");
    }

    loadSettings() {
        const savedSettings = BdApi.Data.load('PingNotification', 'settings');
        return Object.assign({}, this.defaultSettings, savedSettings);
    }

    saveSettings(newSettings) {
        this.settings = newSettings;
        BdApi.Data.save('PingNotification', 'settings', newSettings);
    }

    autoSubscribeToAllServers() {
        const servers = GuildStore.getGuildsArray();
        Dispatcher.dispatch({
            "type": "GUILD_SUBSCRIPTIONS_FLUSH",
            "subscriptions": {
                ...(servers.reduce((acc, v) => {
                        acc[v.id] = {
                            "typing": true,
                            "activities": true,
                            "threads": true
                        };
                        return acc
                    }, {}))
            }
        });
    }

    css = `
        .ping-notification {
            color: var(--text-default);
            border-radius: 12px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.1), 0 0 1px rgba(255, 255, 255, 0.1);
            overflow: hidden;
            backdrop-filter: blur(10px);
            transform: translateZ(0);
            opacity: 0;
            z-index: var(--ping-notification-z-index);
            -webkit-app-region: no-drag;
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
            color: var(--text-default);
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

        .ping-notification [class*="spoilerContent"],
        .ping-notification [class*="spoilerMarkdownContent"] {
            background-color: var(--__current--spoiler-background-color);
            -webkit-box-decoration-break: clone;
            box-decoration-break: clone;
            transition: background-color .2s ease;
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
        .ping-notification [class*="hoverButtonGroup"],
        .ping-notification [class*="codeActions"],
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

        .ping-notification-messageContent [class*="-buttonContainer"],
        .ping-notification-messageContent [class*="-header"],
        .ping-notification-messageContent [class*="-avatar"],
        .ping-notification-messageContent [class*="-avatarDecoration"],
        .ping-notification-messageContent [class*="StatusEverywhereV2-Avatar"] {
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


        .ping-notification-messageContent [class*="-repliedMessage"] {
            padding-left: 20px !important;
            pointer-events: none !important;
        }

        .ping-notification-messageContent :is(.${messageReferenceSelectors.messageSpine}:before, .${messageReferenceSelectors.repliedMessageClickableSpine}) {
            padding-left: 10px !important;
            margin-left: 40px !important;
        }

        .ping-notification-content [class*="-contents"] [class*="-markup"][class*="-messageContent"],
        .ping-notification-content [class*="-contents"] [class*="-markup"],
        .ping-notification-content [class*="-scrollbarGhostHairline"] {
            font-size: var(--ping-notification-content-font-size) !important;
        }

        .ping-notification [class*="-repliedTextPreview"] [class*="-repliedTextContent"],
        .ping-notification [class*="-username"],
        .ping-notification [class*="-contents"] [class*="-message-content"] {
            font-size: calc(var(--ping-notification-content-font-size) * 0.85) !important;
        }

        .ping-notification-content small,
        .ping-notification-content small * {
            font-size: calc(var(--ping-notification-content-font-size) - 0.1rem) !important;
        }

        .ping-notification [class*="-message"][class*="-selected"]:not([class*="-mentioned"]),
        .ping-notification [class*="-message"]:hover:not([class*="-mentioned"]) {
            background: inherit !important;
        }

        .ping-notification [class*="spotifyActivityIndicatorIcon"] {
            display: none !important;
        }

        .ping-notification .${hasThreadElement}:after {
            border-bottom: 0px !important;
            border-bottom-left-radius: 0px !important;
            border-left: 0px !important;
        }

        .ping-notification [class*="timestamp"] {
            pointer-events: none !important;
        }

        .pn-hist-button {
            cursor: pointer;
        }

        .pn-hist-button svg text {
            transition: fill 0.2s ease;
        }

        .pn-hist-popout {
            background-color: var(--background-surface-high);
            border-radius: 8px;
            box-shadow: var(--elevation-high);
            padding: 12px;
            width: 400px;
            max-height: 600px;
            overflow-y: auto;
            color: var(--text-default);
            scrollbar-width: thin;
            scrollbar-color: var(--scrollbar-thin-thumb) var(--scrollbar-thin-track);
        }

        .pn-hist-popout::-webkit-scrollbar {
            width: 8px;
        }

        .pn-hist-popout::-webkit-scrollbar-thumb {
            background-color: var(--scrollbar-thin-thumb, #202225);
            border-radius: 4px;
        }

        .pn-hist-popout::-webkit-scrollbar-track {
            background: var(--scrollbar-thin-track, transparent);
        }

        .pn-hist-popout-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 14px;
            font-weight: 600;
            color: var(--header-primary);
            margin-bottom: 8px;
            padding-bottom: 8px;
            border-bottom: 1px solid var(--background-modifier-accent);
        }

        .pn-hist-clear-button {
            background: transparent;
            border: 1px solid var(--control-critical-primary-border-default);
            color: var(--text-feedback-critical);
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.15s ease;
        }

        .pn-hist-clear-button:hover {
            background: var(--control-critical-primary-background-active);
            border-color: var(--control-critical-primary-background-active);
            color: var(--white);
        }

        .pn-hist-popout-empty {
            color: var(--text-muted);
            font-size: 13px;
            text-align: center;
            padding: 20px 10px;
        }

        .pn-hist-group {
            margin-bottom: 12px;
        }

        .pn-hist-group-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--channels-default);
            margin-bottom: 8px;
            padding: 4px 0;
        }

        .pn-hist-group-icon {
            width: 25px;
            height: 25px;
            border-radius: 50%;
            flex-shrink: 0;
        }

        .pn-hist-group-channel {
            color: var(--channels-default);
            font-size: 16px;
        }

        .pn-hist-popout-item {
            margin-bottom: 8px;
            -webkit-padding-start: 0;
            padding-inline-start: 0;
            margin-inline-start: -16px;
            position: relative;
            transition: background-color 0.15s ease;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .pn-hist-popout-item:last-child {
            margin-bottom: 0;
        }


        .pn-hist-messageContent [class*="-buttonContainer"] {
            display: none !important;
        }

        .pn-hist-popout [class*="-hoverButtonGroup"],
        .pn-hist-popout [class*="-codeActions"],
        .pn-hist-popout [class*="reactionBtn"] {
            display: none !important;
        }

    `;

    onMessageReceived(event, update) {
        if (!event.message?.channel_id) return;
        if (event.message.type === 18) return;

        const channel = ChannelStore.getChannel(event.message.channel_id);
        const currentUser = UserStore.getCurrentUser();
        if (!channel || event.message.author.id === currentUser.id) return;

        const notifyResult = this.shouldNotify(event.message, channel, currentUser);

        if (this.settings.keywordOnlyMode) {
            if (notifyResult?.isKeywordMatch === true) {
                this.showNotification(event.message, channel, notifyResult);
            }

        } else {
            if (!update) {
                if (notifyResult && (notifyResult === true || notifyResult.notify === true)) {
                    this.showNotification(event.message, channel, notifyResult);
                }
            }
            else {
                if (notifyResult?.isKeywordMatch === true) {
                    this.showNotification(event.message, channel, notifyResult);
                }
            }
        }
    }

    async messageThreadCreateHandler(event) {
        const currentUser = UserStore.getCurrentUser();
        const presence = PresenceStore.getStatus(currentUser.id);

        if (presence.status === "dnd" && this.settings.overrideDND === "off") {
            return;
        }

        if (this.settings.keywordOnlyMode) return;

        if (!this.settings.enableThreadNotifications) return;
        const channel = ChannelStore.getChannel(event.channel.id);
        const parentChannel = ChannelStore.getChannel(channel.parent_id);
        let author = UserStore.getUser(event.channel.ownerId);
        if (!author) {
            author = await UserFetchModule.fetchUser(event.channel.ownerId);
        }
        if (!event.isNewlyCreated) return;
        if (event.channel.ownerId === UserStore.getCurrentUser().id) return;
        const status = UserGuildSettingsStore.getNewForumThreadsCreated(parentChannel)
        if (status) {
            const messageToConstruct = {
                id: `PingNotification-Thread-${Date.now()}`,
                channel_id: channel.id,
                content: `:thread: ${event.channel.name}\n-# NEW THREAD CREATED`,
                author: author,
                timestamp: Date.now(),
            }
            this.showNotification(messageToConstruct, parentChannel, {notify: true}, channel);
            NotificationSoundModule.playNotificationSound("message1", 0.4);
        }
    }

    async onReactionReceived(event) {
        const currentUser = UserStore.getCurrentUser();
        const presence = PresenceStore.getStatus(currentUser.id);
        const realId = event.messageId;

        if (presence.status === "dnd" && this.settings.overrideDND === "off") {
            return;
        }

        let reacter = UserStore.getUser(event.userId);
        if (!reacter) {
            reacter = await UserFetchModule.fetchUser(event.userId);
        }
        const channel = ChannelStore.getChannel(event.channelId);
        if (event.messageAuthorId !== currentUser.id) return;
        if (reacter.id === currentUser.id) return;
        if (channel.id === SelectedChannelStore.getChannelId()) return;
        let content = "";
        if (event.emoji.id) {
            content = `reacted <a:${event.emoji.name}:${event.emoji.id}> to your message`
        } else {
            content = `reacted ${event.emoji.name} to your message`
        }
        const messageToConstruct = {
            id: `PingNotification-Reaction-${Date.now()}`,
            channel_id: channel.id,
            content: content,
            author: reacter,
            timestamp: Date.now(),
            message_reference: {
                channel_id: channel.id,
                guild_id: channel.guild_id,
                message_id: event.messageId,
                type: 0
            },
            type: 19
        }
        this.showNotification(messageToConstruct, channel, {notify: true}, undefined, realId);
        if (this.settings.simulateAudioNotificationReaction) {
            NotificationSoundModule.playNotificationSound("message1", 0.4);
        }
    }

    shouldNotify(message, channel, currentUser) {
        let overrideStatus = false;
        if (this.settings.overrideDND === "on" || this.settings.overrideDND === "onWithSound") {
            overrideStatus = true;
        }

        const shouldNotifyDiscordModule = NotificationUtils(message, message.channel_id, false, overrideStatus);
        let keywordMatch = null;

        if (this.settings.enableKeywordNotifications && 
            ((this.settings.keywordFilterMode === "blacklist" && !(this.settings.ignoredServersKeywords || '').includes(channel.guild_id)) && 
            (!(this.settings.ignoredChannelsKeywords || '').includes(channel.id))) || 
            (this.settings.keywordFilterMode === "whitelist" && ((this.settings.ignoredServersKeywords || '').includes(channel.guild_id) || (this.settings.ignoredChannelsKeywords || '').includes(channel.id)))) {
            
            let hasKeywordMatch = false;
            
            if (this.settings.notificationKeywords) {
                const keywords = this.settings.notificationKeywords
                    .split(",")
                    .map(keyword => keyword.trim())
                    .filter(keyword => keyword.length > 0);
                
                const searchTarget = this.settings.keywordSearchScope === "entireMessage" 
                    ? JSON.stringify(message) 
                    : message.content;
                
                hasKeywordMatch = keywords.some(keyword => {
                    if (this.settings.exactMatch) {
                        const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const startsWithWord = /^\w/.test(keyword);
                        const endsWithWord = /\w$/.test(keyword);
                        const pattern = `${startsWithWord ? '\\b' : ''}${escapedKeyword}${endsWithWord ? '\\b' : ''}`;
                        const wordRegex = new RegExp(pattern, 'i');
                        const matches = wordRegex.test(searchTarget);
                        if (matches) {
                            keywordMatch = keyword;
                            return true;
                        }
                        return false;
                    } else {
                        const matches = searchTarget.toLowerCase().includes(keyword.toLowerCase());
                        if (matches) {
                            keywordMatch = keyword;
                            return true;
                        }
                        return false;
                    }
                });
            }
            
            if (!hasKeywordMatch && this.settings.regexPatterns) {
                const regexPatterns = this.settings.regexPatterns
                    .split(";;;")
                    .map(pattern => pattern.trim())
                    .filter(pattern => pattern.length > 0);
                
                const searchTarget = this.settings.keywordSearchScope === "entireMessage" 
                    ? JSON.stringify(message) 
                    : message.content;
                
                for (let i = 0; i < regexPatterns.length; i++) {
                    const pattern = regexPatterns[i];
                    try {
                        const regex = new RegExp(pattern, 'i');
                        const match = regex.exec(searchTarget);
                        if (match) {
                            keywordMatch = `REGEX Index: ${i + 1}`;
                            hasKeywordMatch = true;
                            break;
                        }
                    } catch (error) {
                        UI.showNotification({
                            title: "PingNotification",
                            content: "Caught regex error for pattern \"${pattern}\":", 
                            type: 'error' 
                        });
                    }
                }
            }
            
            if (hasKeywordMatch && this.settings.simulateAudioNotification && !shouldNotifyDiscordModule) {
                NotificationSoundModule.playNotificationSound("message1", 0.4);
            }
        }

        if (shouldNotifyDiscordModule || keywordMatch) {
            if (this.settings.overrideDND === "onWithSound") {
                NotificationSoundModule.playNotificationSound("message1", 0.4);
            }
            return { 
                notify: true,
                isKeywordMatch: !!keywordMatch,
                matchedKeyword: keywordMatch
            };
        }
    }

    async showNotification(messageEvent, channel, notifyResult, threadChannel, realId) {
        const notificationElement = BdApi.DOM.createElement('div', {
            className: 'ping-notification',
            'data-channel-id': channel.id // this is so MoreRoleColors can find the channelid to apply proper color :)
        });
        
        if (this.settings.popupLocation.endsWith("Centre")) {
            notificationElement.classList.add('centre');
        }
        
        let message = MessageStore.getMessage(channel.id, messageEvent.id);

        if (!message){
            message = constructMessageObj(messageEvent);
            addMessage(message);
        }

        if (message.messageReference) {

            if (ReferencedMessageStore.getMessageByReference(message.messageReference).state !== 0) {
                let referencedMessage = MessageStore.getMessage(message.messageReference.channel_id, message.messageReference.message_id);

                if (!referencedMessage) {

                    referencedMessage = await MessageActions.fetchMessage({
                        channelId: message.messageReference.channel_id,
                        messageId: message.messageReference.message_id
                    }).catch(error => {
                        console.error(error)
                        return null;
                    });
                }

                if (referencedMessage) {
                    updateMessageReferenceStore(referencedMessage);
                }
            }
        }

        notificationElement.creationTime = Date.now();
        notificationElement.channelId = threadChannel?.id || channel.id;
        notificationElement.messageId = message.id;
        notificationElement.message = message;
        
        notificationElement.isKeywordMatch = false;
        notificationElement.matchedKeyword = null;
        
        if (notifyResult && typeof notifyResult === 'object') {
            notificationElement.isKeywordMatch = notifyResult.isKeywordMatch || false;
            notificationElement.matchedKeyword = notifyResult.matchedKeyword || null;
        }
        
        const isTestNotification = message.id === "0";
        notificationElement.isTestNotification = isTestNotification;
        
        notificationElement.style.setProperty('--ping-notification-z-index', isTestNotification ? '1003' : '1002');

        const root = createRoot(notificationElement);
        root.render(
            React.createElement(NotificationComponent, {
                message: message,
                channel: channel,
                settings: this.settings,
                isKeywordMatch: notificationElement.isKeywordMatch,
                matchedKeyword: notificationElement.matchedKeyword,
                onClose: (isManual) => { 
                    notificationElement.manualClose = isManual;
                    this.removeNotification(notificationElement);
                },
                onClick: () => {
                    if (!isTestNotification) {
                        this.onNotificationClick(channel, message, threadChannel, realId);
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
            })
        );
        notificationElement.root = root;

        this.activeNotifications.push(notificationElement);

        if (container) {
            if (appElem && appElem.nextSibling) {
                container.insertBefore(notificationElement, appElem.nextSibling);
            } else if (appElem) {
                container.appendChild(notificationElement);
                console.log("PingNotification: Imperfect insert location. Report to DaddyBoard please!");
            } else {
                container.appendChild(notificationElement);
                console.log("PingNotification: fallback insert location. Report to DaddyBoard please!");
            }
        }

        void notificationElement.offsetHeight;
        notificationElement.classList.add('show');
        
        this.adjustNotificationPositions();
        
        liveMessages.push(message.id);

        if (message.type == 21) return;

        if (!String(message.id).includes("PingNotification") && this.settings.showHistoryButton) {
            this.sessionMessages.push({id: message.id, channel_id: channel.id});
        }
        return notificationElement;
    }

    removeNotification(notificationElement) {
        if (container && container.contains(notificationElement)) {
            if (this.settings.readChannelOnClose && notificationElement.manualClose && !notificationElement.isTestNotification) {
                ChannelAckModule(notificationElement.channelId);
            }
            notificationElement.root.unmount();
            container.removeChild(notificationElement);
            this.activeNotifications = this.activeNotifications.filter(n => n !== notificationElement);
            liveMessages = liveMessages.filter(id => id !== notificationElement.messageId);
            this.adjustNotificationPositions();
            if (notificationElement.isTestNotification && this.activeNotifications.filter(n => n.isTestNotification).length === 0) {
                this.testNotificationData = null;
            }
        }
    }

    removeAllNotifications() {
        this.activeNotifications.forEach(notification => {
            if (container && container.contains(notification)) {
                notification.root.unmount();
                container.removeChild(notification);
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
            const transitionDuration = this.settings.readjustAnimationDuration / 1000;
            notification.style.transition = `all ${transitionDuration}s ease-in-out`;
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

    onNotificationClick(channel, message, threadChannel, realId) {
        const notificationsToRemove = this.activeNotifications.filter(notification => 
            notification.channelId === channel.id
        );

        if (message.id.includes("PingNotification-Reaction")) {
            message.id = realId;
        }
        
        notificationsToRemove.forEach(notification => {
            this.removeNotification(notification);
        });
        
        if (threadChannel) {
            transitionTo(channel.guild_id, threadChannel.id);
        } else {
            transitionTo(channel.guild_id, channel.id, message.id);
        }
    }

    getSettingsPanel() {
        const plugin = this;
        
        return React.createElement(() => {
            const [, forceUpdate] = React.useState({});
            const refresh = () => forceUpdate({});
            
            const settingsConfig = structuredClone(config.settings);
            
            settingsConfig.forEach(category => {
                if (category.settings) {
                    category.settings.forEach(setting => {
                        if (setting.id === 'duration') {
                            setting.value = plugin.settings.duration / 1000;
                        } else {
                            setting.value = plugin.settings[setting.id];
                        }
                        
                    if (setting.id === 'ignoredChannelsKeywords') {
                        const mode = plugin.settings.keywordFilterMode === 'whitelist' ? 'Allowed' : 'Ignored';
                        setting.name = `${mode} Channels for Keywords`;
                        setting.note = `Add channels you want to be ${mode.toLowerCase()} for keywords from, separated by commas. Example: \`1234567890, 1234567891\``;
                    }
                    if (setting.id === 'ignoredServersKeywords') {
                        const mode = plugin.settings.keywordFilterMode === 'whitelist' ? 'Allowed' : 'Ignored';
                        setting.name = `${mode} Servers for Keywords`;
                        setting.note = `Add servers you want to be ${mode.toLowerCase()} for keywords from, separated by commas. Example: \`1234567890, 1234567891\``;
                    }
                    if (setting.id === 'showHistoryButton') {
                        setting.onChange = (value) => {
                            plugin.settings[setting.id] = value;
                            plugin.saveSettings(plugin.settings);
                            if (value) {
                                plugin.patchTitleBar();
                            } else {
                                plugin.unpatchTitleBar();
                            }
                        };
                    }
                    if (setting.id === 'simulateAudioNotificationReaction') {
                        setting.disabled = !plugin.settings.enableReactionNotifications;
                    }
                    if (setting.id === 'simulateAudioNotificationThread') {
                        setting.disabled = !plugin.settings.enableThreadNotifications;
                    }
                    if (['pinOnAFK', 'noLongerAFKBehavior', 'pinOnWindowNotVisible', 'noLongerWindowNotVisible'].includes(setting.id)) {
                        setting.disabled = !plugin.settings.showTimer;
                    }
                    if (['simulateAudioNotification', 'exactMatch', 'showKeyword', 'keywordSearchScope', 'notificationKeywords', 'regexPatterns', 'ignoredServersKeywords', 'ignoredChannelsKeywords', 'keywordFilterMode'].includes(setting.id)) {
                        setting.disabled = !plugin.settings.enableKeywordNotifications;
                    }
                        if (['maxWidth', 'maxHeight', 'hideOrangeBorderOnMentions', 'showTimer', 'privacyMode', 'popupLocation', 'usernameOrDisplayName'].includes(setting.id)) {
                            setting.onChange = (value) => {
                                plugin.settings[setting.id] = value;
                                plugin.saveSettings(plugin.settings);

                                plugin.activeNotifications.forEach(notification => {
                                    if (notification.isTestNotification && plugin.testNotificationData) {
                                        plugin.updateNotification(notification, plugin.testNotificationData.message, plugin.testNotificationData.channel.id, "testNotif");
                                    } else {
                                        const channelId = notification.channelId || notification.message?.channel_id;
                                        if (channelId) {
                                            plugin.updateNotification(notification, notification.message, channelId, "testNotif");
                                        }
                                    }
                                });

                                if (!plugin.activeNotifications.find(n => n.isTestNotification)) {
                                    plugin.showTestNotification();
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
                        plugin.settings[id] = value * 1000;
                    } else {
                        plugin.settings[id] = value;
                    }
                    if ([
                        'keywordFilterMode',
                        'enableReactionNotifications',
                        'enableThreadNotifications',
                        'showTimer',
                        'enableKeywordNotifications',
                        'simulateAudioNotificationReaction',
                        'simulateAudioNotificationThread'
                    ].includes(id)) {
                        refresh();
                    }
                    plugin.saveSettings(plugin.settings);
                }
            });
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
        
        notificationElement.root.render(
            React.createElement(NotificationComponent, {
                message: updatedMessage,
                channel: notificationChannel,
                settings: this.settings,
                isKeywordMatch: notificationElement.isKeywordMatch,
                matchedKeyword: notificationElement.matchedKeyword,
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
            })
        );
    }

    showTestNotification() {
        this.activeNotifications = this.activeNotifications.filter(n => {
            if (n.isTestNotification) {
                n.root.unmount();
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
                attachments: []
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

function NotificationComponent({ message:propMessage, channel, settings, isKeywordMatch, matchedKeyword, onClose, onClick, ChangeHandler, onSwipe }) {
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
                        color: 'var(--text-feedback-critical)',
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
                        color: 'var(--text-feedback-critical)',
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
        const guildRoles = GuildRoleStore.getRolesSnapshot(guild.id);
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
            try {
                return user.getAvatarURL(channel.guild_id) || message.author.avatar;
            } catch (error) {
                console.error('Error getting avatar URL:', error);
                return message.author.avatar;
            }
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
            backgroundColor: 'var(--card-background-default)',
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
                        color: settings.coloredUsernames && roleColor ? roleColor : 'var(--header-base-low)',
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
                    opacity: '0.8',
                    backgroundColor: 'var(--background-base-low)',
                    color: 'var(--text-default)',
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
            showTimer: settings.showTimer,
            settings: settings
        }),
        isKeywordMatch && matchedKeyword && settings.showKeyword && React.createElement('div', {
            style: {
                position: 'absolute',
                bottom: '8px',
                left: '12px',
                backgroundColor: 'var(--background-secondary)',
                padding: '2px 6px',
                borderRadius: '4px',
                color: 'var(--text-feedback-critical)',
                fontWeight: 'bold',
                fontSize: '10px'
            }
        }, `Keyword: ${matchedKeyword}`),
        settings.privacyMode && React.createElement('div', {
            className: 'ping-notification-hover-text'
        }, "Hover to unblur")
    );
}

function ProgressBar({ duration, isPaused, onComplete, showTimer, settings }) {
    const [remainingTime, setRemainingTime] = React.useState(duration);
    const [isHovered, setIsHovered] = React.useState(false);
    const [manualPause, setManualPause] = React.useState(false);

    const isAFK = settings.pinOnAFK && settings.showTimer ?
        useStateFromStores([IdleStore], () => IdleStore.isAFK()) : false;
    const isWindowVisible = settings.pinOnWindowNotVisible && settings.showTimer ?
        useStateFromStores([WindowStore], () => WindowStore.isVisible()) : true;

    const shouldBePausedByAFK = settings.pinOnAFK && settings.showTimer && isAFK;
    const shouldBePausedByWindow = settings.pinOnWindowNotVisible && settings.showTimer && !isWindowVisible;
    const localPause = manualPause || shouldBePausedByAFK || shouldBePausedByWindow;

    React.useEffect(() => {
        if (settings.pinOnAFK && settings.showTimer && !isAFK && settings.noLongerAFKBehavior === "unpinAll") {
            setManualPause(false);
        }
    }, [isAFK, settings.pinOnAFK, settings.showTimer, settings.noLongerAFKBehavior]);

    React.useEffect(() => {
        if (settings.pinOnWindowNotVisible && settings.showTimer && isWindowVisible && settings.noLongerWindowNotVisible === "unpinAll") {
            setManualPause(false);
        }
    }, [isWindowVisible, settings.pinOnWindowNotVisible, settings.showTimer, settings.noLongerWindowNotVisible]);

    React.useEffect(() => {
        let interval;
        if (!isPaused && !localPause) {
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
    }, [isPaused, onComplete, duration, localPause]);

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

    const toggleLocalPause = (e) => {
        e.stopPropagation();
        setManualPause(!manualPause);
    };

    const progressColor = getProgressColor();
    const progressColorString = `rgb(${progressColor[0]}, ${progressColor[1]}, ${progressColor[2]})`;

    const shouldShowControl = isHovered || localPause;

    return React.createElement(React.Fragment, null,
        React.createElement('div', { 
            style: { 
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: '4px',
                width: '100%',
            }
        },
            DiscordProgressBar && React.createElement(DiscordProgressBar, {
                percent: progress,
                foregroundGradientColor: [progressColorString, progressColorString],
                animate: true
            })
        ),
        React.createElement('div', {
            style: {
                position: 'absolute',
                bottom: '8px',
                right: '12px',
                display: showTimer ? 'flex' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                pointerEvents: 'auto'
            },
            onClick: toggleLocalPause,
            onMouseEnter: () => setIsHovered(true),
            onMouseLeave: () => setIsHovered(false)
        }, 
            React.createElement('div', {
                style: {
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: 'var(--background-base-low)',
                    borderRadius: '10px',
                    padding: '2px 6px',
                    overflow: 'visible'
                }
            },
                React.createElement('div', {
                    style: {
                        position: 'absolute',
                        right: '100%',
                        marginRight: '4px',
                        opacity: shouldShowControl ? 1 : 0,
                        transform: shouldShowControl ? 'translateX(0)' : 'translateX(10px)',
                        transition: 'opacity 0.2s ease, transform 0.2s ease, color 0.2s ease',
                        color: localPause ? progressColorString : 'var(--text-default)',
                        width: '14px',
                        height: '14px'
                    }
                }, 
                    React.createElement('svg', {
                        width: '14',
                        height: '14',
                        viewBox: '0 0 24 24',
                        fill: 'currentColor'
                    },
                        React.createElement('path', {
                            d: 'M19.38 11.38a3 3 0 0 0 4.24 0l.03-.03a.5.5 0 0 0 0-.7L13.35.35a.5.5 0 0 0-.7 0l-.03.03a3 3 0 0 0 0 4.24L13 5l-2.92 2.92-3.65-.34a2 2 0 0 0-1.6.58l-.62.63a1 1 0 0 0 0 1.42l9.58 9.58a1 1 0 0 0 1.42 0l.63-.63a2 2 0 0 0 .58-1.6l-.34-3.64L19 11l.38.38ZM9.07 17.07a.5.5 0 0 1-.08.77l-5.15 3.43a.5.5 0 0 1-.63-.06l-.42-.42a.5.5 0 0 1-.06-.63L6.16 15a.5.5 0 0 1 .77-.08l2.14 2.14Z'
                        })
                    )
                ),
                React.createElement('span', {
                    style: {
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: progressColorString,
                        transition: 'color 0.5s ease'
                    }
                }, `${Math.round(remainingTime / 1000)}s`)
            )
        )
    );
}

function addMessage(message) {
    const channel = ChannelConstructor.getOrCreate(message.channel_id);

    const newChannel = channel.mutate(r => {
        r.ready = true;
        r.cached = true;
        r._map[message.id] = message;
    });

    ChannelConstructor.commit(newChannel);
}

let renderMessage;

function RenderMessage({message, onClickCallback}) {
    if (typeof renderMessage === "undefined") {
        renderMessage = RecentMentionsInbox({}).props.renderMessage;
    }

    const [node] = renderMessage(message, () => {
        const channel = ChannelStore.getChannel(message.channel_id);
        transitionTo(channel.guild_id, channel.id, message.id);
        if (onClickCallback) onClickCallback();
    });

    return node.type(node.props)?.props?.children?.[1];
}

function createPopout(pluginInstance) {
    return React.createElement(class extends React.Component {
        constructor(props) {
            super(props);
            this.state = { hover: false };
            this.buttonRef = React.createRef();
        }
        
        render() {
            const { hover } = this.state;
            const fillColor = hover ? 'white' : '#8b8c91';

            return React.createElement(PopoutModule, {
                position: 'bottom',
                align: 'center',
                targetElementRef: this.buttonRef,
                renderPopout: () => {
                    return React.createElement(PopoutContent, { pluginInstance, parentComponent: this });
                }
            }, (popoutProps) => {
                return React.createElement('div', {
                    ...popoutProps,
                    ref: this.buttonRef,
                    className: 'pn-hist-button',
                    onMouseEnter: () => this.setState({ hover: true }),
                    onMouseLeave: () => this.setState({ hover: false })
                }, 
                    React.createElement('svg', {
                        width: '24',
                        height: '24',
                        viewBox: '0 0 24 24'
                    }, 
                        React.createElement('text', {
                            x: '50%',
                            y: '55%',
                            fill: fillColor,
                            fontSize: '17',
                            fontWeight: 'bold',
                            textAnchor: 'middle',
                            dominantBaseline: 'central'
                        }, 'PN')
                    )
                );
            });
        }
    });
}

class PopoutContent extends React.Component {
    constructor(props) {
        super(props);
        this.state = { displayCount: 10 };
        this.scrollRef = React.createRef();
        this.sentinelRef = React.createRef();
        this.observer = null;
    }

    componentDidMount() {
        this.setupObserver();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevState.displayCount !== this.state.displayCount) {
            this.setupObserver();
        }
    }

    componentWillUnmount() {
        if (this.observer) {
            this.observer.disconnect();
        }
    }

    setupObserver() {
        if (this.observer) {
            this.observer.disconnect();
        }

        if (this.sentinelRef.current && this.state.displayCount < this.props.pluginInstance.sessionMessages.length) {
            this.observer = new IntersectionObserver(
                (entries) => {
                    if (entries[0].isIntersecting) {
                        this.setState({ displayCount: this.state.displayCount + 10 });
                    }
                },
                { root: this.scrollRef.current, threshold: 0.1 }
            );
            this.observer.observe(this.sentinelRef.current);
        }
    }

    render() {
        const { pluginInstance, parentComponent } = this.props;
        const { displayCount } = this.state;
        
        const allMessagesReversed = pluginInstance.sessionMessages.slice().reverse();
        const messagesToDisplay = allMessagesReversed.slice(0, displayCount);
        const groupedMessages = [];
        let currentGroup = null;

        messagesToDisplay.forEach((item) => {
            const message = MessageStore.getMessage(item.channel_id, item.id);
            if (!message) return;

            if (!currentGroup || currentGroup.channel_id !== item.channel_id) {
                currentGroup = {
                    channel_id: item.channel_id,
                    messages: [item]
                };
                groupedMessages.push(currentGroup);
            } else {
                currentGroup.messages.push(item);
            }
        });

        const sentinelPosition = displayCount - 3;
        let messageCounter = 0;

        return React.createElement('div', {
            ref: this.scrollRef,
            className: 'pn-hist-popout'
        }, [
            React.createElement('div', {
                key: 'header',
                className: 'pn-hist-popout-header'
            }, [
                React.createElement('span', {
                    key: 'title'
                }, 'PingNotification History'),
                pluginInstance.sessionMessages.length > 0 && React.createElement('button', {
                    key: 'clear',
                    className: 'pn-hist-clear-button',
                    onClick: () => {
                        UI.showConfirmationModal("PingNotification", "Are you sure you want to clear notification history?", {
                            onConfirm: () => {
                                pluginInstance.sessionMessages.length = 0;
                                this.setState({ displayCount: 10 });
                                parentComponent.forceUpdate();
                            }
                        })
                    }
                }, 'Clear')
            ]),
            pluginInstance.sessionMessages.length === 0
                ? React.createElement('div', {
                    key: 'empty',
                    className: 'pn-hist-popout-empty'
                }, 'No messages yet')
                : groupedMessages.map((group, groupIndex) => {
                    const channel = ChannelStore.getChannel(group.channel_id);
                    if (!channel) return null;

                    const guild = channel.guild_id ? GuildStore.getGuild(channel.guild_id) : null;
                    const channelName = channel.name || 'Direct Message';
                    
                    let iconUrl;
                    if (guild && guild.icon) {
                        iconUrl = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=32`;
                    } else if (!guild) {
                        const recipients = channel.recipients;
                        if (recipients && recipients.length > 0) {
                            const user = UserStore.getUser(recipients[0]);
                            if (user && user.avatar) {
                                iconUrl = `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=32`;
                            } else {
                                iconUrl = `https://cdn.discordapp.com/embed/avatars/0.png`;
                            }
                        } else {
                            iconUrl = `https://cdn.discordapp.com/embed/avatars/0.png`;
                        }
                    } else {
                        iconUrl = `https://cdn.discordapp.com/embed/avatars/0.png`;
                    }

                    return React.createElement('div', {
                        key: `group-${group.channel_id}-${groupIndex}`,
                        className: 'pn-hist-group'
                    }, [
                        React.createElement('div', {
                            key: 'group-header',
                            className: 'pn-hist-group-header'
                        }, [
                            React.createElement('img', {
                                key: 'icon',
                                src: iconUrl,
                                className: 'pn-hist-group-icon',
                                alt: ''
                            }),
                            React.createElement('span', {
                                key: 'channel',
                                className: 'pn-hist-group-channel'
                            }, `#${channelName}`)
                        ]),
                        ...group.messages.map((item, msgIndex) => {
                            const message = MessageStore.getMessage(item.channel_id, item.id);
                            if (!message) return null;

                            const currentIndex = messageCounter++;
                            const elements = [];
                            
                            elements.push(React.createElement('div', {
                                key: `${item.id}-${msgIndex}`,
                                className: 'pn-hist-popout-item'
                            }, 
                                React.createElement(RenderMessage, {
                                    message: message,
                                    onClickCallback: null
                                })
                            ));

                            if (currentIndex === sentinelPosition) {
                                elements.push(React.createElement('div', {
                                    key: `sentinel-${currentIndex}`,
                                    ref: this.sentinelRef,
                                    style: { height: '1px' }
                                }));
                            }

                            return elements;
                        }).flat()
                    ]);
                })
        ]);
    }
}

function reRender(selector) {
	const target = document.querySelector(selector)?.parentElement;
	if (!target) return;
    const instance = BdApi.ReactUtils.getOwnerInstance(target);
    const unpatch = Patcher.instead("PN", instance, "render", () => unpatch());
	instance.forceUpdate(() => instance.forceUpdate());
}