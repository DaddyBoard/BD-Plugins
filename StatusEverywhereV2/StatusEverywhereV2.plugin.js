/**
* @name StatusEverywhereV2
* @author DaddyBoard
* @version 1.0.12
* @description Show status everywhere (chat avatars and voice chat avatars)
* @website https://github.com/DaddyBoard/BD-Plugins/tree/main/StatusEverywhereV2
* @source https://raw.githubusercontent.com/DaddyBoard/BD-Plugins/refs/heads/main/StatusEverywhereV2/StatusEverywhereV2.plugin.js
* @invite ggNWGDV7e2
* @runAt idle
*/

const { Webpack, React, Patcher, ReactUtils, Utils, Data, UI, DOM, Logger } = BdApi;
const { Filters } = Webpack;

const config = {
    changelog: [
        {
            "title": "v1.0.12",
            "type": "fixed",
            "items": [
                "Plugin loads first time now."
            ]
        }
    ],
    settings: [
        {
            "type": "category", 
            "id": "chatAvatars",
            "name": "Chat Avatars",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "showChatAvatars",
                    "name": "Show Status",
                    "note": "Show status in chat avatars",
                    "value": Data.load('StatusEverywhereV2', 'settings')?.showChatAvatars ?? true
                },
                {
                    "type": "switch",
                    "id": "showSpeakingStatusChatAvatars",
                    "name": "Show Speaking Status",
                    "note": "Show speaking status in chat avatars",
                    "value": Data.load('StatusEverywhereV2', 'settings')?.showSpeakingStatusChatAvatars ?? false
                }
            ]
        },
        {
            "type": "category", 
            "id": "voiceChatAvatars",
            "name": "VoiceChat Avatars",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "showVoiceChatAvatars",
                    "name": "Show Status",
                    "note": "Show status in voice chat avatars",
                    "value": Data.load('StatusEverywhereV2', 'settings')?.showVoiceChatAvatars ?? true
                },
                {
                    "type": "switch",
                    "id": "showSpeakingStatusVoiceChatAvatars",
                    "name": "Show Speaking Status",
                    "note": "Show speaking status in voice chat avatars.",
                    "value": Data.load('StatusEverywhereV2', 'settings')?.showSpeakingStatusVoiceChatAvatars ?? true
                }
            ]
        }
    ]
}

const css = `
    .StatusEverywhereV2-Avatar {
        margin: 0;
        padding: 0;
        border: 0;
        font-weight: inherit;
        font-style: inherit;
        font-family: inherit;
        font-size: 100%;
        vertical-align: baseline;
        position: absolute;
        left: var(--custom-message-margin-horizontal);
        margin-top: calc(4px - var(--custom-message-spacing-vertical-container-cozy));
        width: var(--chat-avatar-size);
        height: var(--chat-avatar-size);
        cursor: pointer;
        user-select: none;
        flex: 0 0 auto;
        z-index: 1;
        text-indent: -9999px;
        pointer-events: auto;
    }

    .StatusEverywhereV2-AvatarVC {
        margin: 0;
        padding: 0;
        border: 0;
        font-weight: inherit;
        font-style: inherit;
        font-family: inherit;
        font-size: 100%;
        vertical-align: baseline;
        position: absolute;
        left: var(--custom-message-margin-horizontal);
        margin-top: calc(4px - var(--custom-message-spacing-vertical-container-cozy));
        width: var(--chat-avatar-size);
        height: var(--chat-avatar-size);
        cursor: pointer;
        user-select: none;
        flex: 0 0 auto;
        z-index: 1;
        text-indent: -9999px;
        pointer-events: auto;
        left: 8px;
    }

`;

