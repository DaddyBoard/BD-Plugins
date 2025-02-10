/**
* @name ViewRoleMembers
* @author DaddyBoard
* @authorId 241334335884492810
* @version 1.0.0
* @description View the members of roles in a popout.
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher } = BdApi;

module.exports = class ViewRoleMembers {

    start() {
        this.patchGuildContextMenu();
        this.patchRoleMention();
        BdApi.DOM.addStyle("ViewRoleMembers", `
            .role-members-scroll::-webkit-scrollbar {
                width: 8px;
            }
            .role-members-scroll::-webkit-scrollbar-track {
                background: var(--scrollbar-thin-track);
            }
            .role-members-scroll::-webkit-scrollbar-thumb {
                background: var(--scrollbar-thin-thumb);
                border-radius: 4px;
            }
        `);
    }

    stop() {
        BdApi.Patcher.unpatchAll("ViewRoleMembers-RoleMention");
        this.contextMenuPatch?.();
        BdApi.DOM.removeStyle("ViewRoleMembers");
    }

    patchRoleMention() {
        const RoleMention = BdApi.Webpack.getModule(Webpack.Filters.byStrings(".wrapper]:!0,interactive:"), { defaultExport: false });       
        RoleMention.Z.displayName = "ViewRoleMembersRoleMention";
        Patcher.before("ViewRoleMembers-RoleMention", RoleMention, "Z", (_, [props]) => {    
            if (!props?.className.includes("role")) return;
    
            props.onClick = (e) => {
                const guildId = BdApi.Webpack.getStore("SelectedGuildStore").getGuildId();
                const guildName = BdApi.Webpack.getStore("GuildStore").getGuild(guildId)?.name;
                const roles = this.getRoles({ id: guildId });
                const name = e.target.textContent.slice(1);
                const role = Object.values(roles).find(r => r.name === name);

                if (e.ctrlKey) {
                    DiscordNative.clipboard.copy(role.id);
                    BdApi.showToast(`Copied ${role.name}'s ID to clipboard`, { type: "success" });
                    return;
                }
                
                this.showRolePopout(guildId, guildName, role.id, role.name);
            };
        });
    }

    patchGuildContextMenu() {        
        this.contextMenuPatch = BdApi.ContextMenu.patch("guild-context", (returnValue, props) => {
            const guild = props.guild;
            if (!guild) return;
            const roles = this.getRoles(guild);
            if (!Object.keys(roles).length) return;
            const GuildMemberStore = BdApi.Webpack.getStore("GuildMemberStore");
            const members = GuildMemberStore.getMembers(guild.id);
            const items = Object.values(roles)
                .sort((a, b) => b.position - a.position)
                .map(role => {
                    const memberCount = role.id === guild.id 
                        ? members.length
                        : members.filter(m => m.roles.includes(role.id)).length;
                    return {
                        label: `${role.name} (${memberCount})`,
                        id: role.id,
                        action: (e) => {
                            if (e.ctrlKey) {
                                DiscordNative.clipboard.copy(role.id);
                                BdApi.showToast(`Copied ${role.name}'s ID to clipboard`, { type: "success" });
                                BdApi.ContextMenu.close();

                            } else {
                                this.showRolePopout(guild.id, guild.name, role.id, role.name);
                            }
                        }
                    };
                });

            const roleSubmenu = BdApi.ContextMenu.buildItem({
                type: "submenu",
                label: "View Role Members",
                items: items
            });

            const separatorIndex = returnValue.props.children.findIndex(k => !k?.props?.label);
            const insertIndex = separatorIndex > 0 ? separatorIndex + 1 : 1;
            returnValue.props.children.splice(insertIndex, 0, roleSubmenu);
        });
    }

    getRoles(guild) {
        const GuildStore = BdApi.Webpack.getStore("GuildStore");
        return guild?.roles ?? GuildStore?.getRoles(guild?.id);
    }

    showRolePopout(guildId, guildName, roleId, roleName) {
        const GuildMemberStore = BdApi.Webpack.getStore("GuildMemberStore");
        const UserStore = BdApi.Webpack.getStore("UserStore");
        const UserProfileModal = BdApi.Webpack.getByKeys('openUserProfileModal');
        const members = GuildMemberStore.getMembers(guildId);
        const roleMembers = roleId === guildId 
            ? members
            : members.filter(m => m.roles.includes(roleId));
        
        const membersList = roleMembers.map(member => {
            const user = UserStore.getUser(member.userId);
            return {
                id: user.id,
                nickname: member.nick,
                globalName: user.globalName,
                username: user.username,
                avatar: user.getAvatarURL()
            };
        });

        const Modal = ({ onClose }) => {
            const [searchQuery, setSearchQuery] = React.useState("");
            
            const filteredMembers = membersList.filter(member => {
                const searchLower = searchQuery.toLowerCase();
                return (
                    (member.nickname?.toLowerCase().includes(searchLower)) ||
                    (member.globalName?.toLowerCase().includes(searchLower)) ||
                    member.username.toLowerCase().includes(searchLower)
                );
            });

            return React.createElement("div", {
                className: "role-members-backdrop",
                onClick: onClose,
                style: {
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.85)",
                    zIndex: 1000,
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }
            }, React.createElement("div", {
                onClick: e => e.stopPropagation(),
                style: {
                    backgroundColor: "var(--background-primary)",
                    borderRadius: "8px",
                    width: "800px",
                    maxHeight: "80vh",
                    display: "flex",
                    flexDirection: "column"
                }
            }, [
                React.createElement("div", {
                    style: {
                        padding: "16px",
                        borderBottom: "1px solid var(--background-modifier-accent)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }
                }, [
                    React.createElement("h2", {
                        style: {
                            color: "var(--header-primary)",
                            margin: 0
                        }
                    }, `${guildName} > ${roleName}`),
                    React.createElement("button", {
                        onClick: onClose,
                        style: {
                            background: "none",
                            border: "none",
                            color: "var(--interactive-normal)",
                            cursor: "pointer",
                            padding: "8px"
                        }
                    }, "✕")
                ]),
                React.createElement("div", {
                    style: {
                        padding: "8px 16px 0 16px",
                        display: "flex",
                        justifyContent: "center"
                    }
                }, React.createElement("input", {
                    type: "text",
                    placeholder: "Search members...",
                    value: searchQuery,
                    onChange: (e) => setSearchQuery(e.target.value),
                    autoFocus: true,
                    style: {
                        width: "200px",
                        padding: "4px 8px",
                        backgroundColor: "var(--background-secondary)",
                        border: "none",
                        borderRadius: "4px",
                        color: "var(--text-normal)",
                        fontSize: "13px",
                        marginBottom: "8px",
                        height: "24px"
                    }
                })),
                React.createElement("div", {
                    style: {
                        padding: "0 16px 16px 16px",
                        overflowY: "auto",
                        maxHeight: "60vh",
                    },
                    className: "role-members-scroll",
                }, React.createElement("div", {
                    style: {
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "8px"
                    }
                }, filteredMembers.map(member => 
                    React.createElement("div", {
                        key: member.id,
                        style: {
                            display: "flex",
                            alignItems: "center",
                            padding: "12px",
                            backgroundColor: "var(--background-secondary)",
                            borderRadius: "8px",
                            cursor: "pointer",
                            transition: "background-color 0.2s"
                        },
                        onMouseEnter: e => {
                            e.currentTarget.style.backgroundColor = "var(--background-secondary-alt)";
                        },
                        onMouseLeave: e => {
                            e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                        },
                        onClick: (e) => {
                            if (e.ctrlKey) {
                                DiscordNative.clipboard.copy(member.id);
                                BdApi.showToast(`Copied ${member.username}'s ID to clipboard`, { type: "success" });
                                return;
                            }
                            UserProfileModal.openUserProfileModal({
                                userId: member.id,
                                guildId: guildId
                            });
                        },
                        "data-user-id": member.id
                    }, [
                        React.createElement("img", {
                            src: member.avatar,
                            style: {
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                marginRight: "12px"
                            }
                        }),
                        React.createElement("div", {
                            style: {
                                display: "flex",
                                flexDirection: "column"
                            }
                        }, [
                            React.createElement("span", {
                                style: {
                                    color: "var(--header-primary)",
                                    fontWeight: "500",
                                    fontSize: "16px"
                                }
                            }, member.nickname || member.globalName || member.username),
                            React.createElement("span", {
                                style: {
                                    color: "var(--text-muted)",
                                    fontSize: "12px"
                                }
                            }, member.username)
                        ])
                    ])
                )))
            ]));
        };

        const container = document.createElement("div");
        document.body.appendChild(container);

        const close = () => {
            BdApi.ReactDOM.unmountComponentAtNode(container);
            container.remove();
        };

        BdApi.ReactDOM.render(React.createElement(Modal, { onClose: close }), container);
    }
};
