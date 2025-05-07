/**
* @name RoleExplorer
* @author DaddyBoard
* @authorId 241334335884492810
* @version 1.0.2
* @description View the members of roles in a popout. Remake of RoleMembers by Zerebos.
* @source https://github.com/DaddyBoard/BD-Plugins
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher } = BdApi;
const { createRoot } = BdApi.ReactDOM;

const GuildMemberStore = BdApi.Webpack.getStore("GuildMemberStore");
const RoleMention = BdApi.Webpack.getModule(Webpack.Filters.byStrings(".wrapper]:!0,interactive:"), { defaultExport: false }); 
const GuildStore = BdApi.Webpack.getStore("GuildStore");   
const SelectedGuildStore = BdApi.Webpack.getStore("SelectedGuildStore");
const UserStore = BdApi.Webpack.getStore("UserStore");
const UserProfileModal = BdApi.Webpack.getByKeys('openUserProfileModal');

module.exports = class RoleExplorer {

    start() {
        this.patchGuildContextMenu();
        this.patchRoleMention();
        BdApi.DOM.addStyle("RoleExplorer", `
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
        BdApi.Patcher.unpatchAll("RoleExplorer-RoleMention");
        this.contextMenuPatch?.();
        BdApi.DOM.removeStyle("RoleExplorer");
    }

    patchRoleMention() {
        RoleMention.Z.displayName = "RoleExplorerRoleMention";
        Patcher.after("RoleExplorer-RoleMention", RoleMention, "Z", (_, [props]) => { 
            
            if (props?.className?.includes("role") || (typeof props?.children[1] === "string" && props?.children[1]?.includes("@"))) {
                props.onClick = (e) => {
                    const guildId = SelectedGuildStore.getGuildId();
                    const guildName = GuildStore.getGuild(guildId)?.name;
                    const roles = this.getRoles({ id: guildId });
                    const name = e.target.textContent.slice(1);
                    const role = Object.values(roles).find(r => r.name === name);

                    if (e.ctrlKey) {
                        DiscordNative.clipboard.copy(role.id);
                        BdApi.UI.showToast(`Copied ${role.name}'s ID to clipboard`, { type: "success" });
                        return;
                    }
                    
                    this.showRolePopout(guildId, guildName, role.id, role.name);
                };
            }
        });
    }

    patchGuildContextMenu() {        
        this.contextMenuPatch = BdApi.ContextMenu.patch("guild-context", (returnValue, props) => {
            const guild = props.guild;
            if (!guild) return;
            const roles = this.getRoles(guild);
            if (!Object.keys(roles).length) return;
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
                                BdApi.UI.showToast(`Copied ${role.name}'s ID to clipboard`, { type: "success" });
                                BdApi.ContextMenu.close();
                            } else {
                                this.showRolePopout(guild.id, guild.name, role.id, role.name);
                            }
                        }
                    };
                });

            const roleSubmenu = BdApi.ContextMenu.buildItem({
                type: "submenu",
                label: "Role Explorer",
                items: items,
                action: () => {
                    this.showRolePopout(guild.id, guild.name, null, null);
                }
            });

            const separatorIndex = returnValue.props.children.findIndex(k => !k?.props?.label);
            const insertIndex = separatorIndex > 0 ? separatorIndex + 1 : 1;
            returnValue.props.children.splice(insertIndex, 0, roleSubmenu);
        });
    }

    getRoles(guild) {
        return guild?.roles ?? GuildStore?.getRoles(guild?.id);
    }

    showRolePopout(guildId, guildName, roleId, roleName) {  
        const members = GuildMemberStore.getMembers(guildId);
        const roles = this.getRoles({ id: guildId });
        
        const membersList = members.map(member => {
            const user = UserStore.getUser(member.userId);
            return {
                id: user.id,
                nickname: member.nick,
                globalName: user.globalName,
                username: user.username,
                avatar: user.getAvatarURL(),
                roles: member.roles
            };
        });

        const Modal = ({ onClose }) => {
            const [searchQuery, setSearchQuery] = React.useState("");
            const [view, setView] = React.useState(roleId ? "members" : "roles");
            const [selectedRole, setSelectedRole] = React.useState({ id: roleId, name: roleName });
            const searchInputRef = React.useRef(null);
            
            React.useEffect(() => {
                const handleKeyDown = (e) => {
                    if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
                        e.preventDefault();
                        if (searchInputRef.current) {
                            searchInputRef.current.focus();
                            setSearchQuery(prev => prev + e.key);
                        }
                    }
                };

                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
            }, []);

            React.useEffect(() => {
                if (searchInputRef.current) {
                    searchInputRef.current.focus();
                }
            }, [view]);

            const handleViewChange = (newView) => {
                setView(newView);
                setSearchQuery("");
            };

            React.useEffect(() => {
                const scrollContainer = document.querySelector('.role-members-scroll');
                if (scrollContainer) {
                    scrollContainer.scrollTop = 0;
                }
            }, [view]);

            const handleRoleSelect = (role) => {
                setSelectedRole(role);
                handleViewChange("members");
            };

            const filteredMembers = membersList
                .filter(member => {
                    if (!selectedRole.id) return true;
                    if (selectedRole.id === guildId) return true;
                    return member.roles.includes(selectedRole.id);
                })
                .filter(member => {
                    const searchLower = searchQuery.toLowerCase();
                    return (
                        (member.nickname?.toLowerCase().includes(searchLower)) ||
                        (member.globalName?.toLowerCase().includes(searchLower)) ||
                        member.username.toLowerCase().includes(searchLower)
                    );
                });

            const filteredRoles = Object.values(roles)
                .sort((a, b) => b.position - a.position)
                .filter(role => {
                    const searchLower = searchQuery.toLowerCase();
                    return role.name.toLowerCase().includes(searchLower);
                })
                .map(role => ({
                    id: role.id,
                    name: role.name,
                    color: role.colorString || "var(--text-muted)",
                    memberCount: role.id === guildId 
                        ? members.length
                        : members.filter(m => m.roles.includes(role.id)).length
                }));

            const renderContent = () => {
                if (view === "roles") {
                    return React.createElement("div", {
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
                    }, filteredRoles.map(role => 
                        React.createElement("div", {
                            key: role.id,
                            style: {
                                display: "flex",
                                alignItems: "center",
                                padding: "12px",
                                backgroundColor: "var(--background-secondary)",
                                borderRadius: "8px",
                                cursor: "pointer",
                                transition: "background-color 0.2s",
                                borderLeft: `4px solid ${role.color}`
                            },
                            onMouseEnter: e => {
                                e.currentTarget.style.backgroundColor = "var(--background-secondary-alt)";
                                e.currentTarget.querySelector(".copy-icon").style.opacity = 1;
                            },
                            onMouseLeave: e => {
                                e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                                e.currentTarget.querySelector(".copy-icon").style.opacity = 0;
                            },
                            onClick: (e) => {
                                if (e.ctrlKey) {
                                    DiscordNative.clipboard.copy(role.id);
                                    BdApi.UI.showToast(`Copied ${role.name}'s ID to clipboard`, { type: "success" });
                                    return;
                                }
                                handleRoleSelect(role);
                            }
                        }, [
                            React.createElement("div", {
                                style: {
                                    display: "flex",
                                    flexDirection: "column",
                                    flex: 1
                                }
                            }, [
                                React.createElement("span", {
                                    style: {
                                        color: "var(--header-primary)",
                                        fontWeight: "500",
                                        fontSize: "16px"
                                    }
                                }, role.name),
                                React.createElement("span", {
                                    style: {
                                        color: "var(--text-muted)",
                                        fontSize: "12px"
                                    }
                                }, `${role.memberCount} members`)
                            ]),
                            React.createElement("div", {
                                className: "copy-icon",
                                style: {
                                    marginLeft: "8px",
                                    cursor: "pointer",
                                    padding: "4px",
                                    borderRadius: "4px",
                                    opacity: 0,
                                    transition: "opacity 0.2s"
                                },
                                onClick: (e) => {
                                    e.stopPropagation();
                                    DiscordNative.clipboard.copy(role.id);
                                    BdApi.UI.showToast(`Copied ${role.name}'s ID to clipboard`, { type: "success" });
                                }
                            }, React.createElement("svg", {
                                width: "16",
                                height: "16",
                                viewBox: "0 0 24 24",
                                fill: "none",
                                xmlns: "http://www.w3.org/2000/svg",
                                style: {
                                    color: "var(--interactive-normal)"
                                }
                            }, [
                                React.createElement("path", {
                                    fill: "currentColor",
                                    d: "M3 16a1 1 0 0 1-1-1v-5a8 8 0 0 1 8-8h5a1 1 0 0 1 1 1v.5a.5.5 0 0 1-.5.5H10a6 6 0 0 0-6 6v5.5a.5.5 0 0 1-.5.5H3Z"
                                }),
                                React.createElement("path", {
                                    fill: "currentColor",
                                    d: "M6 18a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-3a5 5 0 0 1-5-5V6h-4a4 4 0 0 0-4 4v8Z"
                                }),
                                React.createElement("path", {
                                    fill: "currentColor",
                                    d: "M21.73 12a3 3 0 0 0-.6-.88l-4.25-4.24a3 3 0 0 0-.88-.61V9a3 3 0 0 0 3 3h2.73Z"
                                })
                            ]))
                        ])
                    )));
                }

                return React.createElement("div", {
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
                            e.currentTarget.querySelector(".copy-icon").style.opacity = 1;
                        },
                        onMouseLeave: e => {
                            e.currentTarget.style.backgroundColor = "var(--background-secondary)";
                            e.currentTarget.querySelector(".copy-icon").style.opacity = 0;
                        },
                        onClick: (e) => {
                            if (e.ctrlKey) {
                                DiscordNative.clipboard.copy(member.id);
                                BdApi.UI.showToast(`Copied ${member.username}'s ID to clipboard`, { type: "success" });
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
                                flexDirection: "column",
                                flex: 1
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
                        ]),
                        React.createElement("div", {
                            className: "copy-icon",
                            style: {
                                marginLeft: "8px",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                opacity: 0,
                                transition: "opacity 0.2s"
                            },
                            onClick: (e) => {
                                e.stopPropagation();
                                DiscordNative.clipboard.copy(member.id);
                                BdApi.UI.showToast(`Copied ${member.username}'s ID to clipboard`, { type: "success" });
                            }
                        }, React.createElement("svg", {
                            width: "16",
                            height: "16",
                            viewBox: "0 0 24 24",
                            fill: "none",
                            xmlns: "http://www.w3.org/2000/svg",
                            style: {
                                color: "var(--interactive-normal)"
                            }
                        }, [
                            React.createElement("path", {
                                fill: "currentColor",
                                d: "M3 16a1 1 0 0 1-1-1v-5a8 8 0 0 1 8-8h5a1 1 0 0 1 1 1v.5a.5.5 0 0 1-.5.5H10a6 6 0 0 0-6 6v5.5a.5.5 0 0 1-.5.5H3Z"
                            }),
                            React.createElement("path", {
                                fill: "currentColor",
                                d: "M6 18a4 4 0 0 0 4 4h8a4 4 0 0 0 4-4v-4h-3a5 5 0 0 1-5-5V6h-4a4 4 0 0 0-4 4v8Z"
                            }),
                            React.createElement("path", {
                                fill: "currentColor",
                                d: "M21.73 12a3 3 0 0 0-.6-.88l-4.25-4.24a3 3 0 0 0-.88-.61V9a3 3 0 0 0 3 3h2.73Z"
                            })
                        ]))
                    ])
                )));
            };

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
                    React.createElement("div", {
                        style: {
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px"
                        }
                    }, [
                        React.createElement("h2", {
                            style: {
                                color: "var(--header-primary)",
                                margin: 0,
                                fontSize: "20px",
                                fontWeight: "600",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px"
                            }
                        }, [
                            React.createElement("span", {
                                style: {
                                    color: "var(--text-muted)",
                                    fontSize: "16px",
                                    cursor: "pointer",
                                    transition: "color 0.2s"
                                },
                                onMouseEnter: e => {
                                    e.currentTarget.style.color = "var(--interactive-hover)";
                                },
                                onMouseLeave: e => {
                                    e.currentTarget.style.color = "var(--text-muted)";
                                },
                                onClick: () => {
                                    handleViewChange("roles");
                                    setSelectedRole({ id: null, name: null });
                                }
                            }, guildName),
                            React.createElement("span", {
                                style: {
                                    color: "var(--text-muted)",
                                    fontSize: "16px"
                                }
                            }, "›"),
                            React.createElement("span", {
                                style: {
                                    color: "var(--header-primary)",
                                    fontSize: "20px"
                                }
                            }, selectedRole.name || "Roles")
                        ]),
                        React.createElement("span", {
                            style: {
                                color: "var(--text-danger)",
                                fontSize: "13px"
                            }
                        }, "Note: Data accuracy depends on server cache and may be incomplete for large servers.")
                    ]),
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
                    ref: searchInputRef,
                    type: "text",
                    placeholder: view === "roles" ? "Search roles..." : "Search members...",
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
                renderContent()
            ]));
        };

        const container = document.createElement("div");
        document.body.appendChild(container);

        const close = () => {
            container.root.unmount();
            container.remove();
        };

        const root = createRoot(container);
        root.render(React.createElement(Modal, { onClose: close }));
        container.root = root;
    }
};