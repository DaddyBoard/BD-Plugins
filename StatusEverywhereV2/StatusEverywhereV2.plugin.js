/**
* @name StatusEverywhereV2
* @author DaddyBoard
* @version 1.0.0
* @description Show status everywhere (chat avatars and voice chat avatars)
* @website https://github.com/DaddyBoard/BD-Plugins/tree/main/StatusEverywhereV2
* @source https://raw.githubusercontent.com/DaddyBoard/BD-Plugins/refs/heads/main/StatusEverywhereV2/StatusEverywhereV2.plugin.js
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils, Data, UI, DOM} = BdApi;
const PresenceStore = Webpack.getStore("PresenceStore");
const SpeakingStore = Webpack.getStore("SpeakingStore");
const SelectedGuildStore = Webpack.getStore("SelectedGuildStore");

const useStateFromStores = Webpack.getModule(Webpack.Filters.byStrings("getStateFromStores"), { searchExports: true });
const MemberAreaAvatar = Webpack.getModule((exp, m, id) => { if(exp?.type?.toString?.().includes("(d),_=i.useRef(!1),p")){ return true; }},{searchExports:true});
const Popout = Webpack.getModule(Webpack.Filters.byKeys("Animation", "defaultProps"), { searchExports: true });
const userPopout = Webpack.getByStrings('"SENDING"===', 'renderUserGuildPopout: channel should never be');
const loaduser = Webpack.getByStrings("Invalid arguments", 'type:"popout"', ".getAvatarURL(void 0,80)");
const loaduserArg = Webpack.getByStrings('searchParams.set("passthrough"', '.concat(location.protocol)', 'AVATAR_DECORATION_PRESETS', { searchExports: true });

const VoiceChatAvatar = Webpack.getBySource("iconPriortySpeakerSpeaking", "avatarContainer", "getAvatarURL");
const ChatAvatar = Webpack.getBySource("AVATAR", "analyticsLocations", "showCommunicationDisabledStyles");

const { messageListItem } = Webpack.getModule(m => m.messageListItem);
const avatarElement1 = Webpack.getByKeys("userAvatar", "audienceContainer", "audienceIcon");
const avatarElement2 = Webpack.getByKeys("avatarContainer", "overlap", "username", "avatarSmall");
const joinedElements = avatarElement1.userAvatar + " " + avatarElement2.avatar + " " + avatarElement2.avatarSmall;
// ^^ this is to force the voicechat avatar in a permanent "non speaking" state, as I'm managing the speaking state manually.

const config = {
    changelog: [
        {
            "title": "v1.0.0",
            "type": "added",
            "items": [
                "Initial release"
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

        if (this.settings.showChatAvatars) this.patchChatAvatars();
        if (this.settings.showVoiceChatAvatars) this.patchVoiceChatAvatars();
        DOM.addStyle("StatusEverywhereV2Styles", css);
        this.forceUpdateMessages();
        this.forceUpdateVoice();
    }

    stop() {
        Patcher.unpatchAll("ChatAvatarSE");
        Patcher.unpatchAll("VoiceChatAvatarSE");
        DOM.removeStyle("StatusEverywhereV2Styles");
        this.forceUpdateMessages();
        this.forceUpdateVoice();
    }

    forceUpdateMessages() {
        const nodes = document.querySelectorAll(`.${messageListItem}`);
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
        console.log(voiceUsers);
        for (const node of voiceUsers) {
            console.log(node);
            ReactUtils.getOwnerInstance(node)?.forceUpdate();
            console.log(ReactUtils.getOwnerInstance(node));
        }
    }
    
    patchChatAvatars() {
        Patcher.after("ChatAvatarSE", ChatAvatar.ZP, "type", (_, [props], res) => {
            const {author, message, guildId} = props;
            const [show, setShow] = React.useState(false);

            function preloadUserPopout() {
                return loaduser(
                    message.author.id,
                    null != author.guildMemberAvatar && null != guildId ? loaduserArg.ZP.getGuildMemberAvatarURLSimple({
                        guildId,
                        userId: author.id,
                        avatar: author.guildMemberAvatar,
                        size: 80
                    }) : message.author.getAvatarURL(void 0, 80, !1), {
                    guildId,
                    channelId: message.channel_id
                })
            }

            const presence = useStateFromStores([PresenceStore], function () { return PresenceStore.getStatus(message.author.id); });
            const Speaking = useStateFromStores([SpeakingStore], function () { return SpeakingStore.isSpeaking(message.author.id); });
            const isMobile = useStateFromStores([PresenceStore], function () { return PresenceStore.isMobileOnline(message.author.id); });

            let avatarUrlSrc = message.author.getAvatarURL(SelectedGuildStore.getGuildId());
            if (!avatarUrlSrc) {
                avatarUrlSrc = "https://cdn.discordapp.com/avatars/" + message.author.id + "/" + message.author.avatar;
            }

            if (message) {
                let avatarDecoration = null;
                if (message.author.avatarDecorationData) {
                    avatarDecoration = "https://cdn.discordapp.com/avatar-decoration-presets/" + message.author.avatarDecorationData.asset + ".png?size=44&passthrough=false";
                }
                const avatarProps = {
                    "aria-label": message.author.username,
                    avatarDecoration: avatarDecoration,
                    isSpeaking: this.settings.showSpeakingStatusChatAvatars ? Speaking : false,
                    size: "SIZE_40",
                    src: avatarUrlSrc,
                    isMobile: isMobile,
                    status: presence
                };

                res.props.avatar = React.createElement(Popout, {
                    renderPopout: (e) => {
                        return userPopout(e, message)
                    },
                    preload: preloadUserPopout,
                    shouldShow: show,
                    position: "right",
                    onRequestClose: () => setShow(false),
                    children: (e) => {
                        return React.createElement("div", {
                            className: "StatusEverywhereV2-Avatar",
                            onClick: () => setShow(true),
                            onMouseDown: e.onMouseDown,

                        }, React.createElement(MemberAreaAvatar, avatarProps))
                    }
                });

            }
        });
    }
    
    patchVoiceChatAvatars() {
        const VoiceChatAvatarComponent = (props) => {
            const {nick, user, showSpeakingStatus} = props;
            const [presence,isMobile] = useStateFromStores([PresenceStore], ()=>[PresenceStore.getStatus(user.id), PresenceStore.isMobileOnline(user.id)]);

            let avatarUrlSrc = user.getAvatarURL(SelectedGuildStore.getGuildId());
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
                status: presence
            };

            return React.createElement(MemberAreaAvatar, avatarProps);
        };

        Patcher.after("VoiceChatAvatarSE", VoiceChatAvatar.ZP, "render", (_, [props], res) => {
            const elementArea = Utils.findInTree(res, (node) => node?.className?.includes("content__"), { walkable: ["props", "children"] });
            delete elementArea.children[1].props.style;
            elementArea.children[1].props.className = joinedElements;
            elementArea.children[5] = React.createElement(VoiceChatAvatarComponent, {
                ...props,
                showSpeakingStatus: this.settings.showSpeakingStatusVoiceChatAvatars
            });
        });
    }

}