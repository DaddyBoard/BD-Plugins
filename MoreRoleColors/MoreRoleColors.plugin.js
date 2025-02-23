/**
* @name MoreRoleColors
* @author DaddyBoard
* @version 1.2.3
* @description Adds role colors to usernames across Discord - including messages, voice channels, typing indicators, mentions, account area, text editor, audit log, role headers, user profiles, and tags
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils } = BdApi;
const getStore = Webpack.getStore;
const VoiceUser = Webpack.getBySource("iconPriortySpeakerSpeaking", "avatarContainer", "getAvatarURL")
const GuildMemberStore = getStore("GuildMemberStore");
const SelectedGuildStore = getStore("SelectedGuildStore");
const RelationshipStore = getStore("RelationshipStore");
const TypingModule = Webpack.getByStrings(".colors.INTERACTIVE_NORMAL).hex(),activeTextColor", { defaultExport: false });
const MentionModule = Webpack.getByStrings(',"Unexpected missing user"),(0,', { defaultExport: false });
const ChannelStore = getStore("ChannelStore");
const UserStore = BdApi.Webpack.getStore("UserStore");
const GuildStore = BdApi.Webpack.getStore("GuildStore");

//types for changelog: added, fixed, improved, progress.
const config = {
    banner: "",
    changelog: [
        {
            "title": "v1.2.3",
            "type": "fixed",
            "items": [
                "Minor change from discord broke Account Area coloring, this has been fixed."
            ]
        }
    ],
    settings: [
        {
            "type": "category", 
            "id": "generalColoring",
            "name": "General Coloring",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "messages",
                    "name": "Messages",
                    "note": "Colors users text by their role color",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.messages ?? true
                },
                {
                    "type": "switch",
                    "id": "voiceUsers", 
                    "name": "Voice Users",
                    "note": "Colors usernames in voice channels",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.voiceUsers ?? true
                },
                {
                    "type": "switch",
                    "id": "speakingIndicator",
                    "name": "Speaking Indicator",
                    "note": "Changes opacity of voice usernames when speaking",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.speakingIndicator ?? false
                },
                {
                    "type": "switch",
                    "id": "typingUsers",
                    "name": "Typing Indicator",
                    "note": "Colors usernames in typing indicators", 
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.typingUsers ?? true
                },
                {
                    "type": "switch",
                    "id": "accountArea",
                    "name": "Account Area",
                    "note": "Colors your username in the account area",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.accountArea ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "mentionColoring",
            "name": "Mention Coloring",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "mentions",
                    "name": "Mentions",
                    "note": "Colors usernames in mentions",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.mentions ?? true
                },
                {
                    "type": "switch",
                    "id": "textEditor",
                    "name": "Text Editor",
                    "note": "Colors mentions in the text editor",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.textEditor ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "serverColoring",
            "name": "Server Features Coloring",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "auditLog",
                    "name": "Audit Log",
                    "note": "Colors usernames in the audit log",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.auditLog ?? true
                },
                {
                    "type": "switch",
                    "id": "roleHeaders",
                    "name": "Role Headers",
                    "note": "Colors usernames in role headers",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.roleHeaders ?? true
                },
                {
                    "type": "switch",
                    "id": "serverProfileDisplayName",
                    "name": "Server Profile Display Name",
                    "note": "Colors display names in server profiles",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.serverProfileDisplayName ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "profileColoring",
            "name": "Profile Coloring",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "userProfile",
                    "name": "User Profile",
                    "note": "Colors usernames in user profiles",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.userProfile ?? true
                },
                {
                    "type": "switch",
                    "id": "Tags",
                    "name": "Tags",
                    "note": "Colors tags to match role colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.Tags ?? true
                }
            ]
        }
    ]
};
module.exports = class MoreRoleColors {
    constructor(meta) {
        this.meta = meta;
        this.defaultSettings = {
            voiceUsers: true,
            speakingIndicator: false,
            typingUsers: true,
            mentions: true,
            accountArea: true,
            textEditor: true,
            auditLog: true,
            roleHeaders: true,
            messages: false,
            userProfile: true,
            serverProfileDisplayName: true,
            Tags: true
        };
        this.settings = this.loadSettings();
    }

    start() {
        const lastVersion = BdApi.Data.load('MoreRoleColors', 'lastVersion');
        if (lastVersion !== this.meta.version) {
            BdApi.UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                banner: config.banner,
                changes: config.changelog
            });
            BdApi.Data.save('MoreRoleColors', 'lastVersion', this.meta.version);
        }

        if (this.settings.voiceUsers) this.patchVoiceUsers();
        if (this.settings.typingUsers) this.patchTypingUsers();
        if (this.settings.mentions) this.patchMentions();
        if (this.settings.accountArea) this.patchAccountArea();
        if (this.settings.textEditor) this.patchTextEditor();
        if (this.settings.auditLog) this.patchAuditLog();
        if (this.settings.roleHeaders) this.patchRoleHeaders();
        if (this.settings.messages) this.patchMessages();
        if (this.settings.userProfile) this.patchUserProfile();
        if (this.settings.Tags) this.patchTags();
        if (this.settings.serverProfileDisplayName) this.patchServerProfileDisplayName();
        this.forceUpdateComponents();
    }

    loadSettings() {
        return { ...this.defaultSettings, ...BdApi.Data.load('MoreRoleColors', 'settings') };
    }

    saveSettings(newSettings) {
        this.settings = newSettings;
        BdApi.Data.save('MoreRoleColors', 'settings', newSettings);
    }

    getSettingsPanel() {
        config.settings.forEach(category => {
            if (category.settings) {
                category.settings.forEach(setting => {
                    setting.value = this.settings[setting.id];
                });
            }
        });

        return BdApi.UI.buildSettingsPanel({
            settings: config.settings,
            onChange: (category, id, value) => {
                const newSettings = { ...this.settings, [id]: value };
                this.saveSettings(newSettings);
                
                if (value) {
                    switch (id) {
                        case 'voiceUsers': this.patchVoiceUsers(); break;
                        case 'typingUsers': this.patchTypingUsers(); break;
                        case 'mentions': this.patchMentions(); break;
                        case 'accountArea': this.patchAccountArea(); break;
                        case 'textEditor': this.patchTextEditor(); break;
                        case 'auditLog': this.patchAuditLog(); break;
                        case 'roleHeaders': this.patchRoleHeaders(); break;
                        case 'messages': this.patchMessages(); break;
                        case 'userProfile': this.patchUserProfile(); break;
                        case 'Tags': this.patchTags(); break;
                        case 'serverProfileDisplayName': this.patchServerProfileDisplayName(); break;
                    }
                } else {
                    if (id === 'serverProfileDisplayName') {
                        Patcher.unpatchAll("MoreRoleColors-ServerProfileDisplayName");
                        Patcher.unpatchAll("MoreRoleColors-ServerProfileGuildSelector");
                    } else {
                        Patcher.unpatchAll(`MoreRoleColors-${id}`);
                    }
                    if (id === 'accountArea' && this._unpatchAccountArea) {
                        this._unpatchAccountArea();
                    }
                }

                this.forceUpdateComponents();
            }
        });
    }

    stop() {
        Patcher.unpatchAll("MoreRoleColors-voiceUsers");
        Patcher.unpatchAll("MoreRoleColors-typingUsers");
        Patcher.unpatchAll("MoreRoleColors-mentions");
        Patcher.unpatchAll("MoreRoleColors-accountArea");
        Patcher.unpatchAll("MoreRoleColors-textEditor");
        Patcher.unpatchAll("MoreRoleColors-auditLog");
        Patcher.unpatchAll("MoreRoleColors-roleHeaders");
        Patcher.unpatchAll("MoreRoleColors-messages");
        Patcher.unpatchAll("MoreRoleColors-ServerProfileDisplayName");
        Patcher.unpatchAll("MoreRoleColors-ServerProfileGuildSelector");
        Patcher.unpatchAll("MoreRoleColors-userProfile");
        if (this._unpatchAccountArea) this._unpatchAccountArea();
        if (this._unpatchUserProfile) this._unpatchUserProfile();
        if (this._unpatchTags) this._unpatchTags();
        this.forceUpdateComponents();
    }

    forceUpdateComponents() {
        const voiceUsers = Array.from(document.querySelectorAll("[class^=voiceUser_]"), m => BdApi.ReactUtils.getOwnerInstance(m, { filter: m=> !m?.renderInner }).forceUpdate());
        const accountArea = document.querySelectorAll("[class^=avatarWrapper_]");
        const typingUsers = document.querySelectorAll("[class^=channelBottomBarArea_]");
        for (const node of voiceUsers) {
            ReactUtils.getOwnerInstance(node)?.forceUpdate();
        }
        for (const node of accountArea) {
            ReactUtils.getOwnerInstance(node, { filter: m => m.renderNameTag })?.forceUpdate();
        }
        for (const node of typingUsers) {
            ReactUtils.getOwnerInstance(node, { filter: m => m.typingUsers })?.forceUpdate();
        }
    }

    patchVoiceUsers() {
        Patcher.after("MoreRoleColors-voiceUsers", VoiceUser, "ZP", (_, [props], res) => {
            VoiceUser.ZP.displayName = "MoreRoleColorsVoiceUser";
            if (!res?.props) return;
            
            const member = GuildMemberStore.getMember(SelectedGuildStore.getGuildId(), props?.user?.id);
            if (!member?.colorString) return;

            const usernameElement = Utils.findInTree(res, x => x?.className?.includes('usernameFont'), {
                walkable: ['props', 'children']
            });
            if (!usernameElement) return;
            
            const isSpeaking = props?.speaking;
            const color = member.colorString;
            
            usernameElement.style = { 
                color: this.settings.speakingIndicator ? (isSpeaking ? color : `${color}90`) : color,
                backfaceVisibility: "hidden" 
            };
        });
    }

    patchTypingUsers() {        
        const cache = new WeakMap();

        Patcher.after("MoreRoleColors-typingUsers", TypingModule, "Z", (that, args, res) => {
            let newType = cache.get(res.type);

            if (!newType) {
                const target = res.type;

                newType = function(props) {
                    const res = target.apply(this, arguments);

                    const typingUsers = Object.keys(props.typingUsers)
                        .filter(e => e != UserStore.getCurrentUser().id)
                        .filter(e => !RelationshipStore.isBlockedOrIgnored(e))
                        .map(e => UserStore.getUser(e))
                        .filter(e => e != null);

                    const typing = Utils.findInTree(res, (node) => node?.className?.startsWith("typingDots_"), {
                        walkable: ["props", "children"]
                    });

                    if (typing && typeof typing?.children?.[1]?.props?.children !== "string") {
                        const validUserIds = typingUsers.map(u => u.id);

                        if (validUserIds.length <= 3) {
                            let count = 0;
                            typing.children[1].props.children = typing.children[1].props.children.map((m, i) => typeof m === "string" ? m : React.createElement("strong", {
                                key: i,
                                children: m.props.children,
                                style: { color: GuildMemberStore.getMember(props.guildId, validUserIds[count++])?.colorString }
                            }));
                        }
                    }

                    return res;
                }

                cache.set(res.type, newType);
                cache.set(newType, newType);
            }

            res.type = newType;
        });
    }

    patchMentions() {
        Patcher.after("MoreRoleColors-mentions", MentionModule, "Z", (_, [props], res) => {
            if (!props?.userId || !res?.props?.children?.props) return res;

            const guildId = (() => {
                if (!BdApi.Plugins.isEnabled("PingNotification")) return SelectedGuildStore.getGuildId();
                
                const notificationParent = document.querySelector('.ping-notification-content');
                if (notificationParent) {
                    const channel = ChannelStore.getChannel(props.channelId);
                    return channel?.guild_id;
                }
                return SelectedGuildStore.getGuildId();
            })();

            if (!guildId) return res;
            
            const member = GuildMemberStore.getMember(guildId, props.userId);
            
            const original = res.props.children.props.children;
            res.props.children.props.children = (props, context) => {
                res.props.children.props.children = original;
                
                const ret = original(props, context);
                if (ret?.props) {
                    ret.props.color = member?.colorString ? parseInt(member.colorString.slice(1), 16) : undefined;
                }
                
                return ret;
            };

            return res;
        });
    }

    patchAccountArea() {
        const cache = new WeakMap();
        const MAX_RETRIES = 10;
        
        const patchAccountAreaWithRetry = (attempts = 0) => {
            if (attempts >= MAX_RETRIES) {
                console.error("[MoreRoleColors] Failed to find account area after", MAX_RETRIES, "attempts");
                return;
            }

            const accountArea = document.querySelector("[class^=avatarWrapper_]");
            if (!accountArea) {
                setTimeout(() => patchAccountAreaWithRetry(attempts + 1), 1000);
                return;
            }

            const owner = ReactUtils.getOwnerInstance(accountArea, { filter: m => m.renderNameTag });
            if (!owner) {
                setTimeout(() => patchAccountAreaWithRetry(attempts + 1), 1000);
                return;
            }

            const renderNameTag = owner.renderNameTag;
            owner.renderNameTag = function() {
                const res = renderNameTag.call(this);
                const type = res.props.children[0].props.children.type;

                if (type.__MoreRoleColors) return res;

                let component = cache.get(type);
                if (!component) {          
                    component = new Proxy(type, {
                        apply: (target, thisArg, argArray) => {
                            const res = Reflect.apply(target, thisArg, argArray);
                            res.props.style = { 
                                color: GuildMemberStore.getMember(
                                    SelectedGuildStore.getGuildId(), 
                                    this.props?.currentUser?.id || UserStore.getCurrentUser()?.id
                                )?.colorString 
                            };
                            return res;
                        },
                        get(target, key, receiver) {
                            if (key === "__MoreRoleColors") return true;
                            return Reflect.get(target, key, receiver);
                        }
                    });            
                    cache.set(type, component);
                }

                res.props.children[0].props.children.type = component;
                return res;
            }.bind(owner);

            this._unpatchAccountArea = () => {
                owner.renderNameTag = renderNameTag;
            };
            owner.forceUpdate();
        };

        patchAccountAreaWithRetry();
    }

    patchTextEditor() {
        const [ module, key ] = BdApi.Webpack.getWithKey(BdApi.Webpack.Filters.byStrings(".hidePersonalInformation", "#", "<@", ".discriminator"));
        BdApi.Patcher.after("MoreRoleColors-textEditor", module, key, (that, [{ id, guildId }], res) => {
            return BdApi.React.cloneElement(res, {
                children(props) {
                    const ret = res.props.children(props);
                    const member = GuildMemberStore.getMember(guildId, id);

                    ret.props.children.props.color = member?.colorString && parseInt(member.colorString.slice(1), 16);

                    return ret;
                }
            });
        }); 
    }

    patchAuditLog() {
        const filter = BdApi.Webpack.Filters.byStrings("renderChangeSummary(){let{expanded", "renderEntryAvatar(){let{props:{log:");

        BdApi.Webpack.waitForModule((e, m) => filter(BdApi.Webpack.modules[m.id])).then(AuditLogItem => {
            const GuildMemberStore = BdApi.Webpack.getStore("GuildMemberStore");
            const cache = new WeakMap();

            BdApi.Patcher.after("MoreRoleColors-auditLog", AuditLogItem.Z.prototype, "render", (instance, args, res) => {
                if (res.type?.MoreRoleColors) return;

                let newType = cache.get(res.type);
                if (!newType) {
                    newType = class extends res.type {
                        static MoreRoleColors = true;
                        renderTitle() {
                            const res = super.renderTitle();
                            if (!res?.props?.children?.[0]) return res;

                            const user = res.props.children[0];
                            if (!user?.type || user.type?.MoreRoleColors) return res;

                            let newType = cache.get(user.type);
                            if (!newType) {
                                newType = class extends user.type {
                                    static MoreRoleColors = true;
                                    render() {
                                        const res = super.render();
                                        if (!this.props?.user?.id) return res;

                                        const memberColor = GuildMemberStore.getMember(instance.props.guild.id, this.props.user.id)?.colorString;
                                        if (memberColor && res.props?.children?.[0]?.props) {
                                            res.props.children[0].props.style = {color: memberColor};
                                        }
                                        return res;
                                    }
                                }
                                cache.set(user.type, newType);
                            }

                            user.type = newType;
                            return res;
                        }
                    }
                    cache.set(res.type, newType);
                }

                res.type = newType;
            });
        });
    }

    patchRoleHeaders() {
        const map = new WeakMap();

        BdApi.Patcher.after("MoreRoleColors-roleHeaders", BdApi.Webpack.getBySource("getEnableHardwareAcceleration", "renderUserPopout", "openGuildSubscriptionModal"), "Z", (that, [{ currentUser }], res) => {
            let newType = map.get(res.type);
            if (!newType) {
                newType = new Proxy(res.type, {
                    apply() {                
                        const res = Reflect.apply(...arguments);

                        const child = res.props.children.props.children.props.children;

                        let newType = map.get(child.type);
                        if (!newType) {
                            newType = class extends child.type {
                                constructor() {
                                    super(...arguments);

                                    this.renderSection = new Proxy(this.renderSection, {
                                        apply(target, thisArg, argArray) {
                                            const res = Reflect.apply(...arguments);

                                            let ret = res;
                                            if (res.props.tutorialId === "whos-online") {
                                                ret = res.props.children;
                                            }

                                            let newType = map.get(ret.type);
                                            if (!newType) {
                                                newType = BdApi.React.memo(new Proxy(ret.type.type, {
                                                    apply(target, thisARg, [props]) {
                                                        const res = Reflect.apply(...arguments);

                                                        if (props.type === "GROUP") {
                                                            const role = GuildStore.getRole(props.guildId, props.id);
                                                            res.props.children[1].props.style = { color: role?.colorString };
                                                        }

                                                        return res;
                                                    }
                                                }));

                                                map.set(ret.type, newType);
                                                map.set(newType, newType);
                                            }

                                            ret.type = newType;

                                            return res;
                                        }
                                    });
                                }
                            }

                            map.set(child.type, newType);
                            map.set(newType, newType);
                        }
                        child.type = newType;

                        return res;
                    }
                });

                map.set(res.type, newType);
                map.set(newType, newType);
            }

            res.type = newType;
        });
    }

    patchMessages() {
        const MessageContentMRC = BdApi.Webpack.getModule((m) => 
            m?.type?.toString?.()?.includes("messageContent") && 
            m?.type?.toString?.()?.includes("isUnsupported")
        );
        BdApi.Patcher.after("MoreRoleColors-messages", MessageContentMRC, "type", (_, [props], res) => {
            if (!props?.message?.author?.id) return res;
            
            const guildId = SelectedGuildStore.getGuildId();
            if (!guildId) return res;

            const member = GuildMemberStore.getMember(guildId, props.message.author.id);
            if (member?.colorString) {
                if (!res.props.style) res.props.style = { color: member.colorString };
                else res.props.style.color = member.colorString;
            }

            return res;
        });
    }

    patchUserProfile() {
        const UserProfileModule = BdApi.Webpack.getByStrings(".pronouns", "UserProfilePopoutBody", { defaultExport: false });
        const cache = new WeakMap();

        const GuildMemberStore = BdApi.Webpack.getStore("GuildMemberStore");

        BdApi.Patcher.after("MoreRoleColors-userProfile", UserProfileModule, "Z", (_, [props], res) => {
            const profileComponent = res.props.children[0];

            let newType = cache.get(profileComponent.type);
            if (!newType) {            
                newType = new Proxy(profileComponent.type, {
                    apply: (target, thisArg, args) => {
                        const res = Reflect.apply(target, thisArg, args);

                        const displayProfile = args[0].tags.props.displayProfile;

                        const member = GuildMemberStore.getMember(displayProfile?.guildId, displayProfile?.userId);

                        if (!res?.props) return res;

                        const userObject = BdApi.Utils.findInTree(res,x=>x?.className?.includes('nickname'), {walkable: ['props','children']})
                        if (!userObject) return res;
                        if (!userObject?.style) {
                            Object.defineProperty(userObject, "style", {
                                value: { color: member?.colorString || "#FFFFFF" },
                                writable: true,
                                enumerable: true,
                                configurable: true
                            });
                        }

                        // res.props.children[0].props.children[0].props.children.props.style = {color: member?.colorString}
                        // refrain from tree traversing, board
                        return res;
                    }
                });

                cache.set(profileComponent.type, newType);
                cache.set(newType, newType);
            }

            profileComponent.type = newType;
            return res;
        });
    }

    patchTags() {
        const TagModule = BdApi.Webpack.getByStrings(".botTagInvert", { defaultExport: false });
        TagModule.Z.displayName = "MoreRoleColorsTag";

        class TagWrapper extends BdApi.React.Component {
            constructor(props) {
                super(props);
            }

            componentDidMount() {
                const node = BdApi.ReactDOM.findDOMNode(this);
                const username = node.parentElement.querySelector("[class*=username_]");
                
                if (username) {
                    const style = username.querySelector("[style]") || username;
                    node.style.backgroundColor = style?.style?.color;
                }
            }

            render() {        
                return this.props.tag;
            }
        }

        Patcher.after("MoreRoleColors-Tags", TagModule, "Z", (_, args, res) => {
            return BdApi.React.createElement(TagWrapper, {tag: res});
        });

        this._unpatchTags = () => {
            Patcher.unpatchAll("MoreRoleColors-Tags");
        };
    }

    patchServerProfileDisplayName() {
        const ServerProfileGuildSelector = BdApi.Webpack.getBySource(".getFlattenedGuildIds", ".getGuilds", ".guildSelectOptionIcon", "Sizes.SMOL", { defaultExport: false });
        let currentProfileGuildId = null;

        Patcher.after("MoreRoleColors-ServerProfileGuildSelector", ServerProfileGuildSelector, "Z", (_, [props], res) => {
            currentProfileGuildId = res.props.children.props.guildId;
            return res;
        });

        BdApi.Webpack.waitForModule((e, m) => 
            BdApi.Webpack.modules[m.id]?.toString?.()?.includes(".isVerifiedBot", "forceUsername:!0")
        ).then(ServerProfileDisplayNameModule => {
            Patcher.after("MoreRoleColors-ServerProfileDisplayName", ServerProfileDisplayNameModule, "Z", (_, [props], res) => {            
                const target = res.props.children[0].props.children[0].props;
                const currentUser = UserStore.getCurrentUser();
                const member = GuildMemberStore.getMember(currentProfileGuildId, currentUser.id);
                
                if (member?.colorString) {
                    target.style = { color: member.colorString };
                }
                
                return res;
            });

        });
    }

}
