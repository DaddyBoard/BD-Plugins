/**
* @name BetterMentions
* @author DaddyBoard
* @version 1.0.0
* @description Adds profile pictures to mentions and enables click-to-profile on text editor mentions!
* @website https://github.com/DaddyBoard/BD-Plugins/tree/main/BetterMentions
* @source https://raw.githubusercontent.com/DaddyBoard/BD-Plugins/refs/heads/main/BetterMentions/BetterMentions.plugin.js
* @invite ggNWGDV7e2
*/

const { Webpack, React, Patcher } = BdApi;
const { getStore, getWithKey, getBySource, Filters } = Webpack;

const UserStore = getStore("UserStore");
const MentionComponent = getBySource(".USER_MENTION)");
const [MentionModule, mentionKey] = getWithKey(Filters.byStrings('USER_MENTION', "getNickname", "inlinePreview"));
const TextEditorMention = getBySource('.Z.hidePersonalInformation)', '.default.getUser(', 'mode:"username",');
const { useStateFromStores } = BdApi.Hooks;


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
        Patcher.after("BetterMentions", MentionModule, mentionKey, (_, [props], res) => {
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
        Patcher.after("BetterMentions", TextEditorMention, "cB", (_, [{ id, channelId }], res) => {
            const user = useStateFromStores([UserStore], () => UserStore.getUser(id));
            if (!user) return res;

            return React.createElement(MentionComponent.Z, { 
                className: 'mention',
                userId: id,
                parsedUserId: id,
                channelId: channelId,
                viewingChannelId: channelId // big up arven for this you a real g
            });
        });
    }
};
