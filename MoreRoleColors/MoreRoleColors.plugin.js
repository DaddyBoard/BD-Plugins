/**
* @name MoreRoleColors
* @author DaddyBoard
* @version 2.0.2
* @description Adds role colors to usernames across Discord - including messages, voice channels, typing indicators, mentions, account area, text editor, audit log, role headers, user profiles, and tags
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils } = BdApi;
const { getStore, getByStrings, getBySource, getWithKey, Filters, getModule } = Webpack;
const VoiceUser = getBySource("iconPriortySpeakerSpeaking", "avatarContainer", "getAvatarURL");
const GuildMemberStore = getStore("GuildMemberStore");
const SelectedGuildStore = getStore("SelectedGuildStore");
const RelationshipStore = getStore("RelationshipStore");
const TypingStore = getStore("TypingStore");
const TypingModule = getBySource('activityInviteEducationActivity')
const [MentionModule, key] = getWithKey(Filters.byStrings('USER_MENTION',"getNickname", "inlinePreview"));
const ChannelStore = getStore("ChannelStore");
const UserStore = getStore("UserStore");
const GuildStore = getStore("GuildStore");
const useStateFromStores = getModule(Webpack.Filters.byStrings("getStateFromStores"), { searchExports: true });
const GuildRoleStore = getStore("GuildRoleStore");

//types for changelog: added, fixed, improved, progress.
const config = {
    banner: "",
    changelog: [
        {
            "title": "2.0.2 - Fixed",
            "type": "fixed",
            "items": [
                "Small discord breakage."
            ]
        },
        {
            "title": "2.0.1 - Fixed",
            "type": "fixed",
            "items": [
                "Added graceful handling for rare `TagWrapper` causing a react crash."
            ]
        }
    ],
    settings: [
        {
            "type": "category",
            "id": "accountAreaColoring",
            "name": "Account Area",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "accountArea",
                    "name": "Enable Account Area Coloring",
                    "note": "Colors your username in the account area",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.accountArea ?? true
                },
                {
                    "type": "switch",
                    "id": "accountAreaGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to account area colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.accountAreaGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "auditLogColoring",
            "name": "Audit Log",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "auditLog",
                    "name": "Enable Audit Log Coloring",
                    "note": "Colors usernames in the audit log",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.auditLog ?? true
                },
                {
                    "type": "switch",
                    "id": "auditLogGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to audit log colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.auditLogGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "mentionsColoring",
            "name": "Mentions",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "mentions",
                    "name": "Enable Mentions Coloring",
                    "note": "Colors usernames in mentions",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.mentions ?? true
                },
                {
                    "type": "switch",
                    "id": "mentionsGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to mention colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.mentionsGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "messagesColoring",
            "name": "Messages",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "messages",
                    "name": "Enable Messages Coloring",
                    "note": "Colors users text by their role color",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.messages ?? true
                },
                {
                    "type": "switch",
                    "id": "messagesGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to message text colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.messagesGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "roleHeadersColoring",
            "name": "Role Headers",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "roleHeaders",
                    "name": "Enable Role Headers Coloring",
                    "note": "Colors usernames in role headers",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.roleHeaders ?? true
                },
                {
                    "type": "switch",
                    "id": "roleHeadersGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to role header colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.roleHeadersGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "serverProfileDisplayNameColoring",
            "name": "Server Profile Display Name",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "serverProfileDisplayName",
                    "name": "Enable Server Profile Display Name Coloring",
                    "note": "Colors display names in server profiles",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.serverProfileDisplayName ?? true
                },
                {
                    "type": "switch",
                    "id": "serverProfileDisplayNameGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to server profile display name colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.serverProfileDisplayNameGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "tagsColoring",
            "name": "Tags",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "Tags",
                    "name": "Enable Tags Coloring",
                    "note": "Colors tags to match role colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.Tags ?? true
                },
                {
                    "type": "switch",
                    "id": "TagsGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to tag colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.TagsGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "textEditorColoring",
            "name": "Text Editor",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "textEditor",
                    "name": "Enable Text Editor Coloring",
                    "note": "Colors mentions in the text editor",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.textEditor ?? true
                },
                {
                    "type": "switch",
                    "id": "textEditorGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to text editor colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.textEditorGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "typingUsersColoring",
            "name": "Typing Indicator",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "typingUsers",
                    "name": "Enable Typing Indicator Coloring",
                    "note": "Colors usernames in typing indicators",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.typingUsers ?? true
                },
                {
                    "type": "switch",
                    "id": "typingUsersGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to typing indicator colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.typingUsersGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "userProfileColoring",
            "name": "User Profile",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "userProfile",
                    "name": "Enable User Profile Coloring",
                    "note": "Colors usernames in user profiles",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.userProfile ?? true
                },
                {
                    "type": "switch",
                    "id": "userProfileGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to user profile colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.userProfileGradient ?? true
                }
            ]
        },
        {
            "type": "category",
            "id": "voiceUsersColoring",
            "name": "Voice Users",
            "collapsible": true,
            "shown": false,
            "settings": [
                {
                    "type": "switch",
                    "id": "voiceUsers",
                    "name": "Enable Voice Users Coloring",
                    "note": "Colors usernames in voice channels",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.voiceUsers ?? true
                },
                {
                    "type": "switch",
                    "id": "speakingIndicator",
                    "name": "Enable Speaking Indicator",
                    "note": "Changes opacity of voice usernames when speaking",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.speakingIndicator ?? false
                },
                {
                    "type": "switch",
                    "id": "voiceUsersGradient",
                    "name": "Use Gradient Coloring",
                    "note": "Apply gradient effect to voice user colors",
                    "value": BdApi.Data.load('MoreRoleColors', 'settings')?.voiceUsersGradient ?? true
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
            voiceUsersGradient: true,
            speakingIndicator: false,
            typingUsers: true,
            typingUsersGradient: true,
            mentions: true,
            mentionsGradient: true,
            accountArea: true,
            accountAreaGradient: true,
            textEditor: true,
            textEditorGradient: true,
            auditLog: true,
            auditLogGradient: true,
            roleHeaders: true,
            roleHeadersGradient: true,
            messages: false,
            messagesGradient: false,
            userProfile: true,
            userProfileGradient: true,
            serverProfileDisplayName: true,
            serverProfileDisplayNameGradient: true,
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

    applyRoleStyle(element, colorObject, type) {
        if (!type) {
            element.style = {color: colorObject.colorString};
            return;
        }
        if (!GuildStore.getGuild(SelectedGuildStore.getGuildId())?.features?.has?.("ENHANCED_ROLE_COLORS")) {
            element.style = {color: colorObject.colorString};
            return;
        }
        
        if (colorObject.colorStrings && colorObject.colorStrings.primaryColor && colorObject.colorStrings.secondaryColor) {
            let gradient;
            if (colorObject.colorStrings.tertiaryColor) {
                gradient = `linear-gradient(to right, ${colorObject.colorStrings.primaryColor} 0%, ${colorObject.colorStrings.secondaryColor} 50%, ${colorObject.colorStrings.tertiaryColor} 100%)`;
            } else {
                gradient = `linear-gradient(to right, ${colorObject.colorStrings.primaryColor} 0%, ${colorObject.colorStrings.secondaryColor} 100%)`;
            }

            element.style = {
                color: "unset",
                background: `${gradient} text`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent"
            };
        } else {
            element.style = {
                color: colorObject.colorString,
                background: "none",
                backgroundClip: "unset",
                WebkitBackgroundClip: "unset",
                WebkitTextFillColor: "unset"
            };
        }
    }

    getColorObjectForMember(guildId, member) {
        if (member.colorStrings) {
            return member;
        }

        const roles = Object.values(GuildRoleStore.getRolesSnapshot(guildId));
        const matchingRole = roles.find(role => role.colorString === member.colorString);

        return matchingRole || member;
    }
    
    patchVoiceUsers() {
        Patcher.after("MoreRoleColors-voiceUsers", VoiceUser.ZP, "render", (_, [props], res) => {
            VoiceUser.ZP.displayName = "MoreRoleColorsVoiceUser";
            if (!res?.props) return;
            
            const guildId = SelectedGuildStore.getGuildId();
            const member = GuildMemberStore.getMember(guildId, props?.user?.id);
            if (!member?.colorString) return;

            const usernameElement = Utils.findInTree(res, x => x?.className?.includes('usernameFont'), {
                walkable: ['props', 'children']
            });
            if (!usernameElement) return;
            
            const colorObject = this.getColorObjectForMember(guildId, member);
            this.applyRoleStyle(usernameElement, colorObject, this.settings.voiceUsersGradient);
            
            const isSpeaking = props?.speaking;
            if (this.settings.speakingIndicator && !isSpeaking) {
                usernameElement.style.opacity = "0.56";
            }
            
            usernameElement.style.backfaceVisibility = "hidden";
        });
    }

    patchTypingUsers() {        
        const cache = new WeakMap();
        const pluginInstance = this;

        Patcher.after("MoreRoleColors-typingUsers", TypingModule, "ZP", (that, args, res) => {
            let newType = cache.get(res.type);

            if (!newType) {
                const target = res.type;

                newType = function(props) {
                    const channelId = props.channel?.id;
                    const typingUsersStore = useStateFromStores([TypingStore], () => 
                        TypingStore.getTypingUsers(channelId)
                    );

                    const res = target.apply(this, arguments);

                    const typingUsers = Object.keys(typingUsersStore)
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
                            typing.children[1].props.children = typing.children[1].props.children.map((m, i) => {
                                if (typeof m === "string") return m;
                                
                                const member = GuildMemberStore.getMember(props.guildId, validUserIds[count++]);
                                let elementStyle = {};
                                
                                if (member?.colorString) {
                                    const colorObject = pluginInstance.getColorObjectForMember(props.guildId, member);
                                    const tempElement = { style: {} };
                                    pluginInstance.applyRoleStyle(tempElement, colorObject, pluginInstance.settings.typingUsersGradient);
                                    elementStyle = tempElement.style;
                                }
                                
                                return React.createElement("strong", {
                                    key: i,
                                    children: m.props.children,
                                    style: elementStyle
                                });
                            });
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
        Patcher.after("MoreRoleColors-mentions", MentionModule, key, (_, [props], res) => {
            if (!props?.userId || !res?.props?.children?.props) return res;

            const guildId = (() => {
                if (!BdApi.Plugins.isEnabled("PingNotification")) return SelectedGuildStore.getGuildId();
                
                let element = document.activeElement;
                while (element && !element.classList.contains('ping-notification')) {
                    element = element.parentElement;
                }
                
                if (element) {
                    const channelId = element.getAttribute('data-channel-id');
                    if (channelId) {
                        const channel = ChannelStore.getChannel(channelId);
                        if (channel?.guild_id) return channel.guild_id;
                    }
                }
                
                if (props.channelId) {
                    const channel = ChannelStore.getChannel(props.channelId);
                    if (channel?.guild_id) return channel.guild_id;
                    if (!channel?.guild_id) return;
                }
                
                return SelectedGuildStore.getGuildId();
            })();

            if (!guildId) return res;
            
            const member = GuildMemberStore.getMember(guildId, props.userId);
            if (!member?.colorString) return res;

            const colorObject = this.getColorObjectForMember(guildId, member);
            
            const original = res.props.children.props.children;
            res.props.children.props.children = (props, context) => {
                const ret = original(props, context);
                if (ret?.props) {
                    ret.props.color = parseInt(member.colorString.slice(1), 16);
                    
                    if (this.settings.mentionsGradient && 
                        GuildStore.getGuild(guildId)?.features?.has?.("ENHANCED_ROLE_COLORS") &&
                        colorObject.colorStrings && 
                        colorObject.colorStrings.primaryColor && colorObject.colorStrings.secondaryColor) {
                        ret.props.roleColors = {
                            primaryColor: colorObject.colorStrings.primaryColor,
                            secondaryColor: colorObject.colorStrings.secondaryColor,
                            tertiaryColor: colorObject.colorStrings.tertiaryColor || null
                        };
                    }
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
            const pluginInstance = this;
            owner.renderNameTag = function() {
                const res = renderNameTag.call(this);
                const type = res.props.children[0].props.children.type;

                if (type.__MoreRoleColors) return res;

                let component = cache.get(type);
                if (!component) {          
                    component = new Proxy(type, {
                        apply: (target, thisArg, argArray) => {
                            const res = Reflect.apply(target, thisArg, argArray);
                            const guildId = SelectedGuildStore.getGuildId();
                            const member = GuildMemberStore.getMember(
                                guildId, 
                                this.props?.currentUser?.id || UserStore.getCurrentUser()?.id
                            );
                            
                            if (member?.colorString) {
                                const colorObject = pluginInstance.getColorObjectForMember(guildId, member);
                                const tempElement = { style: {} };
                                pluginInstance.applyRoleStyle(tempElement, colorObject, pluginInstance.settings.accountAreaGradient);
                                res.props.style = tempElement.style;
                            }
                            
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
        const pluginInstance = this;
        BdApi.Patcher.after("MoreRoleColors-textEditor", module, key, (that, [{ id, guildId }], res) => {
            return BdApi.React.cloneElement(res, {
                children(props) {
                    const ret = res.props.children(props);
                    const member = GuildMemberStore.getMember(guildId, id);

                    if (!member?.colorString) return ret;

                    const colorObject = pluginInstance.getColorObjectForMember(guildId, member);

                    ret.props.children.props.color = parseInt(member.colorString.slice(1), 16);

                    if (pluginInstance.settings.textEditorGradient && 
                        GuildStore.getGuild(guildId)?.features?.has?.("ENHANCED_ROLE_COLORS") &&
                        colorObject.colorStrings && 
                        colorObject.colorStrings.primaryColor && colorObject.colorStrings.secondaryColor) {
                        ret.props.children.props.roleColors = {
                            primaryColor: colorObject.colorStrings.primaryColor,
                            secondaryColor: colorObject.colorStrings.secondaryColor,
                            tertiaryColor: colorObject.colorStrings.tertiaryColor || null
                        };
                    }

                    return ret;
                }
            });
        }); 
    }

    patchAuditLog() {
        let AuditLogUser;
        const pluginInstance = this;

        function patchAuditLogUser() {
            BdApi.Patcher.after("MoreRoleColors-auditLog", AuditLogUser.prototype, "render", (that, args, res) => {
                const member = GuildMemberStore.getMember(SelectedGuildStore.getGuildId(), that.props.user.id);

                if (!member?.colorString) return;
                
                if (res.props?.children?.[0]?.props) {
                    const colorObject = pluginInstance.getColorObjectForMember(SelectedGuildStore.getGuildId(), member);
                    const tempElement = { style: {} };
                    pluginInstance.applyRoleStyle(tempElement, colorObject, pluginInstance.settings.auditLogGradient);
                    res.props.children[0].props.style = tempElement.style;
                }
            });
        }

        function attemptPatchAuditLogUser() {
            if (AuditLogUser) {
                patchAuditLogUser();
                return;
            }
            
            const undo = BdApi.Patcher.after("MoreRoleColors-auditLog-temp", BdApi.Webpack.getModule(m => m.displayName === "ForwardRef(FluxContainer(GuildSettingsAuditLogEntry))"), "render", (that, [props], res) => { 
                undo();
                
                const a = res?.type?.prototype?.render?.call({
                    props: res.props,
                    memoizedGetStateFromStores: () => ({
                        theme: "dark"
                    })
                });

                const { render } = a.type;
                a.type = {
                    ...a.type,
                    render() {
                        const ret = render.apply(this, arguments);

                        const undo = BdApi.Patcher.after("MoreRoleColors-auditLog-temp2", ret.props, "children", (that, args, res) => {
                            undo();

                            const node = BdApi.Utils.findInTree(res, (m) => m?.type?.prototype?.render && m.props.user?.id, {
                                walkable: [ "children", "props" ]
                            });

                            if (node?.type) {
                                AuditLogUser = node.type;
                                patchAuditLogUser();
                            }
                        });
                        
                        return ret;
                    }
                }

                return a;
            });
        }

        BdApi.Webpack.waitForModule(m => m.displayName === "ForwardRef(FluxContainer(GuildSettingsAuditLogEntry))").then(() => {
            attemptPatchAuditLogUser();
        });
    }

    patchRoleHeaders() {
        const roleHeaderModule = BdApi.Webpack.getBySource(/,.{1,3}.container,.{1,3}.header\),/)
        BdApi.Patcher.after("MoreRoleColors-roleHeaders", roleHeaderModule, "Z", (_, [props], res) => {
            if (res.props.className.includes("membersGroup")) {
                const guildId = SelectedGuildStore.getGuildId();
                const roles = Object.values(GuildRoleStore.getRolesSnapshot(guildId));

                let roleName = res.props.children[1].props.children[0];
                let role = roles.find(r => r.name === roleName);
                if (role) {
                    this.applyRoleStyle(res.props.children[1].props, role, this.settings.roleHeadersGradient);
                } else {
                    roleName = res.props.children[1].props.children[1];
                    role = roles.find(r => r.name === roleName);
                    if (role) {
                        this.applyRoleStyle(res.props.children[1].props, role, this.settings.roleHeadersGradient);
                    }
                }
            }
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
                const colorObject = this.getColorObjectForMember(guildId, member);
                if (!res.props.style) res.props.style = {};
                const tempElement = { style: {} };
                this.applyRoleStyle(tempElement, colorObject, this.settings.messagesGradient);
                Object.assign(res.props.style, tempElement.style);
            }

            return res;
        });
    }

    patchUserProfile() {
        const UserProfileModule = BdApi.Webpack.getByStrings(".pronouns", "UserProfilePopoutBody", "relationshipType", { defaultExport: false });
        const cache = new WeakMap();
        const pluginInstance = this;

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
                        
                        if (member?.colorString) {
                            const colorObject = pluginInstance.getColorObjectForMember(displayProfile?.guildId, member);
                            const tempElement = { style: {} };
                            pluginInstance.applyRoleStyle(tempElement, colorObject, pluginInstance.settings.userProfileGradient);
                            
                            if (!userObject?.style) {
                                Object.defineProperty(userObject, "style", {
                                    value: tempElement.style,
                                    writable: true,
                                    enumerable: true,
                                    configurable: true
                                });
                            } else {
                                Object.assign(userObject.style, tempElement.style);
                            }
                        }

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

        function hexToRgb(hex) {
            hex = hex.replace(/^#/, "");
            if (hex.length === 3) {
                hex = hex.split("").map(x => x + x).join("");
            }
            const num = parseInt(hex, 16);
            return `rgb(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255})`;
        }

        class TagWrapper extends BdApi.React.Component {
            constructor(props) {
                super(props);
                this.tagRef = BdApi.React.createRef();
            }

            componentDidMount() {
                const node = this.tagRef.current;
                if (!node) return;

                if (!node.parentElement) return;
                
                const username = node.parentElement.querySelector("[class*=username_]");
                if (!username) return;

                const style = username.querySelector("[style]") || username;
                let backgroundColor = style?.style?.color;

                if (!backgroundColor) {
                    const computed = window.getComputedStyle(style);
                    let gradientColor = computed.getPropertyValue("--custom-gradient-color-1")?.trim();
                    if (gradientColor) {
                        if (gradientColor.startsWith("#")) {
                            backgroundColor = hexToRgb(gradientColor);
                        } else if (gradientColor.startsWith("rgb")) {
                            backgroundColor = gradientColor;
                        }
                    }
                }

                if (!backgroundColor) return;

                node.style.backgroundColor = backgroundColor;

                const tagText = node.querySelector("span");
                if (tagText) {
                    tagText.style.color = this.getContrastingColor(backgroundColor);
                }
            }

            getContrastingColor(color) {
                let r, g, b;
                if (color.startsWith('#')) {
                    const hex = color.substring(1);
                    r = parseInt(hex.substring(0, 2), 16);
                    g = parseInt(hex.substring(2, 4), 16);
                    b = parseInt(hex.substring(4, 6), 16);
                } else if (color.startsWith('rgb')) {
                    const rgbValues = color.match(/\d+/g);
                    if (rgbValues && rgbValues.length >= 3) {
                        r = parseInt(rgbValues[0]);
                        g = parseInt(rgbValues[1]);
                        b = parseInt(rgbValues[2]);
                    } else {
                        return "#000000";
                    }
                } else {
                    return "#000000";
                }

                const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
                return luminance > 0.5 ? "#000000" : "#FFFFFF";
            }

            render() {
                if (!this.props.tag) return null;
                return BdApi.React.cloneElement(this.props.tag, { ref: this.tagRef });
            }
        }

        Patcher.after("MoreRoleColors-Tags", TagModule, "Z", (_, args, res) => {
            return BdApi.React.createElement(TagWrapper, { tag: res });
        });

        this._unpatchTags = () => {
            Patcher.unpatchAll("MoreRoleColors-Tags");
        };
    }

    patchServerProfileDisplayName() {
        const ServerProfileGuildSelector = BdApi.Webpack.getBySource(".getFlattenedGuildIds", ".getGuilds", ".guildSelectOptionIcon", "Sizes.SMOL", { defaultExport: false });
        let currentProfileGuildId = null;
        const pluginInstance = this;

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
                    const colorObject = pluginInstance.getColorObjectForMember(currentProfileGuildId, member);
                    const tempElement = { style: {} };
                    pluginInstance.applyRoleStyle(tempElement, colorObject, pluginInstance.settings.serverProfileDisplayNameGradient);
                    target.style = tempElement.style;
                }
                
                return res;
            });

        });
    }

}