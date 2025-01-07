/**
* @name FriendCategories
* @author DaddyBoard
* @version 1.0.0
* @description Categorise friends by custom categories 
* @website https://github.com/DaddyBoard/BD-Plugins/tree/main/FriendCategories
* @source https://raw.githubusercontent.com/DaddyBoard/BD-Plugins/refs/heads/main/FriendCategories/FriendCategories.plugin.js
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher, ReactUtils, Utils } = BdApi;

const config = {
    changelog: [
        {
            "title": "Initial Release",
            "type": "added",
            "items": [
                "Initial Release"
            ]
        }
    ],
    settings: [
        {
            "type": "category",
            "id": "categories",
            "name": "Behaviour",
            "collapsible": true,
            "shown": true,
            "settings": [
                {
                    "type": "switch",
                    "id": "orderList",
                    "name": "Order List",
                    "note": "Order users in custom categories by most recent message",
                    "value": BdApi.Data.load('FriendCategories', 'settings')?.orderList ?? true
                }
            ]
        }
    ]
}

module.exports = class FriendCategories {
    constructor(meta) {
        this.meta = meta;
        this.config = config;
        this.defaultSettings = {
            categories: [],
            orderList: true
        };
        this.settings = this.loadSettings();
    }

    loadSettings() {
        return { ...this.defaultSettings, ...BdApi.Data.load('FriendCategories', 'settings') };
    }

    saveSettings(newSettings) {
        this.settings = newSettings;
        BdApi.Data.save('FriendCategories', 'settings', this.settings);
        this.forceUpdateComponents();
    }

    getSettingsPanel() {
        config.settings[0].settings.forEach(setting => {
            setting.value = this.settings[setting.id];
        });

        return BdApi.UI.buildSettingsPanel({
        settings: config.settings,
            onChange: (category, id, value) => {
                const newSettings = { ...this.settings, [id]: value };
                this.saveSettings(newSettings);
            }
        });
    }

    applyCategories(children) {
        if (!Array.isArray(children)) return;

        const shopIndex = children.findIndex(child => child?.key === "discord-shop");
        const baseElementIndex = children.findIndex(child => child?.key === "1");

        if (shopIndex >= 0 && baseElementIndex >= 0) {
            const sortedCategories = [...this.settings.categories].sort((a, b) => (a.index || 0) - (b.index || 0));
            const clonedElements = sortedCategories.map((category, index) => {
                const categoryElement = React.cloneElement(
                    children[baseElementIndex], 
                    { 
                        key: `custom-category-${index}`,
                        'data-category-id': `custom-category-${index}`,
                        children: React.createElement('div', {
                            className: "custom-category-header",
                            style: { 
                                color: category.color,
                                cursor: 'pointer',
                                userSelect: 'none'
                            },
                            'data-category-id': `custom-category-${index}`,
                            onContextMenu: (e) => {
                                e.stopPropagation();
                                BdApi.ContextMenu.open(e, BdApi.ContextMenu.buildMenu([
                                    {
                                        type: "submenu",
                                        label: "Category Options",
                                        items: [
                                            {
                                                label: "Move Up",
                                                disabled: category.index === 1,
                                                action: () => this.moveCategory(`custom-category-${index}`, 'up')
                                            },
                                            {
                                                label: "Move Down",
                                                disabled: category.index === this.settings.categories.length,
                                                action: () => this.moveCategory(`custom-category-${index}`, 'down')
                                            },
                                            { type: "separator" },
                                            {
                                                label: "Edit Category",
                                                action: () => {
                                                    BdApi.UI.showConfirmationModal(
                                                        "Edit Category",
                                                        React.createElement("div", {
                                                            children: [
                                                                React.createElement("input", {
                                                                    type: "text",
                                                                    placeholder: "Category Name",
                                                                    id: "category-name",
                                                                    defaultValue: category.name
                                                                }),
                                                                React.createElement("input", {
                                                                    type: "color",
                                                                    id: "category-color",
                                                                    defaultValue: category.color
                                                                })
                                                            ]
                                                        }),
                                                        {
                                                            onConfirm: () => {
                                                                const name = document.getElementById("category-name").value;
                                                                const color = document.getElementById("category-color").value;
                                                                if (!name) return;

                                                                const newSettings = { ...this.settings };
                                                                const categoryIndex = newSettings.categories.findIndex((_, i) => i === index);
                                                                if (categoryIndex !== -1) {
                                                                    newSettings.categories[categoryIndex] = {
                                                                        ...newSettings.categories[categoryIndex],
                                                                        name,
                                                                        color
                                                                    };
                                                                    this.saveSettings(newSettings);
                                                                }
                                                            }
                                                        }
                                                    );
                                                }
                                            },
                                            {
                                                label: "Delete Category",
                                                danger: true,
                                                action: () => {
                                                    BdApi.UI.showConfirmationModal(
                                                        "Delete Category",
                                                        "Are you sure you want to delete this category?",
                                                        {
                                                            danger: true,
                                                            onConfirm: () => {
                                                                const newSettings = { ...this.settings };
                                                                newSettings.categories.splice(index, 1);
                                                                this.saveSettings(newSettings);
                                                            }
                                                        }
                                                    );
                                                }
                                            }
                                        ]
                                    }
                                ]))
                            },
                            children: category.name
                        })
                    }
                );

                const userElements = category.userIds.map(userId => {
                    const userIndex = children.findIndex(child => child?.key === userId);
                    return userIndex >= 0 ? children.splice(userIndex, 1)[0] : null;
                }).filter(Boolean);

                return [categoryElement, ...userElements];
            }).flat();

            children.splice(shopIndex + 1, 0, ...clonedElements);
        }
    }

    createCategory(name, color) {
        const maxIndex = Math.max(0, ...this.settings.categories.map(c => c.index || 0));
        const newCategory = { name, color, userIds: [], index: maxIndex + 1 };
        const newSettings = {
            ...this.settings,
            categories: [...this.settings.categories, newCategory]
        };
        this.saveSettings(newSettings);
    }

    addUserToCategory(channelId, categoryName) {
        const newSettings = { ...this.settings };
        const category = newSettings.categories.find(c => c.name === categoryName);
        
        if (category) {
            if (category.userIds.includes(channelId)) {
                category.userIds = category.userIds.filter(id => id !== channelId);
            }
            else {
                newSettings.categories.forEach(cat => {
                    if (cat.name !== categoryName) {
                        cat.userIds = cat.userIds.filter(id => id !== channelId);
                    }
                });
                category.userIds.push(channelId);
            }
            this.saveSettings(newSettings);
        }
    }

    setupContextMenu() {
        return BdApi.ContextMenu.patch("user-context", (returnValue, props) => {
            const channelId = props.channel?.id;
            if (!channelId) return;

            returnValue.props.children.push(
                BdApi.ContextMenu.buildItem({
                    type: "submenu",
                    label: "Friend Categories",
                    items: [
                        ...this.settings.categories.map(category => ({
                            type: "toggle",
                            label: category.name,
                            checked: category.userIds.includes(channelId),
                            action: () => this.addUserToCategory(channelId, category.name)
                        })),
                        { type: "separator" },
                        {
                            label: "Create New Category",
                            action: () => {
                                BdApi.UI.showConfirmationModal(
                                    "Create Category",
                                    React.createElement("div", {
                                        children: [
                                            React.createElement("input", {
                                                type: "text",
                                                placeholder: "Category Name",
                                                id: "category-name"
                                            }),
                                            React.createElement("input", {
                                                type: "color",
                                                id: "category-color"
                                            })
                                        ]
                                    }),
                                    {
                                        onConfirm: () => {
                                            const name = document.getElementById("category-name").value;
                                            const color = document.getElementById("category-color").value;
                                            if (name) this.createCategory(name, color);
                                        }
                                    }
                                );
                            }
                        }
                    ]
                })
            );
        });
    }

    setupListPatch() {
        return BdApi.Patcher.after('FriendCategories', 
            BdApi.Webpack.getModule(x => x.ListThin).ListThin, 
            'render', 
            (_, __, returnValue) => {
                const children = returnValue.props.children?.[0]?.props?.children?.props?.children;
                this.applyCategories(children);
                return returnValue;
            }
        );
    }

    setupCategoryContextMenu() {
        return BdApi.ContextMenu.patch("div.custom-category-header", (returnValue, props) => {
        const categoryMatch = props.target?.closest('[data-category-id]');
        if (!categoryMatch) return;

        const categoryId = categoryMatch.getAttribute('data-category-id');
        const category = this.settings.categories.find((_, index) => `custom-category-${index}` === categoryId);
        if (!category) return;

        const isFirst = category.index === 1;
        const isLast = category.index === this.settings.categories.length;

        returnValue.props.children = [
            BdApi.ContextMenu.buildItem({
                    type: "submenu",
                    label: "Category Options",
                    items: [
                        {
                            label: "Move Up",
                            disabled: isFirst,
                            action: () => this.moveCategory(categoryId, 'up')
                        },
                        {
                            label: "Move Down",
                            disabled: isLast,
                            action: () => this.moveCategory(categoryId, 'down')
                        },
                        { type: "separator" },
                        {
                            label: "Edit Category",
                            action: () => {
                                BdApi.UI.showConfirmationModal(
                                    "Edit Category",
                                    React.createElement("div", {
                                        children: [
                                            React.createElement("input", {
                                                type: "text",
                                                placeholder: "Category Name",
                                                id: "category-name",
                                                defaultValue: category.name
                                            }),
                                            React.createElement("input", {
                                                type: "color",
                                                id: "category-color",
                                                defaultValue: category.color
                                            })
                                        ]
                                    }),
                                    {
                                        onConfirm: () => {
                                            const name = document.getElementById("category-name").value;
                                            const color = document.getElementById("category-color").value;
                                            if (!name) return;

                                            const newSettings = { ...this.settings };
                                            const categoryIndex = newSettings.categories.findIndex((_, index) => `custom-category-${index}` === categoryId);
                                            if (categoryIndex !== -1) {
                                                newSettings.categories[categoryIndex] = {
                                                    ...newSettings.categories[categoryIndex],
                                                    name,
                                                    color
                                                };
                                                this.saveSettings(newSettings);
                                            }
                                        }
                                    }
                                );
                            }
                        },
                        {
                            label: "Delete Category",
                            color: "RED",
                            action: () => {
                                BdApi.UI.showConfirmationModal(
                                    "Delete Category",
                                    "Are you sure you want to delete this category?",
                                    {
                                        danger: true,
                                        onConfirm: () => {
                                            const newSettings = { ...this.settings };
                                            const categoryIndex = newSettings.categories.findIndex((_, index) => `custom-category-${index}` === categoryId);
                                            if (categoryIndex !== -1) {
                                                newSettings.categories.splice(categoryIndex, 1);
                                                this.saveSettings(newSettings);
                                            }
                                        }
                                    }
                                );
                            }
                        }
                    ]
                })
            ];
        });
    }

    moveCategory(categoryId, direction) {
        const newSettings = { ...this.settings };
        const categoryIndex = newSettings.categories.findIndex((_, index) => `custom-category-${index}` === categoryId);
        
        if (categoryIndex !== -1) {
            const categories = [...newSettings.categories];
            const category = categories[categoryIndex];
            
            if (direction === 'up' && category.index > 1) {
                const targetCategory = categories.find(c => c.index === category.index - 1);
                if (targetCategory) {
                    targetCategory.index++;
                    category.index--;
                }
            } else if (direction === 'down' && category.index < categories.length) {
                const targetCategory = categories.find(c => c.index === category.index + 1);
                if (targetCategory) {
                    targetCategory.index--;
                    category.index++;
                }
            }
            
            newSettings.categories = categories.sort((a, b) => (a.index || 0) - (b.index || 0));
            this.saveSettings(newSettings);
        }
    }

    start() {
        const lastVersion = BdApi.Data.load('FriendCategories', 'lastVersion');
        if (lastVersion !== this.meta.version) {
            BdApi.UI.showChangelogModal({
                title: this.meta.name,
                subtitle: this.meta.version,
                changes: config.changelog
            });
            BdApi.Data.save('FriendCategories', 'lastVersion', this.meta.version);
        }

        this.contextMenuPatch = this.setupContextMenu();
        this.listPatch = this.setupListPatch();
        this.forceUpdateComponents();
    }

    stop() {
        if (this.contextMenuPatch) this.contextMenuPatch();
        BdApi.Patcher.unpatchAll('FriendCategories');
        this.forceUpdateComponents();
    }

    forceUpdateComponents() {
        BdApi.ReactUtils.getOwnerInstance(
            document.querySelector("nav[class^=privateChannels_] > [class^=scroller_][class*=thin_]"),
            { filter: m => m.props.channels }
        ).forceUpdate()
    }

}
