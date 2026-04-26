/**
* @name BetterMentions
* @author DaddyBoard
* @version 1.0.2
* @description Adds profile pictures to mentions and enables click-to-profile on text editor mentions!
* @website https://github.com/DaddyBoard/BD-Plugins/tree/main/BetterMentions
* @source https://raw.githubusercontent.com/DaddyBoard/BD-Plugins/refs/heads/main/BetterMentions/BetterMentions.plugin.js
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher } = BdApi;
const { Filters } = Webpack;

const { UserStore } = Webpack.Stores;

const [
    MentionComponent,
    MentionModule,
    TextEditorMention
] = Webpack.getBulk(
    { filter: Filters.bySource(".USER_MENTION)"), searchDefault: false },
    { filter: Filters.byStrings('USER_MENTION', "getNickname", "inlinePreview"), defaultExport: false },
    { filter: Filters.bySource("ChannelEditor.tsx") }
);

module.exports = class BetterMentions {
    constructor(meta) {
        this.meta = meta;
    }

    start() {
        this.patchMentions();
        this.patchTextEditor();
    }

    stop() {
        Patcher.unpatchAll("BetterMentions");
    }

    patchMentions() {
        Patcher.after("BetterMentions", MentionModule, "A", (_, [props], res) => {
            const innerProps = BdApi.Utils.findInTree(res, x => x?.position?.includes('right'), {
                walkable: ['props', 'children']
            });

            if (!innerProps?.user) return res;
            
            const { user, guildId } = innerProps;
            const avatarElement = React.createElement("img", {
                src: user.getAvatarURL(guildId),
                style: {
                    width: "16px",
                    height: "16px",
                    borderRadius: "50%",
                    marginRight: "2px",
                    marginBottom: "4px",
                    verticalAlign: "middle",
                    objectFit: "cover"
                }
            });
            
            const originalChildren = innerProps.children;
            if (typeof originalChildren !== 'function') return res;
            
            res.props.children.props.children = (childProps, context) => {
                const original = originalChildren(childProps, context);
                if (!original?.props?.children) return original;
                
                const currentText = original.props.children;
                const newText = typeof currentText === 'string' && currentText.startsWith('@') 
                    ? currentText.slice(1) 
                    : currentText;
                
                return React.cloneElement(original, {
                    children: [avatarElement, newText]
                });
            };
            
            return res;
        });
    }

    patchTextEditor() {
        const probe = TextEditorMention.A.prototype.render.call({
            props: {
                type: {},
                textValue: "",
                useSlate: true,
                channel: {}
            },
            state: {
                popup: {}
            },
            getPlaceholder: () => {}
        });

        const renderElementProto = BdApi.ReactUtils.wrapInHooks(probe.props.children[2].type)(probe.props.children[2].props).props.children[1].props.children.type.prototype;

        this.nodePatcher = BdApi.ReactUtils.createNodePatcher();

        Patcher.after("BetterMentions", renderElementProto, "renderElement", (that, [ele], res) => {
            if (ele?.element?.type !== "userMention") return;

            this.nodePatcher.patch(res.props.children[0], (_props, ret) => {
                ret.props.children.props.children = React.createElement(MentionComponent.A, {
                    className: 'mention',
                    userId: _props.id,
                    parsedUserId: _props.id,
                    channelId: _props.channelId,
                    viewingChannelId: _props.channelId
                });
            });
        });
    }
};
