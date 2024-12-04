/**
* @name MoreRoleColors
* @author DaddyBoard
* @version 1.0.0
* @description Adds role colors to usernames in mentions, typing indicators, account area, and voice channels.
* @website https://github.com/DaddyBoard/BD-Plugins/tree/main/MoreRoleColors
* @source https://raw.githubusercontent.com/DaddyBoard/BD-Plugins/refs/heads/main/MoreRoleColors/MoreRoleColors.plugin.js
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils } = BdApi;
const getStore = Webpack.getStore;
const VoiceUser = Webpack.getModule(m => m?.prototype?.renderName && m?.prototype?.renderAvatar);
const GuildMemberStore = getStore("GuildMemberStore");
const SelectedGuildStore = getStore("SelectedGuildStore");
const RelationshipStore = getStore("RelationshipStore");
const TypingModule = Webpack.getByStrings(".colors.INTERACTIVE_NORMAL).hex(),activeTextColor", { defaultExport: false });
const MentionModule = Webpack.getByStrings(',"Unexpected missing user"),(0,', { defaultExport: false });
const ChannelStore = getStore("ChannelStore");
const AccountArea = Webpack.getByStrings("new Date().getTime();return null!=", { defaultExport: false })
const UserStore = BdApi.Webpack.getStore("UserStore");

module.exports = class MoreRoleColors {
    start() {
        this.patchVoiceUsers();
        this.patchTypingUsers();
        this.patchMentions();
        this.patchAccountArea();
        this.forceUpdateComponents();
    }

    stop() {
        Patcher.unpatchAll("MoreRoleColors");
        this.forceUpdateComponents();
    }

    forceUpdateComponents() {
        const voiceUsers = Array.from(document.querySelectorAll("[class^=voiceUser_]"), m => BdApi.ReactUtils.getOwnerInstance(m, { filter: m=> !m?.renderInner }).forceUpdate());
        for (const node of voiceUsers) {
            ReactUtils.getOwnerInstance(node)?.forceUpdate();
        }
    }

    patchVoiceUsers() {
        Patcher.after("MoreRoleColors", VoiceUser.prototype, "renderName", (thisObject, _, returnValue) => {
            if (!returnValue?.props) return;
            
            const member = GuildMemberStore.getMember(SelectedGuildStore.getGuildId(), thisObject?.props?.user?.id);
            if (!member?.colorString) return;

            const target = returnValue?.props?.children?.props?.children;
            if (!target?.props) return;
            
            target.props.style = { color: member.colorString, backfaceVisibility: "hidden" };
        });
    }

    patchTypingUsers() {
        Patcher.after("MoreRoleColors", TypingModule, "Z", (that, args, res) => {
            const original = res.type;
            res.type = class extends res.type {
                constructor() {
                    super(...arguments);
                    res.type = original;
                }
                
                render() {
                    const res = super.render();

                    const typing = Utils.findInTree(res, (node) => node?.className?.startsWith("typingDots_"), {
                        walkable: ["props", "children"]
                    });

                    if (typing && typeof typing?.children?.[1]?.props?.children !== "string") {
                        const validUserIds = Object.keys(this.props.typingUsers).filter(m => !RelationshipStore.isBlockedOrIgnored(m));

                        if (validUserIds.length <= 3) {
                            let count = 0;
                            typing.children[1].props.children = typing.children[1].props.children.map((m, i) => typeof m === "string" ? m : React.createElement("strong", {
                                key: i,
                                children: m.props.children,
                                style: { color: GuildMemberStore.getMember(this.props.guildId, validUserIds[count++])?.colorString }
                            }));
                        }
                    }
                    
                    return res;
                }
            };
        });
    }

    patchMentions() {
        Patcher.after("MoreRoleColors", MentionModule, "Z", (_, [props], res) => {
            const guildId = (() => {
                if (!BdApi.Plugins.isEnabled("PingNotification")) return SelectedGuildStore.getGuildId();
                
                const notificationParent = document.querySelector('.ping-notification-content');
                if (notificationParent) {
                    const channel = ChannelStore.getChannel(props.channelId);
                    return channel?.guild_id;
                }
                return SelectedGuildStore.getGuildId();
            })();

            if (!guildId) return;
            
            const member = GuildMemberStore.getMember(guildId, props.userId);
            
            const original = res.props.children.props.children;
            res.props.children.props.children = (props, context) => {
                res.props.children.props.children = original;
                
                const ret = original(props, context);
                ret.props.color = member?.colorString ? parseInt(member.colorString.slice(1), 16) : undefined;
                
                return ret;
            };
        });
    }

    patchAccountArea() {
        let cached;

        Patcher.after("MoreRoleColors", AccountArea, "Z", (_, args, res) => {
            const type = res.props.children.type;

            res.props.children.type = cached ??= class extends type {
                constructor() {
                    super(...arguments);
                }
                
                renderNameTag() {
                    const res = super.renderNameTag();
                    const self = this;
                    
                    const type = res.props.children[0].props.children.type;
                    res.props.children[0].props.children.type = function(props) {
                        res.props.children[0].props.children.type = type;
                        const ret = type.call(this, props);
                        
                        ret.props.style = { 
                            color: GuildMemberStore.getMember(
                                SelectedGuildStore.getGuildId(), 
                                self.props?.currentUser?.id || UserStore.getCurrentUser()?.id
                            )?.colorString 
                        };
                        
                        return ret;
                    }
                    
                    return res;
                }
            }
        });
    }
}