module.exports = class StatusEverywhereV2 {
    constructor(meta) {
        this.meta = meta;
        this.config = config;
        this.defaultSettings = {
            showChatAvatars: true,
            showSpeakingStatusChatAvatars: false,
            showVoiceChatAvatars: true,
            showSpeakingStatusVoiceChatAvatars: true
        };
        this.settings = this.loadSettings();
        this._corePromise = null;
        this._chatDepsPromise = null;
    }

    loadSettings() {
        return { ...this.defaultSettings, ...Data.load('StatusEverywhereV2', 'settings') };
    }

    saveSettings(newSettings) {
        this.settings = newSettings;
        Data.save('StatusEverywhereV2', 'settings', this.settings);
    }

    getSettingsPanel() {
        config.settings.forEach(category => {
            category.settings.forEach(setting => {
                setting.value = this.settings[setting.id];
            });
        });

        return UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                const newSettings = { ...this.settings, [id]: value };
                this.saveSettings(newSettings);

                if (id === 'showChatAvatars') {
                    if (value) {
                        this.patchChatAvatars();
                    } else {
                        Patcher.unpatchAll("ChatAvatarSE");
                    }
                } else if (id === 'showVoiceChatAvatars') {
                    if (value) {
                        this.patchVoiceChatAvatars();
                    } else {
                        Patcher.unpatchAll("VoiceChatAvatarSE");
                    }
                }
                this.forceUpdateMessages();
                this.forceUpdateVoice();
            }
        });
    }

    ensureCoreModules() {
        if (this._corePromise) return this._corePromise;

        this.PresenceStore = Webpack.getStore("PresenceStore");
        this.SpeakingStore = Webpack.getStore("SpeakingStore");
        this.SelectedGuildStore = Webpack.getStore("SelectedGuildStore");

        this._corePromise = Promise.all([
            Webpack.waitForModule(Filters.byStrings("getStateFromStores"), { searchExports: true }),
            Webpack.waitForModule(x => Filters.byStrings("statusColor", "isTyping")(x?.type), { searchExports: true }),
        ]).then(([useStateFromStores, MemberAreaAvatar]) => {
            this.useStateFromStores = useStateFromStores;
            this.MemberAreaAvatar = MemberAreaAvatar;
        }).catch((e) => {
            this._corePromise = null;
            Logger.error("StatusEverywhereV2", "Failed to resolve core modules", e);
            throw e;
        });

        return this._corePromise;
    }

    ensureChatDeps() {
        if (this._chatDepsPromise) return this._chatDepsPromise;

        this._chatDepsPromise = Promise.all([
            Webpack.waitForModule(Filters.bySource("getUserTag", "referencedUsernameProfile", "interactionUsernameProfile"), { defaultExport: false }).then((mod) => {
                this.useUserContextMenu = mod.UY;
            }),
            Webpack.waitForModule(Filters.byStrings("Unsupported animation config:"), { searchExports: true }).then((mod) => {
                this.Popout = mod;
            }),
            Webpack.waitForModule(Filters.byStrings('"SENDING"===', 'renderUserGuildPopout: channel should never be')).then((mod) => {
                this.userPopout = mod;
            }),
            Webpack.waitForModule(Filters.byStrings("preloadUserProfileForPopout", 'Invalid arguments')).then((mod) => {
                this.loaduser = mod;
            }),
            Webpack.waitForModule(Filters.byStrings("getGuildMemberAvatarURLSimple"), { defaultExport: false }).then((mod) => {
                this.loaduserArg = mod;
            }),
            Webpack.waitForModule(m => m.messageListItem).then((mod) => {
                this.messageListItem = mod.messageListItem;
            }),
        ]).catch((e) => {
            this._chatDepsPromise = null;
            Logger.error("StatusEverywhereV2", "Failed to resolve chat modules", e);
            throw e;
        });

        return this._chatDepsPromise;
    }

    start() {
        const lastVersion = Data.load('StatusEverywhereV2', 'lastVersion');
        if (lastVersion !== this.meta.version) {
            UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            Data.save('StatusEverywhereV2', 'lastVersion', this.meta.version);
        }

        DOM.addStyle("StatusEverywhereV2Styles", css);
        if (this.settings.showChatAvatars) this.patchChatAvatars();
        if (this.settings.showVoiceChatAvatars) this.patchVoiceChatAvatars();
    }

    stop() {
        Patcher.unpatchAll("ChatAvatarSE");
        Patcher.unpatchAll("VoiceChatAvatarSE");
        DOM.removeStyle("StatusEverywhereV2Styles");
        this.forceUpdateMessages();
        this.forceUpdateVoice();
        this._corePromise = null;
        this._chatDepsPromise = null;
    }

    forceUpdateMessages() {
        const selector = this.messageListItem ? `.${this.messageListItem}` : '[class*="messageListItem_"]';
        const nodes = document.querySelectorAll(selector);
        const owners = Array.from(nodes, (node) => ReactUtils.getOwnerInstance(node)).filter(m => m);
        
        for (const owner of new Set(owners)) {
            const { render } = owner;
            if (render.toString() === "() => null") continue;
            owner.render = () => null;
            owner.forceUpdate(() => {
                owner.render = render;
                owner.forceUpdate();
            });
        }
    }

    forceUpdateVoice() {
        const voiceUsers = Array.from(document.querySelectorAll("[class*=voiceUser_]"));
        for (const node of voiceUsers) {
            ReactUtils.getOwnerInstance(node)?.forceUpdate();
        }
    }
    
    patchChatAvatars() {
        const plugin = this;

        Promise.all([
            this.ensureCoreModules(),
            Webpack.waitForModule(Filters.bySource("AVATAR", "analyticsLocations", "showCommunicationDisabledStyles"), { defaultExport: false }),
        ]).then(([, ChatAvatar]) => {
            if (!ChatAvatar?.Ay) {
                Logger.error("StatusEverywhereV2", "ChatAvatar.Ay missing", ChatAvatar);
                return;
            }

            Patcher.after("ChatAvatarSE", ChatAvatar.Ay, "type", (_, [props], res) => {
                const {author, message, guildId, channel} = props;
                const popoutRef = React.useRef();
                const [show, setShow] = React.useState(false);

                if (message.author?.bot && message.author.discriminator === "0000") return;
                if (props.channel === undefined) return;

                const presence = plugin.useStateFromStores([plugin.PresenceStore], () => plugin.PresenceStore.getStatus(message.author.id));
                const Speaking = plugin.useStateFromStores([plugin.SpeakingStore], () => plugin.SpeakingStore.isSpeaking(message.author.id));
                const isMobile = plugin.useStateFromStores([plugin.PresenceStore], () => plugin.PresenceStore.isMobileOnline(message.author.id));
                const isVR = plugin.useStateFromStores([plugin.PresenceStore], () => plugin.PresenceStore.isVROnline?.(message.author.id) ?? !!plugin.PresenceStore.getClientStatus?.(message.author.id)?.vr);

                let avatarUrlSrc = message.author.getAvatarURL(plugin.SelectedGuildStore.getGuildId());
                if (!avatarUrlSrc) {
                    avatarUrlSrc = "https://cdn.discordapp.com/avatars/" + message.author.id + "/" + message.author.avatar;
                }

                if (!message) return;

                let avatarDecoration = null;
                if (message.author.avatarDecorationData) {
                    avatarDecoration = "https://cdn.discordapp.com/avatar-decoration-presets/" + message.author.avatarDecorationData.asset + ".png?size=44&passthrough=false";
                }
                const avatarProps = {
                    "aria-label": message.author.username,
                    avatarDecoration: avatarDecoration,
                    isSpeaking: plugin.settings.showSpeakingStatusChatAvatars ? Speaking : false,
                    size: "SIZE_40",
                    src: avatarUrlSrc,
                    isMobile: isMobile,
                    isVR: isVR,
                    status: presence
                };

                const avatar = React.createElement(plugin.MemberAreaAvatar, avatarProps);

                if (!plugin.Popout || !plugin.userPopout) {
                    res.props.avatar = React.createElement("div", {
                        className: "StatusEverywhereV2-Avatar"
                    }, avatar);
                    return;
                }

                const contextMenuHandler = plugin.useUserContextMenu?.(message.author?.id, channel?.id);

                const preloadUserPopout = () => {
                    if (!plugin.loaduser) return;
                    return plugin.loaduser(
                        message.author.id,
                        null != author.guildMemberAvatar && null != guildId && plugin.loaduserArg?.Ay ? plugin.loaduserArg.Ay.getGuildMemberAvatarURLSimple({
                            guildId,
                            userId: author.id,
                            avatar: author.guildMemberAvatar,
                            size: 80
                        }) : message.author.getAvatarURL(void 0, 80, !1), {
                        guildId,
                        channelId: message.channel_id
                    })
                }

                res.props.avatar = React.createElement(plugin.Popout, {
                    renderPopout: (e) => {
                        return plugin.userPopout(e, message)
                    },
                    preload: preloadUserPopout,
                    targetElementRef: popoutRef,
                    shouldShow: show,
                    position: "right",
                    onRequestClose: () => setShow(false),
                    
                    children: (e) => {
                        return React.createElement("div", {
                            ref: popoutRef,
                            className: "StatusEverywhereV2-Avatar",
                            onClick: () => setShow(prev => !prev),
                            onContextMenu: contextMenuHandler,
                            onMouseDown: e.onMouseDown

                        }, avatar)
                    }
                });
            });

            plugin.ensureChatDeps().then(() => plugin.forceUpdateMessages()).catch(() => {});
            plugin.forceUpdateMessages();
        }).catch((e) => {
            Logger.error("StatusEverywhereV2", "Failed to patch chat avatars", e);
        });
    }
    
    patchVoiceChatAvatars() {
        const plugin = this;

        Promise.all([
            this.ensureCoreModules(),
            Webpack.waitForModule(Filters.bySource("avatarContainerClass", "getAvatarURL", "userNameClassName"), { defaultExport: false }),
            Webpack.waitForModule(Filters.byKeys("userAvatar", "audienceContainer", "audienceIcon")),
            Webpack.waitForModule(Filters.byKeys("avatarContainer", "overlap", "username", "avatarSmall")),
        ]).then(([, VoiceChatAvatar, avatarElement1, avatarElement2]) => {
            plugin.joinedElements = avatarElement1.userAvatar + " " + avatarElement2.avatar + " " + avatarElement2.avatarSmall;

            const VoiceChatAvatarComponent = (props) => {
                const {nick, user, showSpeakingStatus} = props;
                const [presence,isMobile,isVR] = plugin.useStateFromStores([plugin.PresenceStore], ()=>[plugin.PresenceStore.getStatus(user.id), plugin.PresenceStore.isMobileOnline(user.id), plugin.PresenceStore.isVROnline?.(user.id) ?? !!plugin.PresenceStore.getClientStatus?.(user.id)?.vr]);

                let avatarUrlSrc = user.getAvatarURL(plugin.SelectedGuildStore.getGuildId());
                if (!avatarUrlSrc) {
                    avatarUrlSrc = "https://cdn.discordapp.com/avatars/" + user.id + "/" + user.avatar;
                }

                const avatarProps = {
                    "aria-label": nick,
                    className: "StatusEverywhereV2-AvatarVC",
                    isSpeaking: showSpeakingStatus ? props.speaking : false,
                    size: "SIZE_24",
                    src: avatarUrlSrc,
                    isMobile: isMobile,
                    isVR: isVR,
                    status: presence
                };

                return React.createElement(plugin.MemberAreaAvatar, avatarProps);
            };

            Patcher.after("VoiceChatAvatarSE", VoiceChatAvatar, "Ay", (_, [props], res) => {
                const elementArea = Utils.findInTree(res, (node) => node?.className?.includes("content"), { walkable: ["props", "children"] });
                delete elementArea.children[1].props.style;
                elementArea.children[1].props.className = plugin.joinedElements;
                elementArea.children[5] = React.createElement(VoiceChatAvatarComponent, {
                    ...props,
                    showSpeakingStatus: plugin.settings.showSpeakingStatusVoiceChatAvatars
                });
            });

            plugin.forceUpdateVoice();
        }).catch((e) => {
            Logger.error("StatusEverywhereV2", "Failed to patch voice avatars", e);
        });
    }

}
